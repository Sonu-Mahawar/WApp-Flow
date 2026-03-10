const { Pool } = require("pg");
const { logger } = require("./logger");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on("error", (err) => {
  logger.error("Unexpected database error:", err);
});

const db = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
};

// Test connection on startup
pool
  .query("SELECT NOW()")
  .then(() => {
    logger.info("Database connected successfully");
  })
  .catch((err) => {
    logger.error("Database connection failed:", err.message);
  });

module.exports = { db, pool };
