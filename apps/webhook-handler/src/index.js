require("dotenv").config();
const express = require("express");
const crypto = require("crypto");
const { logger, db } = require("./utils/shared");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3006;

const MESSAGING_URL =
  process.env.MESSAGING_SERVICE_URL || "http://localhost:3002";
const AI_URL = process.env.AI_SERVICE_URL || "http://localhost:3004";
const AUTOMATION_URL =
  process.env.AUTOMATION_ENGINE_URL || "http://localhost:3003";

// Raw body needed for HMAC verification
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.get("/health", (req, res) =>
  res.json({ status: "ok", service: "webhook-handler" }),
);

// ============================================================
// WhatsApp Business API Webhook (Meta)
// ============================================================

// GET /webhooks/whatsapp — Webhook verification
app.get("/webhooks/whatsapp", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.WABA_WEBHOOK_VERIFY_TOKEN) {
    logger.info("WhatsApp webhook verified");
    return res.status(200).send(challenge);
  }
  res.status(403).json({ error: "Forbidden" });
});

// POST /webhooks/whatsapp — Receive messages and status updates
app.post("/webhooks/whatsapp", async (req, res) => {
  try {
    res.status(200).send("OK"); // Always respond 200 fast

    const body = req.body;
    if (body.object !== "whatsapp_business_account") return;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;

        // Incoming messages
        for (const message of value.messages || []) {
          await handleInboundMessage(
            value.metadata?.phone_number_id,
            message,
            value.contacts?.[0],
          );
        }

        // Status updates (delivered, read, failed)
        for (const status of value.statuses || []) {
          await handleStatusUpdate(status);
        }
      }
    }
  } catch (err) {
    logger.error("WhatsApp webhook error:", err);
  }
});

async function handleInboundMessage(phoneNumberId, message, contact) {
  try {
    // Find workspace by phone number ID
    const wsResult = await db.query(
      "SELECT id FROM workspaces WHERE whatsapp_phone_number_id=$1",
      [phoneNumberId],
    );
    if (!wsResult.rows.length) return;

    const workspaceId = wsResult.rows[0].id;
    const phone = message.from;
    const text = message.text?.body || message.button?.text || "[media]";

    // Save contact + message to DB
    await db.query(
      `INSERT INTO contacts (workspace_id, phone, name) VALUES ($1,$2,$3)
       ON CONFLICT (workspace_id, phone) DO UPDATE SET name=COALESCE(EXCLUDED.name, contacts.name), last_contacted_at=NOW()`,
      [workspaceId, phone, contact?.profile?.name],
    );
    await db.query(
      `INSERT INTO messages (workspace_id, direction, type, content, waba_message_id, status, sent_at)
       VALUES ($1,'inbound','text',$2,$3,'received',NOW())`,
      [workspaceId, text, message.id],
    );

    // Route to AI chatbot
    await axios.post(`${AI_URL}/chat`, {
      workspaceId,
      phone,
      message: text,
      wabaMessageId: message.id,
    });
  } catch (err) {
    logger.error("Handle inbound message error:", err.message);
  }
}

async function handleStatusUpdate(status) {
  try {
    await axios.post(`${MESSAGING_URL}/mark-delivered`, {
      wabaMessageId: status.id,
      status: status.status,
      timestamp: status.timestamp,
    });
  } catch (err) {
    logger.error("Handle status update error:", err.message);
  }
}

// ============================================================
// Shopify Webhooks
// ============================================================

// POST /webhooks/shopify/orders/create
app.post("/webhooks/shopify/orders/create", verifyShopify, async (req, res) => {
  res.status(200).send("OK");
  const order = req.body;
  const workspaceId = req.headers["x-workspace-id"];
  if (!workspaceId) return;

  await axios
    .post(`${AUTOMATION_URL}/trigger`, {
      workspaceId,
      event: "order-created",
      data: {
        order_id: order.order_number,
        customer_phone:
          order.billing_address?.phone || order.shipping_address?.phone,
        customer_name: order.customer?.first_name,
        products: order.line_items?.map((i) => i.title),
        amount: order.total_price,
        currency: order.currency,
      },
    })
    .catch((e) => logger.error("Shopify order trigger error:", e.message));
});

// POST /webhooks/shopify/checkouts/create (abandoned cart)
app.post(
  "/webhooks/shopify/checkouts/create",
  verifyShopify,
  async (req, res) => {
    res.status(200).send("OK");
    const checkout = req.body;
    const workspaceId = req.headers["x-workspace-id"];
    if (!workspaceId || !checkout.abandoned_checkout_url) return;

    // Wait 1hr then trigger (QStash for delays)
    await axios
      .post(`${AUTOMATION_URL}/trigger`, {
        workspaceId,
        event: "cart-abandoned",
        data: {
          customer_phone: checkout.billing_address?.phone,
          customer_name: checkout.billing_address?.first_name,
          cart_total: checkout.total_price,
          recovery_url: checkout.abandoned_checkout_url,
        },
      })
      .catch((e) => logger.error("Shopify cart trigger error:", e.message));
  },
);

// POST /webhooks/shopify/orders/fulfilled
app.post(
  "/webhooks/shopify/orders/fulfilled",
  verifyShopify,
  async (req, res) => {
    res.status(200).send("OK");
    const order = req.body;
    const workspaceId = req.headers["x-workspace-id"];
    if (!workspaceId) return;

    const tracking = order.fulfillments?.[0];
    await axios
      .post(`${AUTOMATION_URL}/trigger`, {
        workspaceId,
        event: "order-shipped",
        data: {
          order_id: order.order_number,
          customer_phone: order.billing_address?.phone,
          tracking_number: tracking?.tracking_number,
          courier: tracking?.tracking_company,
        },
      })
      .catch(() => {});
  },
);

// POST /webhooks/shopify/orders/cancelled
app.post(
  "/webhooks/shopify/orders/cancelled",
  verifyShopify,
  async (req, res) => {
    res.status(200).send("OK");
    const order = req.body;
    const workspaceId = req.headers["x-workspace-id"];
    await axios
      .post(`${AUTOMATION_URL}/trigger`, {
        workspaceId,
        event: "order-cancelled",
        data: {
          order_id: order.order_number,
          customer_phone: order.billing_address?.phone,
          reason: order.cancel_reason,
        },
      })
      .catch(() => {});
  },
);

// ============================================================
// WooCommerce Webhooks
// ============================================================

// POST /webhooks/woocommerce/order-created
app.post("/webhooks/woocommerce/order-created", async (req, res) => {
  res.status(200).send("OK");
  const order = req.body;
  const workspaceId = req.headers["x-workspace-id"];
  if (!workspaceId) return;

  await axios
    .post(`${AUTOMATION_URL}/trigger`, {
      workspaceId,
      event: "order-created",
      data: {
        order_id: order.id,
        customer_phone: order.billing?.phone,
        customer_name: order.billing?.first_name,
        products: order.line_items?.map((i) => i.name),
        amount: order.total,
      },
    })
    .catch(() => {});
});

// Shopify webhook HMAC verification
function verifyShopify(req, res, next) {
  const hmac = req.headers["x-shopify-hmac-sha256"];
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) return next(); // Skip in dev

  const digest = crypto
    .createHmac("sha256", secret)
    .update(req.rawBody)
    .digest("base64");
  if (digest !== hmac) return res.status(401).send("Unauthorized");
  next();
}

app.listen(PORT, () => logger.info(`Webhook Handler running on port ${PORT}`));
module.exports = app;
