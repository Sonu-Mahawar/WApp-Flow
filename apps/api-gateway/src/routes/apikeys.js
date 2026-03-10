const express = require("express");
const router = express.Router();
const { db } = require("../utils/db");
const crypto = require("crypto");

// GET /api/v1/api-keys
router.get("/", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, name, key_prefix, is_active, last_used_at, created_at FROM api_keys WHERE workspace_id=$1",
      [req.workspaceId],
    );
    res.json({ success: true, apiKeys: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch API keys" });
  }
});

// POST /api/v1/api-keys
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name)
      return res.status(400).json({ success: false, error: "name required" });

    const rawKey = `wap_${crypto.randomBytes(24).toString("hex")}`;
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
    const keyPrefix = rawKey.slice(0, 12);

    const result = await db.query(
      "INSERT INTO api_keys (workspace_id, name, key_hash, key_prefix) VALUES ($1,$2,$3,$4) RETURNING id, name, key_prefix",
      [req.workspaceId, name, keyHash, keyPrefix],
    );

    // Return full key ONCE — never shown again
    res
      .status(201)
      .json({ success: true, apiKey: { ...result.rows[0], key: rawKey } });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to create API key" });
  }
});

// DELETE /api/v1/api-keys/:id
router.delete("/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM api_keys WHERE id=$1 AND workspace_id=$2", [
      req.params.id,
      req.workspaceId,
    ]);
    res.json({ success: true, message: "API key deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to delete API key" });
  }
});

// PATCH /api/v1/api-keys/:id/toggle
router.patch("/:id/toggle", async (req, res) => {
  try {
    const result = await db.query(
      "UPDATE api_keys SET is_active = NOT is_active WHERE id=$1 AND workspace_id=$2 RETURNING id, is_active",
      [req.params.id, req.workspaceId],
    );
    res.json({ success: true, is_active: result.rows[0]?.is_active });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to toggle API key" });
  }
});

module.exports = router;
