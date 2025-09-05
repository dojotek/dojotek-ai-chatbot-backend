import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import Redis from 'ioredis';
import { CachesService } from './caches.service';
import { CACHE_CLIENT } from './constants';
import {
  CachesModuleAsyncOptions,
  CachesModuleOptions,
} from './interfaces/caches-module-options.interface';

@Global() // Making the module available throughout the application
@Module({})
export class CachesModule {
  /**
   * Synchronous configuration of the module.
   */
  static forRoot(options: CachesModuleOptions): DynamicModule {
    const redisProvider: Provider = {
      provide: CACHE_CLIENT,
      useFactory: () => {
        return new Redis(options);
      },
    };

    return {
      module: CachesModule,
      providers: [redisProvider, CachesService],
      exports: [CachesService], // Export CacheService so it can be injected
    };
  }

  /**
   * Asynchronous configuration of the module (e.g. fetching data from ConfigService).
   */
  static forRootAsync<T = any>(
    options: CachesModuleAsyncOptions<T>,
  ): DynamicModule {
    const redisProvider: Provider = {
      provide: CACHE_CLIENT,
      useFactory: async (...args: T[]) => {
        const redisOptions = await options.useFactory(...args);
        return new Redis(redisOptions);
      },
      inject: options.inject || [],
    };

    return {
      module: CachesModule,
      imports: options.imports,
      providers: [redisProvider, CachesService],
      exports: [CachesService],
    };
  }
}
