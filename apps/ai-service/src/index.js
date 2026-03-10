require("dotenv").config();
const express = require("express");
const axios = require("axios");
const { logger, db } = require("./utils/shared");

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3004;

const MESSAGING_URL =
  process.env.MESSAGING_SERVICE_URL || "http://localhost:3002";

// In-memory conversation history (use Redis in production)
const conversationHistory = new Map();

app.get("/health", (req, res) =>
  res.json({ status: "ok", service: "ai-service" }),
);

/**
 * POST /chat — Process incoming WhatsApp message through AI chatbot
 * Called by the webhook handler for every inbound message
 */
app.post("/chat", async (req, res) => {
  try {
    const { workspaceId, phone, message, wabaMessageId } = req.body;

    // Get workspace AI config
    const wsResult = await db.query("SELECT * FROM workspaces WHERE id=$1", [
      workspaceId,
    ]);
    const workspace = wsResult.rows[0];

    // Get conversation history
    const histKey = `${workspaceId}:${phone}`;
    const history = conversationHistory.get(histKey) || [];

    // Build messages for OpenAI
    const systemPrompt = buildSystemPrompt(workspace);
    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-10), // keep last 10 messages for context
      { role: "user", content: message },
    ];

    // Call OpenAI
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages,
        max_tokens: 500,
        temperature: 0.7,
      },
      { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } },
    );

    const aiReply = response.data.choices[0].message.content;

    // Update history
    history.push({ role: "user", content: message });
    history.push({ role: "assistant", content: aiReply });
    conversationHistory.set(histKey, history.slice(-20));

    // Send reply via WhatsApp
    await axios.post(`${MESSAGING_URL}/send`, {
      workspaceId,
      phone,
      message: aiReply,
    });

    // Check for special intents (product search, order booking)
    await handleIntents(workspaceId, phone, message, aiReply);

    res.json({ success: true, reply: aiReply });
  } catch (err) {
    logger.error("AI chat error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /product-search — Natural language product search
 */
app.post("/product-search", async (req, res) => {
  try {
    const { workspaceId, phone, query, products } = req.body;

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a product search assistant. Given a user query and product catalog, return the top 3 matching products as a numbered list. Format: "1. ProductName - ₹Price"`,
          },
          {
            role: "user",
            content: `Query: "${query}"\n\nProducts catalog:\n${JSON.stringify(products?.slice(0, 50))}`,
          },
        ],
        max_tokens: 300,
      },
      { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } },
    );

    const resultText = response.data.choices[0].message.content;

    // Send results via WhatsApp
    await axios.post(`${MESSAGING_URL}/send`, {
      workspaceId,
      phone,
      message: resultText,
    });

    res.json({ success: true, results: resultText });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /summarize — Summarize a conversation
 */
app.post("/summarize", async (req, res) => {
  try {
    const { messages } = req.body;
    const conversationText = messages
      .map(
        (m) =>
          `${m.direction === "inbound" ? "Customer" : "Bot"}: ${m.content}`,
      )
      .join("\n");

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Summarize this customer service conversation in 2-3 sentences. Highlight key issues, resolutions, and sentiment.",
          },
          { role: "user", content: conversationText },
        ],
        max_tokens: 200,
      },
      { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } },
    );

    res.json({
      success: true,
      summary: response.data.choices[0].message.content,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /generate-template — AI generates a WhatsApp template from description
 */
app.post("/generate-template", async (req, res) => {
  try {
    const { description, category } = req.body;
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Generate a WhatsApp Business API approved template message. Category: ${category}. Use {{1}}, {{2}} for variables. Keep it under 1024 chars. Return JSON: {name, body_text, header_text, variables[]}`,
          },
          { role: "user", content: description },
        ],
        max_tokens: 400,
        response_format: { type: "json_object" },
      },
      { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } },
    );

    const template = JSON.parse(response.data.choices[0].message.content);
    res.json({ success: true, template });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Build AI system prompt based on workspace settings
 */
function buildSystemPrompt(workspace) {
  return `You are a helpful WhatsApp assistant for ${workspace?.name || "this business"}.
You help customers with:
- Product information and recommendations
- Order status and tracking
- Returns and refunds
- General support questions

Guidelines:
- Keep responses concise (2-4 sentences max for WhatsApp)
- Be friendly and professional
- If you cannot help, offer to connect with a human agent
- Don't make up order details or prices
- Use emojis sparingly for a professional tone`;
}

/**
 * Detect special intents and trigger appropriate actions
 */
async function handleIntents(workspaceId, phone, userMessage, aiReply) {
  const lowerMsg = userMessage.toLowerCase();
  // Detect "speak to human" intent
  if (
    lowerMsg.includes("human") ||
    lowerMsg.includes("agent") ||
    lowerMsg.includes("person")
  ) {
    await db.query(
      `UPDATE conversations SET assigned_to=NULL, status='open'
       WHERE workspace_id=$1 AND contact_id=(SELECT id FROM contacts WHERE workspace_id=$1 AND phone=$2 LIMIT 1)`,
      [workspaceId, phone],
    );
  }
}

app.listen(PORT, () => logger.info(`AI Service running on port ${PORT}`));
module.exports = app;
