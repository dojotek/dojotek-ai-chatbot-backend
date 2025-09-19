import { Annotation } from '@langchain/langgraph';
import { BaseMessage, AIMessage, HumanMessage } from '@langchain/core/messages';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { tool } from '@langchain/core/tools';
import { END, START, StateGraph } from '@langchain/langgraph';
import { pull } from 'langchain/hub';
import { z } from 'zod';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import { VectorStorageFactoryService } from '../../vector-storage/vector-storage-factory.service';
import { Injectable } from '@nestjs/common';
import { LogsService } from '../../logs/logs.service';
import { ConfigsService } from '../../configs/configs.service';

/**
 * Agentic RAG
 *
 * Reference:
 *   https://langchain-ai.github.io/langgraphjs/tutorials/rag/langgraph_agentic_rag/
 */
@Injectable()
export class AgenticRagService {
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
    const vectorStore = this.vectorStorageFactory.createClient(knowledgeId);

    const GraphState = Annotation.Root({
      messages: Annotation<BaseMessage[]>({
        reducer: (x, y) => x.concat(y),
        default: () => [],
      }),
    });

    // Custom retrieve-like tool for the vector store
    const retrieveTool = tool(
      async ({ query }: { query: string }) => {
        this.logs.logSafe(
          'AgenticRag retrieve_documents tool start',
          { query, knowledgeFileIds },
          'AgenticRagService',
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
          'AgenticRag retrieve_documents tool found documents',
          {
            query: query,
            documentsCount: docs.length,
            documentSources: docs.map(
              (doc) =>
                (doc.metadata as { source?: string })?.source || 'unknown',
            ),
          },
          'AgenticRagService',
        );

        const chunks = docs.map(
          (d) =>
            `Source: ${(d.metadata as { source?: string })?.source || ''}\nContent: ${d.pageContent}`,
        );
        const result = chunks.join('\n');

        this.logs.logSafe(
          'AgenticRag retrieve_documents tool end',
          {
            query: query,
            documentsCount: docs.length,
            resultLength: result.length,
          },
          'AgenticRagService',
        );

        return result;
      },
      {
        name: 'retrieve_documents',
        description: 'Search and return information from knowledge files.',
        schema: z.object({ query: z.string() }),
      },
    );
    const tools = [retrieveTool];

    const toolNode = new ToolNode<typeof GraphState.State>(tools);

    /**
     * Decides whether the agent should retrieve more information or end the process.
     * This function checks the last message in the state for a function call. If a tool call is
     * present, the process continues to retrieve information. Otherwise, it ends the process.
     * @param {typeof GraphState.State} state - The current state of the agent, including all messages.
     * @returns {string} - A decision to either "continue" the retrieval process or "end" it.
     */
    const logger = this.logs;
    const configs = this.configsService;
    function shouldRetrieve(state: typeof GraphState.State): string {
      const { messages } = state;
      logger.debug('---DECIDE TO RETRIEVE---', 'AgenticRagService');
      const lastMessage = messages[messages.length - 1];

      if (
        'tool_calls' in lastMessage &&
        Array.isArray(lastMessage.tool_calls) &&
        lastMessage.tool_calls.length
      ) {
        logger.debug('---DECISION: RETRIEVE---', 'AgenticRagService');
        return 'retrieve';
      }
      // If there are no tool calls then we finish.
      return END;
    }

