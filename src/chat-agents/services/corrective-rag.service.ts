import { Annotation } from '@langchain/langgraph';
import { DocumentInterface } from '@langchain/core/documents';
import { Document } from '@langchain/core/documents';
import { z } from 'zod';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { pull } from 'langchain/hub';
import { ChatOpenAI } from '@langchain/openai';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { formatDocumentsAsString } from 'langchain/util/document';
import { END, START, StateGraph } from '@langchain/langgraph';
import { VectorStorageFactoryService } from '../../vector-storage/vector-storage-factory.service';
import { Injectable } from '@nestjs/common';
import { LogsService } from '../../logs/logs.service';

/**
 * Corrective RAG
 *
 * Reference:
 *   https://langchain-ai.github.io/langgraphjs/tutorials/rag/langgraph_crag/
 */
@Injectable()
export class CorrectiveRagService {
  constructor(
    private readonly vectorStorageFactory: VectorStorageFactoryService,
    private readonly logs: LogsService,
  ) {}

  async runInference(params: {
    knowledgeId: string;
    knowledgeFileIds: string[];
    recentMessages: Array<{ role: 'user' | 'ai' | 'system'; content: string }>;
    userQuery: string;
  }): Promise<string> {
    const { knowledgeId, knowledgeFileIds, userQuery } = params;
    const logger = this.logs;
    const vectorStore = this.vectorStorageFactory.createClient(knowledgeId);

    // Represents the state of our graph.
    const GraphState = Annotation.Root({
      documents: Annotation<DocumentInterface[]>({
        reducer: (x, y) => y ?? x ?? [],
      }),
      question: Annotation<string>({
        reducer: (x, y) => y ?? x ?? '',
      }),
      generation: Annotation<string>({
        reducer: (x, y) => y ?? x,
      }),
    });

    // Define the LLM once. We'll reuse it throughout the graph.
    const model = new ChatOpenAI({
      model: 'gpt-4o',
      temperature: 0,
    });

    /**
     * Retrieve documents
     *
     * @param {typeof GraphState.State} state The current state of the graph.
     * @param {RunnableConfig | undefined} config The configuration object for tracing.
     * @returns {Promise<Partial<typeof GraphState.State>>} The new state object.
     */
    async function retrieve(
      state: typeof GraphState.State,
    ): Promise<Partial<typeof GraphState.State>> {
      logger.debug('---RETRIEVE---', 'CorrectiveRagService');
      logger.logSafe(
        'CorrectiveRag retrieve function start',
        {
          question: state.question,
          knowledgeFileIds,
        },
        'CorrectiveRagService',
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
        state.question,
        3,
        filter,
      );

      logger.logSafe(
        'CorrectiveRag retrieve function found documents',
        {
          question: state.question,
          documentsCount: docs.length,
          documentSources: docs.map(
            (doc) =>
              (doc.metadata as Record<string, unknown>)?.source || 'unknown',
          ),
        },
        'CorrectiveRagService',
      );

      return {
        documents: docs,
      };
    }

    /**
     * Generate answer
     *
     * @param {typeof GraphState.State} state The current state of the graph.
     * @param {RunnableConfig | undefined} config The configuration object for tracing.
     * @returns {Promise<Partial<typeof GraphState.State>>} The new state object.
     */
    async function generate(
      state: typeof GraphState.State,
    ): Promise<Partial<typeof GraphState.State>> {
      logger.debug('---GENERATE---', 'CorrectiveRagService');

      const prompt = await pull<ChatPromptTemplate>('rlm/rag-prompt');
      // Construct the RAG chain by piping the prompt, model, and output parser
      const ragChain = prompt.pipe(model).pipe(new StringOutputParser());

      const generation = await ragChain.invoke({
        context: formatDocumentsAsString(state.documents),
        question: state.question,
      });

      return {
        generation,
      };
    }

    /**
     * Determines whether the retrieved documents are relevant to the question.
     *
     * @param {typeof GraphState.State} state The current state of the graph.
     * @param {RunnableConfig | undefined} config The configuration object for tracing.
     * @returns {Promise<Partial<typeof GraphState.State>>} The new state object.
     */
    async function gradeDocuments(
      state: typeof GraphState.State,
    ): Promise<Partial<typeof GraphState.State>> {
      logger.debug('---CHECK RELEVANCE---', 'CorrectiveRagService');
      logger.logSafe(
        'CorrectiveRag gradeDocuments function start',
        {
          question: state.question,
          documentsCount: state.documents.length,
        },
        'CorrectiveRagService',
      );

      // pass the name & schema to `withStructuredOutput` which will force the model to call this tool.
      const llmWithTool = model.withStructuredOutput(
        z
          .object({
            binaryScore: z
              .enum(['yes', 'no'])
              .describe("Relevance score 'yes' or 'no'"),
          })
          .describe(
            "Grade the relevance of the retrieved documents to the question. Either 'yes' or 'no'.",
          ),
        {
          name: 'grade',
        },
      );

      const prompt = ChatPromptTemplate.fromTemplate(
        `You are a grader assessing relevance of a retrieved document to a user question.
    Here is the retrieved document:
  
    {context}
  
    Here is the user question: {question}
  
    If the document contains keyword(s) or semantic meaning related to the user question, grade it as relevant.
    Give a binary score 'yes' or 'no' score to indicate whether the document is relevant to the question.`,
      );

      // Chain
      const chain = prompt.pipe(llmWithTool);

      const filteredDocs: Array<DocumentInterface> = [];
      let relevantCount = 0;
      let notRelevantCount = 0;

      for (const doc of state.documents) {
        const grade = await chain.invoke({
          context: doc.pageContent,
          question: state.question,
        });
        if (grade.binaryScore === 'yes') {
          logger.debug(
            '---GRADE: DOCUMENT RELEVANT---',
            'CorrectiveRagService',
          );
          filteredDocs.push(doc);
          relevantCount++;
        } else {
          logger.debug(
            '---GRADE: DOCUMENT NOT RELEVANT---',
            'CorrectiveRagService',
          );
          notRelevantCount++;
        }
      }

      logger.logSafe(
        'CorrectiveRag gradeDocuments function end',
        {
          question: state.question,
          originalDocumentsCount: state.documents.length,
          relevantDocumentsCount: relevantCount,
          notRelevantDocumentsCount: notRelevantCount,
          filteredDocumentsCount: filteredDocs.length,
        },
        'CorrectiveRagService',
      );

      return {
        documents: filteredDocs,
      };
    }

    /**
     * Transform the query to produce a better question.
     *
     * @param {typeof GraphState.State} state The current state of the graph.
     * @param {RunnableConfig | undefined} config The configuration object for tracing.
     * @returns {Promise<Partial<typeof GraphState.State>>} The new state object.
     */
    async function transformQuery(
      state: typeof GraphState.State,
    ): Promise<Partial<typeof GraphState.State>> {
      logger.debug('---TRANSFORM QUERY---', 'CorrectiveRagService');
      logger.logSafe(
        'CorrectiveRag transformQuery function start',
        {
          originalQuestion: state.question,
        },
        'CorrectiveRagService',
      );

      // Pull in the prompt
      const prompt = ChatPromptTemplate.fromTemplate(
        `You are generating a question that is well optimized for semantic search retrieval.
    Look at the input and try to reason about the underlying sematic intent / meaning.
    Here is the initial question:
    \n ------- \n
    {question} 
    \n ------- \n
    Formulate an improved question: `,
      );

      // Prompt
      const chain = prompt.pipe(model).pipe(new StringOutputParser());
      const betterQuestion = await chain.invoke({ question: state.question });

      logger.logSafe(
        'CorrectiveRag transformQuery function end',
        {
          originalQuestion: state.question,
          transformedQuestion: betterQuestion,
        },
        'CorrectiveRagService',
      );

      return {
        question: betterQuestion,
      };
    }

    /**
     * Web search based on the re-phrased question using Tavily API.
     *
     * @param {typeof GraphState.State} state The current state of the graph.
     * @param {RunnableConfig | undefined} config The configuration object for tracing.
     * @returns {Promise<Partial<typeof GraphState.State>>} The new state object.
     */
    function webSearch(
      state: typeof GraphState.State,
    ): Partial<typeof GraphState.State> {
      logger.debug('---WEB SEARCH---', 'CorrectiveRagService');
      logger.logSafe(
        'CorrectiveRag webSearch function start',
        {
          question: state.question,
          documentsCount: state.documents.length,
        },
        'CorrectiveRagService',
      );

      // Placeholder web search disabled; return same documents (no-op)
      const webResults = new Document({ pageContent: '' });
      const newDocuments = state.documents.concat(webResults);

      logger.logSafe(
        'CorrectiveRag webSearch function end',
        {
          question: state.question,
          originalDocumentsCount: state.documents.length,
          newDocumentsCount: newDocuments.length,
          webResultsAdded: 1,
        },
        'CorrectiveRagService',
      );

      return {
        documents: newDocuments,
      };
    }

    /**
     * Determines whether to generate an answer, or re-generate a question.
     *
     * @param {typeof GraphState.State} state The current state of the graph.
     * @returns {"transformQuery" | "generate"} Next node to call
     */
    function decideToGenerate(state: typeof GraphState.State) {
      logger.debug('---DECIDE TO GENERATE---', 'CorrectiveRagService');

      const filteredDocs = state.documents;
      if (filteredDocs.length === 0) {
        // All documents have been filtered checkRelevance
        // We will re-generate a new query
        logger.debug('---DECISION: TRANSFORM QUERY---', 'CorrectiveRagService');
        return 'transformQuery';
      }

      // We have relevant documents, so generate answer
      logger.debug('---DECISION: GENERATE---', 'CorrectiveRagService');
      return 'generate';
    }

    const workflow = new StateGraph(GraphState)
      // Define the nodes
      .addNode('retrieve', retrieve)
      .addNode('gradeDocuments', gradeDocuments)
      .addNode('generate', generate)
      .addNode('transformQuery', transformQuery)
      .addNode('webSearch', webSearch);

    // Build graph
    workflow.addEdge(START, 'retrieve');
    workflow.addEdge('retrieve', 'gradeDocuments');
    workflow.addConditionalEdges('gradeDocuments', decideToGenerate);
    workflow.addEdge('transformQuery', 'webSearch');
    workflow.addEdge('webSearch', 'generate');
    workflow.addEdge('generate', END);

    // Compile
    const app = workflow.compile();
    this.logs.logSafe(
      'CorrectiveRag inference start',
      { userQuery },
      'CorrectiveRagService',
    );

    const inputs = {
      question: userQuery,
    };
    const final = await app.invoke(inputs, { recursionLimit: 50 });
    const finalState = final as { generation?: string };
    this.logs.logSafe(
      'CorrectiveRag inference end',
      { hasGeneration: !!finalState.generation },
      'CorrectiveRagService',
    );
    return String(finalState.generation ?? '');
  }
}
