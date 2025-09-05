import { ModuleMetadata, InjectionToken, Type } from '@nestjs/common';
import { RedisOptions } from 'ioredis';

// Options for synchronous configuration (forRoot)
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CachesModuleOptions extends RedisOptions {
  // You can add custom options here if needed
}

// Options for asynchronous configuration (forRootAsync)
export interface CachesModuleAsyncOptions<T = any>
  extends Pick<ModuleMetadata, 'imports'> {
  useFactory: (
    ...args: T[]
  ) => Promise<CachesModuleOptions> | CachesModuleOptions;
  inject?: (InjectionToken | Type<any>)[];
}