    /**
     * Determines whether the Agent should continue based on the relevance of retrieved documents.
     * This function checks if the last message in the conversation is of type FunctionMessage, indicating
     * that document retrieval has been performed. It then evaluates the relevance of these documents to the user's
     * initial question using a predefined model and output parser. If the documents are relevant, the conversation
     * is considered complete. Otherwise, the retrieval process is continued.
     * @param {typeof GraphState.State} state - The current state of the agent, including all messages.
     * @returns {Promise<Partial<typeof GraphState.State>>} - The updated state with the new message added to the list of messages.
     */
    async function gradeDocuments(
      state: typeof GraphState.State,
    ): Promise<Partial<typeof GraphState.State>> {
      logger.debug('---GET RELEVANCE---', 'AgenticRagService');

      const { messages } = state;
      const tool = {
        name: 'give_relevance_score',
        description: 'Give a relevance score to the retrieved documents.',
        schema: z.object({
          binaryScore: z.string().describe("Relevance score 'yes' or 'no'"),
        }),
      };

      const prompt = ChatPromptTemplate.fromTemplate(
        `You are a grader assessing relevance of retrieved docs to a user question.
    Here are the retrieved docs:
    \n ------- \n
    {context} 
    \n ------- \n
    Here is the user question: {question}
    If the content of the docs are relevant to the users question, score them as relevant.
    Give a binary score 'yes' or 'no' score to indicate whether the docs are relevant to the question.
    Yes: The docs are relevant to the question.
    No: The docs are not relevant to the question.`,
      );

      const model = new ChatOpenAI({
        apiKey: configs.openaiApiKey,
        model: 'gpt-4o',
        temperature: 0,
      }).bindTools([tool], {
        tool_choice: tool.name,
      });

      const chain = prompt.pipe(model);

      const lastMessage = messages[messages.length - 1];

      const score = await chain.invoke({
        question: (messages[0].content as string) || '',
        context: (lastMessage.content as string) || '',
      });

      return {
        messages: [score],
      };
    }

    /**
     * Check the relevance of the previous LLM tool call.
     *
     * @param {typeof GraphState.State} state - The current state of the agent, including all messages.
     * @returns {string} - A directive to either "yes" or "no" based on the relevance of the documents.
     */
    function checkRelevance(state: typeof GraphState.State): string {
      logger.debug('---CHECK RELEVANCE---', 'AgenticRagService');

      const { messages } = state;
      const lastMessage = messages[messages.length - 1];
      if (!('tool_calls' in lastMessage)) {
        throw new Error(
          "The 'checkRelevance' node requires the most recent message to contain tool calls.",
        );
      }
      const toolCalls = (lastMessage as AIMessage).tool_calls;
      if (!toolCalls || !toolCalls.length) {
        throw new Error('Last message was not a function message');
      }

      if (
        (toolCalls[0].args as { binaryScore?: string }).binaryScore === 'yes'
      ) {
        logger.debug('---DECISION: DOCS RELEVANT---', 'AgenticRagService');
        return 'yes';
      }
      logger.debug('---DECISION: DOCS NOT RELEVANT---', 'AgenticRagService');
      return 'no';
    }

    // Nodes

    /**
     * Invokes the agent model to generate a response based on the current state.
     * This function calls the agent model to generate a response to the current conversation state.
     * The response is added to the state's messages.
     * @param {typeof GraphState.State} state - The current state of the agent, including all messages.
     * @returns {Promise<Partial<typeof GraphState.State>>} - The updated state with the new message added to the list of messages.
     */
    async function agent(
      state: typeof GraphState.State,
    ): Promise<Partial<typeof GraphState.State>> {
      logger.debug('---CALL AGENT---', 'AgenticRagService');

      const { messages } = state;
      // Find the AIMessage which contains the `give_relevance_score` tool call,
      // and remove it if it exists. This is because the agent does not need to know
      // the relevance score.
      const filteredMessages = messages.filter((message) => {
        if (
          'tool_calls' in message &&
          Array.isArray(message.tool_calls) &&
          message.tool_calls.length > 0
        ) {
          return (
            (message.tool_calls[0] as { name?: string }).name !==
            'give_relevance_score'
          );
        }
        return true;
      });

      const model = new ChatOpenAI({
        apiKey: configs.openaiApiKey,
        model: 'gpt-4o',
        temperature: 0,
      }).bindTools(tools);

      const response = await model.invoke(filteredMessages);
      return {
        messages: [response],
      };
    }

