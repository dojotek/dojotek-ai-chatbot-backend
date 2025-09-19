import { z } from 'zod';
import { tool } from '@langchain/core/tools';
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from '@langchain/core/messages';
import { MessagesAnnotation } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { ChatOpenAI } from '@langchain/openai';
import { StateGraph } from '@langchain/langgraph';
import { toolsCondition } from '@langchain/langgraph/prebuilt';
import { VectorStorageFactoryService } from '../../vector-storage/vector-storage-factory.service';
import { Injectable } from '@nestjs/common';
import { LogsService } from '../../logs/logs.service';
import { ConfigsService } from '../../configs/configs.service';

/**
 * Basic RAG
 *
 * Reference:
 *   https://js.langchain.com/docs/tutorials/qa_chat_history/
 */
@Injectable()
export class BasicRagService {
  constructor(
    private readonly configsService: ConfigsService,
    private readonly vectorStorageFactory: VectorStorageFactoryService,
    private readonly logs: LogsService,
  ) {}

  async runInference(params: {
    knowledgeId: string;
    knowledgeFileIds: string[];
    recentMessages: Array<{ role: 'user' | 'ai' | 'system'; content: string }>;
    userQuery: string;
  }): Promise<string> {
    const { knowledgeId, knowledgeFileIds, recentMessages, userQuery } = params;
    this.logs.logSafe(
      'BasicRag inference start',
      { userQuery },
      'BasicRagService',
    );

    // Create a single client for the knowledge
    const vectorStore = this.vectorStorageFactory.createClient(knowledgeId);

    const llm = new ChatOpenAI({
      apiKey: this.configsService.openaiApiKey,
      model: 'gpt-4o-mini',
      temperature: 0,
    });

    const retrieveSchema = z.object({ query: z.string() });

    const retrieve = tool(
      async ({ query }) => {
        this.logs.logSafe(
          'BasicRag retrieve tool start',
          { query: String(query), knowledgeFileIds },
          'BasicRagService',
        );

        const filter = {
          should: [
            {
              key: 'metadata.knowledgeFileId',
              match: {
                any: knowledgeFileIds,
              },
            },
          ],
        };
        const docs = await vectorStore.similaritySearch(
          String(query),
          3,
          filter,
        );

        this.logs.logSafe(
          'BasicRag retrieve tool found documents',
          {
            query: String(query),
            documentsCount: docs.length,
            documentSources: docs.map((doc) =>
              String(doc.metadata?.source || 'unknown'),
            ),
          },
          'BasicRagService',
        );

        const allDocs = docs.map(
          (doc) =>
            `Source: ${doc.metadata?.source || ''}\nContent: ${doc.pageContent}`,
        );
        const serialized = allDocs.join('\n');

        this.logs.logSafe(
          'BasicRag retrieve tool end',
          {
            query: String(query),
            documentsCount: docs.length,
            serializedLength: serialized.length,
          },
          'BasicRagService',
        );

        return serialized;
      },
      {
        name: 'retrieve',
        description: 'Retrieve information related to a query.',
        schema: retrieveSchema,
      },
    );

    async function queryOrRespond(state: typeof MessagesAnnotation.State) {
      const llmWithTools = llm.bindTools([retrieve]);
      const response = await llmWithTools.invoke(state.messages);
      return { messages: [response] };
    }

    const tools = new ToolNode([retrieve]);

    async function generate(state: typeof MessagesAnnotation.State) {
      const recentToolMessages = [] as ToolMessage[];
      for (let i = state['messages'].length - 1; i >= 0; i--) {
        const message = state['messages'][i];
        if (message instanceof ToolMessage) {
          recentToolMessages.push(message);
        } else {
          break;
        }
      }
      const toolMessages = recentToolMessages.reverse();
      const docsContent = toolMessages
        .map((doc) => {
          if (typeof doc.content === 'string') {
            return doc.content;
          }
          return JSON.stringify(doc.content);
        })
        .join('\n');
      const systemMessageContent =
        'You are an assistant for question-answering tasks. ' +
        'Use the following pieces of retrieved context to answer ' +
        "the question. If you don't know the answer, say that you " +
        "don't know. Use three sentences maximum and keep the " +
        'answer concise.' +
        '\n\n' +
        `${docsContent}`;

      const conversationMessages = state.messages.filter((message) => {
        if (
          message instanceof HumanMessage ||
          message instanceof SystemMessage
        ) {
          return true;
        }
        if (message instanceof AIMessage) {
          const messageWithToolCalls = message as AIMessage & {
            tool_calls?: unknown[];
          };
          const toolCalls = messageWithToolCalls.tool_calls;
          return !toolCalls || toolCalls.length === 0;
        }
        return false;
      });
      const prompt = [
        new SystemMessage(systemMessageContent),
        ...conversationMessages,
      ];

      const response = await llm.invoke(prompt);
      return { messages: [response] };
    }

    const graphBuilder = new StateGraph(MessagesAnnotation)
      .addNode('queryOrRespond', queryOrRespond)
      .addNode('tools', tools)
      .addNode('generate', generate)
      .addEdge('__start__', 'queryOrRespond')
      .addConditionalEdges('queryOrRespond', toolsCondition, {
        __end__: '__end__',
        tools: 'tools',
      })
      .addEdge('tools', 'generate')
      .addEdge('generate', '__end__');

    const graph = graphBuilder.compile();

    const inputs = {
      messages: [
        ...recentMessages.map((message) => {
          if (message.role === 'user') {
            return new HumanMessage(message.content);
          }
          if (message.role === 'ai') {
            return new AIMessage(message.content);
          }
          return new SystemMessage(message.content);
        }),
        new HumanMessage(userQuery),
      ],
    };

    const result = await graph.invoke(inputs);
    this.logs.logSafe(
      'BasicRag inference end',
      { messagesCount: result.messages?.length },
      'BasicRagService',
    );
    const lastMessage = result.messages[
      result.messages.length - 1
    ] as AIMessage;
    const text = Array.isArray(lastMessage.content)
      ? (lastMessage.content as Array<{ text: string }>)
          .map((c) => c.text)
          .join('\n')
      : lastMessage.content;
    return String(text);
  }
}
