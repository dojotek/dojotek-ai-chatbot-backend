import { Test, TestingModule } from '@nestjs/testing';
import { CachesService } from './caches.service';
import { CACHE_CLIENT } from './constants';
import Redis from 'ioredis';

describe('CachesService', () => {
  let service: CachesService;
  let mockRedisClient: jest.Mocked<
    Pick<Redis, 'get' | 'set' | 'del' | 'quit' | 'exists'>
  >;

  beforeEach(async () => {
    // Create a mock Redis client
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      quit: jest.fn(),
      exists: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CachesService,
        {
          provide: CACHE_CLIENT,
          useValue: mockRedisClient,
        },
      ],
    }).compile();

    service = module.get<CachesService>(CachesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get', () => {
    it('should return parsed data when key exists', async () => {
      const testKey = 'test-key';
      const testData = { id: 1, name: 'test' };
      const serializedData = JSON.stringify(testData);

      mockRedisClient.get.mockResolvedValue(serializedData);

      const result = await service.get<typeof testData>(testKey);

      expect(jest.mocked(mockRedisClient.get)).toHaveBeenCalledWith(testKey);
      expect(result).toEqual(testData);
    });

    it('should return null when key does not exist', async () => {
      const testKey = 'non-existent-key';

      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.get(testKey);

      expect(jest.mocked(mockRedisClient.get)).toHaveBeenCalledWith(testKey);
      expect(result).toBeNull();
    });

    it('should return null when Redis returns empty string', async () => {
      const testKey = 'empty-key';

      mockRedisClient.get.mockResolvedValue('');

      const result = await service.get(testKey);

      expect(jest.mocked(mockRedisClient.get)).toHaveBeenCalledWith(testKey);
      expect(result).toBeNull();
    });

    it('should handle complex objects', async () => {
      const testKey = 'complex-key';
      const complexData = {
        users: [
          { id: 1, name: 'John' },
          { id: 2, name: 'Jane' },
        ],
        metadata: { total: 2, page: 1 },
        timestamp: new Date().toISOString(),
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(complexData));

      const result = await service.get<typeof complexData>(testKey);

      expect(result).toEqual(complexData);
    });

    it('should throw error when JSON parsing fails', async () => {
      const testKey = 'invalid-json-key';
      const invalidJson = '{ invalid json }';

      mockRedisClient.get.mockResolvedValue(invalidJson);

      await expect(service.get(testKey)).rejects.toThrow();
    });
  });

  describe('set', () => {
    it('should set data without TTL', async () => {
      const testKey = 'test-key';
      const testValue = { id: 1, name: 'test' };

      mockRedisClient.set.mockResolvedValue('OK');

      const result = await service.set(testKey, testValue);

      expect(jest.mocked(mockRedisClient.set)).toHaveBeenCalledWith(
        testKey,
        JSON.stringify(testValue),
      );
      expect(result).toBe('OK');
    });

    it('should set data with TTL', async () => {
      const testKey = 'test-key';
      const testValue = { id: 1, name: 'test' };
      const ttl = 3600; // 1 hour

      mockRedisClient.set.mockResolvedValue('OK');

      const result = await service.set(testKey, testValue, ttl);

      expect(jest.mocked(mockRedisClient.set)).toHaveBeenCalledWith(
        testKey,
        JSON.stringify(testValue),
        'EX',
        ttl,
      );
      expect(result).toBe('OK');
    });

    it('should handle null values', async () => {
      const testKey = 'null-key';
      const testValue = null;

      mockRedisClient.set.mockResolvedValue('OK');

      await service.set(testKey, testValue);

      expect(jest.mocked(mockRedisClient.set)).toHaveBeenCalledWith(
        testKey,
        JSON.stringify(testValue),
      );
    });

    it('should handle primitive values', async () => {
      const testKey = 'string-key';
      const testValue = 'simple string';

      mockRedisClient.set.mockResolvedValue('OK');

      await service.set(testKey, testValue);

      expect(jest.mocked(mockRedisClient.set)).toHaveBeenCalledWith(
        testKey,
        JSON.stringify(testValue),
      );
    });

    it('should handle arrays', async () => {
      const testKey = 'array-key';
      const testValue = [1, 2, 3, 'test'];

      mockRedisClient.set.mockResolvedValue('OK');

      await service.set(testKey, testValue);

      expect(jest.mocked(mockRedisClient.set)).toHaveBeenCalledWith(
        testKey,
        JSON.stringify(testValue),
      );
    });

    it('should handle TTL of 0', async () => {
      const testKey = 'zero-ttl-key';
      const testValue = { test: 'data' };
      const ttl = 0;

      mockRedisClient.set.mockResolvedValue('OK');

      await service.set(testKey, testValue, ttl);

      // When TTL is 0 (falsy), it should not use EX option
      expect(jest.mocked(mockRedisClient.set)).toHaveBeenCalledWith(
        testKey,
        JSON.stringify(testValue),
      );
    });
  });

  describe('del', () => {
    it('should delete existing key and return 1', async () => {
      const testKey = 'test-key';

      mockRedisClient.del.mockResolvedValue(1);

      const result = await service.del(testKey);

      expect(jest.mocked(mockRedisClient.del)).toHaveBeenCalledWith(testKey);
      expect(result).toBe(1);
    });

    it('should return 0 when deleting non-existent key', async () => {
      const testKey = 'non-existent-key';

      mockRedisClient.del.mockResolvedValue(0);

      const result = await service.del(testKey);

      expect(jest.mocked(mockRedisClient.del)).toHaveBeenCalledWith(testKey);
      expect(result).toBe(0);
    });

    it('should handle multiple keys deletion', async () => {
      const testKey = 'test-key';

      mockRedisClient.del.mockResolvedValue(3); // Multiple keys deleted

      const result = await service.del(testKey);

      expect(jest.mocked(mockRedisClient.del)).toHaveBeenCalledWith(testKey);
      expect(result).toBe(3);
    });
  });

  describe('getClient', () => {
    it('should return the Redis client instance', () => {
      const client = service.getClient();

      expect(client).toBe(mockRedisClient);
    });

    it('should allow direct Redis operations through the client', async () => {
      const client = service.getClient();

      // Mock a Redis operation that's not wrapped by the service
      const existsSpy = jest.spyOn(client, 'exists').mockResolvedValue(1);

      const result = await client.exists('some-key');

      expect(existsSpy).toHaveBeenCalledWith('some-key');
      expect(result).toBe(1);
    });
  });

  describe('onModuleDestroy', () => {
    it('should quit Redis connection successfully', () => {
      jest.mocked(mockRedisClient.quit).mockResolvedValue('OK');
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      service.onModuleDestroy();

      expect(jest.mocked(mockRedisClient.quit)).toHaveBeenCalled();
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle Redis quit error gracefully', async () => {
      const error = new Error('Connection error');
      jest.mocked(mockRedisClient.quit).mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      service.onModuleDestroy();

      // Wait a bit for the promise to resolve since onModuleDestroy doesn't return a promise
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(jest.mocked(mockRedisClient.quit)).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error closing Redis connection:',
        error,
      );

      consoleSpy.mockRestore();
    });
  });

  describe('integration scenarios', () => {
    it('should handle a complete cache workflow', async () => {
      const key = 'user:123';
      const userData = { id: 123, name: 'John Doe', email: 'john@example.com' };
      const ttl = 1800; // 30 minutes

      // Set data
      mockRedisClient.set.mockResolvedValue('OK');
      await service.set(key, userData, ttl);

      // Get data
      mockRedisClient.get.mockResolvedValue(JSON.stringify(userData));
      const retrievedData = await service.get<typeof userData>(key);

      // Delete data
      mockRedisClient.del.mockResolvedValue(1);
      const deleteResult = await service.del(key);

      expect(retrievedData).toEqual(userData);
      expect(deleteResult).toBe(1);
    });

    it('should handle cache miss scenario', async () => {
      const key = 'user:999';

      mockRedisClient.get.mockResolvedValue(null);
      const result = await service.get(key);

      expect(result).toBeNull();
    });
  });
});
