const express = require("express");
const router = express.Router();
const { db } = require("../utils/db");

// GET /api/v1/automations
router.get("/", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM automations WHERE workspace_id=$1 ORDER BY created_at DESC",
      [req.workspaceId],
    );
    res.json({ success: true, automations: result.rows });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch automations" });
  }
});

// POST /api/v1/automations
router.post("/", async (req, res) => {
  try {
    const {
      name,
      trigger_type,
      trigger_config = {},
      workflow_steps = [],
    } = req.body;
    if (!name || !trigger_type)
      return res
        .status(400)
        .json({ success: false, error: "name, trigger_type required" });

    const result = await db.query(
      `INSERT INTO automations (workspace_id, name, trigger_type, trigger_config, workflow_steps)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [
        req.workspaceId,
        name,
        trigger_type,
        JSON.stringify(trigger_config),
        JSON.stringify(workflow_steps),
      ],
    );
    res.status(201).json({ success: true, automation: result.rows[0] });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: "Failed to create automation" });
  }
});

// PUT /api/v1/automations/:id
router.put("/:id", async (req, res) => {
  try {
    const { name, trigger_config, workflow_steps, is_active } = req.body;
    const result = await db.query(
      `UPDATE automations SET name=COALESCE($1,name),
       trigger_config=COALESCE($2,trigger_config),
       workflow_steps=COALESCE($3,workflow_steps),
       is_active=COALESCE($4,is_active), updated_at=NOW()
       WHERE id=$5 AND workspace_id=$6 RETURNING *`,
      [
        name,
        JSON.stringify(trigger_config),
        JSON.stringify(workflow_steps),
        is_active,
        req.params.id,
        req.workspaceId,
      ],
    );
    if (!result.rows.length)
      return res
        .status(404)
        .json({ success: false, error: "Automation not found" });
    res.json({ success: true, automation: result.rows[0] });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: "Failed to update automation" });
  }
});

// PATCH /api/v1/automations/:id/toggle
router.patch("/:id/toggle", async (req, res) => {
  try {
    const result = await db.query(
      "UPDATE automations SET is_active = NOT is_active WHERE id=$1 AND workspace_id=$2 RETURNING id, is_active",
      [req.params.id, req.workspaceId],
    );
    res.json({ success: true, is_active: result.rows[0]?.is_active });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: "Failed to toggle automation" });
  }
});

// DELETE /api/v1/automations/:id
router.delete("/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM automations WHERE id=$1 AND workspace_id=$2", [
      req.params.id,
      req.workspaceId,
    ]);
    res.json({ success: true, message: "Automation deleted" });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: "Failed to delete automation" });
  }
});

module.exports = router;
