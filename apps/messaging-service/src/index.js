require("dotenv").config();
const express = require("express");
const { logger } = require("./utils/logger");
const wabaClient = require("./waba");
const { db } = require("./utils/db");

const app = express();
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 3002;

// Health check
app.get("/health", (req, res) =>
  res.json({ status: "ok", service: "messaging-service" }),
);

// POST /send — Send plain text message
app.post("/send", async (req, res) => {
  try {
    const { workspaceId, phone, message, type = "text" } = req.body;
    const workspace = await getWorkspace(workspaceId);
    const result = await wabaClient.sendText(workspace, phone, message);
    await logMessage(
      workspaceId,
      phone,
      "outbound",
      "text",
      message,
      result.messages?.[0]?.id,
    );
    res.json({ success: true, messageId: result.messages?.[0]?.id });
  } catch (err) {
    logger.error("Send error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /send-template
app.post("/send-template", async (req, res) => {
  try {
    const {
      workspaceId,
      phone,
      template,
      variables = {},
      language = "en",
    } = req.body;
    const workspace = await getWorkspace(workspaceId);
    const result = await wabaClient.sendTemplate(
      workspace,
      phone,
      template,
      variables,
      language,
    );
    await logMessage(
      workspaceId,
      phone,
      "outbound",
      "template",
      JSON.stringify(variables),
      result.messages?.[0]?.id,
    );
    res.json({ success: true, messageId: result.messages?.[0]?.id });
  } catch (err) {
    logger.error("Send template error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /send-media
app.post("/send-media", async (req, res) => {
  try {
    const { workspaceId, phone, mediaUrl, mediaType, caption } = req.body;
    const workspace = await getWorkspace(workspaceId);
    const result = await wabaClient.sendMedia(
      workspace,
      phone,
      mediaUrl,
      mediaType,
      caption,
    );
    await logMessage(
      workspaceId,
      phone,
      "outbound",
      mediaType,
      caption || mediaUrl,
      result.messages?.[0]?.id,
    );
    res.json({ success: true, messageId: result.messages?.[0]?.id });
  } catch (err) {
    logger.error("Send media error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /send-interactive (buttons / list)
app.post("/send-interactive", async (req, res) => {
  try {
    const { workspaceId, phone, interactive } = req.body;
    const workspace = await getWorkspace(workspaceId);
    const result = await wabaClient.sendInteractive(
      workspace,
      phone,
      interactive,
    );
    res.json({ success: true, messageId: result.messages?.[0]?.id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /send-bulk — Batch message sending
app.post("/send-bulk", async (req, res) => {
  try {
    const { workspaceId, campaignId, recipients, template, message } = req.body;
    const workspace = await getWorkspace(workspaceId);
    let sent = 0,
      failed = 0;

    for (const recipient of recipients) {
      try {
        if (template) {
          await wabaClient.sendTemplate(
            workspace,
            recipient.phone,
            template,
            recipient.variables || {},
          );
        } else {
          await wabaClient.sendText(workspace, recipient.phone, message);
        }
        sent++;
        // Throttle: 50ms between messages to respect WABA limits
        await new Promise((r) => setTimeout(r, 50));
      } catch (e) {
        failed++;
        logger.error(`Bulk send failed for ${recipient.phone}:`, e.message);
      }
    }

    if (campaignId) {
      await db.query(
        "UPDATE campaigns SET sent_count=$1, failed_count=$2, status=$3, completed_at=NOW() WHERE id=$4",
        [sent, failed, "completed", campaignId],
      );
    }

    res.json({ success: true, sent, failed });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /mark-delivered (called from webhook handler)
app.post("/mark-delivered", async (req, res) => {
  try {
    const { wabaMessageId, status, timestamp } = req.body;
    const field =
      status === "delivered"
        ? "delivered_at"
        : status === "read"
          ? "read_at"
          : "sent_at";
    await db.query(
      `UPDATE messages SET status=$1, ${field}=$2 WHERE waba_message_id=$3`,
      [status, new Date(timestamp * 1000), wabaMessageId],
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper: fetch workspace credentials
async function getWorkspace(workspaceId) {
  const result = await db.query("SELECT * FROM workspaces WHERE id=$1", [
    workspaceId,
  ]);
  if (!result.rows.length) throw new Error("Workspace not found");
  return result.rows[0];
}

// Helper: log message to DB
async function logMessage(
  workspaceId,
  phone,
  direction,
  type,
  content,
  wabaId,
) {
  try {
    // Get or create contact
    const contact = await db.query(
      `INSERT INTO contacts (workspace_id, phone) VALUES ($1,$2)
       ON CONFLICT (workspace_id, phone) DO UPDATE SET last_contacted_at=NOW() RETURNING id`,
      [workspaceId, phone],
    );
    await db.query(
      `INSERT INTO messages (workspace_id, contact_id, direction, type, content, waba_message_id, status, sent_at)
       VALUES ($1,$2,$3,$4,$5,$6,'sent',NOW())`,
      [workspaceId, contact.rows[0].id, direction, type, content, wabaId],
    );
  } catch (err) {
    logger.error("Log message error:", err.message);
  }
}

app.listen(PORT, () =>
  logger.info(`Messaging Service running on port ${PORT}`),
);
module.exports = app;
