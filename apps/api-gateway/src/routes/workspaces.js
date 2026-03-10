const express = require("express");
const router = express.Router();
const { db } = require("../utils/db");
const { logger } = require("../utils/logger");
const https = require("https");

const GRAPH_API_VERSION = "v19.0";

// ─── Helper: Ping Meta Graph API ──────────────────────────────────────────────
async function pingMetaAPI(phoneNumberId, accessToken) {
  return new Promise((resolve) => {
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,status,code_verification_status&access_token=${accessToken}`;
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve({ error: { message: "Invalid response from Meta API" } });
          }
        });
      })
      .on("error", (err) => {
        resolve({ error: { message: err.message } });
      });
  });
}

// GET /api/v1/workspaces/current
router.get("/current", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT w.*, u.name as owner_name, u.email as owner_email
       FROM workspaces w JOIN users u ON w.user_id = u.id WHERE w.id=$1`,
      [req.workspaceId],
    );
    if (!result.rows.length)
      return res
        .status(404)
        .json({ success: false, error: "Workspace not found" });
    const workspace = result.rows[0];
    // Replace access token with a masked indicator for UI display
    workspace.has_waba_token = !!workspace.waba_access_token;
    delete workspace.waba_access_token;
    res.json({ success: true, workspace });
  } catch (err) {
    logger.error("Get workspace error:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch workspace" });
  }
});

// PUT /api/v1/workspaces/current — Update WABA credentials & settings
router.put("/current", async (req, res) => {
  try {
    const {
      name,
      whatsapp_phone_number,
      whatsapp_phone_number_id,
      whatsapp_business_account_id,
      waba_access_token,
      webhook_verify_token,
    } = req.body;

    const result = await db.query(
      `UPDATE workspaces SET
       name=COALESCE($1,name),
       whatsapp_phone_number=COALESCE($2,whatsapp_phone_number),
       whatsapp_phone_number_id=COALESCE($3,whatsapp_phone_number_id),
       whatsapp_business_account_id=COALESCE($4,whatsapp_business_account_id),
       waba_access_token=COALESCE($5,waba_access_token),
       webhook_verify_token=COALESCE($6,webhook_verify_token),
       updated_at=NOW()
       WHERE id=$7 RETURNING id, name, whatsapp_phone_number, whatsapp_phone_number_id, whatsapp_business_account_id, webhook_verify_token`,
      [
        name,
        whatsapp_phone_number,
        whatsapp_phone_number_id,
        whatsapp_business_account_id,
        waba_access_token,
        webhook_verify_token,
        req.workspaceId,
      ],
    );
    logger.info(`Workspace ${req.workspaceId} updated WABA credentials`);
    res.json({ success: true, workspace: result.rows[0] });
  } catch (err) {
    logger.error("Update workspace error:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to update workspace" });
  }
});

// GET /api/v1/workspaces/waba/health — Live check of WABA credentials against Meta API
router.get("/waba/health", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT whatsapp_phone_number_id, waba_access_token, whatsapp_business_account_id
       FROM workspaces WHERE id=$1`,
      [req.workspaceId],
    );
    if (!result.rows.length)
      return res
        .status(404)
        .json({ success: false, error: "Workspace not found" });

    const { whatsapp_phone_number_id, waba_access_token } = result.rows[0];
    if (!whatsapp_phone_number_id || !waba_access_token) {
      return res.json({
        success: true,
        connected: false,
        reason:
          "WABA credentials not configured. Go to Settings → WhatsApp API (Live) to add them.",
      });
    }

    const data = await pingMetaAPI(whatsapp_phone_number_id, waba_access_token);

    if (data.error) {
      const errMsg = data.error.message || "Unknown Meta API error";
      let hint = "";
      if (errMsg.includes("Invalid OAuth access token")) {
        hint =
          "Your access token is invalid or expired. Generate a new System User token in Meta Business Manager.";
      } else if (errMsg.includes("does not exist")) {
        hint =
          "Phone Number ID not found. Verify it in Meta Developer Console → WhatsApp → Getting Started.";
      } else if (errMsg.includes("OAuthException")) {
        hint =
          "OAuth error — token may be expired. Use a permanent System User token for production.";
      } else {
        hint = "Check your credentials in Settings → WhatsApp API (Live).";
      }
      return res.json({
        success: true,
        connected: false,
        error: errMsg,
        hint,
        checkedAt: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      connected: true,
      phoneNumber: data.display_phone_number,
      verifiedName: data.verified_name,
      qualityRating: data.quality_rating,
      status: data.status,
      codeVerificationStatus: data.code_verification_status,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error("WABA health check error:", err);
    res.status(500).json({ success: false, error: "Health check failed" });
  }
});

// POST /api/v1/workspaces/waba/test — One-time test without saving (from Settings UI)
router.post("/waba/test", async (req, res) => {
  try {
    const { phoneNumberId, accessToken } = req.body;
    if (!phoneNumberId || !accessToken)
      return res
        .status(400)
        .json({
          success: false,
          error: "phoneNumberId and accessToken required",
        });

    const data = await pingMetaAPI(phoneNumberId, accessToken);

    if (data.error) {
      return res.json({
        success: false,
        error: data.error.message || "Meta API error",
        code: data.error.code,
      });
    }

    res.json({
      success: true,
      phoneNumber: data.display_phone_number,
      verifiedName: data.verified_name,
      qualityRating: data.quality_rating || "UNKNOWN",
      status: data.status || "CONNECTED",
    });
  } catch (err) {
    logger.error("WABA test error:", err);
    res.status(500).json({ success: false, error: "Test failed" });
  }
});

module.exports = router;
