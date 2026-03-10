const express = require("express");
const router = express.Router();
const axios = require("axios");
const { db } = require("../utils/db");
const { logger } = require("../utils/logger");

const MESSAGING_URL =
  process.env.MESSAGING_SERVICE_URL || "http://localhost:3002";

// POST /api/v1/messages/send
router.post("/send", async (req, res) => {
  try {
    const { phone, message, type = "text", mediaUrl } = req.body;
    if (!phone || !message)
      return res
        .status(400)
        .json({ success: false, error: "phone and message are required" });

    // Save contact if not exists
    await db.query(
      `INSERT INTO contacts (workspace_id, phone) VALUES ($1, $2)
       ON CONFLICT (workspace_id, phone) DO UPDATE SET last_contacted_at = NOW()`,
      [req.workspaceId, phone],
    );

    // Queue via messaging service
    const response = await axios.post(`${MESSAGING_URL}/send`, {
      workspaceId: req.workspaceId,
      phone,
      message,
      type,
      mediaUrl,
    });

    // Log message to DB
    await db.query(
      `INSERT INTO messages (workspace_id, direction, type, content, status)
       VALUES ($1, 'outbound', $2, $3, 'queued')`,
      [req.workspaceId, type, message],
    );

    res.json({
      success: true,
      messageId: response.data.messageId,
      status: "queued",
    });
  } catch (err) {
    logger.error("Send message error:", err.message);
    res.status(500).json({ success: false, error: "Failed to send message" });
  }
});

// POST /api/v1/messages/send-template
router.post("/send-template", async (req, res) => {
  try {
    const { phone, template, variables = {}, language = "en" } = req.body;
    if (!phone || !template)
      return res
        .status(400)
        .json({ success: false, error: "phone and template required" });

    const response = await axios.post(`${MESSAGING_URL}/send-template`, {
      workspaceId: req.workspaceId,
      phone,
      template,
      variables,
      language,
    });

    res.json({
      success: true,
      messageId: response.data.messageId,
      status: "queued",
    });
  } catch (err) {
    logger.error("Send template error:", err.message);
    res.status(500).json({ success: false, error: "Failed to send template" });
  }
});

// POST /api/v1/messages/send-media
router.post("/send-media", async (req, res) => {
  try {
    const { phone, mediaUrl, mediaType, caption } = req.body;
    if (!phone || !mediaUrl || !mediaType)
      return res
        .status(400)
        .json({ success: false, error: "phone, mediaUrl, mediaType required" });

    const response = await axios.post(`${MESSAGING_URL}/send-media`, {
      workspaceId: req.workspaceId,
      phone,
      mediaUrl,
      mediaType,
      caption,
    });

    res.json({ success: true, messageId: response.data.messageId });
  } catch (err) {
    logger.error("Send media error:", err.message);
    res.status(500).json({ success: false, error: "Failed to send media" });
  }
});

// POST /api/v1/messages/send-bulk (CSV broadcast)
router.post("/send-bulk", async (req, res) => {
  try {
    const { recipients, template, message } = req.body;
    // recipients = [{phone, name, variables}]
    if (!recipients || !Array.isArray(recipients))
      return res
        .status(400)
        .json({ success: false, error: "recipients array required" });

    const response = await axios.post(`${MESSAGING_URL}/send-bulk`, {
      workspaceId: req.workspaceId,
      recipients,
      template,
      message,
    });

    res.json({
      success: true,
      queued: recipients.length,
      jobId: response.data.jobId,
    });
  } catch (err) {
    logger.error("Send bulk error:", err.message);
    res
      .status(500)
      .json({ success: false, error: "Failed to queue bulk messages" });
  }
});

// GET /api/v1/messages
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 50, phone } = req.query;
    const offset = (page - 1) * limit;
    let query = `SELECT m.*, c.phone, c.name as contact_name
                 FROM messages m LEFT JOIN contacts c ON m.contact_id = c.id
                 WHERE m.workspace_id = $1`;
    const params = [req.workspaceId];

    if (phone) {
      params.push(phone);
      query += ` AND c.phone = $${params.length}`;
    }
    query += ` ORDER BY m.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    res.json({
      success: true,
      messages: result.rows,
      page: +page,
      limit: +limit,
    });
  } catch (err) {
    logger.error("Get messages error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch messages" });
  }
});

// GET /api/v1/messages/status/:messageId
router.get("/status/:messageId", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, status, sent_at, delivered_at, read_at FROM messages WHERE id=$1 AND workspace_id=$2",
      [req.params.messageId, req.workspaceId],
    );
    if (!result.rows.length)
      return res
        .status(404)
        .json({ success: false, error: "Message not found" });
    res.json({ success: true, message: result.rows[0] });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch message status" });
  }
});

module.exports = router;
