# WhatsApp Platform — Full Deployment & Live Hosting Guide

> **This platform works on live projects.** All 6 order automation flows (Order Confirmed, Dispatched, Cancelled, Tracking, Out for Delivery, Delivered) send real WhatsApp messages and emails when deployed with valid credentials.

---

## Table of Contents

1. [How Automations Work on Live Projects](#1-how-automations-work-on-live-projects)
2. [Prerequisites](#2-prerequisites)
3. [Local Development Setup](#3-local-development-setup)
4. [WhatsApp Business API Setup (Required for Live)](#4-whatsapp-business-api-setup)
5. [Environment Variables Reference](#5-environment-variables-reference)
6. [Upload Your Project to GitHub](#6-upload-your-project-to-github)
7. [Deploy to Hostinger VPS — Step by Step](#7-deploy-to-hostinger-vps)
8. [Deploy Full Stack to Railway (Easiest — 15 min)](#8-deploy-to-railway)
9. [Deploy Frontend to Vercel](#9-deploy-frontend-to-vercel)
10. [Domain, SSL & Nginx Setup](#10-domain-ssl--nginx-setup)
11. [Register Webhook with Meta](#11-register-webhook-with-meta)
12. [Trigger Order Automations from Your Website](#12-trigger-order-automations)
13. [Email Integration Setup](#13-email-integration)
14. [Invoice Generation Setup](#14-invoice-generation)
15. [Manual Automation Builder Guide](#15-manual-automation-builder)
16. [Shortcodes Reference](#16-shortcodes-reference)
17. [Troubleshooting FAQ](#17-troubleshooting-faq)

---

## 1. How Automations Work on Live Projects

```
Your E-commerce Store
       │
       │ POST /api/v1/event/trigger
       │ (HTTP request with order data)
       ▼
  API Gateway  ──────────────────────────────────────────────────
  (port 3001)                                                     │
       │ Reads automations from DB                               │
       │ Finds matching automation by trigger type               │
       ▼                                                         │
  Automation Engine                                              │
  (port 3003)                                                    │
       │ Executes steps:                                         │
       ├── send_whatsapp ──► Messaging Service ──► Meta Cloud API ──► Customer's Phone
       ├── send_email    ──► Nodemailer/Resend ──► Customer's Email
       └── send_invoice  ──► PDF generated    ──► Attached to email + WA link
```

**Key Requirement for Live Sending:**

- Go to **Settings → WhatsApp API (Live)** in your dashboard
- Enter your Phone Number ID + WABA ID + Access Token
- Click **Test Connection** — must show green success
- Click **Save Credentials**

---

## 2. Prerequisites

| Tool       | Version                 | Download                                 |
| ---------- | ----------------------- | ---------------------------------------- |
| Node.js    | v18+                    | [nodejs.org](https://nodejs.org)         |
| npm        | v9+                     | comes with Node.js                       |
| Git        | Latest                  | [git-scm.com](https://git-scm.com)       |
| PostgreSQL | v14+ (optional locally) | [postgresql.org](https://postgresql.org) |

> **⚡ Quick Start (Frontend Only):** The whole dashboard works without a database using browser localStorage. Just run `npm run dev` in `apps/dashboard` and you can configure everything including credentials.

---

## 3. Local Development Setup

```bash
# 1. Open terminal, go to project folder
cd "C:/Users/SAM/Downloads/1/temp/whatsapp-platform"

# 2. Install all packages
npm install

# 3. Start the dashboard (frontend only — works without backend)
cd apps/dashboard
npm run dev
# Opens at http://localhost:5175

# 4. (Optional) Start backend services
cd apps/api-gateway && node src/index.js    # API at port 3001
cd apps/messaging-service && node src/index.js  # Messaging at port 3002
cd apps/automation-engine && node src/index.js  # Automation at port 3003
```

---

## 4. WhatsApp Business API Setup

> This is required to send real WhatsApp messages. Takes about 30 minutes.

### Step 4.1 — Create Meta Developer Account

1. Open [developers.facebook.com](https://developers.facebook.com)
2. Click **Get Started** → Sign in with Facebook/Business account
3. Verify email and phone number

### Step 4.2 — Create a Meta App

1. Click **My Apps** → **Create App**
2. App Type: **Business** → Click Next
3. App Name: e.g. `My Order Notifications`
4. Business Account: Select or create → Click **Create App**

### Step 4.3 — Add WhatsApp Product

1. In your app dashboard, find **Products section**
2. Find **WhatsApp** → Click **Set Up**

### Step 4.4 — Set Up WhatsApp Business Account

1. Under **WhatsApp → Getting Started**
2. Click **Create a new business portfolio** → Enter business details
3. A test number is provided automatically

### Step 4.5 — Get Your Credentials

Go to **WhatsApp → Getting Started** and copy:

| Credential          | Where to find                               |
| ------------------- | ------------------------------------------- |
| **Phone Number ID** | Listed on the Getting Started page          |
| **WABA ID**         | "WhatsApp Business Account ID" on same page |
| **Access Token**    | Click "Generate Access Token" button        |

### Step 4.6 — Enter Credentials in Dashboard

1. Open your dashboard → **Settings → WhatsApp API (Live)** tab
2. Enter Phone Number ID, WABA ID, Access Token
3. Click **Test Connection** → should show `Connected! Number: +91xxx`
4. Click **Save Credentials**

### Step 4.7 — Add Your Real Phone Number (Production)

1. Meta Dashboard → **WhatsApp → Phone Numbers → Add Phone Number**
2. Enter your WhatsApp Business number with country code
3. Verify via SMS or voice call
4. **Note: Business verification takes 1-3 business days**

---

## 5. Environment Variables Reference

Create `apps/api-gateway/.env`:

```env
# ─── Server ──────────────────────────────────
PORT=3001
NODE_ENV=production

# ─── Database (PostgreSQL) ───────────────────
DATABASE_URL=postgresql://username:password@localhost:5432/whatsapp_platform

# ─── Authentication ──────────────────────────
JWT_SECRET=change_this_to_anything_random_and_long

# ─── WhatsApp Business API ───────────────────
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_waba_id
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxx
WHATSAPP_VERIFY_TOKEN=any_random_string_you_set

# ─── Email ───────────────────────────────────
# Option A: Gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourname@gmail.com
SMTP_PASS=your_16_char_app_password
EMAIL_FROM=orders@yourdomain.com

# Option B: Resend (production — recommended)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx

# ─── Services ────────────────────────────────
MESSAGING_SERVICE_URL=http://localhost:3002
AUTOMATION_ENGINE_URL=http://localhost:3003
ALLOWED_ORIGINS=https://yourdomain.com,http://localhost:5175
```

---

## 6. Upload Your Project to GitHub

```bash
# 1. Create a repository on github.com (click "New Repository")
# 2. In your project folder:
cd "C:/Users/SAM/Downloads/1/temp/whatsapp-platform"

git init
git add .
git commit -m "Initial commit — WhatsApp automation platform"

git remote add origin https://github.com/YOUR_USERNAME/whatsapp-platform.git
git branch -M main
git push -u origin main
```

> After pushing to GitHub, you can deploy with one click on Railway, Render, or link to Vercel.

---

## 7. Deploy to Hostinger VPS

> **Best for:** Full control + cheapest (₹500-1000/month). You own the server.

### Step 7.1 — Buy VPS on Hostinger

1. Go to [hostinger.in](https://www.hostinger.in) → VPS Hosting
2. Choose **KVM 1** (cheapest — ₹499/month) — gives 1 CPU, 4GB RAM
3. Select **Ubuntu 22.04** as OS
4. Complete payment → you get an IP address and root password

### Step 7.2 — Connect to VPS via SSH

```bash
# On Windows: open PowerShell or download PuTTY
ssh root@YOUR_VPS_IP_ADDRESS
# Enter the password from Hostinger email
```

### Step 7.3 — Install Node.js + Git + PM2

```bash
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs git nginx

# Install PM2 (keeps your app running 24/7)
npm install -g pm2
```

### Step 7.4 — Install PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql -c "CREATE USER wauser WITH PASSWORD 'YourStrongPassword123';"
sudo -u postgres psql -c "CREATE DATABASE whatsapp_platform OWNER wauser;"
```

### Step 7.5 — Clone Your GitHub Repo

```bash
cd /var/www
git clone https://github.com/YOUR_USERNAME/whatsapp-platform.git
cd whatsapp-platform
npm install
```

### Step 7.6 — Create .env File

```bash
cp apps/api-gateway/.env.example apps/api-gateway/.env
nano apps/api-gateway/.env
# Fill in all values (WABA credentials, DB, email, etc.)
# Press Ctrl+X, then Y to save
```

### Step 7.7 — Build Frontend

```bash
cd apps/dashboard
npm run build
# Creates: apps/dashboard/dist/ folder (your website files)
```

### Step 7.8 — Start Backend with PM2

```bash
cd /var/www/whatsapp-platform

# Create PM2 config
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'api-gateway',
      cwd: '/var/www/whatsapp-platform/apps/api-gateway',
      script: 'src/index.js',
      env: { NODE_ENV: 'production', PORT: 3001 }
    },
    {
      name: 'messaging-service',
      cwd: '/var/www/whatsapp-platform/apps/messaging-service',
      script: 'src/index.js',
      env: { NODE_ENV: 'production', PORT: 3002 }
    },
    {
      name: 'automation-engine',
      cwd: '/var/www/whatsapp-platform/apps/automation-engine',
      script: 'src/index.js',
      env: { NODE_ENV: 'production', PORT: 3003 }
    }
  ]
};
EOF

pm2 start ecosystem.config.js
pm2 save
pm2 startup          # Copy and run the command it shows
```

### Step 7.9 — Configure Nginx

```bash
nano /etc/nginx/sites-available/whatsapp
```

Paste this (replace `yourdomain.com` with your real domain):

```nginx
server {
    server_name yourdomain.com www.yourdomain.com;

    # Dashboard (React frontend)
    location / {
        root /var/www/whatsapp-platform/apps/dashboard/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }

    # WhatsApp Webhook (Meta will call this URL)
    location /webhooks/ {
        proxy_pass http://localhost:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/whatsapp /etc/nginx/sites-enabled/
nginx -t                  # Test config
systemctl reload nginx    # Apply
```

### Step 7.10 — Set Up Domain & Free SSL

```bash
# Point your domain to the VPS IP in your domain registrar's DNS settings
# Then install SSL certificate (free):
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
# Follow prompts — auto-renews every 90 days
```

---

## 8. Deploy to Railway (Easiest — 15 min)

> **Best for:** No DevOps knowledge required. Free tier available.

1. Go to [railway.app](https://railway.app) → Sign up with GitHub
2. Click **New Project** → **Deploy from GitHub Repo** → Select your repo
3. Click **+ New** → **Database** → **Add PostgreSQL** → Railway auto-connects it
4. Click your service → **Variables** → Add all env vars from Section 5
5. Set **Start Command** (under Settings): `node apps/api-gateway/src/index.js`
6. Railway auto-builds and deploys on every git push

**For multiple services (recommended):**

- Create 3 separate services in the same project
- api-gateway: `node apps/api-gateway/src/index.js`
- messaging-service: `node apps/messaging-service/src/index.js`
- automation-engine: `node apps/automation-engine/src/index.js`

---

## 9. Deploy Frontend to Vercel

> **Best for:** Dashboard UI (React app) — unlimited free hosting.

```bash
# Install Vercel CLI
npm i -g vercel

cd apps/dashboard
vercel

# Prompts:
# Set up? Y
# Which scope? (your account)
# Link to existing project? N
# Project name: whatsapp-dashboard
# Directory: ./
# Override build command? N (uses npm run build)
# Output dir? dist
```

**Set environment variable in Vercel dashboard:**

- `VITE_API_URL` = `https://your-api-gateway-railway-url.railway.app`

---

## 10. Domain, SSL & Nginx Setup

See Section 7.9 for full Nginx configuration.

**Quick DNS setup (in your domain registrar):**

```
Type    Name      Value
A       @         YOUR_VPS_IP
A       www       YOUR_VPS_IP
CNAME   api       your-railway-url.railway.app (if using Railway for backend)
```

---

## 11. Register Webhook with Meta

After deployment (your site must be live with HTTPS):

1. Meta Developer Dashboard → Your App → **WhatsApp → Configuration**
2. Under **Webhook**, click **Edit**
3. **Callback URL**: `https://yourdomain.com/webhooks/whatsapp`
4. **Verify Token**: Same as `WHATSAPP_VERIFY_TOKEN` in your `.env`
5. Click **Verify and Save**
6. Subscribe to fields:
   - ✅ `messages`
   - ✅ `message_deliveries`
   - ✅ `message_reads`
   - ✅ `messaging_postbacks`

---

## 12. Trigger Order Automations

### From WooCommerce (WordPress)

Add this to your `functions.php` or use a plugin like **WP Webhooks**:

```php
// Send order confirmation when WooCommerce order is created
add_action('woocommerce_checkout_order_created', function($order) {
    $payload = json_encode([
        'event' => 'order-created',
        'data' => [
            'customer_phone' => '91' . $order->get_billing_phone(),
            'customer_email' => $order->get_billing_email(),
            'name'           => $order->get_billing_first_name(),
            'order_id'       => 'ORD-' . $order->get_id(),
            'amount'         => $order->get_total(),
            'product'        => implode(', ', array_map(fn($i) => $i->get_name(), $order->get_items())),
            'delivery_date'  => date('d M Y', strtotime('+3 days')),
            'invoice_url'    => $order->get_checkout_order_received_url(),
        ]
    ]);
    wp_remote_post('https://yourdomain.com/api/v1/event/trigger', [
        'body'    => $payload,
        'headers' => ['Content-Type' => 'application/json', 'x-api-key' => 'YOUR_API_KEY'],
    ]);
});
```

### From Shopify

Add a Webhook in Shopify Admin → Settings → Notifications → Webhooks:

- **Topic**: `orders/create`
- **URL**: `https://yourdomain.com/api/v1/event/shopify-order`

Or use the REST API:

```bash
# Order Confirmed
curl -X POST https://yourdomain.com/api/v1/event/trigger \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "order-created",
    "data": {
      "customer_phone": "919876543210",
      "customer_email": "customer@email.com",
      "name": "Rahul Sharma",
      "order_id": "ORD-4821",
      "amount": "1499",
      "product": "Nike Air Max 270",
      "delivery_date": "15 Mar 2026",
      "invoice_url": "https://yourdomain.com/invoices/ORD-4821.pdf"
    }
  }'

# Order Shipped
curl -X POST https://yourdomain.com/api/v1/event/trigger \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "event": "order-shipped",
    "data": {
      "customer_phone": "919876543210",
      "name": "Rahul",
      "order_id": "ORD-4821",
      "courier": "BlueDart",
      "tracking_number": "BD123456789",
      "tracking_url": "https://track.bluedart.com/BD123456789",
      "delivery_date": "15 Mar"
    }
  }'

# Order Delivered + Invoice
curl -X POST https://yourdomain.com/api/v1/event/trigger \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "event": "order-delivered",
    "data": {
      "customer_phone": "919876543210",
      "customer_email": "customer@email.com",
      "name": "Rahul",
      "order_id": "ORD-4821",
      "amount": "1499",
      "invoice_url": "https://yourdomain.com/invoices/ORD-4821.pdf",
      "review_url": "https://g.page/r/your-review-link"
    }
  }'
```

### Available Events

| Event                    | When to call      | Required fields                                |
| ------------------------ | ----------------- | ---------------------------------------------- |
| `order-created`          | Order placed      | `customer_phone`, `order_id`, `amount`         |
| `order-shipped`          | Handed to courier | + `tracking_number`, `courier`, `tracking_url` |
| `order-cancelled`        | Order cancelled   | + `cancel_reason`, `refund_days`               |
| `order-out-for-delivery` | Out with driver   | + `driver_name`, `eta`                         |
| `order-delivered`        | Delivered         | + `invoice_url`, `review_url`                  |

---

## 13. Email Integration

### Option A: Gmail SMTP (Development/Testing)

1. Enable 2FA on your Google account
2. Go to account.google.com → Security → **App Passwords**
3. App: Mail, Device: Other → Generate → **Copy 16-character password**
4. Set in `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourname@gmail.com
SMTP_PASS=your16charpassword
```

### Option B: Resend (Production — Recommended)

1. Go to [resend.com](https://resend.com) → Create free account (100 emails/day free)
2. Domains → Add Domain → Enter your domain
3. Add the DNS records shown (MX + DKIM + SPF)
4. API Keys → Create Key → Copy
5. Set in `.env`:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
EMAIL_FROM=orders@yourdomain.com
```

---

## 14. Invoice Generation

Install in `apps/api-gateway`:

```bash
npm install puppeteer
```

Your invoice API works at: `GET /api/v1/invoices/:order_id`

It renders the invoice HTML template and converts to PDF. The PDF URL is:
`https://yourdomain.com/invoices/ORD-{id}.pdf`

This URL is what you pass as `{{invoice_url}}` in automation shortcodes.

---

## 15. Manual Automation Builder

The dashboard's **Automations → Custom** tab lets you build automations manually:

### How to create a custom automation:

1. Go to **Automations** page → click **Custom** tab
2. Click **Build Your First Automation**
3. Enter a **Name** (e.g. "Birthday Offer")
4. Select a **Trigger Event** (e.g. "Keyword Reply")
5. If keyword trigger: enter keywords (e.g. "birthday, offer, discount")
6. Click step types to add steps: `📱 WhatsApp`, `📧 Email`, `⏳ Wait`, `🏷️ Tag`, `🌐 Webhook`
7. **For WhatsApp step**: click the step to expand → type your message using shortcodes
8. **For Email step**: enter subject + HTML body
9. **For Wait step**: set delay (e.g. 2 hours)
10. Click **↑↓** to reorder steps, **✕** to delete steps
11. Click **Create Automation** — it's saved and ready

### Example: Birthday Flow

| Step | Type           | Content                                                                   |
| ---- | -------------- | ------------------------------------------------------------------------- |
| 1    | 🏷️ Tag Contact | `Birthday-Month`                                                          |
| 2    | 📱 WhatsApp    | `🎂 Happy Birthday {{name}}! Here's a special 20% discount: BDAY20`       |
| 3    | ⏳ Wait        | 1 day                                                                     |
| 4    | 📧 Email       | Subject: `Exclusive Birthday Offer` / Body: HTML email with discount code |

---

## 16. Shortcodes Reference

| Shortcode             | Description           | Example Value                       |
| --------------------- | --------------------- | ----------------------------------- |
| `{{name}}`            | Customer name         | Rahul Sharma                        |
| `{{phone}}`           | Phone number          | 919876543210                        |
| `{{email}}`           | Email address         | rahul@email.com                     |
| `{{order_id}}`        | Order number          | ORD-4821                            |
| `{{amount}}`          | Order total           | 1499                                |
| `{{product}}`         | Product name          | Nike Air Max                        |
| `{{delivery_date}}`   | Expected delivery     | 15 Mar 2026                         |
| `{{tracking_url}}`    | Live tracking link    | https://track.courier.com/...       |
| `{{tracking_number}}` | Courier tracking code | BD123456789                         |
| `{{courier}}`         | Courier name          | BlueDart                            |
| `{{invoice_url}}`     | Invoice PDF URL       | https://yourdomain.com/invoices/... |
| `{{review_url}}`      | Review link           | https://g.page/r/...                |
| `{{cancel_reason}}`   | Cancellation reason   | Out of stock                        |
| `{{refund_days}}`     | Refund timeline       | 5–7 business days                   |
| `{{eta}}`             | ETA for delivery      | Before 6 PM                         |
| `{{driver_name}}`     | Delivery partner      | Suresh                              |
| `{{business_name}}`   | Your business name    | My Store                            |

---

## 17. Troubleshooting FAQ

| Problem                    | Solution                                                                                                  |
| -------------------------- | --------------------------------------------------------------------------------------------------------- |
| Dashboard blank page       | Run `npm run dev` in `apps/dashboard` directory                                                           |
| WhatsApp API Test fails    | Check Phone Number ID and Access Token — regenerate from Meta Developer Console                           |
| Token expired error        | Meta temporary tokens expire in 24h — create a System User token (never expires) in Meta Business Manager |
| Messages not sending       | Check `NODE_ENV=production` is set and automation is toggled ON                                           |
| Webhook 403 error          | `WHATSAPP_VERIFY_TOKEN` in .env doesn't match what you entered in Meta Console                            |
| Email not sending          | For Gmail: use App Password not account password. Enable 2FA first.                                       |
| PM2 keeps crashing         | Check logs: `pm2 logs api-gateway --lines 50`                                                             |
| Database connection error  | Check PostgreSQL running: `sudo systemctl status postgresql`                                              |
| Nginx 502 Bad Gateway      | Backend not running: `pm2 status` and restart if needed                                                   |
| SSL certificate error      | Renew: `sudo certbot renew`                                                                               |
| WooCommerce not triggering | Make sure your site is on HTTPS and the `x-api-key` header matches API key from dashboard                 |

---

## Quick Commands Reference

```bash
# Check all services
pm2 status

# View logs
pm2 logs                       # All services
pm2 logs api-gateway           # Just API

# Restart all
pm2 restart all

# Update after code changes
cd /var/www/whatsapp-platform
git pull origin main
npm install
cd apps/dashboard && npm run build
pm2 restart all

# View Nginx access logs
tail -f /var/log/nginx/access.log
```

---

_WhatsApp Automation Platform — v1.0 · Supports live WooCommerce, Shopify, custom integrations_
