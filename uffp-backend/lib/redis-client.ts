/**
 * Redis client adapter
 * Supports both Vercel KV and generic Redis URLs
 */

import Redis from 'ioredis';
import { kv } from '@vercel/kv';

// Check if we have a generic REDIS_URL (Redis Labs, Upstash, etc.)
const REDIS_URL = process.env.REDIS_URL;

// If REDIS_URL is provided, use ioredis (supports credentials in URL)
// Otherwise use Vercel KV
let redisClient: Redis | null = null;

if (REDIS_URL) {
  redisClient = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
    lazyConnect: true,
  });
}

// Unified interface that works with both clients
export const kvClient = {
  async get<T = any>(key: string): Promise<T | null> {
    if (redisClient) {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    }
    return kv.get<T>(key);
  },

  async set(key: string, value: any): Promise<void> {
    if (redisClient) {
      await redisClient.set(key, JSON.stringify(value));
    } else {
      await kv.set(key, value);
    }
  },

  async del(key: string): Promise<void> {
    if (redisClient) {
      await redisClient.del(key);
    } else {
      await kv.del(key);
    }
  },

  async keys(pattern: string): Promise<string[]> {
    if (redisClient) {
      return redisClient.keys(pattern);
    }
    return kv.keys(pattern);
  },

  async sadd(key: string, ...members: string[]): Promise<void> {
    if (redisClient) {
      await redisClient.sadd(key, ...members);
    } else {
      await kv.sadd(key, ...members);
    }
  },

  async smembers(key: string): Promise<string[]> {
    if (redisClient) {
      return redisClient.smembers(key);
    }
    return kv.smembers(key) as Promise<string[]>;
  },
};
