/**
 * CacheService Unit Tests
 */

import { CacheService } from '@/lib/cache/cache.service';
import type { ILogger } from '@/lib/logger/logger.interface';
import { Redis } from 'ioredis';

// Mock Redis
const mockRedis = {
  get: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
} as unknown as Redis;

const mockLogger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  performance: jest.fn(),
} as unknown as ILogger;

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    jest.clearAllMocks();
    cacheService = new CacheService(mockRedis, mockLogger);
  });

  describe('get', () => {
    it('should return cached value', async () => {
      const cachedValue = JSON.stringify({ data: 'test' });
      (mockRedis.get as jest.Mock).mockResolvedValue(cachedValue);

      const result = await cacheService.get<{ data: string }>('test-key');

      expect(result).toEqual({ data: 'test' });
      expect(mockRedis.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null if key does not exist', async () => {
      (mockRedis.get as jest.Mock).mockResolvedValue(null);

      const result = await cacheService.get('non-existent');

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      (mockRedis.get as jest.Mock).mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.get('error-key');

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('set', () => {
    it('should set cached value with TTL', async () => {
      const value = { data: 'test' };
      (mockRedis.setex as jest.Mock).mockResolvedValue('OK');

      await cacheService.set('test-key', value, 3600);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'test-key',
        3600,
        JSON.stringify(value)
      );
    });

    it('should use default TTL if not provided', async () => {
      const value = { data: 'test' };
      (mockRedis.setex as jest.Mock).mockResolvedValue('OK');

      await cacheService.set('test-key', value);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'test-key',
        3600, // default TTL
        JSON.stringify(value)
      );
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      const cachedValue = { data: 'cached' };
      (mockRedis.get as jest.Mock).mockResolvedValue(JSON.stringify(cachedValue));

      const fetcher = jest.fn();

      const result = await cacheService.getOrSet('test-key', fetcher);

      expect(result).toEqual(cachedValue);
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('should call fetcher and cache result if not cached', async () => {
      (mockRedis.get as jest.Mock).mockResolvedValue(null);
      (mockRedis.setex as jest.Mock).mockResolvedValue('OK');

      const fetchedValue = { data: 'fetched' };
      const fetcher = jest.fn().mockResolvedValue(fetchedValue);

      const result = await cacheService.getOrSet('test-key', fetcher);

      expect(result).toEqual(fetchedValue);
      expect(fetcher).toHaveBeenCalled();
      expect(mockRedis.setex).toHaveBeenCalled();
    });
  });
});

