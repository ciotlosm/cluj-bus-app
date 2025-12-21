export interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  expiresAt: Date;
}

export interface CacheOptions {
  ttl: number; // Time to live in milliseconds
  maxAge: number; // Maximum age for stale data in milliseconds
}

export const defaultCacheOptions: CacheOptions = {
  ttl: 5 * 60 * 1000, // 5 minutes
  maxAge: 30 * 60 * 1000, // 30 minutes
};

export class DataCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private options: CacheOptions;

  constructor(options: Partial<CacheOptions> = {}) {
    this.options = { ...defaultCacheOptions, ...options };
  }

  set(key: string, data: T): void {
    const now = new Date();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: new Date(now.getTime() + this.options.ttl),
    };
    this.cache.set(key, entry);
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const now = new Date();
    
    // If data is still fresh, return it
    if (now <= entry.expiresAt) {
      return entry.data;
    }

    // If data is stale but within max age, return it (for graceful degradation)
    const maxAgeExpiry = new Date(entry.timestamp.getTime() + this.options.maxAge);
    if (now <= maxAgeExpiry) {
      return entry.data;
    }

    // Data is too old, remove it
    this.cache.delete(key);
    return null;
  }

  getStale(key: string): { data: T; isStale: boolean; age: number } | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const now = new Date();
    const age = now.getTime() - entry.timestamp.getTime();
    const isStale = now > entry.expiresAt;

    // Check if data is within max age
    const maxAgeExpiry = new Date(entry.timestamp.getTime() + this.options.maxAge);
    if (now > maxAgeExpiry) {
      this.cache.delete(key);
      return null;
    }

    return {
      data: entry.data,
      isStale,
      age,
    };
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Clean up expired entries
  cleanup(): void {
    const now = new Date();
    for (const [key, entry] of this.cache.entries()) {
      const maxAgeExpiry = new Date(entry.timestamp.getTime() + this.options.maxAge);
      if (now > maxAgeExpiry) {
        this.cache.delete(key);
      }
    }
  }
}