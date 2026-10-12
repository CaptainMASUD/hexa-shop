/**
 * High-Performance In-Memory Cache Engine
 * Provides sub-millisecond data retrieval, TTL expiration, and tag-based invalidation.
 */

class MemoryCache {
  constructor() {
    this.store = new Map();
    this.tagMap = new Map();
    // Automatic cleanup of expired keys every 60 seconds
    this.cleanupTimer = setInterval(() => this.cleanup(), 60 * 1000);
    if (this.cleanupTimer.unref) this.cleanupTimer.unref();
  }

  /**
   * Set a cached value with TTL in seconds and optional invalidation tags.
   */
  set(key, value, ttlSeconds = 120, tags = []) {
    const expiresAt = Date.now() + Math.max(1, ttlSeconds) * 1000;
    this.store.set(key, { value, expiresAt, tags });

    for (const tag of tags) {
      if (!this.tagMap.has(tag)) {
        this.tagMap.set(tag, new Set());
      }
      this.tagMap.get(tag).add(key);
    }
    return value;
  }

  /**
   * Retrieve a cached value. Returns null if missing or expired.
   */
  get(key) {
    const record = this.store.get(key);
    if (!record) return null;

    if (Date.now() > record.expiresAt) {
      this.del(key);
      return null;
    }

    return record.value;
  }

  /**
   * Delete a specific key from cache.
   */
  del(key) {
    const record = this.store.get(key);
    if (record) {
      for (const tag of record.tags || []) {
        const set = this.tagMap.get(tag);
        if (set) {
          set.delete(key);
          if (set.size === 0) this.tagMap.delete(tag);
        }
      }
      this.store.delete(key);
    }
  }

  /**
   * Invalidate all cache entries associated with one or more tags.
   */
  invalidateTags(tags = []) {
    const tagList = Array.isArray(tags) ? tags : [tags];
    for (const tag of tagList) {
      const keys = this.tagMap.get(tag);
      if (keys) {
        for (const key of keys) {
          this.store.delete(key);
        }
        this.tagMap.delete(tag);
      }
    }
  }

  /**
   * Purge expired entries to keep memory footprint minimal.
   */
  cleanup() {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.expiresAt) {
        this.del(key);
      }
    }
  }

  /**
   * Clear entire cache.
   */
  clear() {
    this.store.clear();
    this.tagMap.clear();
  }
}

export const serverCache = new MemoryCache();
export default serverCache;
