import { QdrantVectorStore } from '@langchain/qdrant';
import { ConfigsService } from '../configs/configs.service';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Injectable } from '@nestjs/common';

@Injectable()
export class VectorStorageFactoryService {
  constructor(private readonly configsService: ConfigsService) {}

  createClient(knowledgeId: string) {
    let vectorEmbedding;

    switch (this.configsService.vectorProvider) {
      case 'openai':
        vectorEmbedding = new OpenAIEmbeddings({
          openAIApiKey: this.configsService.openaiApiKey,
          modelName: this.configsService.vectorModel,
        });
        break;
      default:
        throw new Error(
          `Unsupported vector provider: ${this.configsService.vectorProvider}`,
        );
    }

    switch (this.configsService.vectorDatabase) {
      case 'qdrant':
        return new QdrantVectorStore(vectorEmbedding, {
          url: this.configsService.qdrantDatabaseUrl,
          collectionName: `knowledge_${knowledgeId.replace(/-/g, '_')}`,
        });
      default:
        throw new Error(
          `Unsupported vector database: ${this.configsService.vectorDatabase}`,
        );
    }
  }
}
