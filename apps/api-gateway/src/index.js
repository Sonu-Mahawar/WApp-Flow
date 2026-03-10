require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { logger } = require("./utils/logger");

// Route imports
const authRoutes = require("./routes/auth");
const messageRoutes = require("./routes/messages");
const templateRoutes = require("./routes/templates");
const contactRoutes = require("./routes/contacts");
const automationRoutes = require("./routes/automations");
const campaignRoutes = require("./routes/campaigns");
const analyticsRoutes = require("./routes/analytics");
const apiKeyRoutes = require("./routes/apikeys");
const eventRoutes = require("./routes/events");
const workspaceRoutes = require("./routes/workspaces");

// Middleware imports
const { authenticate } = require("./middleware/auth");
const { rateLimiter, strictRateLimiter } = require("./middleware/rateLimiter");

const app = express();
const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === "production";

// ─── 1. SECURITY — Helmet with strict headers ─────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://graph.facebook.com"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: IS_PROD ? [] : null,
      },
    },
    hsts: IS_PROD
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    crossOriginEmbedderPolicy: false, // Allow loading from CDNs
  }),
);

// ─── 2. CORS — Strict origin allowlist ───────────────────────────────────────
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://localhost:5174"
)
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (Postman, server-to-server) and whitelisted origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-api-key",
      "x-workspace-id",
    ],
    exposedHeaders: ["X-RateLimit-Limit", "X-RateLimit-Remaining"],
  }),
);

// ─── 3. Request body parsing with size limits ─────────────────────────────────
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// ─── 4. XSS Sanitization — strip HTML/script from request body ───────────────
app.use((req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj !== "object" || obj === null) return obj;
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === "string") {
        // Remove script tags and HTML event handlers
        obj[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
          .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
          .replace(/javascript:/gi, "");
      } else if (typeof obj[key] === "object") {
        sanitize(obj[key]);
      }
    }
    return obj;
  };
  if (req.body) sanitize(req.body);
  next();
});

// ─── 5. Request logging ───────────────────────────────────────────────────────
app.use(
  morgan("combined", {
    stream: { write: (msg) => logger.info(msg.trim()) },
    skip: (req) => req.path === "/health", // don't log health checks
  }),
);

// ─── 6. Security event logging ────────────────────────────────────────────────
app.use((req, res, next) => {
  // Log suspicious patterns
  const suspicious = [
    /\.\.\//, // path traversal
    /<script/i, // XSS attempt
    /union.*select/i, // SQL injection
    /exec\s*\(/i, // code injection
  ];
  const fullUrl = req.originalUrl + JSON.stringify(req.body || {});
  if (suspicious.some((p) => p.test(fullUrl))) {
    logger.warn(
      `🚨 Suspicious request from ${req.ip}: ${req.method} ${req.originalUrl}`,
    );
  }
  next();
});

// ─── 7. Health check ─────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "api-gateway",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    env: process.env.NODE_ENV || "development",
  });
});

// ─── 8. Public routes ────────────────────────────────────────────────────────
app.use("/api/v1/auth", strictRateLimiter, authRoutes);

// ─── 9. Protected routes (JWT or API Key) ────────────────────────────────────
app.use("/api/v1/messages", authenticate, rateLimiter, messageRoutes);
app.use("/api/v1/templates", authenticate, templateRoutes);
app.use("/api/v1/contacts", authenticate, contactRoutes);
app.use("/api/v1/automations", authenticate, automationRoutes);
app.use("/api/v1/campaigns", authenticate, campaignRoutes);
app.use("/api/v1/analytics", authenticate, analyticsRoutes);
app.use("/api/v1/api-keys", authenticate, apiKeyRoutes);
app.use("/api/v1/workspaces", authenticate, workspaceRoutes);
app.use("/api/v1/event", authenticate, eventRoutes);

// ─── 10. 404 Handler ─────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

// ─── 11. Global error handler ────────────────────────────────────────────────
app.use((err, req, res, next) => {
  // Don't expose internal errors in production
  logger.error("Unhandled error:", err);
  if (err.message === "Not allowed by CORS") {
    return res
      .status(403)
      .json({ success: false, error: "CORS policy violation" });
  }
  res.status(err.status || 500).json({
    success: false,
    error: IS_PROD
      ? "Internal server error"
      : err.message || "Internal server error",
    ...(IS_PROD ? {} : { stack: err.stack }),
  });
});

// ─── 12. Graceful shutdown ────────────────────────────────────────────────────
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully...");
  server.close(() => {
    logger.info("Server closed.");
    process.exit(0);
  });
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception:", err);
  process.exit(1);
});

const server = app.listen(PORT, () => {
  logger.info(
    `🚀 API Gateway v2.0 running on port ${PORT} [${process.env.NODE_ENV || "development"}]`,
  );
  logger.info(`🔒 Security: Helmet CSP + CORS + XSS sanitizer + Rate limiting`);
});

module.exports = app;
