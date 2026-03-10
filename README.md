<div align="center">
  <h1>💬 WApp Flow</h1>
  <p><strong>Universal WhatsApp Automation Platform</strong></p>
  <p>Bulk messaging · AI Chatbot · Campaigns · CRM · Analytics</p>
  <br/>
  <img src="https://img.shields.io/badge/Meta_WhatsApp_API-25D366?style=flat&logo=whatsapp&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=flat&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/MySQL-8.0-4479A1?style=flat&logo=mysql&logoColor=white" />
</div>

---

## 🚀 What is WApp Flow?

WApp Flow is a full-stack WhatsApp Business Cloud API platform for **DigitalAtlus** (`digitalatlus.in`) that lets you:

- 📤 **Bulk Messaging** — send to thousands of contacts
- 🤖 **AI Chatbot** — GPT-powered automatic replies
- 📢 **Campaigns** — scheduled broadcast with templates
- 👥 **CRM** — contacts, tags, and segments
- ⚡ **Automations** — trigger-based workflow engine
- 📊 **Analytics** — delivery, read rates, conversion
- 🔗 **Webhooks** — real-time WhatsApp events
- 🛒 **Shopify Plugin** — cart recovery, order notifications

---

## 📁 Project Structure

```
wapp-flow/
├── apps/
│   ├── dashboard/         ← React + Vite frontend
│   ├── api-gateway/       ← Node.js + Express backend
│   ├── messaging-service/
│   ├── automation-engine/
│   ├── ai-service/
│   ├── analytics-service/
│   └── webhook-handler/
├── packages/sdk/          ← JavaScript SDK
├── plugins/shopify/       ← Shopify app
├── schema.sql             ← MySQL 8.0 schema (import in phpMyAdmin)
└── HOSTINGER_DEPLOY.md    ← Production deployment guide
```

---

## ⚡ Quick Start (Local)

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/wapp-flow.git
cd wapp-flow

# 2. Install dependencies
npm install

# 3. Configure environment
cp apps/api-gateway/.env.example apps/api-gateway/.env
cp apps/dashboard/.env.example   apps/dashboard/.env
# Edit both files with your credentials

# 4. Start dashboard (frontend)
cd apps/dashboard && npm run dev
# → http://localhost:5173

# 5. Start API gateway (backend) — new terminal
cd apps/api-gateway && node src/index.js
# → http://localhost:3001
```

---

## 🔑 Required Environment Variables

**`apps/api-gateway/.env`**

```env
PORT=3001
DATABASE_URL=mysql://user:pass@127.0.0.1:3306/wapp_flow
JWT_SECRET=64_char_random_string
WABA_ACCESS_TOKEN=your_meta_system_user_token
WABA_PHONE_NUMBER_ID=your_phone_number_id
WABA_BUSINESS_ACCOUNT_ID=your_waba_id
ALLOWED_ORIGINS=http://localhost:5173
```

**`apps/dashboard/.env`**

```env
VITE_WEBHOOK_URL=https://digitalatlus.in
VITE_APP_NAME=WApp Flow
```

---

## 🌐 Production Deployment

See **[HOSTINGER_DEPLOY.md](./HOSTINGER_DEPLOY.md)** for the complete Hostinger guide.

---

## 🔒 Security Features

- Helmet.js with strict CSP, HSTS
- JWT + API Key authentication
- Strict CORS allowlist
- XSS body sanitizer
- Rate limiting (10 auth/15min)
- SQL injection logging
- Graceful SIGTERM shutdown

---

<div align="center">
  Built for <strong>DigitalAtlus</strong> · Powered by <strong>Meta WhatsApp Business Cloud API</strong>
</div>
