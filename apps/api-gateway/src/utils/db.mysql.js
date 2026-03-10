/**
 * db.mysql.js — MySQL 8.0 Database Adapter for Hostinger Deployment
 *
 * Usage for Hostinger: Copy this file to src/utils/db.js, replacing the existing file.
 *
 * Install: npm install mysql2
 *
 * Key differences vs PostgreSQL (pg):
 *  - Connection string: mysql:// instead of postgresql://
 *  - Placeholder syntax: ? instead of $1, $2
 *  - RETURNING clause: Not supported in MySQL — use INSERT getId + SELECT
 *  - BOOLEAN: Use TINYINT(1) in schema, reads as 0/1
 */

const mysql = require("mysql2/promise");
const { logger } = require("./logger");

// Parse DATABASE_URL to support both URL format and individual env vars
let poolConfig;
if (
  process.env.DATABASE_URL &&
  process.env.DATABASE_URL.startsWith("mysql://")
) {
  poolConfig = { uri: process.env.DATABASE_URL };
} else {
  // Fallback: individual connection params
  poolConfig = {
    host: process.env.DB_HOST || "127.0.0.1",
    port: parseInt(process.env.DB_PORT || "3306"),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "whatsapp_platform",
  };
}

const pool = mysql.createPool({
  ...poolConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "Z",
  decimalNumbers: true,
  dateStrings: false,
});

/**
 * Convert PostgreSQL-style placeholders ($1, $2) to MySQL (?)
 * Also handles RETURNING clause (not supported in MySQL)
 */
function adaptQuery(text) {
  // Replace $1, $2, ... with ?
  return text.replace(/\$\d+/g, "?");
}

const db = {
  /**
   * Execute a query.
   * Returns { rows: [...] } compatible with the pg module interface.
   */
  query: async (text, params) => {
    const mysqlText = adaptQuery(text);
    try {
      const [rows] = await pool.execute(mysqlText, params);
      // For INSERT statements, add insertId to emulate RETURNING behavior
      if (!Array.isArray(rows) && rows.insertId) {
        return { rows: [{ id: rows.insertId }], insertId: rows.insertId };
      }
      return { rows: Array.isArray(rows) ? rows : [] };
    } catch (err) {
      logger.error(`DB Query error: ${err.message}`, { text: mysqlText });
      throw err;
    }
  },

  /**
   * Get a raw connection from the pool (for transactions)
   */
  getClient: async () => {
    const conn = await pool.getConnection();
    return {
      query: async (text, params) => {
        const [rows] = await conn.execute(adaptQuery(text), params);
        return { rows: Array.isArray(rows) ? rows : [] };
      },
      release: () => conn.release(),
    };
  },

  /**
   * Run a transaction
   * Usage: await db.transaction(async (client) => { await client.query(...); });
   */
  transaction: async (fn) => {
    const conn = await pool.getConnection();
    await conn.beginTransaction();
    try {
      const client = {
        query: async (text, params) => {
          const [rows] = await conn.execute(adaptQuery(text), params);
          return { rows: Array.isArray(rows) ? rows : [] };
        },
      };
      const result = await fn(client);
      await conn.commit();
      return result;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },
};

// Test connection on startup
pool
  .getConnection()
  .then((conn) => {
    logger.info("✅ MySQL database connected successfully");
    conn.release();
  })
  .catch((err) => {
    logger.error("❌ MySQL database connection failed:", err.message);
    logger.error("Check your DATABASE_URL in the .env file");
  });

module.exports = { db, pool };
