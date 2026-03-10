/**
 * Lightweight in-memory LRU-style cache for API responses.
 *
 * Principles applied:
 *  - Cache-aside pattern: callers check, populate, and invalidate explicitly.
 *  - TTL-based expiry: stale entries are evicted on read, not on a timer.
 *  - Max-size eviction: oldest entry removed when capacity is reached (prevents memory leak).
 *  - Key namespacing: each feature uses a prefix so global invalidation is cheap.
 */

const DEFAULT_TTL_MS = 60_000;   // 60 seconds
const MAX_ENTRIES    = 1_000;    // max in-memory entries

const store = new Map(); // key → { value, expiresAt }

/**
 * Read from cache. Returns undefined on miss or expiry.
 */
export function cacheGet(key) {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

/**
 * Write to cache with optional TTL in milliseconds.
 */
export function cacheSet(key, value, ttlMs = DEFAULT_TTL_MS) {
  // Evict oldest entry when at capacity
  if (store.size >= MAX_ENTRIES) {
    const firstKey = store.keys().next().value;
    store.delete(firstKey);
  }
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/**
 * Delete one specific key.
 */
export function cacheDelete(key) {
  store.delete(key);
}

/**
 * Invalidate every key that starts with a given prefix.
 * Use this when you mutate data (e.g. new post → invalidate "images:" prefix).
 */
export function cacheInvalidatePrefix(prefix) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}

/**
 * Express middleware factory — caches GET responses per URL.
 * @param {number}   ttlMs    How long to cache (default 60 s)
 * @param {string}   prefix   Namespace prefix for invalidation
 */
export function cacheMiddleware(ttlMs = DEFAULT_TTL_MS, prefix = 'route:') {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') return next();

    // Include authenticated user in the cache key so users don't see each other's data
    const userId = req.user?._id?.toString() || 'anon';
    const key = `${prefix}${userId}:${req.originalUrl}`;
    const hit = cacheGet(key);

    if (hit !== undefined) {
      // Serve cached response — set Cache-Control so browser can also cache
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Cache-Control', `private, max-age=${Math.floor(ttlMs / 1000)}`);
      return res.status(200).json(hit);
    }

    // Intercept res.json to store the response before sending
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode === 200) {
        cacheSet(key, body, ttlMs);
      }
      res.setHeader('X-Cache', 'MISS');
      return originalJson(body);
    };

    next();
  };
}
