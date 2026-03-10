const jwt = require("jsonwebtoken");
const { db } = require("../utils/db");
const { logger } = require("../utils/logger");
const crypto = require("crypto");

/**
 * Authenticate via JWT (Bearer token) or API Key (x-api-key header)
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers["x-api-key"];

    if (apiKey) {
      return await authenticateApiKey(apiKey, req, res, next);
    }

    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authenticateJWT(authHeader.slice(7), req, res, next);
    }

    return res
      .status(401)
      .json({ success: false, error: "Authentication required" });
  } catch (err) {
    logger.error("Auth error:", err);
    return res
      .status(401)
      .json({ success: false, error: "Authentication failed" });
  }
};

const authenticateJWT = (token, req, res, next) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    req.workspaceId = decoded.workspaceId;
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, error: "Invalid or expired token" });
  }
};

const authenticateApiKey = async (rawKey, req, res, next) => {
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  const result = await db.query(
    `SELECT ak.*, w.id as workspace_id FROM api_keys ak
     JOIN workspaces w ON ak.workspace_id = w.id
     WHERE ak.key_hash = $1 AND ak.is_active = true`,
    [keyHash],
  );

  if (!result.rows.length) {
    return res.status(401).json({ success: false, error: "Invalid API key" });
  }

  const apiKeyRecord = result.rows[0];
  // Update last_used_at async (no await)
  db.query("UPDATE api_keys SET last_used_at = NOW() WHERE id = $1", [
    apiKeyRecord.id,
  ]);

  req.apiKey = apiKeyRecord;
  req.workspaceId = apiKeyRecord.workspace_id;
  next();
};

module.exports = { authenticate };
