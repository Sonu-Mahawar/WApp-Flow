/**
 * API Response Cache Middleware
 * In-memory LRU cache for expensive/repeated GET endpoints.
 * Reduces DB load and speeds up analytics, overview, chart endpoints.
 */

const cache = new Map(); // key → { data, expiresAt }

/**
 * Create a cache middleware with a given TTL (seconds)
 * @param {number} ttl - seconds to cache the response
 * @param {function} keyFn - optional custom key generator (req) => string
 */
function cacheMiddleware(ttl = 60, keyFn = null) {
  return (req, res, next) => {
    // Build cache key: method + path + workspaceId + query string
    const key = keyFn
      ? keyFn(req)
      : `${req.method}:${req.path}:${req.workspaceId}:${JSON.stringify(req.query)}`;

    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      res.setHeader("X-Cache", "HIT");
      res.setHeader(
        "X-Cache-TTL",
        Math.ceil((cached.expiresAt - Date.now()) / 1000),
      );
      return res.json(cached.data);
    }

    // Intercept res.json to store response
    const origJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode === 200 && body?.success !== false) {
        cache.set(key, { data: body, expiresAt: Date.now() + ttl * 1000 });
        // Prune cache if it grows too large (max 500 entries)
        if (cache.size > 500) {
          const firstKey = cache.keys().next().value;
          cache.delete(firstKey);
        }
      }
      res.setHeader("X-Cache", "MISS");
      return origJson(body);
    };

    next();
  };
}

/**
 * Invalidate all cache entries that match a prefix
 * Call this when data changes (e.g. after sending a message)
 */
function invalidateCache(prefix) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

/** Clear entire cache */
function clearCache() {
  cache.clear();
}

/** Get cache stats */
function cacheStats() {
  return { size: cache.size, keys: [...cache.keys()] };
}

module.exports = { cacheMiddleware, invalidateCache, clearCache, cacheStats };
