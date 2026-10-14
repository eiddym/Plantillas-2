'use strict';

/**
 * MemoryCache con soporte de TTL y desalojo LRU
 * Optimizado para Node.js 22 LTS
 */
class MemoryCache {
  constructor(defaultTtlMs = 1000 * 60 * 30, maxEntries = 500) {
    this.cache = new Map();
    this.defaultTtlMs = defaultTtlMs;
    this.maxEntries = maxEntries;
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    // Refresh access order (LRU)
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.value;
  }

  set(key, value, ttlMs = this.defaultTtlMs) {
    if (this.cache.size >= this.maxEntries) {
      // Desalojar la entrada más antigua (primer elemento del Map)
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlMs
    });
  }

  del(key) {
    return this.cache.delete(key);
  }

  delPattern(pattern) {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
  }

  has(key) {
    return this.get(key) !== null;
  }
}

module.exports = new MemoryCache();
