import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ConfigsService {
  constructor(private configService: ConfigService) {}

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

  getRequiredConfig(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new Error(`Required configuration ${key} is not set`);
    }
    return value;
  }

  // Helper method untuk mendapatkan konfigurasi dengan default value
  getConfigWithDefault<T>(key: string, defaultValue: T): T {
    return this.configService.get<T>(key, defaultValue);
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

  // JWT configuration getters
  get jwtSecret(): string {
    return this.configService.getOrThrow<string>('JWT_SECRET');
  }

  get jwtExpiresIn(): string {
    return this.configService.getOrThrow<string>('JWT_EXPIRES_IN', '86400s');
  }
}
