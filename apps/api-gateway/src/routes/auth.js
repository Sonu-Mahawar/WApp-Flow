const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { db } = require("../utils/db");
const { logger } = require("../utils/logger");
const { validate, schemas } = require("../middleware/validate");

// POST /api/v1/auth/register
router.post("/register", validate(schemas.register), async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res
        .status(400)
        .json({ success: false, error: "name, email, password required" });

    const existing = await db.query("SELECT id FROM users WHERE email=$1", [
      email,
    ]);
    if (existing.rows.length)
      return res
        .status(409)
        .json({ success: false, error: "Email already registered" });

    const password_hash = await bcrypt.hash(password, 12);
    const userResult = await db.query(
      "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email",
      [name, email, password_hash],
    );
    const user = userResult.rows[0];

    // Create default workspace
    const wsResult = await db.query(
      "INSERT INTO workspaces (user_id, name) VALUES ($1, $2) RETURNING id",
      [user.id, `${name}'s Workspace`],
    );

    const token = jwt.sign(
      { userId: user.id, email: user.email, workspaceId: wsResult.rows[0].id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
    );

    res
      .status(201)
      .json({ success: true, token, user, workspaceId: wsResult.rows[0].id });
  } catch (err) {
    logger.error("Register error:", err);
    res.status(500).json({ success: false, error: "Registration failed" });
  }
});

// POST /api/v1/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ success: false, error: "email and password required" });

    const result = await db.query(
      "SELECT u.*, w.id as workspace_id FROM users u LEFT JOIN workspaces w ON w.user_id = u.id WHERE u.email=$1 LIMIT 1",
      [email],
    );
    if (!result.rows.length)
      return res
        .status(401)
        .json({ success: false, error: "Invalid credentials" });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res
        .status(401)
        .json({ success: false, error: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user.id, email: user.email, workspaceId: user.workspace_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
    );

    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email },
      workspaceId: user.workspace_id,
    });
  } catch (err) {
    logger.error("Login error:", err);
    res.status(500).json({ success: false, error: "Login failed" });
  }
});

// POST /api/v1/auth/refresh
router.post("/refresh", async (req, res) => {
  const { token } = req.body;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const newToken = jwt.sign(
      {
        userId: decoded.userId,
        email: decoded.email,
        workspaceId: decoded.workspaceId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );
    res.json({ success: true, token: newToken });
  } catch {
    res.status(401).json({ success: false, error: "Invalid token" });
  }
});

// GET /api/v1/auth/me
router.get(
  "/me",
  require("../middleware/auth").authenticate,
  async (req, res) => {
    try {
      const result = await db.query(
        "SELECT id, name, email, plan, created_at FROM users WHERE id=$1",
        [req.user?.userId],
      );
      res.json({ success: true, user: result.rows[0] });
    } catch (err) {
      res.status(500).json({ success: false, error: "Failed to fetch user" });
    }
  },
);

module.exports = router;
