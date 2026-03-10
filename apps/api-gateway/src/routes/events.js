const express = require("express");
const router = express.Router();
const { db } = require("../utils/db");
const axios = require("axios");
const { logger } = require("../utils/logger");

const AUTOMATION_URL =
  process.env.AUTOMATION_ENGINE_URL || "http://localhost:3003";

// POST /api/v1/event/order-created
router.post("/order-created", async (req, res) => {
  try {
    const {
      order_id,
      customer_phone,
      customer_name,
      products,
      amount,
      currency = "INR",
    } = req.body;
    if (!order_id || !customer_phone)
      return res
        .status(400)
        .json({
          success: false,
          error: "order_id and customer_phone required",
        });

    await axios.post(`${AUTOMATION_URL}/trigger`, {
      workspaceId: req.workspaceId,
      event: "order-created",
      data: {
        order_id,
        customer_phone,
        customer_name,
        products,
        amount,
        currency,
      },
    });

    res.json({
      success: true,
      message: "Order created event triggered",
      event: "order-created",
    });
  } catch (err) {
    logger.error("Event order-created error:", err.message);
    res.status(500).json({ success: false, error: "Failed to trigger event" });
  }
});

// POST /api/v1/event/cart-abandoned
router.post("/cart-abandoned", async (req, res) => {
  try {
    const {
      customer_phone,
      customer_name,
      cart_items,
      cart_total,
      recovery_url,
    } = req.body;
    await axios.post(`${AUTOMATION_URL}/trigger`, {
      workspaceId: req.workspaceId,
      event: "cart-abandoned",
      data: {
        customer_phone,
        customer_name,
        cart_items,
        cart_total,
        recovery_url,
      },
    });
    res.json({ success: true, event: "cart-abandoned" });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to trigger event" });
  }
});

// POST /api/v1/event/order-shipped
router.post("/order-shipped", async (req, res) => {
  try {
    const { order_id, customer_phone, tracking_number, tracking_url, courier } =
      req.body;
    await axios.post(`${AUTOMATION_URL}/trigger`, {
      workspaceId: req.workspaceId,
      event: "order-shipped",
      data: {
        order_id,
        customer_phone,
        tracking_number,
        tracking_url,
        courier,
      },
    });
    res.json({ success: true, event: "order-shipped" });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to trigger event" });
  }
});

// POST /api/v1/event/order-delivered
router.post("/order-delivered", async (req, res) => {
  try {
    const { order_id, customer_phone, customer_name } = req.body;
    await axios.post(`${AUTOMATION_URL}/trigger`, {
      workspaceId: req.workspaceId,
      event: "order-delivered",
      data: { order_id, customer_phone, customer_name },
    });
    res.json({ success: true, event: "order-delivered" });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to trigger event" });
  }
});

// POST /api/v1/event/order-cancelled
router.post("/order-cancelled", async (req, res) => {
  try {
    const { order_id, customer_phone, reason } = req.body;
    await axios.post(`${AUTOMATION_URL}/trigger`, {
      workspaceId: req.workspaceId,
      event: "order-cancelled",
      data: { order_id, customer_phone, reason },
    });
    res.json({ success: true, event: "order-cancelled" });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to trigger event" });
  }
});

// POST /api/v1/event/payment-pending (COD confirmation)
router.post("/payment-pending", async (req, res) => {
  try {
    const { order_id, customer_phone, amount, payment_link } = req.body;
    await axios.post(`${AUTOMATION_URL}/trigger`, {
      workspaceId: req.workspaceId,
      event: "payment-pending",
      data: { order_id, customer_phone, amount, payment_link },
    });
    res.json({ success: true, event: "payment-pending" });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to trigger event" });
  }
});

// POST /api/v1/event/back-in-stock
router.post("/back-in-stock", async (req, res) => {
  try {
    const { product_id, product_name, product_url, notify_phones } = req.body;
    await axios.post(`${AUTOMATION_URL}/trigger`, {
      workspaceId: req.workspaceId,
      event: "back-in-stock",
      data: { product_id, product_name, product_url, notify_phones },
    });
    res.json({ success: true, event: "back-in-stock" });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to trigger event" });
  }
});

// POST /api/v1/event/review-request
router.post("/review-request", async (req, res) => {
  try {
    const { order_id, customer_phone, review_url } = req.body;
    await axios.post(`${AUTOMATION_URL}/trigger`, {
      workspaceId: req.workspaceId,
      event: "review-request",
      data: { order_id, customer_phone, review_url },
    });
    res.json({ success: true, event: "review-request" });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to trigger event" });
  }
});

// POST /api/v1/event/custom
router.post("/custom", async (req, res) => {
  try {
    const { event_name, phone, data = {} } = req.body;
    if (!event_name || !phone)
      return res
        .status(400)
        .json({ success: false, error: "event_name and phone required" });
    await axios.post(`${AUTOMATION_URL}/trigger`, {
      workspaceId: req.workspaceId,
      event: event_name,
      data: { phone, ...data },
    });
    res.json({ success: true, event: event_name });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: "Failed to trigger custom event" });
  }
});

module.exports = router;
