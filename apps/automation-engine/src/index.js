require("dotenv").config();
const express = require("express");
const { logger, db } = require("./utils/shared");
const axios = require("axios");

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3003;

const MESSAGING_URL =
  process.env.MESSAGING_SERVICE_URL || "http://localhost:3002";

app.get("/health", (req, res) =>
  res.json({ status: "ok", service: "automation-engine" }),
);

/**
 * POST /trigger — Receive event and run matching automations
 */
app.post("/trigger", async (req, res) => {
  try {
    const { workspaceId, event, data } = req.body;
    if (!workspaceId || !event)
      return res
        .status(400)
        .json({ success: false, error: "workspaceId and event required" });

    // Find active automations matching this trigger
    const automations = await db.query(
      `SELECT * FROM automations WHERE workspace_id=$1 AND trigger_type=$2 AND is_active=true`,
      [workspaceId, event],
    );

    if (!automations.rows.length) {
      return res.json({
        success: true,
        message: "No active automations for this event",
        triggered: 0,
      });
    }

    let triggered = 0;
    for (const automation of automations.rows) {
      try {
        await runWorkflow(workspaceId, automation, data);
        triggered++;
      } catch (e) {
        logger.error(`Automation ${automation.id} failed:`, e.message);
      }
    }

    // Log analytics event
    await db.query(
      "INSERT INTO analytics_events (workspace_id, event_type, metadata) VALUES ($1,$2,$3)",
      [workspaceId, event, JSON.stringify(data)],
    );

    res.json({ success: true, triggered });
  } catch (err) {
    logger.error("Trigger error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Run a workflow: iterate steps with delays and conditionals
 */
async function runWorkflow(workspaceId, automation, data) {
  const steps = automation.workflow_steps || [];
  logger.info(
    `Running automation "${automation.name}" with ${steps.length} steps`,
  );

  for (const step of steps) {
    await executeStep(workspaceId, step, data);
  }
}

/**
 * Execute a single workflow step
 */
async function executeStep(workspaceId, step, data) {
  switch (step.type) {
    case "send_message":
      const phone = data.customer_phone || data.phone;
      if (!phone) break;
      const message = interpolate(step.message, data);
      await axios.post(`${MESSAGING_URL}/send`, {
        workspaceId,
        phone,
        message,
      });
      break;

    case "send_template":
      await axios.post(`${MESSAGING_URL}/send-template`, {
        workspaceId,
        phone: data.customer_phone || data.phone,
        template: step.template,
        variables: buildVariables(step.variables, data),
      });
      break;

    case "delay":
      // For Hostinger: schedule with setTimeout (works for short delays in same process)
      // For production use Upstash QStash for delayed jobs
      const delayMs = parseDelay(step.duration, step.unit);
      if (delayMs <= 60000) {
        await new Promise((r) => setTimeout(r, delayMs));
      } else {
        // Schedule via QStash for longer delays
        await scheduleDelayed(workspaceId, step, data, delayMs);
      }
      break;

    case "condition":
      const value = getNestedValue(data, step.field);
      const conditionMet = evaluateCondition(value, step.operator, step.value);
      if (conditionMet && step.then) {
        for (const thenStep of step.then) {
          await executeStep(workspaceId, thenStep, data);
        }
      } else if (!conditionMet && step.else) {
        for (const elseStep of step.else) {
          await executeStep(workspaceId, elseStep, data);
        }
      }
      break;

    case "update_contact":
      if (data.customer_phone) {
        await db.query(
          `UPDATE contacts SET tags = array_append(tags, $1) WHERE workspace_id=$2 AND phone=$3`,
          [step.tag, workspaceId, data.customer_phone],
        );
      }
      break;

    case "webhook":
      await axios.post(step.url, { event: step.event_name, ...data });
      break;

    default:
      logger.warn(`Unknown step type: ${step.type}`);
  }
}

/** Schedule a delayed step via Upstash QStash */
async function scheduleDelayed(workspaceId, step, data, delayMs) {
  if (!process.env.QSTASH_TOKEN) return;
  await axios.post(
    `https://qstash.upstash.io/v2/publish/${process.env.MESSAGING_SERVICE_URL}/send`,
    { workspaceId, ...step, data },
    {
      headers: {
        Authorization: `Bearer ${process.env.QSTASH_TOKEN}`,
        "Upstash-Delay": `${Math.round(delayMs / 1000)}s`,
      },
    },
  );
}

// Helpers
function interpolate(template, data) {
  return template?.replace(
    /\{\{(\w+)\}\}/g,
    (_, key) => data[key] || `{{${key}}}`,
  );
}
function buildVariables(varMap = {}, data) {
  return Object.fromEntries(
    Object.entries(varMap).map(([k, v]) => [k, data[v] || v]),
  );
}
function parseDelay(duration, unit) {
  const map = { seconds: 1000, minutes: 60000, hours: 3600000, days: 86400000 };
  return duration * (map[unit] || 1000);
}
function getNestedValue(obj, path) {
  return path?.split(".").reduce((o, k) => o?.[k], obj);
}
function evaluateCondition(value, operator, target) {
  switch (operator) {
    case "equals":
      return value == target;
    case "not_equals":
      return value != target;
    case "contains":
      return String(value).includes(target);
    case "greater_than":
      return +value > +target;
    case "less_than":
      return +value < +target;
    default:
      return false;
  }
}

// ============================================================
// Built-in Workflow Templates
// ============================================================

// GET /workflows/templates — Return pre-built automation templates
app.get("/workflows/templates", (req, res) => {
  res.json({
    success: true,
    templates: [
      {
        id: "order_confirmation",
        name: "Order Confirmation",
        trigger_type: "order-created",
        workflow_steps: [
          {
            type: "send_template",
            template: "order_confirmation",
            variables: {
              name: "customer_name",
              order_id: "order_id",
              amount: "amount",
            },
          },
          { type: "delay", duration: 24, unit: "hours" },
          { type: "send_template", template: "delivery_update" },
          { type: "delay", duration: 3, unit: "days" },
          {
            type: "send_template",
            template: "review_request",
            variables: { name: "customer_name", order_id: "order_id" },
          },
        ],
      },
      {
        id: "abandoned_cart",
        name: "Abandoned Cart Recovery",
        trigger_type: "cart-abandoned",
        workflow_steps: [
          { type: "delay", duration: 1, unit: "hours" },
          {
            type: "send_template",
            template: "cart_recovery",
            variables: {
              name: "customer_name",
              total: "cart_total",
              link: "recovery_url",
            },
          },
          { type: "delay", duration: 24, unit: "hours" },
          { type: "send_template", template: "cart_recovery_discount" },
        ],
      },
      {
        id: "shipping_updates",
        name: "Shipping Updates",
        trigger_type: "order-shipped",
        workflow_steps: [
          {
            type: "send_template",
            template: "order_shipped",
            variables: { tracking: "tracking_number", courier: "courier" },
          },
        ],
      },
      {
        id: "payment_reminder",
        name: "COD Payment Reminder",
        trigger_type: "payment-pending",
        workflow_steps: [
          {
            type: "send_template",
            template: "cod_confirmation",
            variables: { amount: "amount" },
          },
          { type: "delay", duration: 2, unit: "hours" },
          {
            type: "condition",
            field: "paid",
            operator: "equals",
            value: "false",
            then: [{ type: "send_template", template: "payment_reminder" }],
          },
        ],
      },
    ],
  });
});

app.listen(PORT, () =>
  logger.info(`Automation Engine running on port ${PORT}`),
);
module.exports = app;
