// LLM响应缓存 - IndexedDB + TTL

import Dexie, { type EntityTable } from 'dexie';

interface CacheEntry {
  key: string;           // 请求的hash
  response: string;      // LLM响应
  created_at: number;    // 创建时间
  expires_at: number;    // 过期时间
  hit_count: number;     // 命中次数
}

class LLMCacheDB extends Dexie {
  cache!: EntityTable<CacheEntry, 'key'>;

  constructor() {
    super('LLMCacheDB');
    this.version(1).stores({
      cache: 'key, expires_at, created_at',
    });
  }
}

const db = new LLMCacheDB();

class LLMCache {
  private readonly DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24小时

  // 生成缓存key（基于messages内容）
  private generateKey(messages: any[]): string {
    const content = JSON.stringify(messages);
    return this.simpleHash(content);
  }

  // 简单hash函数
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  // 获取缓存
  async get(messages: any[]): Promise<string | null> {
    const key = this.generateKey(messages);
    const entry = await db.cache.get(key);

    if (!entry) return null;

    // 检查是否过期
    if (Date.now() > entry.expires_at) {
      await db.cache.delete(key);
      return null;
    }

    // 更新命中次数
    await db.cache.update(key, { hit_count: entry.hit_count + 1 });

    return entry.response;
  }

  // 设置缓存
  async set(messages: any[], response: string, ttl: number = this.DEFAULT_TTL): Promise<void> {
    const key = this.generateKey(messages);
    const now = Date.now();

    await db.cache.put({
      key,
      response,
      created_at: now,
      expires_at: now + ttl,
      hit_count: 0,
    });
  }

  // 清理过期缓存
  async cleanup(): Promise<void> {
    const now = Date.now();
    await db.cache.where('expires_at').below(now).delete();
  }

  // 获取缓存统计
  async getStats() {
    const all = await db.cache.toArray();
    const valid = all.filter(e => e.expires_at > Date.now());

    return {
      total: all.length,
      valid: valid.length,
      expired: all.length - valid.length,
      totalHits: valid.reduce((sum, e) => sum + e.hit_count, 0),
      hitRate: valid.length > 0 ? valid.reduce((sum, e) => sum + e.hit_count, 0) / valid.length : 0,
    };
  }

  // 清空所有缓存
  async clear(): Promise<void> {
    await db.cache.clear();
  }
}

export const llmCache = new LLMCache();

// 定期清理过期缓存（每小时）
if (typeof window !== 'undefined') {
  setInterval(() => {
    llmCache.cleanup().catch(console.error);
  }, 60 * 60 * 1000);
}
