require("dotenv").config();
const express = require("express");
const { logger, db } = require("./utils/shared");

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3005;

app.get("/health", (req, res) =>
  res.json({ status: "ok", service: "analytics-service" }),
);

// POST /track — Record an analytics event
app.post("/track", async (req, res) => {
  try {
    const {
      workspaceId,
      event_type,
      message_id,
      campaign_id,
      contact_id,
      metadata = {},
    } = req.body;
    await db.query(
      `INSERT INTO analytics_events (workspace_id, event_type, message_id, campaign_id, contact_id, metadata)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        workspaceId,
        event_type,
        message_id || null,
        campaign_id || null,
        contact_id || null,
        JSON.stringify(metadata),
      ],
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /report/:workspaceId — Full analytics report
app.get("/report/:workspaceId", async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { days = 30 } = req.query;

    const [events, msgStats, contactGrowth] = await Promise.all([
      db.query(
        `SELECT event_type, COUNT(*) as count FROM analytics_events
         WHERE workspace_id=$1 AND created_at >= NOW()-INTERVAL '${+days} days'
         GROUP BY event_type ORDER BY count DESC`,
        [workspaceId],
      ),
      db.query(
        `SELECT DATE(created_at) as date, COUNT(*) as sent,
         SUM(CASE WHEN status='delivered' THEN 1 ELSE 0 END) as delivered,
         SUM(CASE WHEN status='read' THEN 1 ELSE 0 END) as read
         FROM messages WHERE workspace_id=$1 AND direction='outbound'
         AND created_at >= NOW()-INTERVAL '${+days} days'
         GROUP BY DATE(created_at) ORDER BY date`,
        [workspaceId],
      ),
      db.query(
        `SELECT DATE(created_at) as date, COUNT(*) as new_contacts
         FROM contacts WHERE workspace_id=$1
         AND created_at >= NOW()-INTERVAL '${+days} days'
         GROUP BY DATE(created_at) ORDER BY date`,
        [workspaceId],
      ),
    ]);

    res.json({
      success: true,
      events: events.rows,
      messageStats: msgStats.rows,
      contactGrowth: contactGrowth.rows,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () =>
  logger.info(`Analytics Service running on port ${PORT}`),
);
module.exports = app;
