import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis, { RedisKey } from 'ioredis';
import { CACHE_CLIENT } from './constants';

@Injectable()
export class CachesService implements OnModuleDestroy {
  // Inject Redis client using the defined token
  constructor(@Inject(CACHE_CLIENT) private readonly redisClient: Redis) {}

  /**
   * Closing Redis connection when the application is stopped.
   */
  onModuleDestroy() {
    this.redisClient.quit().catch((error) => {
      console.error('Error closing Redis connection:', error);
    });
  }

  /**
   * Getting data from cache.
   * @param key Cache key
   * @returns Stored data or null if not found
   */
  async get<T>(key: RedisKey): Promise<T | null> {
    const data = await this.redisClient.get(key);
    if (!data) {
      return null;
    }
    // Assuming data is stored as a JSON string
    return JSON.parse(data) as T;
  }

  /**
   * Saving data to cache.
   * @param key Cache key
   * @param value Data to be saved (will be serialized to JSON)
   * @param ttl Time-to-live in seconds (optional)
   */
  async set(key: RedisKey, value: any, ttl?: number): Promise<'OK'> {
    const stringValue = JSON.stringify(value);
    if (ttl) {
      return this.redisClient.set(key, stringValue, 'EX', ttl);
    } else {
      return this.redisClient.set(key, stringValue);
    }
  }

  /**
   * Deleting data from cache.
   * @param key Cache key
   * @returns Number of keys deleted
   */
  async del(key: RedisKey): Promise<number> {
    return this.redisClient.del(key);
  }

  /**
   * Giving direct access to the ioredis client if you need to run a command that is not wrapped.
   * Running a command that is not wrapped.
   * @returns instance ioredis
   */
  getClient(): Redis {
    return this.redisClient;
  }
}
