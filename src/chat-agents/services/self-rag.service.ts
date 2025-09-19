import { Annotation } from '@langchain/langgraph';
import { type DocumentInterface } from '@langchain/core/documents';
import { z } from 'zod';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { pull } from 'langchain/hub';
import { ChatOpenAI } from '@langchain/openai';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { formatDocumentsAsString } from 'langchain/util/document';
import { END, START, StateGraph } from '@langchain/langgraph';
import { Injectable } from '@nestjs/common';
import { VectorStorageFactoryService } from '../../vector-storage/vector-storage-factory.service';
import { LogsService } from '../../logs/logs.service';
import { ConfigsService } from '../../configs/configs.service';

/**
 * Self RAG
 *
 * Reference:
 *   https://langchain-ai.github.io/langgraphjs/tutorials/rag/langgraph_self_rag/
 */
@Injectable()
export class SelfRagService {
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
        default: () => '',
      }),
      generationVQuestionGrade: Annotation<string>({
        reducer: (x, y) => y ?? x,
      }),
      generationVDocumentsGrade: Annotation<string>({
        reducer: (x, y) => y ?? x,
      }),
    });

    // Define the LLM once. We'll reuse it throughout the graph.
    const model = new ChatOpenAI({
      apiKey: this.configsService.openaiApiKey,
      model: 'gpt-4o',
      temperature: 0,
    });

    /**
     * Retrieve documents
     *
     * @param {typeof GraphState.State} state The current state of the graph.
     * @returns {Promise<Partial<typeof GraphState.State>>} The new state object.
     */
    async function retrieve(
      state: typeof GraphState.State,
    ): Promise<Partial<typeof GraphState.State>> {
      logger.debug('---RETRIEVE---', 'SelfRagService');
      logger.logSafe(
        'SelfRag retrieve function start',
        {
          question: state.question,
          knowledgeFileIds,
        },
        'SelfRagService',
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
      const documents = await vectorStore.similaritySearch(
        state.question,
        3,
        filter,
      );

      logger.logSafe(
        'SelfRag retrieve function found documents',
        {
          question: state.question,
          documentsCount: documents.length,
          documentSources: documents.map(
            (doc) =>
              (doc.metadata as Record<string, unknown>)?.source || 'unknown',
          ),
        },
        'SelfRagService',
      );

      return {
        documents,
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
      logger.debug('---GENERATE---', 'SelfRagService');

      // Pull in the prompt
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
      logger.debug('---CHECK RELEVANCE---', 'SelfRagService');
      logger.logSafe(
        'SelfRag gradeDocuments function start',
        {
          question: state.question,
          documentsCount: state.documents.length,
        },
        'SelfRagService',
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
          logger.debug('---GRADE: DOCUMENT RELEVANT---', 'SelfRagService');
          filteredDocs.push(doc);
          relevantCount++;
        } else {
          logger.debug('---GRADE: DOCUMENT NOT RELEVANT---', 'SelfRagService');
          notRelevantCount++;
        }
      }

      logger.logSafe(
        'SelfRag gradeDocuments function end',
        {
          question: state.question,
          originalDocumentsCount: state.documents.length,
          relevantDocumentsCount: relevantCount,
          notRelevantDocumentsCount: notRelevantCount,
          filteredDocumentsCount: filteredDocs.length,
        },
        'SelfRagService',
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
      logger.debug('---TRANSFORM QUERY---', 'SelfRagService');
      logger.logSafe(
        'SelfRag transformQuery function start',
        {
          originalQuestion: state.question,
        },
        'SelfRagService',
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

      // Construct the chain
      const chain = prompt.pipe(model).pipe(new StringOutputParser());
      const betterQuestion = await chain.invoke({ question: state.question });

      logger.logSafe(
        'SelfRag transformQuery function end',
        {
          originalQuestion: state.question,
          transformedQuestion: betterQuestion,
        },
        'SelfRagService',
      );

      return {
        question: betterQuestion,
      };
    }

    /**
     * Determines whether to generate an answer, or re-generate a question.
     *
     * @param {typeof GraphState.State} state The current state of the graph.
     * @returns {"transformQuery" | "generate"} Next node to call
     */
    function decideToGenerate(state: typeof GraphState.State) {
      logger.debug('---DECIDE TO GENERATE---', 'SelfRagService');

      const filteredDocs = state.documents;
      if (filteredDocs.length === 0) {
        // All documents have been filtered checkRelevance
        // We will re-generate a new query
        logger.debug('---DECISION: TRANSFORM QUERY---', 'SelfRagService');
        return 'transformQuery';
      }

      // We have relevant documents, so generate answer
      logger.debug('---DECISION: GENERATE---', 'SelfRagService');
      return 'generate';
    }

    /**
     * Determines whether the generation is grounded in the document.
     *
     * @param {typeof GraphState.State} state The current state of the graph.
     * @param {RunnableConfig | undefined} config The configuration object for tracing.
     * @returns {Promise<Partial<typeof GraphState.State>>} The new state object.
     */
    async function generateGenerationVDocumentsGrade(
      state: typeof GraphState.State,
    ): Promise<Partial<typeof GraphState.State>> {
      logger.debug(
        '---GENERATE GENERATION vs DOCUMENTS GRADE---',
        'SelfRagService',
      );

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
        `You are a grader assessing whether an answer is grounded in / supported by a set of facts.
    Here are the facts:
    \n ------- \n
    {documents} 
    \n ------- \n
    Here is the answer: {generation}
    Give a binary score 'yes' or 'no' to indicate whether the answer is grounded in / supported by a set of facts.`,
      );

      const chain = prompt.pipe(llmWithTool);

      const score = await chain.invoke({
        documents: formatDocumentsAsString(state.documents),
        generation: state.generation,
      });

      return {
        generationVDocumentsGrade: score.binaryScore,
      };
    }

    function gradeGenerationVDocuments(state: typeof GraphState.State) {
      logger.debug('---GRADE GENERATION vs DOCUMENTS---', 'SelfRagService');

      const grade = state.generationVDocumentsGrade;
      if (grade === 'yes') {
        logger.debug(
          '---DECISION: SUPPORTED, MOVE TO FINAL GRADE---',
          'SelfRagService',
        );
        return 'supported';
      }

      logger.debug(
        '---DECISION: NOT SUPPORTED, GENERATE AGAIN---',
        'SelfRagService',
      );
      return 'not supported';
    }

    /**
     * Determines whether the generation addresses the question.
     *
     * @param {typeof GraphState.State} state The current state of the graph.
     * @param {RunnableConfig | undefined} config The configuration object for tracing.
     * @returns {Promise<Partial<typeof GraphState.State>>} The new state object.
     */
    async function generateGenerationVQuestionGrade(
      state: typeof GraphState.State,
    ): Promise<Partial<typeof GraphState.State>> {
      logger.debug(
        '---GENERATE GENERATION vs QUESTION GRADE---',
        'SelfRagService',
      );

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
        `You are a grader assessing whether an answer is useful to resolve a question.
    Here is the answer:
    \n ------- \n
    {generation} 
    \n ------- \n
    Here is the question: {question}
    Give a binary score 'yes' or 'no' to indicate whether the answer is useful to resolve a question.`,
      );

      const chain = prompt.pipe(llmWithTool);

      const score = await chain.invoke({
        question: state.question,
        generation: state.generation,
      });

      return {
        generationVQuestionGrade: score.binaryScore,
      };
    }

    function gradeGenerationVQuestion(state: typeof GraphState.State) {
      logger.debug('---GRADE GENERATION vs QUESTION---', 'SelfRagService');

      const grade = state.generationVQuestionGrade;
      if (grade === 'yes') {
        logger.debug('---DECISION: USEFUL---', 'SelfRagService');
        return 'useful';
      }

      logger.debug('---DECISION: NOT USEFUL---', 'SelfRagService');
      return 'not useful';
    }

    const workflow = new StateGraph(GraphState)
      // Define the nodes
      .addNode('retrieve', retrieve)
      .addNode('gradeDocuments', gradeDocuments)
      .addNode('generate', generate)
      .addNode(
        'generateGenerationVDocumentsGrade',
        generateGenerationVDocumentsGrade,
      )
      .addNode('transformQuery', transformQuery)
      .addNode(
        'generateGenerationVQuestionGrade',
        generateGenerationVQuestionGrade,
      );

    // Build graph
    workflow.addEdge(START, 'retrieve');
    workflow.addEdge('retrieve', 'gradeDocuments');
    workflow.addConditionalEdges('gradeDocuments', decideToGenerate, {
      transformQuery: 'transformQuery',
      generate: 'generate',
    });
    workflow.addEdge('transformQuery', 'retrieve');
    workflow.addEdge('generate', 'generateGenerationVDocumentsGrade');
    workflow.addConditionalEdges(
      'generateGenerationVDocumentsGrade',
      gradeGenerationVDocuments,
      {
        supported: 'generateGenerationVQuestionGrade',
        'not supported': 'generate',
      },
    );

    workflow.addConditionalEdges(
      'generateGenerationVQuestionGrade',
      gradeGenerationVQuestion,
      {
        useful: END,
        'not useful': 'transformQuery',
      },
    );

    // Compile
    const app = workflow.compile();
    logger.logSafe('SelfRag inference start', { userQuery }, 'SelfRagService');
    const final = await app.invoke({ question: userQuery });
    logger.logSafe(
      'SelfRag inference end',
      { hasGeneration: !!final.generation },
      'SelfRagService',
    );
    return String(final.generation ?? '');
  }
}
