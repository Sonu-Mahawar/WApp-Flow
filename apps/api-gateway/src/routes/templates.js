const express = require("express");
const router = express.Router();
const { db } = require("../utils/db");

// GET /api/v1/templates
router.get("/", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM templates WHERE workspace_id=$1 ORDER BY created_at DESC",
      [req.workspaceId],
    );
    res.json({ success: true, templates: result.rows });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch templates" });
  }
});

// POST /api/v1/templates
router.post("/", async (req, res) => {
  try {
    const {
      name,
      category,
      language = "en",
      body_text,
      header_text,
      footer_text,
      buttons = [],
      variables = [],
    } = req.body;
    if (!name || !category || !body_text)
      return res
        .status(400)
        .json({ success: false, error: "name, category, body_text required" });

    const result = await db.query(
      `INSERT INTO templates (workspace_id, name, category, language, body_text, header_text, footer_text, buttons, variables)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        req.workspaceId,
        name,
        category,
        language,
        body_text,
        header_text,
        footer_text,
        JSON.stringify(buttons),
        JSON.stringify(variables),
      ],
    );
    res.status(201).json({ success: true, template: result.rows[0] });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: "Failed to create template" });
  }
});

// PUT /api/v1/templates/:id
router.put("/:id", async (req, res) => {
  try {
    const { name, body_text, header_text, footer_text, buttons, variables } =
      req.body;
    const result = await db.query(
      `UPDATE templates SET name=COALESCE($1,name), body_text=COALESCE($2,body_text),
       header_text=COALESCE($3,header_text), footer_text=COALESCE($4,footer_text),
       buttons=COALESCE($5,buttons), variables=COALESCE($6,variables)
       WHERE id=$7 AND workspace_id=$8 RETURNING *`,
      [
        name,
        body_text,
        header_text,
        footer_text,
        buttons ? JSON.stringify(buttons) : null,
        variables ? JSON.stringify(variables) : null,
        req.params.id,
        req.workspaceId,
      ],
    );
    if (!result.rows.length)
      return res
        .status(404)
        .json({ success: false, error: "Template not found" });
    res.json({ success: true, template: result.rows[0] });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: "Failed to update template" });
  }
});

// DELETE /api/v1/templates/:id
router.delete("/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM templates WHERE id=$1 AND workspace_id=$2", [
      req.params.id,
      req.workspaceId,
    ]);
    res.json({ success: true, message: "Template deleted" });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: "Failed to delete template" });
  }
});

module.exports = router;
