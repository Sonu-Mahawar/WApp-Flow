const { Pool } = require("pg");
const winston = require("winston");
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console({ format: winston.format.simple() }),
  ],
});
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
const db = { query: (text, params) => pool.query(text, params) };
module.exports = { logger, db };
