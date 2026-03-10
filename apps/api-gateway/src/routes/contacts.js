const express = require("express");
const router = express.Router();
const { db } = require("../utils/db");
const { logger } = require("../utils/logger");

// GET /api/v1/contacts
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 50, search, tag } = req.query;
    const offset = (page - 1) * limit;
    let query = "SELECT * FROM contacts WHERE workspace_id = $1";
    const params = [req.workspaceId];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name ILIKE $${params.length} OR phone ILIKE $${params.length})`;
    }
    if (tag) {
      params.push(tag);
      query += ` AND $${params.length} = ANY(tags)`;
    }
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    const countResult = await db.query(
      "SELECT COUNT(*) FROM contacts WHERE workspace_id=$1",
      [req.workspaceId],
    );
    res.json({
      success: true,
      contacts: result.rows,
      total: +countResult.rows[0].count,
      page: +page,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch contacts" });
  }
});

// GET /api/v1/contacts/:id
router.get("/:id", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM contacts WHERE id=$1 AND workspace_id=$2",
      [req.params.id, req.workspaceId],
    );
    if (!result.rows.length)
      return res
        .status(404)
        .json({ success: false, error: "Contact not found" });
    res.json({ success: true, contact: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch contact" });
  }
});

// POST /api/v1/contacts
router.post("/", async (req, res) => {
  try {
    const { phone, name, email, tags = [], custom_fields = {} } = req.body;
    if (!phone)
      return res.status(400).json({ success: false, error: "phone required" });

    const result = await db.query(
      `INSERT INTO contacts (workspace_id, phone, name, email, tags, custom_fields)
       VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (workspace_id, phone)
       DO UPDATE SET name=EXCLUDED.name, email=EXCLUDED.email, tags=EXCLUDED.tags, custom_fields=EXCLUDED.custom_fields
       RETURNING *`,
      [
        req.workspaceId,
        phone,
        name,
        email,
        tags,
        JSON.stringify(custom_fields),
      ],
    );
    res.status(201).json({ success: true, contact: result.rows[0] });
  } catch (err) {
    logger.error("Create contact error:", err);
    res.status(500).json({ success: false, error: "Failed to create contact" });
  }
});

// PUT /api/v1/contacts/:id
router.put("/:id", async (req, res) => {
  try {
    const { name, email, tags, custom_fields, opted_in } = req.body;
    const result = await db.query(
      `UPDATE contacts SET name=COALESCE($1,name), email=COALESCE($2,email),
       tags=COALESCE($3,tags), custom_fields=COALESCE($4,custom_fields),
       opted_in=COALESCE($5,opted_in) WHERE id=$6 AND workspace_id=$7 RETURNING *`,
      [
        name,
        email,
        tags,
        JSON.stringify(custom_fields),
        opted_in,
        req.params.id,
        req.workspaceId,
      ],
    );
    if (!result.rows.length)
      return res
        .status(404)
        .json({ success: false, error: "Contact not found" });
    res.json({ success: true, contact: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to update contact" });
  }
});

// DELETE /api/v1/contacts/:id
router.delete("/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM contacts WHERE id=$1 AND workspace_id=$2", [
      req.params.id,
      req.workspaceId,
    ]);
    res.json({ success: true, message: "Contact deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to delete contact" });
  }
});

// POST /api/v1/contacts/import (bulk import from CSV data)
router.post("/import", async (req, res) => {
  try {
    const { contacts } = req.body; // [{phone, name, email, tags}]
    if (!contacts || !Array.isArray(contacts))
      return res
        .status(400)
        .json({ success: false, error: "contacts array required" });

    let imported = 0;
    for (const c of contacts) {
      if (!c.phone) continue;
      await db.query(
        `INSERT INTO contacts (workspace_id, phone, name, email, tags)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (workspace_id, phone) DO UPDATE SET name=EXCLUDED.name`,
        [req.workspaceId, c.phone, c.name, c.email, c.tags || []],
      );
      imported++;
    }
    res.json({ success: true, imported, total: contacts.length });
  } catch (err) {
    logger.error("Import contacts error:", err);
    res.status(500).json({ success: false, error: "Import failed" });
  }
});

module.exports = router;