    /**
     * Transform the query to produce a better question.
     * @param {typeof GraphState.State} state - The current state of the agent, including all messages.
     * @returns {Promise<Partial<typeof GraphState.State>>} - The updated state with the new message added to the list of messages.
     */
    async function rewrite(
      state: typeof GraphState.State,
    ): Promise<Partial<typeof GraphState.State>> {
      logger.debug('---TRANSFORM QUERY---', 'AgenticRagService');

      const { messages } = state;
      const question = messages[0].content as string;
      const prompt = ChatPromptTemplate.fromTemplate(
        `Look at the input and try to reason about the underlying semantic intent / meaning. \n 
  Here is the initial question:
  \n ------- \n
  {question} 
  \n ------- \n
  Formulate an improved question:`,
      );

      // Grader
      const model = new ChatOpenAI({
        apiKey: configs.openaiApiKey,
        model: 'gpt-4o',
        temperature: 0,
      });
      const response = await prompt.pipe(model).invoke({ question });
      return {
        messages: [response],
      };
    }

    /**
     * Generate answer
     * @param {typeof GraphState.State} state - The current state of the agent, including all messages.
     * @returns {Promise<Partial<typeof GraphState.State>>} - The updated state with the new message added to the list of messages.
     */
    async function generate(
      state: typeof GraphState.State,
    ): Promise<Partial<typeof GraphState.State>> {
      logger.debug('---GENERATE---', 'AgenticRagService');

      const { messages } = state;
      const question = messages[0].content as string;
      // Extract the most recent ToolMessage
      const lastToolMessage = messages
        .slice()
        .reverse()
        .find((msg) => msg._getType() === 'tool');
      if (!lastToolMessage) {
        throw new Error('No tool message found in the conversation history');
      }

      const docs = lastToolMessage.content as string;

      const prompt = await pull<ChatPromptTemplate>('rlm/rag-prompt');

      const llm = new ChatOpenAI({
        apiKey: configs.openaiApiKey,
        model: 'gpt-4o',
        temperature: 0,
      });

      const ragChain = prompt.pipe(llm);

      const response = await ragChain.invoke({
        context: docs,
        question,
      });

      return {
        messages: [response],
      };
    }

    // Define the graph
    const workflow = new StateGraph(GraphState)
      // Define the nodes which we'll cycle between.
      .addNode('agent', agent)
      .addNode('retrieve', toolNode)
      .addNode('gradeDocuments', gradeDocuments)
      .addNode('rewrite', rewrite)
      .addNode('generate', generate)
      // Entry point
      .addEdge(START, 'agent')
      // After agent runs, decide to retrieve more info or end
      .addConditionalEdges('agent', shouldRetrieve, {
        retrieve: 'retrieve',
        [END]: END,
      })
      // After retrieve, grade documents
      .addEdge('retrieve', 'gradeDocuments')
      // Based on relevance, either generate final answer or rewrite question
      .addConditionalEdges('gradeDocuments', checkRelevance, {
        yes: 'generate',
        no: 'rewrite',
      })
      // If rewritten, try retrieving again
      .addEdge('rewrite', 'retrieve')
      // After generate, we are done
      .addEdge('generate', END);
    const app = workflow.compile();

    const inputs = {
      messages: [
        ...recentMessages.map((m) => new HumanMessage(m.content)),
        new HumanMessage(userQuery),
      ],
    };

    this.logs.logSafe(
      'AgenticRag inference start',
      { userQuery },
      'AgenticRagService',
    );
    const final = await app.invoke(inputs);
    this.logs.logSafe(
      'AgenticRag inference end',
      {
        lastMessageType:
          final.messages[final.messages.length - 1]?._getType?.(),
      },
      'AgenticRagService',
    );
    const last = final.messages[final.messages.length - 1];
    const text = Array.isArray(last.content)
      ? (last.content as Array<{ text?: string }>)
          .map((c) => c.text || '')
          .join('\n')
      : last.content;
    return String(text);
  }
}
