const express = require("express");
const router = express.Router();
const { db } = require("../utils/db");

// GET /api/v1/analytics/overview
router.get("/overview", async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date(
      Date.now() - days * 24 * 60 * 60 * 1000,
    ).toISOString();

    const [msgSent, msgDelivered, msgRead, contacts, campaigns] =
      await Promise.all([
        db.query(
          `SELECT COUNT(*) FROM messages WHERE workspace_id=$1 AND direction='outbound' AND created_at >= $2`,
          [req.workspaceId, since],
        ),
        db.query(
          `SELECT COUNT(*) FROM messages WHERE workspace_id=$1 AND status='delivered' AND created_at >= $2`,
          [req.workspaceId, since],
        ),
        db.query(
          `SELECT COUNT(*) FROM messages WHERE workspace_id=$1 AND status='read' AND created_at >= $2`,
          [req.workspaceId, since],
        ),
        db.query(`SELECT COUNT(*) FROM contacts WHERE workspace_id=$1`, [
          req.workspaceId,
        ]),
        db.query(
          `SELECT COUNT(*) FROM campaigns WHERE workspace_id=$1 AND status='completed' AND created_at >= $2`,
          [req.workspaceId, since],
        ),
      ]);

    const sent = +msgSent.rows[0].count;
    const delivered = +msgDelivered.rows[0].count;
    const read = +msgRead.rows[0].count;

    res.json({
      success: true,
      metrics: {
        messages_sent: sent,
        delivery_rate: sent > 0 ? ((delivered / sent) * 100).toFixed(1) : 0,
        read_rate: delivered > 0 ? ((read / delivered) * 100).toFixed(1) : 0,
        total_contacts: +contacts.rows[0].count,
        campaigns_completed: +campaigns.rows[0].count,
      },
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch analytics" });
  }
});

// GET /api/v1/analytics/messages-chart (daily message volume)
router.get("/messages-chart", async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const result = await db.query(
      `SELECT DATE(created_at) as date, COUNT(*) as total,
       SUM(CASE WHEN direction='outbound' THEN 1 ELSE 0 END) as sent,
       SUM(CASE WHEN direction='inbound' THEN 1 ELSE 0 END) as received
       FROM messages WHERE workspace_id=$1 AND created_at >= NOW() - INTERVAL '${+days} days'
       GROUP BY DATE(created_at) ORDER BY date ASC`,
      [req.workspaceId],
    );
    res.json({ success: true, chart: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch chart" });
  }
});

// GET /api/v1/analytics/top-contacts
router.get("/top-contacts", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.phone, c.name, COUNT(m.id) as message_count
       FROM contacts c LEFT JOIN messages m ON m.contact_id = c.id
       WHERE c.workspace_id=$1 GROUP BY c.id ORDER BY message_count DESC LIMIT 10`,
      [req.workspaceId],
    );
    res.json({ success: true, contacts: result.rows });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch top contacts" });
  }
});

// GET /api/v1/analytics/conversion-rate
router.get("/conversion-rate", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
       COUNT(CASE WHEN event_type='order-created' THEN 1 END) as orders,
       COUNT(CASE WHEN event_type='cart-abandoned' THEN 1 END) as abandoned_carts,
       COUNT(CASE WHEN event_type='cart-recovered' THEN 1 END) as recovered_carts
       FROM analytics_events WHERE workspace_id=$1 AND created_at >= NOW() - INTERVAL '30 days'`,
      [req.workspaceId],
    );
    const row = result.rows[0];
    const conversionRate =
      row.abandoned_carts > 0
        ? ((row.recovered_carts / row.abandoned_carts) * 100).toFixed(1)
        : 0;
    res.json({ success: true, ...row, conversion_rate: conversionRate });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch conversion rate" });
  }
});

module.exports = router;
