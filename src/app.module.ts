import { Module } from '@nestjs/common';

import { ConfigModule } from '@nestjs/config';
import { OpenTelemetryModule } from 'nestjs-otel';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { LogsModule } from './logs/logs.module';
import { CachesModule } from './caches/caches.module';
import { BullModule } from '@nestjs/bullmq';
import { SeedersModule } from './seeders/seeders.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';

import { ConfigsModule } from './configs/configs.module';
import { ConfigsService } from './configs/configs.service';

import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { InboundsModule } from './inbounds/inbounds.module';
import { OutboundsModule } from './outbounds/outbounds.module';
import { KnowledgesModule } from './knowledges/knowledges.module';
import { KnowledgeFilesModule } from './knowledge-files/knowledge-files.module';
import { CustomersModule } from './customers/customers.module';

// Function to sanitize sensitive headers
function sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
  const sanitized = { ...headers };
  const sensitiveHeaders = [
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token',
  ];

  sensitiveHeaders.forEach((header) => {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
    // Also check for case variations
    const upperHeader = header.toUpperCase();
    if (sanitized[upperHeader]) {
      sanitized[upperHeader] = '[REDACTED]';
    }
  });

  return sanitized;
}

// Type guards for request and response objects
function isRequestObject(obj: unknown): obj is Record<string, unknown> {
  return typeof obj === 'object' && obj !== null;
}

function isResponseObject(obj: unknown): obj is Record<string, unknown> {
  return typeof obj === 'object' && obj !== null;
}

// Safe property accessors
function getStringProperty(obj: Record<string, unknown>, key: string): string {
  const value = obj[key];
  return typeof value === 'string' ? value : 'unknown';
}

function getNumberProperty(obj: Record<string, unknown>, key: string): number {
  const value = obj[key];
  return typeof value === 'number' ? value : 0;
}

function getHeadersProperty(
  obj: Record<string, unknown>,
  key: string,
): Record<string, any> {
  const value = obj[key];
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['env_files/development.env', '.env'],
      expandVariables: true,
    }),

    PinoLoggerModule.forRootAsync({
      imports: [ConfigsModule],
      useFactory: (configsService: ConfigsService) => ({
        pinoHttp: {
          level: configsService.logLevel,
          // Disable pino-pretty in production for Fluent Bit compatibility
          transport:
            configsService.nodeEnv === 'development'
              ? {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    singleLine: false,
                    translateTime: 'yyyy-mm-dd HH:MM:ss',
                    ignore: 'pid,hostname',
                  },
                }
              : undefined,
          formatters: {
            level: (label) => {
              return { level: label };
            },
          },
          // Use proper timestamp format for Fluent Bit + Loki
          timestamp: () => `,"@timestamp":"${new Date().toISOString()}"`,
          serializers: {
            req: (req: unknown) => {
              if (!isRequestObject(req)) {
                return {
                  method: 'unknown',
                  url: 'unknown',
                  headers: {},
                  remoteAddress: 'unknown',
                  remotePort: 0,
                };
              }
              return {
                method: getStringProperty(req, 'method'),
                url: getStringProperty(req, 'url'),
                headers: sanitizeHeaders(getHeadersProperty(req, 'headers')),
                remoteAddress: getStringProperty(req, 'remoteAddress'),
                remotePort: getNumberProperty(req, 'remotePort'),
              };
            },
            res: (res: unknown) => {
              if (!isResponseObject(res)) {
                return {
                  statusCode: 0,
                  headers: {},
                };
              }
              return {
                statusCode: getNumberProperty(res, 'statusCode'),
                headers: sanitizeHeaders(getHeadersProperty(res, 'headers')),
              };
            },
          },
          // Add additional fields for better Loki indexing
          base: {
            service: 'dojotek-ai-chatbot',
            environment: configsService.nodeEnv,
          },
        },
      }),
      inject: [ConfigsService],
    }),

    ConfigsModule,

    OpenTelemetryModule.forRoot({
      metrics: {
        hostMetrics: true, // Includes Host Metrics
        apiMetrics: {
          // @deprecated - will be removed in 8.0 - you should start using the semcov from opentelemetry metrics instead
          enable: false, // Includes api metrics
          defaultAttributes: {
            // You can set default labels for api metrics
            // custom: 'label',
          },
          ignoreRoutes: ['/favicon.ico'], // You can ignore specific routes (See https://docs.nestjs.com/middleware#excluding-routes for options)
          ignoreUndefinedRoutes: false, // Records metrics for all URLs, even undefined ones
          prefix: 'my_prefix', // Add a custom prefix to all API metrics
        },
      },
    }),

    BullModule.forRootAsync({
      imports: [ConfigsModule],
      useFactory: (configsService: ConfigsService) => ({
        connection: {
          host: configsService.messageQueueValkeyHost,
          port: configsService.messageQueueValkeyPort,
        },
        prefix: 'BULLMQ_QUEUE',
      }),
      inject: [ConfigsService],
    }),

    CachesModule.forRootAsync({
      imports: [ConfigsModule],
      useFactory: (configsService: ConfigsService) => ({
        host: configsService.cacheValkeyHost,
        port: configsService.cacheValkeyPort,
      }),
      inject: [ConfigsService],
    }),

    PrismaModule,
    CachesModule,
    LogsModule,
    SeedersModule,

    RolesModule,
    UsersModule,
    AuthModule,
    InboundsModule,
    OutboundsModule,
    KnowledgesModule,
    KnowledgeFilesModule,
    CustomersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
