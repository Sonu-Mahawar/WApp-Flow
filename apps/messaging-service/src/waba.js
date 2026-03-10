const axios = require("axios");
const { logger } = require("./utils/logger");

const GRAPH_API = "https://graph.facebook.com/v19.0";

/**
 * Send plain text message via WhatsApp Business API
 */
async function sendText(workspace, phone, message) {
  const response = await axios.post(
    `${GRAPH_API}/${workspace.whatsapp_phone_number_id}/messages`,
    {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: phone,
      type: "text",
      text: { preview_url: false, body: message },
    },
    { headers: buildHeaders(workspace) },
  );
  logger.info(`Message sent to ${phone}:`, response.data);
  return response.data;
}

/**
 * Send template message
 */
async function sendTemplate(
  workspace,
  phone,
  templateName,
  variables = {},
  language = "en",
) {
  // Build components from variables object
  const paramValues = Object.values(variables).map((v) => ({
    type: "text",
    text: String(v),
  }));
  const components =
    paramValues.length > 0 ? [{ type: "body", parameters: paramValues }] : [];

  const response = await axios.post(
    `${GRAPH_API}/${workspace.whatsapp_phone_number_id}/messages`,
    {
      messaging_product: "whatsapp",
      to: phone,
      type: "template",
      template: {
        name: templateName,
        language: { code: language },
        components,
      },
    },
    { headers: buildHeaders(workspace) },
  );
  return response.data;
}

/**
 * Send media message (image, video, document, audio)
 */
async function sendMedia(workspace, phone, mediaUrl, mediaType, caption = "") {
  const typeMap = {
    image: "image",
    video: "video",
    pdf: "document",
    audio: "audio",
    document: "document",
  };
  const waType = typeMap[mediaType] || "image";

  const payload = {
    messaging_product: "whatsapp",
    to: phone,
    type: waType,
    [waType]: { link: mediaUrl, caption },
  };

  const response = await axios.post(
    `${GRAPH_API}/${workspace.whatsapp_phone_number_id}/messages`,
    payload,
    { headers: buildHeaders(workspace) },
  );
  return response.data;
}

/**
 * Send interactive message (buttons or list)
 */
async function sendInteractive(workspace, phone, interactive) {
  const response = await axios.post(
    `${GRAPH_API}/${workspace.whatsapp_phone_number_id}/messages`,
    {
      messaging_product: "whatsapp",
      to: phone,
      type: "interactive",
      interactive,
    },
    { headers: buildHeaders(workspace) },
  );
  return response.data;
}

/**
 * Send product cards (for AI product search results)
 */
async function sendProductCards(workspace, phone, products) {
  // Build button message with product list
  const buttons = products.slice(0, 3).map((p, i) => ({
    type: "reply",
    reply: { id: `product_${p.id}`, title: p.name.slice(0, 20) },
  }));

  return sendInteractive(workspace, phone, {
    type: "button",
    body: {
      text: `Here are matching products:\n\n${products.map((p, i) => `${i + 1}. *${p.name}* - ₹${p.price}`).join("\n")}`,
    },
    action: { buttons },
  });
}

/**
 * Mark message as read
 */
async function markRead(workspace, messageId) {
  await axios.post(
    `${GRAPH_API}/${workspace.whatsapp_phone_number_id}/messages`,
    { messaging_product: "whatsapp", status: "read", message_id: messageId },
    { headers: buildHeaders(workspace) },
  );
}

function buildHeaders(workspace) {
  return {
    Authorization: `Bearer ${workspace.waba_access_token}`,
    "Content-Type": "application/json",
  };
}

module.exports = {
  sendText,
  sendTemplate,
  sendMedia,
  sendInteractive,
  sendProductCards,
  markRead,
};
