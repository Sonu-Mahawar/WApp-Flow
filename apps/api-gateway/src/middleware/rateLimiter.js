const rateLimit = require("express-rate-limit");

/**
 * Standard rate limiter — 100 req/min per IP
 * Uses in-memory store (works on Hostinger Node.js apps)
 * For production scale, swap store with Upstash Redis store
 */
const rateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests, please slow down." },
});

/**
 * Strict rate limiter for auth routes — 10 req/15min
 */
const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many auth attempts, try again later.",
  },
});

/**
 * API rate limiter — 1000 req/min per workspace (for message sending)
 */
const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  keyGenerator: (req) => req.workspaceId || req.ip,
  message: { success: false, error: "Rate limit exceeded for this workspace." },
});

module.exports = { rateLimiter, strictRateLimiter, apiRateLimiter };
