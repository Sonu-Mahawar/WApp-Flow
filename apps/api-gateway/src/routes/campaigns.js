const express = require("express");
const router = express.Router();
const { db } = require("../utils/db");
const axios = require("axios");

const MESSAGING_URL =
  process.env.MESSAGING_SERVICE_URL || "http://localhost:3002";

// GET /api/v1/campaigns
router.get("/", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM campaigns WHERE workspace_id=$1 ORDER BY created_at DESC",
      [req.workspaceId],
    );
    res.json({ success: true, campaigns: result.rows });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch campaigns" });
  }
});

// POST /api/v1/campaigns
router.post("/", async (req, res) => {
  try {
    const { name, template_id, segment_filter = {}, scheduled_at } = req.body;
    if (!name || !template_id)
      return res
        .status(400)
        .json({ success: false, error: "name, template_id required" });

    const result = await db.query(
      `INSERT INTO campaigns (workspace_id, name, template_id, segment_filter, scheduled_at, status)
       VALUES ($1,$2,$3,$4,$5,'draft') RETURNING *`,
      [
        req.workspaceId,
        name,
        template_id,
        JSON.stringify(segment_filter),
        scheduled_at || null,
      ],
    );
    res.status(201).json({ success: true, campaign: result.rows[0] });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: "Failed to create campaign" });
  }
});

// POST /api/v1/campaigns/:id/launch
router.post("/:id/launch", async (req, res) => {
  try {
    const campaign = await db.query(
      `SELECT c.*, t.name as template_name, t.body_text FROM campaigns c
       LEFT JOIN templates t ON c.template_id = t.id
       WHERE c.id=$1 AND c.workspace_id=$2`,
      [req.params.id, req.workspaceId],
    );

    if (!campaign.rows.length)
      return res
        .status(404)
        .json({ success: false, error: "Campaign not found" });

    // Build contact list based on segment filter
    let contactQuery =
      "SELECT phone, name FROM contacts WHERE workspace_id=$1 AND opted_in=true";
    const params = [req.workspaceId];
    const filter = campaign.rows[0].segment_filter;
    if (filter?.tags?.length) {
      params.push(filter.tags);
      contactQuery += ` AND tags && $${params.length}`;
    }

    const contacts = await db.query(contactQuery, params);
    const totalCount = contacts.rows.length;

    // Update campaign status
    await db.query(
      "UPDATE campaigns SET status=$1, started_at=NOW(), total_count=$2 WHERE id=$3",
      ["running", totalCount, req.params.id],
    );

    // Send to messaging service (batch)
    await axios.post(`${MESSAGING_URL}/send-bulk`, {
      workspaceId: req.workspaceId,
      campaignId: req.params.id,
      recipients: contacts.rows,
      template: campaign.rows[0].template_name,
    });

    res.json({ success: true, message: "Campaign launched", totalCount });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: "Failed to launch campaign" });
  }
});

// GET /api/v1/campaigns/:id/stats
router.get("/:id/stats", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT total_count, sent_count, failed_count, status,
       (SELECT COUNT(*) FROM analytics_events WHERE campaign_id=$1 AND event_type='delivered') as delivered,
       (SELECT COUNT(*) FROM analytics_events WHERE campaign_id=$1 AND event_type='read') as read_count,
       (SELECT COUNT(*) FROM analytics_events WHERE campaign_id=$1 AND event_type='clicked') as clicked
       FROM campaigns WHERE id=$1 AND workspace_id=$2`,
      [req.params.id, req.workspaceId],
    );
    res.json({ success: true, stats: result.rows[0] });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch campaign stats" });
  }
});

// DELETE /api/v1/campaigns/:id
router.delete("/:id", async (req, res) => {
  try {
    await db.query(
      "DELETE FROM campaigns WHERE id=$1 AND workspace_id=$2 AND status='draft'",
      [req.params.id, req.workspaceId],
    );
    res.json({ success: true, message: "Campaign deleted" });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: "Failed to delete campaign" });
  }
});

module.exports = router;
