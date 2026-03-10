# 🚀 WhatsApp Platform — Hostinger Business Hosting Deployment Guide

# Domain: digitalatlus.in

---

## 📋 Technology Stack Overview

| Layer               | Technology                 | Why                                          |
| ------------------- | -------------------------- | -------------------------------------------- |
| **Frontend**        | React (Vite static build)  | Fastest load, CDN-friendly                   |
| **Backend API**     | Node.js 18+ + Express      | Required for all microservices               |
| **Database**        | MySQL 8.0                  | Hostinger Business default — free & included |
| **Cache/Queue**     | Upstash Redis + QStash     | Cloud-hosted free tier — no server needed    |
| **Process Manager** | PM2                        | Keeps Node.js alive + auto-restart on crash  |
| **Web Server**      | Apache (Hostinger default) | Routes static files + Node.js reverse proxy  |
| **SSL**             | Let's Encrypt (free)       | Managed via Hostinger control panel          |
| **WhatsApp**        | Meta Cloud API (WABA)      | Official, free — no WhatsApp hosting needed  |

> ⚠️ **Important**: Hostinger **Business Hosting** supports Node.js apps via SSH. All 6 microservices can be combined OR you can use a **Hostinger VPS** (KVM 2 plan, ~$6/mo) for full control with PM2 and separate ports.

---

## 📁 Part 1: Build the Project Locally

Run these commands on your local machine before uploading:

```bash
# 1. Install all dependencies
cd C:\Users\SAM\Downloads\1\temp\whatsapp-platform
npm install

# 2. Build the React dashboard (creates apps/dashboard/dist/)
cd apps/dashboard
npm install
npm run build
cd ../..

# 3. Install API gateway dependencies
cd apps/api-gateway
npm install
cd ../..
```

---

## 🗄️ Part 2: Database Setup (MySQL on Hostinger)

### Step 2.1 — Create MySQL Database in Hostinger Panel

