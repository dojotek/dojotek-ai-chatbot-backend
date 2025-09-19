import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { CachesService } from '../../caches/caches.service';
import { ConfigsService } from '../../configs/configs.service';
import { LogsService } from '../../logs/logs.service';
import type { IStorageService } from '../../storage/storage.interface';
import { STORAGE_SERVICE } from '../../storage/constants';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { QdrantVectorStore } from '@langchain/qdrant';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Document } from '@langchain/core/documents';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { DocxLoader } from '@langchain/community/document_loaders/fs/docx';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { randomUUID } from 'crypto';
import * as fs from 'fs-extra';
import * as path from 'path';

interface VectorizeJobData {
  knowledgeFileId: string;
  storageKey: string;
}

@Injectable()
@Processor('knowledge-files/vectorize')
export class VectorizeKnowledgeFileConsumer extends WorkerHost {
  private readonly lockKeyPrefix = 'knowledge-files:vectorize-lock:';
  private readonly lockExpiry = 60 * 60; // 1 hour in seconds

  constructor(
    private prisma: PrismaService,
    private cachesService: CachesService,
    private configsService: ConfigsService,
    private logsService: LogsService,

    @Inject(STORAGE_SERVICE)
    private storageService: IStorageService,
  ) {
    super();
  }

