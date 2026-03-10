/**
 * WhatsApp Automation Platform — JavaScript SDK
 * npm install whatsapp-automation-sdk
 */

class WAClient {
  constructor() {
    this.apiKey = null;
    this.baseUrl = null;
    this._eventHandlers = {};
  }

  /**
   * Initialize the SDK
   * @param {Object} config - { apiKey, baseUrl }
   */
  init({ apiKey, baseUrl = "https://api.yourplatform.com/v1" }) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, "");
    return this;
  }

  /** Build request headers */
  _headers() {
    return {
      "Content-Type": "application/json",
      "x-api-key": this.apiKey,
    };
  }

  /** Core HTTP request */
  async _request(method, path, body = null) {
    const url = `${this.baseUrl}${path}`;
    const options = {
      method,
      headers: this._headers(),
    };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(url, options);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "API request failed");
    return data;
  }

  // ============================================================
  // Messaging
  // ============================================================

  /**
   * Send a text message
   * @param {string} phone - Recipient phone (e.g. "919876543210")
   * @param {string} message - Message text
   */
  async send({ phone, message }) {
    return this._request("POST", "/messages/send", { phone, message });
  }

  /**
   * Send a template message
   * @param {string} phone
   * @param {string} template - Template name
   * @param {Object} variables - Template variable values
   */
  async sendTemplate({ phone, template, variables = {}, language = "en" }) {
    return this._request("POST", "/messages/send-template", {
      phone,
      template,
      variables,
      language,
    });
  }

  /**
   * Send a media message (image, video, document)
   */
  async sendMedia({ phone, mediaUrl, mediaType, caption }) {
    return this._request("POST", "/messages/send-media", {
      phone,
      mediaUrl,
      mediaType,
      caption,
    });
  }

  /**
   * Send bulk messages (for campaigns)
   * @param {Array} recipients - [{phone, name, variables}]
   */
  async sendBulk({ recipients, template, message }) {
    return this._request("POST", "/messages/send-bulk", {
      recipients,
      template,
      message,
    });
  }

  // ============================================================
  // Events
  // ============================================================

  /** Trigger order created event → automation fires */
  async orderCreated({
    orderId,
    customerPhone,
    customerName,
    products,
    amount,
  }) {
    return this._request("POST", "/event/order-created", {
      order_id: orderId,
      customer_phone: customerPhone,
      customer_name: customerName,
      products,
      amount,
    });
  }

  /** Trigger abandoned cart event */
  async cartAbandoned({
    customerPhone,
    customerName,
    cartItems,
    cartTotal,
    recoveryUrl,
  }) {
    return this._request("POST", "/event/cart-abandoned", {
      customer_phone: customerPhone,
      customer_name: customerName,
      cart_items: cartItems,
      cart_total: cartTotal,
      recovery_url: recoveryUrl,
    });
  }

  /** Trigger order shipped event */
  async orderShipped({
    orderId,
    customerPhone,
    trackingNumber,
    trackingUrl,
    courier,
  }) {
    return this._request("POST", "/event/order-shipped", {
      order_id: orderId,
      customer_phone: customerPhone,
      tracking_number: trackingNumber,
      tracking_url: trackingUrl,
      courier,
    });
  }

  /** Trigger order delivered */
  async orderDelivered({ orderId, customerPhone, customerName }) {
    return this._request("POST", "/event/order-delivered", {
      order_id: orderId,
      customer_phone: customerPhone,
      customer_name: customerName,
    });
  }

  /** Trigger custom event */
  async trigger({ eventName, phone, data = {} }) {
    return this._request("POST", "/event/custom", {
      event_name: eventName,
      phone,
      data,
    });
  }

  // ============================================================
  // Contacts
  // ============================================================

  async createContact({ phone, name, email, tags = [] }) {
    return this._request("POST", "/contacts", { phone, name, email, tags });
  }

  async getContacts({ page = 1, limit = 50, search, tag } = {}) {
    const params = new URLSearchParams({
      page,
      limit,
      ...(search && { search }),
      ...(tag && { tag }),
    });
    return this._request("GET", `/contacts?${params}`);
  }

  async importContacts(contacts) {
    return this._request("POST", "/contacts/import", { contacts });
  }

  // ============================================================
  // Templates
  // ============================================================

  async getTemplates() {
    return this._request("GET", "/templates");
  }

  async createTemplate({
    name,
    category,
    bodyText,
    headerText,
    footerText,
    buttons = [],
    variables = [],
  }) {
    return this._request("POST", "/templates", {
      name,
      category,
      body_text: bodyText,
      header_text: headerText,
      footer_text: footerText,
      buttons,
      variables,
    });
  }

  // ============================================================
  // Analytics
  // ============================================================

  async getAnalytics({ days = 30 } = {}) {
    return this._request("GET", `/analytics/overview?days=${days}`);
  }

  async getMessagesChart({ days = 7 } = {}) {
    return this._request("GET", `/analytics/messages-chart?days=${days}`);
  }
}

// Export singleton
const WA = new WAClient();
module.exports = WA;
module.exports.WAClient = WAClient;

// Browser/CDN support
if (typeof window !== "undefined") window.WA = WA;