1. Log in to **hPanel** (hpanel.hostinger.com)
2. Find your hosting → **Databases** → **MySQL Databases**
3. Click **Create a new database**
   - **Database name**: `digitalatlus_wa` (Hostinger will prefix with your username: `u123456789_wa`)
   - **Username**: `digitalatlus_admin` (will be prefixed too)
   - **Password**: Use a strong password (store it safely — you'll need it in `.env`)
4. Click **Create** and **note down**:
   - Full database name: `u123456789_wa`
   - Full username: `u123456789_admin`
   - Password: (your password)
   - Host: `127.0.0.1` (same server)

### Step 2.2 — Import the Schema

1. In hPanel → **Databases** → **phpMyAdmin**
2. Click your new database in the left panel
3. Click **Import** tab
4. Click **Choose File** → select `whatsapp-platform/schema.sql`
5. Click **Go**

✅ You should see "10 tables created successfully"

### Step 2.3 — Verify Tables

In phpMyAdmin, click your database and confirm these tables exist:

- `users`, `workspaces`, `contacts`, `messages`, `templates`
- `campaigns`, `automations`, `api_keys`, `analytics_events`, `conversations`

---

## 📤 Part 3: Upload Files to Hostinger

### Step 3.1 — Upload Frontend (React Dashboard)

This goes into your `public_html/` (or a subdirectory if digitalatlus.in is already used):

**Option A: Dashboard at root (digitalatlus.in/)**

```
Upload: apps/dashboard/dist/* → public_html/
```

**Option B: Dashboard at subdomain (app.digitalatlus.in/)**

1. In hPanel → **Domains** → **Subdomains** → Create `app.digitalatlus.in`
2. Set root folder to: `public_html/app/`
3. Upload: `apps/dashboard/dist/*` → `public_html/app/`

### Step 3.2 — Upload Backend (Node.js API)

Connect via **SSH** or use **File Manager** in hPanel:

```
Upload entire folder: apps/api-gateway/ → /home/u123456789/api-gateway/
```

> **SSH Access**: hPanel → **Advanced** → **SSH Access** → Enable → Connect with PuTTY or Terminal

```bash
# Connect via SSH
ssh u123456789@digitalatlus.in -p 65002

# Create the app folder
mkdir -p ~/api-gateway && cd ~/api-gateway

# Upload via scp (from your local machine in a NEW terminal):
scp -r -P 65002 C:/Users/SAM/Downloads/1/temp/whatsapp-platform/apps/api-gateway/* u123456789@digitalatlus.in:~/api-gateway/
```

---

## ⚙️ Part 4: Environment Variables

### Step 4.1 — Create .env file on server

```bash
# Via SSH:
cd ~/api-gateway
nano .env
```

Paste this (replace all values with your actual values):

```env
PORT=3001
NODE_ENV=production

# ─── Database (MySQL on Hostinger) ───────────────────────────────────────
# Note: Hostinger uses MySQL, not PostgreSQL — use mysql2 package
DATABASE_URL=mysql://u123456789_admin:YOUR_DB_PASSWORD@127.0.0.1:3306/u123456789_wa

# ─── JWT ─────────────────────────────────────────────────────────────────
JWT_SECRET=PASTE_A_RANDOM_64_CHAR_STRING_HERE
JWT_EXPIRES_IN=7d

# ─── WhatsApp Business API ────────────────────────────────────────────────
WABA_ACCESS_TOKEN=your_meta_system_user_token
WABA_PHONE_NUMBER_ID=your_phone_number_id
WABA_BUSINESS_ACCOUNT_ID=your_waba_business_account_id
WABA_WEBHOOK_VERIFY_TOKEN=your_chosen_webhook_verify_token

# ─── Upstash Redis (free at upstash.com) ─────────────────────────────────
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_token

# ─── Upstash QStash ──────────────────────────────────────────────────────
QSTASH_TOKEN=your_qstash_token

# ─── Frontend / CORS ─────────────────────────────────────────────────────
FRONTEND_URL=https://digitalatlus.in
ALLOWED_ORIGINS=https://digitalatlus.in,https://app.digitalatlus.in

# ─── OpenAI (for AI chatbot) ─────────────────────────────────────────────
OPENAI_API_KEY=your_openai_key
```

**Save**: Press `Ctrl+X` → `Y` → `Enter`

### Step 4.2 — Install MySQL2 Package (replaces pg)

The project uses PostgreSQL (`pg` package). On Hostinger MySQL, switch the DB driver:

```bash
cd ~/api-gateway
npm install mysql2
```

Then update `src/utils/db.js` to use MySQL:

```bash
nano src/utils/db.js
```

Replace with:

```javascript
const mysql = require("mysql2/promise");
const { logger } = require("./logger");

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const db = {
  query: async (text, params) => {
    // Convert PostgreSQL $1, $2 placeholders to MySQL ? placeholders
    const mysqlText = text.replace(/\$(\d+)/g, "?");
    const [rows] = await pool.execute(mysqlText, params);
    return { rows: Array.isArray(rows) ? rows : [rows] };
  },
  getClient: () => pool.getConnection(),
};

pool
  .getConnection()
  .then((conn) => {
    logger.info("MySQL connected successfully");
    conn.release();
  })
  .catch((err) => logger.error("MySQL connection failed:", err.message));

module.exports = { db, pool };
```

---

## 🔄 Part 5: Set Up PM2 Process Manager

```bash
# Install PM2 globally (via SSH)
npm install -g pm2

# Start the API gateway
cd ~/api-gateway
pm2 start src/index.js --name "wa-api" --env production

# Save PM2 config so it restarts on server reboot
pm2 save
pm2 startup  # Follow the printed instructions to set up auto-start

# Check it's running
pm2 status
pm2 logs wa-api --lines 50
```

---

## 🔀 Part 6: Configure Apache Reverse Proxy

This routes `/api/*` requests to your Node.js app:

### Step 6.1 — Create/Edit .htaccess

**In hPanel File Manager**, open `public_html/.htaccess` and add:

```apache
# ─── React SPA routing (handle client-side routes) ───────────────────────────
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # Don't rewrite files that exist
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d

  # Route /api/* to Node.js backend on port 3001
  RewriteRule ^api/(.*) http://127.0.0.1:3001/api/$1 [P,L]

  # Route /webhooks/* to Node.js
  RewriteRule ^webhooks/(.*) http://127.0.0.1:3001/webhooks/$1 [P,L]

  # All other routes → React app (index.html)
  RewriteRule . /index.html [L]
</IfModule>

# ─── Security headers ─────────────────────────────────────────────────────────
<IfModule mod_headers.c>
  Header always set X-Content-Type-Options "nosniff"
  Header always set X-Frame-Options "SAMEORIGIN"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

# ─── Compression ──────────────────────────────────────────────────────────────
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json
</IfModule>

# ─── Cache static assets ──────────────────────────────────────────────────────
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType image/png "access plus 1 month"
  ExpiresByType image/webp "access plus 1 month"
</IfModule>
```

### Step 6.2 — Create Dashboard .env for Production

In `apps/dashboard/`, create `.env` with:

```env
VITE_API_URL=https://digitalatlus.in
VITE_WEBHOOK_URL=https://digitalatlus.in
VITE_APP_NAME=WhatsApp Platform
```

Then rebuild locally and re-upload `dist/`:

```bash
cd apps/dashboard
npm run build
# Upload dist/* to public_html/ again
```

---

## 🔒 Part 7: SSL Setup (HTTPS)

1. In **hPanel** → **Security** → **SSL/TLS** → **digitalatlus.in**
2. Click **Install SSL**
3. Select **Let's Encrypt** (free, auto-renews every 90 days)
4. Click **Install**

✅ Your site will now be accessible at `https://digitalatlus.in`

---

## 🌐 Part 8: Domain DNS Configuration

If `digitalatlus.in` is registered through Hostinger, DNS is auto-configured.

If registered elsewhere, point these DNS records to Hostinger:

| Type  | Name  | Value                                                 |
| ----- | ----- | ----------------------------------------------------- |
| A     | `@`   | Hostinger IP (shown in hPanel → Domains)              |
| A     | `www` | Same Hostinger IP                                     |
| CNAME | `app` | `digitalatlus.in` (for app.digitalatlus.in subdomain) |

---

## 📱 Part 9: WhatsApp Webhook Registration

After deployment, register your webhook with Meta:

1. Go to **Meta Developer Console** → your App → **WhatsApp** → **Configuration**
2. **Webhook URL**: `https://digitalatlus.in/webhooks/whatsapp`
3. **Verify Token**: (the token you set in Settings → Business Info → Webhook Verify Token)
4. **Subscribed fields**: `messages`, `message_deliveries`, `message_reads`, `messaging_postbacks`
5. Click **Verify and Save**

---

## ✅ Part 10: Post-Deployment Checklist

After everything is uploaded, verify each item:

| #   | Check                                | Expected Result                                   |
| --- | ------------------------------------ | ------------------------------------------------- |
| 1   | `https://digitalatlus.in`            | React dashboard loads                             |
| 2   | `https://digitalatlus.in/api/health` | `{"status":"ok","service":"api-gateway"}`         |
| 3   | **Settings → WhatsApp API (Live)**   | Test connection returns phone name ✅             |
| 4   | **Settings → Webhook**               | Shows `https://digitalatlus.in/webhooks/whatsapp` |
| 5   | Meta Webhook verification            | Returns 200 OK with challenge                     |
| 6   | Login with `admin@digitalatlus.in`   | Logs in successfully                              |
| 7   | `pm2 status` (via SSH)               | `wa-api` shows `online`                           |
| 8   | SSL padlock                          | Green lock in browser                             |

---

## 🔧 Common Issues & Fixes

| Problem                                  | Solution                                                                            |
| ---------------------------------------- | ----------------------------------------------------------------------------------- |
| `502 Bad Gateway` on `/api/*`            | PM2 app crashed — run `pm2 restart wa-api` and check `pm2 logs wa-api`              |
| Database connection failed               | Check `.env` DATABASE_URL — confirm hostname is `127.0.0.1` not `localhost`         |
| WhatsApp test fails with "Invalid OAuth" | Token expired — generate a new System User permanent token in Meta Business Manager |
| React app shows blank page               | Check `.htaccess` exists and `mod_rewrite` is enabled in hPanel                     |
| CORS errors in browser                   | Add `https://digitalatlus.in` to `ALLOWED_ORIGINS` in `.env` and restart PM2        |
| Webhook verification fails               | Confirm `WABA_WEBHOOK_VERIFY_TOKEN` in `.env` matches what you set in Meta Console  |

---

## 📞 Support Resources

- **Hostinger Support**: 24/7 live chat at hpanel.hostinger.com
- **Meta API Docs**: [developers.facebook.com/docs/whatsapp](https://developers.facebook.com/docs/whatsapp)
- **Upstash Free Redis**: [upstash.com](https://upstash.com) — create free Redis & QStash
- **PM2 Docs**: [pm2.keymetrics.io](https://pm2.keymetrics.io)