  async process(job: Job<VectorizeJobData>): Promise<void> {
    const { knowledgeFileId, storageKey } = job.data;
    const jobId = job.id || randomUUID();
    const lockKey = `${this.lockKeyPrefix}${knowledgeFileId}`;

    this.logsService.log(
      `Starting vectorization for knowledge file: ${knowledgeFileId}`,
      VectorizeKnowledgeFileConsumer.name,
    );

    try {
      // Acquire lock to prevent duplicate processing
      const lockAcquired = await this.acquireLock(lockKey, jobId);
      if (!lockAcquired) {
        this.logsService.warn(
          `Lock not acquired for knowledge file: ${knowledgeFileId}`,
          VectorizeKnowledgeFileConsumer.name,
        );
        return;
      }

      // Get knowledge file from database
      const knowledgeFile = await this.prisma.knowledgeFile.findUnique({
        where: { id: knowledgeFileId },
        include: { knowledge: true },
      });

      if (!knowledgeFile) {
        this.logsService.error(
          `Knowledge file not found: ${knowledgeFileId}`,
          undefined,
          VectorizeKnowledgeFileConsumer.name,
        );
        return;
      }

      // Check if status is still pending
      if (knowledgeFile.status !== 'pending') {
        this.logsService.warn(
          `Knowledge file ${knowledgeFileId} has status ${knowledgeFile.status}, skipping processing`,
          VectorizeKnowledgeFileConsumer.name,
        );
        return;
      }

      // Update status to processing
      await this.updateKnowledgeFileStatus(knowledgeFileId, 'processing');

      // Create local temporary directory
      const tempDir = path.join(
        '/tmp/dojotek-ai-chatbot/knowledge-files',
        knowledgeFileId,
        jobId,
      );
      await fs.ensureDir(tempDir);

      try {
        // Download file from storage
        const localFilePath = await this.downloadFile(
          storageKey,
          tempDir,
          knowledgeFile.fileName,
        );

        // Load documents using LangChain loaders
        const documents = await this.loadDocumentsFromFile(
          localFilePath,
          knowledgeFile,
        );

        if (!documents || documents.length === 0) {
          throw new Error('No documents loaded from file');
        }

        // Split documents into chunks
        const chunks = await this.splitDocumentsIntoChunks(documents);

        // Store chunks in Qdrant
        await this.storeDocumentsInQdrant(chunks, knowledgeFile);

        // Update status to processed
        await this.updateKnowledgeFileStatus(knowledgeFileId, 'processed');
        await this.updateKnowledgeFileActiveStatus(knowledgeFileId, true);

        this.logsService.log(
          `Successfully vectorized knowledge file: ${knowledgeFileId}`,
          VectorizeKnowledgeFileConsumer.name,
        );
      } catch (error) {
        this.logsService.error(
          `Error processing file ${knowledgeFileId}: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error.stack : undefined,
          VectorizeKnowledgeFileConsumer.name,
        );
        await this.updateKnowledgeFileStatus(knowledgeFileId, 'failed');
        throw error;
      } finally {
        // Clean up temporary files
        try {
          await fs.remove(tempDir);
        } catch (cleanupError) {
          this.logsService.warn(
            `Failed to clean up temp directory: ${tempDir}: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`,
            VectorizeKnowledgeFileConsumer.name,
          );
        }
      }
    } finally {
      // Always release the lock
      await this.releaseLock(lockKey, jobId);
    }
  }

  private async acquireLock(lockKey: string, jobId: string): Promise<boolean> {
    try {
      // Use Redis SET with NX (only if not exists) and EX (expiry)
      const result = await this.cachesService
        .getClient()
        .set(lockKey, jobId, 'EX', this.lockExpiry, 'NX');
      return result === 'OK';
    } catch (error) {
      this.logsService.error(
        `Failed to acquire lock ${lockKey}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        VectorizeKnowledgeFileConsumer.name,
      );
      return false;
    }
  }

  private async releaseLock(lockKey: string, jobId: string): Promise<void> {
    try {
      // Check if the lock value matches our job ID before deleting
      const currentValue = await this.cachesService.getClient().get(lockKey);
      if (currentValue === jobId) {
        await this.cachesService.getClient().del(lockKey);
      }
    } catch (error) {
      this.logsService.error(
        `Failed to release lock ${lockKey}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        VectorizeKnowledgeFileConsumer.name,
      );
    }
  }

  private async updateKnowledgeFileStatus(
    knowledgeFileId: string,
    status: string,
  ): Promise<void> {
    await this.prisma.knowledgeFile.update({
      where: { id: knowledgeFileId },
      data: { status },
    });

    // Invalidate cache
    const cacheKey = `${this.configsService.cachePrefixKnowledgeFiles}:findOne:id:${knowledgeFileId}`;
    await this.cachesService.del(cacheKey);
  }

  private async updateKnowledgeFileActiveStatus(
    knowledgeFileId: string,
    isActive: boolean,
  ): Promise<void> {
    await this.prisma.knowledgeFile.update({
      where: { id: knowledgeFileId },
      data: { isActive },
    });

    // Invalidate cache
    const cacheKey = `${this.configsService.cachePrefixKnowledgeFiles}:findOne:id:${knowledgeFileId}`;
    await this.cachesService.del(cacheKey);
  }

  private async downloadFile(
    storageKey: string,
    tempDir: string,
    fileName: string,
  ): Promise<string> {
    const localFilePath = path.join(tempDir, fileName);
    const fileStream = await this.storageService.getObjectStream({
      key: storageKey,
    });

    return new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(localFilePath);

      fileStream.pipe(writeStream);

      fileStream.on('error', reject);
      writeStream.on('error', reject);
      writeStream.on('finish', () => resolve(localFilePath));
    });
  }

  private async loadDocumentsFromFile(
    filePath: string,
    knowledgeFile: {
      id: string;
      knowledgeId: string;
      fileName: string;
      fileType: string;
    },
  ): Promise<Document[]> {
    const extension = path.extname(filePath).toLowerCase();

    try {
      let loader: TextLoader | PDFLoader | DocxLoader;
      let documents: Document[] = [];

      switch (extension) {
        case '.txt':
          loader = new TextLoader(filePath);
          documents = await loader.load();
          break;

        case '.pdf':
          loader = new PDFLoader(filePath);
          documents = await loader.load();
          break;

        case '.docx':
          loader = new DocxLoader(filePath);
          documents = await loader.load();
          break;

        case '.doc':
          loader = new DocxLoader(filePath);
          documents = await loader.load();
          break;

        default:
          throw new Error(`Unsupported file type: ${extension}`);
      }

      // Add metadata to each document
      documents = documents.map((doc, index) => {
        return new Document({
          pageContent: doc.pageContent,
          metadata: {
            ...doc.metadata,
            knowledgeFileId: knowledgeFile.id,
            knowledgeId: knowledgeFile.knowledgeId,
            fileName: knowledgeFile.fileName,
            fileType: knowledgeFile.fileType,
            source: `${knowledgeFile.fileName}#page-${index}`,
            documentIndex: index,
          },
        });
      });

      return documents;
    } catch (error) {
      this.logsService.error(
        `Failed to load documents from ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        VectorizeKnowledgeFileConsumer.name,
      );
      throw new Error(
        `Failed to load documents from file: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async splitDocumentsIntoChunks(
    documents: Document[],
  ): Promise<Document[]> {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ['\n\n', '\n', '. ', '? ', '! ', ' ', ''],
    });

    const allChunks: Document[] = [];

    for (const doc of documents) {
      const chunks = await splitter.splitDocuments([doc]);

      // Add chunk-specific metadata
      const chunksWithMetadata = chunks.map((chunk, index) => {
        return new Document({
          pageContent: chunk.pageContent,
          metadata: {
            ...chunk.metadata,
            chunkIndex: index,
            source: `${chunk.metadata.fileName}#doc-${chunk.metadata.documentIndex}-chunk-${index}`,
          },
        });
      });

      allChunks.push(
        ...chunksWithMetadata.filter(
          (chunk) => chunk.pageContent.trim().length > 0,
        ),
      );
    }

    return allChunks;
  }

  private async storeDocumentsInQdrant(
    documents: Document[],
    knowledgeFile: { knowledgeId: string },
  ): Promise<void> {
    try {
      // Initialize OpenAI embeddings
      const embeddings = new OpenAIEmbeddings({
        openAIApiKey: this.configsService.openaiApiKey,
        modelName: this.configsService.vectorModel,
      });

      // Create collection name based on knowledge
      const collectionName = `knowledge_${knowledgeFile.knowledgeId.replace(/-/g, '_')}`;

      // Create vector store instance using fromDocuments
      await QdrantVectorStore.fromDocuments(documents, embeddings, {
        url: this.configsService.qdrantDatabaseUrl,
        collectionName,
        collectionConfig: {
          vectors: {
            size: 1536, // OpenAI text-embedding-3-small dimension
            distance: 'Cosine',
          },
        },
      });

      this.logsService.log(
        `Stored ${documents.length} document chunks in Qdrant collection: ${collectionName}`,
        VectorizeKnowledgeFileConsumer.name,
      );
    } catch (error) {
      this.logsService.error(
        `Failed to store documents in Qdrant: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        VectorizeKnowledgeFileConsumer.name,
      );
      throw new Error(
        `Failed to store documents in Qdrant: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
