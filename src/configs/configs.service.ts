import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ConfigsService {
  constructor(private configService: ConfigService) {}

  getRequiredConfig(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new Error(`Required configuration ${key} is not set`);
    }
    return value;
  }

  // Helper method to get configuration with default value
  getConfigWithDefault<T>(key: string, defaultValue: T): T {
    return this.configService.get<T>(key, defaultValue);
  }

  get openaiApiKey(): string {
    return this.configService.get<string>('OPENAI_API_KEY', '');
  }

  get anthropicApiKey(): string {
    return this.configService.get<string>('ANTHROPIC_API_KEY', '');
  }

  get storageProvider(): string {
    return this.configService.get<string>('STORAGE_PROVIDER', 's3');
  }

  get awsRegion(): string {
    return this.configService.get<string>('AWS_REGION', '');
  }

  get awsAccessKeyId(): string {
    return this.configService.get<string>('AWS_ACCESS_KEY_ID', '');
  }

  get awsSecretAccessKey(): string {
    return this.configService.get<string>('AWS_SECRET_ACCESS_KEY', '');
  }

  get s3BucketName(): string {
    return this.configService.get<string>('S3_BUCKET_NAME', '');
  }

  get vectorProvider(): string {
    return this.configService.get<string>('VECTOR_PROVIDER', 'openai');
  }

  get vectorModel(): string {
    return this.configService.get<string>(
      'VECTOR_MODEL',
      'text-embedding-3-small',
    );
  }

  get vectorDatabase(): string {
    return this.configService.get<string>('VECTOR_DATABASE', 'qdrant');
  }

  get qdrantDatabaseUrl(): string {
    return this.configService.get<string>('QDRANT_DATABASE_URL', '');
  }

  get port(): number {
    return this.configService.get<number>('PORT', 3000);
  }

  get nodeEnv(): string {
    return this.configService.get<string>('NODE_ENV', 'development');
  }

  get logLevel(): string {
    return this.configService.get<string>('LOG_LEVEL', 'info');
  }

  get messageQueueValkeyHost(): string {
    return this.configService.getOrThrow<string>('MESSAGE_QUEUE_VALKEY_HOST');
  }

  get messageQueueValkeyPort(): number {
    return this.configService.get<number>('MESSAGE_QUEUE_VALKEY_PORT', 6380);
  }

  get cacheValkeyHost(): string {
    return this.configService.getOrThrow<string>('CACHE_VALKEY_HOST');
  }

  get cacheValkeyPort(): number {
    return this.configService.get<number>('CACHE_VALKEY_PORT', 6379);
  }

  // Cache configuration getters
  get cachePrefixUsers(): string {
    return this.configService.get<string>('CACHE_PREFIX_USERS', 'users');
  }

  get cacheTtlUsers(): number {
    return this.configService.get<number>('CACHE_TTL_USERS', 3600);
  }

  get cachePrefixRoles(): string {
    return this.configService.get<string>('CACHE_PREFIX_ROLES', 'roles');
  }

  get cacheTtlRoles(): number {
    return this.configService.get<number>('CACHE_TTL_ROLES', 3600);
  }

  get cachePrefixKnowledges(): string {
    return this.configService.get<string>(
      'CACHE_PREFIX_KNOWLEDGES',
      'knowledges',
    );
  }

  get cacheTtlKnowledges(): number {
    return this.configService.get<number>('CACHE_TTL_KNOWLEDGES', 3600);
  }

  get cachePrefixKnowledgeFiles(): string {
    return this.configService.get<string>(
      'CACHE_PREFIX_KNOWLEDGE_FILES',
      'knowledge-files',
    );
  }

  get cacheTtlKnowledgeFiles(): number {
    return this.configService.get<number>('CACHE_TTL_KNOWLEDGE_FILES', 3600);
  }

  get cachePrefixCustomers(): string {
    return this.configService.get<string>(
      'CACHE_PREFIX_CUSTOMERS',
      'customers',
    );
  }

  get cacheTtlCustomers(): number {
    return this.configService.get<number>('CACHE_TTL_CUSTOMERS', 3600);
  }

  get cachePrefixCustomerStaffs(): string {
    return this.configService.get<string>(
      'CACHE_PREFIX_CUSTOMER_STAFFS',
      'customer-staffs',
    );
  }

  get cacheTtlCustomerStaffs(): number {
    return this.configService.get<number>('CACHE_TTL_CUSTOMER_STAFFS', 3600);
  }

  get cachePrefixChatAgents(): string {
    return this.configService.get<string>(
      'CACHE_PREFIX_CHAT_AGENTS',
      'chat-agents',
    );
  }

  get cacheTtlChatAgents(): number {
    return this.configService.get<number>('CACHE_TTL_CHAT_AGENTS', 3600);
  }

  get cachePrefixChatSessions(): string {
    return this.configService.get<string>(
      'CACHE_PREFIX_CHAT_SESSIONS',
      'chat-sessions',
    );
  }

  get cacheTtlChatSessions(): number {
    return this.configService.get<number>('CACHE_TTL_CHAT_SESSIONS', 3600);
  }

  get cachePrefixChatMessages(): string {
    return this.configService.get<string>(
      'CACHE_PREFIX_CHAT_MESSAGES',
      'chat-messages',
    );
  }
  get cacheTtlChatMessages(): number {
    return this.configService.get<number>('CACHE_TTL_CHAT_MESSAGES', 3600);
  }

  get cachePrefixChatAgentKnowledges(): string {
    return this.configService.get<string>(
      'CACHE_PREFIX_CHAT_AGENT_KNOWLEDGES',
      'chat-agent-knowledges',
    );
  }

  get cacheTtlChatAgentKnowledges(): number {
    return this.configService.get<number>(
      'CACHE_TTL_CHAT_AGENT_KNOWLEDGES',
      3600,
    );
  }

  // Inbound chat deduplication TTL getters
  get inboundChatDeduplicationTtlSample(): number {
    return this.configService.get<number>(
      'INBOUND_CHAT_DEDUPLICATION_TTL_SAMPLE',
      300,
    );
  }

  get inboundChatDeduplicationTtlSlack(): number {
    return this.configService.get<number>(
      'INBOUND_CHAT_DEDUPLICATION_TTL_SLACK',
      300,
    );
  }

  get inboundChatDeduplicationTtlLark(): number {
    return this.configService.get<number>(
      'INBOUND_CHAT_DEDUPLICATION_TTL_LARK',
      300,
    );
  }

  // Inbound chat session TTL getters
  get inboundChatSessionTtlSample(): number {
    return this.configService.get<number>(
      'INBOUND_CHAT_SESSION_TTL_SAMPLE',
      3600,
    );
  }

  get inboundChatSessionTtlSlack(): number {
    return this.configService.get<number>(
      'INBOUND_CHAT_SESSION_TTL_SLACK',
      3600,
    );
  }

  get inboundChatSessionTtlLark(): number {
    return this.configService.get<number>(
      'INBOUND_CHAT_SESSION_TTL_LARK',
      3600,
    );
  }

  // JWT configuration getters
  get jwtSecret(): string {
    return this.configService.getOrThrow<string>('JWT_SECRET');
  }

  get jwtExpiresIn(): string {
    return this.configService.getOrThrow<string>('JWT_EXPIRES_IN', '86400s');
  }

  // Settings cache configuration getters
  get cachePrefixSettings(): string {
    return this.configService.get<string>('CACHE_PREFIX_SETTINGS', 'settings');
  }

  get cacheTtlSettings(): number {
    return this.configService.get<number>('CACHE_TTL_SETTINGS', 3600);
  }

  // Infisical configuration getters
  get infisicalSiteUrl(): string {
    return this.configService.get<string>(
      'INFISICAL_SITE_URL',
      'https://app.infisical.com',
    );
  }

  get infisicalClientId(): string {
    return this.configService.get<string>('INFISICAL_CLIENT_ID', '');
  }

  get infisicalClientSecret(): string {
    return this.configService.get<string>('INFISICAL_CLIENT_SECRET', '');
  }

  get infisicalEnvironment(): string {
    return this.configService.get<string>('INFISICAL_ENVIRONMENT', 'dev');
  }

  get infisicalProjectId(): string {
    return this.configService.get<string>('INFISICAL_PROJECT_ID', '');
  }

  // Default path for model provider secrets in Infisical
  get infisicalModelProviderSecretsPath(): string {
    return this.configService.get<string>(
      'INFISICAL_MODEL_PROVIDER_SECRETS_PATH',
      '/MODEL_PROVIDER_SECRETS',
    );
  }
}
