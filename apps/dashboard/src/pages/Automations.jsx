import { useState } from "react";
import toast from "react-hot-toast";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
  ToggleRight,
  Mail,
  MessageSquare,
  FileText,
  Clock,
  Tag,
  Globe,
  CheckCircle,
  Eye,
  X,
} from "lucide-react";

const LS_KEY = "wa-automations";
const TPL_KEY = "wa-templates";

// ─── Order Flow definitions ─────────────────────────────────────────────────
const ORDER_FLOWS = [
  {
    id: "order_confirmed",
    icon: "🛍️",
    name: "Order Confirmed",
    trigger_type: "order-created",
    desc: "Instant confirmation + invoice sent via WhatsApp & Email",
    color: "#25D366",
    steps: [
      {
        type: "send_whatsapp",
        label: "WhatsApp: Order Confirmation",
        message:
          "✅ *Order Confirmed!*\n\nHi {{name}}, your order *#{{order_id}}* is confirmed!\n\n📦 Items: {{product}}\n💰 Total: ₹{{amount}}\n📅 Delivery by: {{delivery_date}}\n\nTrack here: {{tracking_url}}\n\n_Thank you for shopping with us!_ 🙏",
      },
      {
        type: "send_invoice_whatsapp",
        label: "WhatsApp: Send Order Invoice (PDF link)",
        message:
          "📄 *Your Invoice is Ready!*\n\nInvoice for Order #{{order_id}}\nAmount: ₹{{amount}}\n\nDownload: {{invoice_url}}\n\n_Keep this for your records._",
      },
      {
        type: "send_email",
        label: "Email: Order Confirmation + Invoice",
        subject: "Order Confirmed – #{{order_id}}",
        body: `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f4f4f4;padding:20px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.1)">
  <div style="background:#25D366;padding:24px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:24px">✅ Order Confirmed!</h1>
  </div>
  <div style="padding:28px">
    <p style="font-size:16px">Hi <strong>{{name}}</strong>,</p>
    <p>Thank you! Your order <strong>#{{order_id}}</strong> has been confirmed.</p>
    <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin:16px 0">
      <table width="100%" style="font-size:14px">
        <tr><td><b>Product</b></td><td>{{product}}</td></tr>
        <tr><td><b>Amount</b></td><td>₹{{amount}}</td></tr>
        <tr><td><b>Delivery Date</b></td><td>{{delivery_date}}</td></tr>
        <tr><td><b>Order ID</b></td><td>#{{order_id}}</td></tr>
      </table>
    </div>
    <div style="background:#fff9e6;border:1px solid #f0c040;border-radius:8px;padding:14px;margin:16px 0">
      <b>📄 Invoice attached</b> — Invoice #{{order_id}} is attached to this email.
    </div>
    <a href="{{tracking_url}}" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;margin-top:12px">Track My Order →</a>
  </div>
  <div style="padding:16px;text-align:center;font-size:12px;color:#999;border-top:1px solid #eee">Reply STOP to unsubscribe from WhatsApp messages.</div>
</div>
</body></html>`,
      },
    ],
  },
  {
    id: "order_dispatched",
    icon: "📦",
    name: "Order Dispatched",
    trigger_type: "order-shipped",
    desc: "Shipping notification with tracking link via WhatsApp & Email",
    color: "#3b82f6",
    steps: [
      {
        type: "send_whatsapp",
        label: "WhatsApp: Dispatch Notification",
        message:
          "🚚 *Your Order is On Its Way!*\n\nHi {{name}}, Order *#{{order_id}}* has been dispatched!\n\n📦 Courier: {{courier}}\n🔖 Tracking: *{{tracking_number}}*\n📅 Expected: {{delivery_date}}\n\nTrack live: {{tracking_url}}\n\n_We'll notify you when it arrives!_ 📍",
      },
      {
        type: "send_email",
        label: "Email: Shipping Confirmation",
        subject: "Your Order #{{order_id}} Has Been Shipped 🚚",
        body: `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f4f4f4;padding:20px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.1)">
  <div style="background:#3b82f6;padding:24px;text-align:center">
    <h1 style="color:#fff;margin:0">🚚 Order Shipped!</h1>
  </div>
  <div style="padding:28px">
    <p>Hi <strong>{{name}}</strong>, your order is on the way!</p>
    <div style="background:#eff6ff;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #3b82f6">
      <b>📦 Couier:</b> {{courier}}<br>
      <b>🔖 Tracking No:</b> {{tracking_number}}<br>
      <b>📅 ETA:</b> {{delivery_date}}
    </div>
    <a href="{{tracking_url}}" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600">Live Track →</a>
  </div>
</div></body></html>`,
      },
    ],
  },
  {
    id: "order_cancelled",
    icon: "❌",
    name: "Order Cancelled",
    trigger_type: "order-cancelled",
    desc: "Cancellation notice + refund info via WhatsApp & Email",
    color: "#ef4444",
    steps: [
      {
        type: "send_whatsapp",
        label: "WhatsApp: Cancellation Notice",
        message:
          "❌ *Order Cancelled*\n\nHi {{name}}, your order *#{{order_id}}* has been cancelled.\n\n💬 Reason: {{cancel_reason}}\n💰 Refund: ₹{{amount}} will be processed in 5–7 business days.\n\nNeed help? Chat with us or call support.\n\n_We're sorry for the inconvenience._ 🙏",
      },
      {
        type: "send_email",
        label: "Email: Cancellation + Refund Notice",
        subject: "Order #{{order_id}} Cancelled – Refund Initiated",
        body: `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f4f4f4;padding:20px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.1)">
  <div style="background:#ef4444;padding:24px;text-align:center">
    <h1 style="color:#fff;margin:0">Order Cancelled</h1>
  </div>
  <div style="padding:28px">
    <p>Hi <strong>{{name}}</strong>,</p>
    <p>Your order <b>#{{order_id}}</b> has been cancelled.</p>
    <div style="background:#fef2f2;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #ef4444">
      <b>Reason:</b> {{cancel_reason}}<br>
      <b>Refund Amount:</b> ₹{{amount}}<br>
      <b>Refund ETA:</b> 5–7 business days
    </div>
    <p>If you did not cancel this order, please contact support immediately.</p>
  </div>
</div></body></html>`,
      },
    ],
  },
  {
    id: "order_tracking",
    icon: "📍",
    name: "Live Tracking Update",
    trigger_type: "order-shipped",
    desc: "Proactive tracking ping with live map link via WhatsApp",
    color: "#8b5cf6",
    steps: [
      {
        type: "wait",
        label: "Wait 6 hours after dispatch",
        config: { duration: "6h" },
      },
      {
        type: "send_whatsapp",
        label: "WhatsApp: Live Tracking Ping",
        message:
          "📍 *Tracking Update!*\n\nHi {{name}}, here's an update on Order *#{{order_id}}*:\n\n📦 Status: *{{tracking_status}}*\n📍 Location: {{current_location}}\n🕐 ETA: {{eta}}\n\nLive track: {{tracking_url}}\n\n_Stay tuned — we'll notify you when it's out for delivery!_ 🚚",
      },
      {
        type: "send_email",
        label: "Email: Tracking Status",
        subject: "📍 Tracking Update for Order #{{order_id}}",
        body: `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f4f4f4;padding:20px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
  <div style="background:#8b5cf6;padding:24px;text-align:center">
    <h1 style="color:#fff;margin:0">📍 Tracking Update</h1>
  </div>
  <div style="padding:28px">
    <p>Hi <strong>{{name}}</strong>,</p>
    <p>Order <b>#{{order_id}}</b> is currently at <b>{{current_location}}</b></p>
    <div style="background:#f5f3ff;border-radius:8px;padding:16px;margin:16px 0">
      <b>Status:</b> {{tracking_status}}<br><b>ETA:</b> {{eta}}
    </div>
    <a href="{{tracking_url}}" style="display:inline-block;background:#8b5cf6;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600">Live Track →</a>
  </div>
</div></body></html>`,
      },
    ],
  },
  {
    id: "out_for_delivery",
    icon: "🏃",
    name: "Out for Delivery",
    trigger_type: "order-out-for-delivery",
    desc: "OFD alert with driver & ETA via WhatsApp & Email",
    color: "#f59e0b",
    steps: [
      {
        type: "send_whatsapp",
        label: "WhatsApp: Out for Delivery Alert",
        message:
          "🏃 *Out for Delivery!*\n\nHi {{name}}, your order *#{{order_id}}* is out for delivery!\n\n🚴 Delivery partner: {{driver_name}}\n📞 Driver contact: {{driver_phone}}\n⏰ Current ETA: {{eta}}\n\nPlease be available to receive your order.\n\n_Be ready! It's almost there!_ 📦",
      },
      {
        type: "send_email",
        label: "Email: Out for Delivery",
        subject: "🏃 Your Order is Out for Delivery! – #{{order_id}}",
        body: `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f4f4f4;padding:20px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
  <div style="background:#f59e0b;padding:24px;text-align:center">
    <h1 style="color:#fff;margin:0">🏃 Out for Delivery!</h1>
  </div>
  <div style="padding:28px">
    <p>Hi <strong>{{name}}</strong>, your order is almost there!</p>
    <div style="background:#fffbeb;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #f59e0b">
      <b>Order:</b> #{{order_id}}<br>
      <b>Driver:</b> {{driver_name}} ({{driver_phone}})<br>
      <b>ETA:</b> {{eta}}
    </div>
    <p>Please ensure someone is available at the delivery address.</p>
  </div>
</div></body></html>`,
      },
    ],
  },
  {
    id: "order_delivered",
    icon: "✅",
    name: "Order Delivered",
    trigger_type: "order-delivered",
    desc: "Delivery confirmation + invoice receipt + review request via WhatsApp & Email",
    color: "#10b981",
    steps: [
      {
        type: "send_whatsapp",
        label: "WhatsApp: Delivered + Review Request",
        message:
          "🎉 *Delivered!*\n\nHi {{name}}, your order *#{{order_id}}* has been delivered!\n\n📄 Invoice receipt: {{invoice_url}}\n\nWe hope you love it! ❤️\n⭐ Please take 30 secs to rate us:\n{{review_url}}\n\n_Reply with any issues — we're here to help!_ 💬",
      },
      {
        type: "send_invoice_whatsapp",
        label: "WhatsApp: Final Invoice Receipt",
        message:
          "📄 *Final Invoice/Receipt*\n\nOrder: #{{order_id}}\nDate: {{delivery_date}}\nTotal Paid: ₹{{amount}}\n\nDownload receipt: {{invoice_url}}\n\n_Please keep this for your records._",
      },
      {
        type: "send_email",
        label: "Email: Delivered + Invoice + Review",
        subject: "Delivered! ✅ Rate your experience – Order #{{order_id}}",
        body: `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f4f4f4;padding:20px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
  <div style="background:#10b981;padding:24px;text-align:center">
    <h1 style="color:#fff;margin:0">✅ Delivered!</h1>
  </div>
  <div style="padding:28px">
    <p>Hi <strong>{{name}}</strong>, your order <b>#{{order_id}}</b> has been delivered!</p>
    <div style="background:#f0fdf4;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #10b981">
      <b>📄 Invoice attached</b> — Final receipt for ₹{{amount}} is attached.
    </div>
    <div style="text-align:center;margin:20px 0">
      <p><b>How was your experience? ⭐</b></p>
      <a href="{{review_url}}" style="display:inline-block;background:#10b981;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600">Leave a Review →</a>
    </div>
  </div>
</div></body></html>`,
      },
    ],
  },
];

// Quick-start templates for non-order flows
const QUICK_TEMPLATES = [
  {
    id: "cart_abandoned",
    icon: "🛒",
    name: "Cart Recovery",
    trigger_type: "cart-abandoned",
    desc: "3 reminders + discount offer over 24h",
    color: "#f97316",
  },
  {
    id: "keyword_reply",
    icon: "💬",
    name: "Keyword Auto-Reply",
    trigger_type: "keyword-reply",
    desc: "Auto-respond to customer keywords",
    color: "#6366f1",
  },
  {
    id: "new_contact",
    icon: "👋",
    name: "Welcome Message",
    trigger_type: "new-contact",
    desc: "Welcome new contacts with intro + catalog",
    color: "#14b8a6",
  },
];

const TRIGGER_LABELS = {
  "order-created": "Order Created",
  "order-shipped": "Order Shipped",
  "order-cancelled": "Order Cancelled",
  "order-out-for-delivery": "Out for Delivery",
  "order-delivered": "Order Delivered",
  "cart-abandoned": "Cart Abandoned",
  "keyword-reply": "Keyword Reply",
  "new-contact": "New Contact",
  custom: "Custom Event",
};

const STEP_ICONS = {
  send_whatsapp: <MessageSquare size={13} color="#25D366" />,
  send_email: <Mail size={13} color="#3b82f6" />,
  send_invoice_whatsapp: <FileText size={13} color="#8b5cf6" />,
  wait: <Clock size={13} color="#f59e0b" />,
  tag_contact: <Tag size={13} color="#6366f1" />,
  webhook: <Globe size={13} color="#64748b" />,
};

const ALL_STEP_TYPES = [
  { value: "send_whatsapp", label: "📱 WhatsApp Message" },
  { value: "send_email", label: "📧 Email" },
  { value: "send_invoice_whatsapp", label: "📄 Invoice (WhatsApp)" },
  { value: "wait", label: "⏳ Wait / Delay" },
  { value: "tag_contact", label: "🏷️ Tag Contact" },
  { value: "webhook", label: "🌐 Webhook" },
];

function loadData() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) || [];
  } catch {
    return [];
  }
}
function saveData(d) {
  localStorage.setItem(LS_KEY, JSON.stringify(d));
}

// Render a flow step row
function StepRow({ step, index }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "10px 0",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          fontWeight: 700,
          color: "var(--text-secondary)",
          flexShrink: 0,
        }}
      >
        {index + 1}
      </div>
      <div style={{ width: 20, flexShrink: 0, paddingTop: 2 }}>
        {STEP_ICONS[step.type] || "⚙️"}
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: 2,
          }}
        >
          {step.label}
        </div>
        {step.message && (
          <div
            style={{
              fontSize: 11,
              color: "var(--text-secondary)",
              background: "var(--bg-elevated)",
              padding: "6px 10px",
              borderRadius: 6,
              whiteSpace: "pre-wrap",
              maxHeight: 60,
              overflow: "hidden",
              lineHeight: 1.4,
            }}
          >
            {step.message.slice(0, 140)}
            {step.message.length > 140 ? "…" : ""}
          </div>
        )}
        {step.subject && (
          <div style={{ fontSize: 11, color: "#3b82f6" }}>
            Subject: {step.subject}
          </div>
        )}
        {step.config?.duration && (
          <div style={{ fontSize: 11, color: "#f59e0b" }}>
            Duration: {step.config.duration}
          </div>
        )}
      </div>
    </div>
  );
}

// Email preview modal
function EmailPreview({ step, onClose }) {
  if (!step?.body) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 16,
          width: "min(700px, 95vw)",
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            borderBottom: "1px solid #eee",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14, color: "#111" }}>
            📧 Email Preview:{" "}
            <span style={{ color: "#3b82f6" }}>{step.subject}</span>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            <X size={18} color="#666" />
          </button>
        </div>
        <div
          style={{ padding: 20 }}
          dangerouslySetInnerHTML={{ __html: step.body }}
        />
      </div>
    </div>
  );
}

// Invoice preview modal
function InvoicePreview({ onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 16,
          width: "min(600px, 95vw)",
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
        <div style={{ fontFamily: "sans-serif", padding: 32 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 24,
              paddingBottom: 16,
              borderBottom: "2px solid #25D366",
            }}
          >
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#111" }}>
                INVOICE
              </div>
              <div style={{ fontSize: 12, color: "#666" }}>
                Invoice #{"{{order_id}}"}
              </div>
              <div style={{ fontSize: 12, color: "#666" }}>
                Date: {"{{delivery_date}}"}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#25D366" }}>
                {"{{business_name}}"}
              </div>
              <div style={{ fontSize: 11, color: "#666" }}>
                {"{{business_address}}"}
              </div>
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
              BILL TO
            </div>
            <div style={{ fontWeight: 600 }}>{"{{name}}"}</div>
            <div style={{ fontSize: 12, color: "#666" }}>
              {"{{phone}}"} · {"{{email}}"}
            </div>
          </div>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginBottom: 20,
            }}
          >
            <thead>
              <tr style={{ background: "#f4f4f4" }}>
                {["Item", "Qty", "Price", "Total"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "8px 12px",
                      textAlign: "left",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "10px 12px", fontSize: 13 }}>
                  {"{{product}}"}
                </td>
                <td style={{ padding: "10px 12px", fontSize: 13 }}>1</td>
                <td style={{ padding: "10px 12px", fontSize: 13 }}>
                  ₹{"{{amount}}"}
                </td>
                <td style={{ padding: "10px 12px", fontSize: 13 }}>
                  ₹{"{{amount}}"}
                </td>
              </tr>
            </tbody>
          </table>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <div style={{ minWidth: 200 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "6px 0",
                  fontSize: 13,
                }}
              >
                <span>Subtotal</span>
                <span>₹{"{{amount}}"}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "6px 0",
                  fontSize: 13,
                  color: "#666",
                }}
              >
                <span>GST (18%)</span>
                <span>₹{"{{gst}}"}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  fontWeight: 800,
                  fontSize: 15,
                  borderTop: "2px solid #111",
                }}
              >
                <span>TOTAL</span>
                <span>₹{"{{total}}"}</span>
              </div>
            </div>
          </div>
          <div
            style={{
              marginTop: 24,
              padding: "12px 16px",
              background: "#f0fdf4",
              borderRadius: 8,
              fontSize: 12,
              color: "#666",
            }}
          >
            Thank you for your purchase! This is a system-generated invoice.
          </div>
        </div>
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid #eee",
            display: "flex",
            gap: 12,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              border: "1px solid #ddd",
              background: "#fff",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AutomationsPage() {
  const [automations, setAutomations] = useState(loadData);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "",
    trigger_type: "order-created",
    keywords: "",
  });
  const [steps, setSteps] = useState([]);
  const [expandId, setExpandId] = useState(null);
  const [emailPreview, setEmailPreview] = useState(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [tab, setTab] = useState("order"); // order | other | custom

  const useFlow = (flow) => {
    const rec = {
      id: Date.now().toString(),
      name: flow.name,
      trigger_type: flow.trigger_type,
      steps: flow.steps,
      keywords: "",
      is_active: true,
      runs: 0,
      created_at: new Date().toISOString(),
    };
    const next = [rec, ...loadData()];
    saveData(next);
    setAutomations(next);
    toast.success(`✅ "${flow.name}" automation created!`);
  };

  const useQuickTemplate = (tpl) => {
    const rec = {
      id: Date.now().toString(),
      name: tpl.name,
      trigger_type: tpl.trigger_type,
      steps: [],
      keywords: "",
      is_active: true,
      runs: 0,
      created_at: new Date().toISOString(),
    };
    const next = [rec, ...loadData()];
    saveData(next);
    setAutomations(next);
    toast.success(`✅ "${tpl.name}" automation created!`);
  };

  const toggle = (id) => {
    const next = loadData().map((a) =>
      a.id === id ? { ...a, is_active: !a.is_active } : a,
    );
    saveData(next);
    setAutomations(next);
    toast(next.find((x) => x.id === id)?.is_active ? "Activated!" : "Paused");
  };

  const del = (id) => {
    if (!confirm("Delete this automation?")) return;
    const next = loadData().filter((a) => a.id !== id);
    saveData(next);
    setAutomations(next);
    toast.success("Deleted");
  };

  const simulateRun = (id) => {
    const next = loadData().map((a) =>
      a.id === id
        ? { ...a, runs: (a.runs || 0) + 1, last_run: new Date().toISOString() }
        : a,
    );
    saveData(next);
    setAutomations(next);
    toast.success("🔄 Test run simulated!");
  };

  const [stepEditOpen, setStepEditOpen] = useState(null); // step id being edited

  const addStep = (type) => {
    const defaults = {
      send_whatsapp: { label: "WhatsApp Message", message: "Hi {{name}}, " },
      send_email: {
        label: "Email",
        subject: "Message from us",
        body: "<p>Hi {{name}},</p>",
      },
      send_invoice_whatsapp: {
        label: "Invoice (WhatsApp)",
        message: "📄 Your invoice: {{invoice_url}}",
      },
      wait: { label: "Wait / Delay", delay: "1", unit: "hours" },
      tag_contact: { label: "Tag Contact", tag: "" },
      webhook: { label: "Webhook", url: "", method: "POST" },
      condition: {
        label: "Condition",
        field: "amount",
        operator: "greater_than",
        value: "0",
      },
    };
    const newStep = { id: Date.now().toString(), type, ...defaults[type] };
    setSteps((p) => [...p, newStep]);
    setStepEditOpen(newStep.id);
  };

  const updateStep = (id, patch) =>
    setSteps((p) => p.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const removeStep = (id) => setSteps((p) => p.filter((s) => s.id !== id));
  const moveStep = (id, dir) => {
    setSteps((p) => {
      const i = p.findIndex((s) => s.id === id);
      const n = [...p];
      const target = i + dir;
      if (target < 0 || target >= n.length) return p;
      [n[i], n[target]] = [n[target], n[i]];
      return n;
    });
  };

  const create = () => {
    if (!form.name.trim()) return toast.error("Enter automation name");
    if (steps.length === 0) return toast.error("Add at least one step");
    const rec = {
      id: Date.now().toString(),
      ...form,
      steps,
      is_active: true,
      runs: 0,
      created_at: new Date().toISOString(),
    };
    const next = [rec, ...loadData()];
    saveData(next);
    setAutomations(next);
    toast.success("✅ Automation created!");
    setShowCreate(false);
    setForm({ name: "", trigger_type: "order-created", keywords: "" });
    setSteps([]);
    setStepEditOpen(null);
  };

  return (
    <div>
      {emailPreview && (
        <EmailPreview
          step={emailPreview}
          onClose={() => setEmailPreview(null)}
        />
      )}
      {showInvoice && <InvoicePreview onClose={() => setShowInvoice(false)} />}

      <div className="page-header">
        <div>
          <h1>Automations</h1>
          <p>
            Multi-channel workflows — WhatsApp + Email + Invoice, automatically
          </p>
        </div>
        <button
          id="createAutomationBtn"
          className="btn btn-primary"
          onClick={() => setShowCreate(!showCreate)}
        >
          <Plus size={16} /> New Automation
        </button>
      </div>

      {/* How it works banner */}
      <div
        className="card"
        style={{ marginBottom: 20, borderColor: "rgba(37,211,102,0.25)" }}
      >
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {[
            {
              icon: "⚡",
              n: "1",
              t: "Trigger Event",
              d: "Order placed, shipped, delivered, keyword, etc.",
            },
            {
              icon: "📤",
              n: "2",
              t: "Multi-Channel Send",
              d: "WhatsApp message + Email + Invoice — all automated.",
            },
            {
              icon: "📊",
              n: "3",
              t: "Track & Improve",
              d: "See run count, last run time, pause or edit anytime.",
            },
          ].map((s) => (
            <div
              key={s.n}
              style={{
                display: "flex",
                gap: 12,
                flex: "1 1 180px",
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "rgba(37,211,102,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  flexShrink: 0,
                }}
              >
                {s.icon}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>
                  {s.n}. {s.t}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {s.d}
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => setShowInvoice(true)}
          style={{
            marginTop: 12,
            background: "none",
            border: "1px dashed rgba(37,211,102,0.4)",
            borderRadius: 8,
            padding: "5px 14px",
            color: "var(--green)",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          <FileText size={12} style={{ marginRight: 5 }} /> Preview Invoice
          Template
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[
          { id: "order", label: "📦 Order Flows" },
          { id: "other", label: "⚡ Other Flows" },
          { id: "custom", label: "🛠️ Custom" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "7px 18px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
              background: tab === t.id ? "var(--green)" : "var(--bg-elevated)",
              color: tab === t.id ? "#fff" : "var(--text-secondary)",
              transition: "all 0.2s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ORDER FLOWS */}
      {tab === "order" && (
        <div style={{ display: "grid", gap: 16, marginBottom: 24 }}>
          {ORDER_FLOWS.map((flow) => (
            <div
              key={flow.id}
              style={{
                background: "var(--bg-card)",
                borderRadius: 14,
                border: "1px solid var(--border)",
                overflow: "hidden",
              }}
            >
              {/* Flow header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "16px 20px",
                  borderBottom: "1px solid var(--border)",
                  background: `linear-gradient(135deg, ${flow.color}10, transparent)`,
                }}
              >
                <span style={{ fontSize: 28 }}>{flow.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {flow.name}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    {flow.desc}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        background: `${flow.color}20`,
                        color: flow.color,
                        padding: "2px 8px",
                        borderRadius: 6,
                        fontWeight: 600,
                      }}
                    >
                      Trigger: {TRIGGER_LABELS[flow.trigger_type]}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        background: "rgba(37,211,102,0.1)",
                        color: "var(--green)",
                        padding: "2px 8px",
                        borderRadius: 6,
                      }}
                    >
                      📱 WA · 📧 Email
                      {flow.steps.some(
                        (s) => s.type === "send_invoice_whatsapp",
                      )
                        ? " · 📄 Invoice"
                        : ""}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--text-secondary)",
                        padding: "2px 8px",
                        borderRadius: 6,
                        border: "1px solid var(--border)",
                      }}
                    >
                      {flow.steps.length} steps
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() =>
                      setExpandId(expandId === flow.id ? null : flow.id)
                    }
                  >
                    {expandId === flow.id ? (
                      <ChevronUp size={14} />
                    ) : (
                      <>
                        <Eye size={13} /> Preview
                      </>
                    )}
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => useFlow(flow)}
                  >
                    ✓ Use This
                  </button>
                </div>
              </div>

              {/* Flow steps preview */}
              {expandId === flow.id && (
                <div style={{ padding: "12px 20px" }}>
                  {flow.steps.map((step, i) => (
                    <div key={i}>
                      <StepRow step={step} index={i} />
                      {step.type === "send_email" && (
                        <button
                          onClick={() => setEmailPreview(step)}
                          style={{
                            margin: "4px 0 6px 34px",
                            background: "none",
                            border: "1px dashed #3b82f6",
                            borderRadius: 6,
                            padding: "3px 10px",
                            color: "#3b82f6",
                            cursor: "pointer",
                            fontSize: 11,
                          }}
                        >
                          👁 Preview Email
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* OTHER FLOWS */}
      {tab === "other" && (
        <div className="grid-2" style={{ gap: 14, marginBottom: 24 }}>
          {QUICK_TEMPLATES.map((tpl) => (
            <div
              key={tpl.id}
              style={{
                background: "var(--bg-card)",
                borderRadius: 12,
                border: "1px solid var(--border)",
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 28 }}>{tpl.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{tpl.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {tpl.desc}
                </div>
                <div style={{ fontSize: 10, color: tpl.color, marginTop: 3 }}>
                  Trigger: {TRIGGER_LABELS[tpl.trigger_type]}
                </div>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => useQuickTemplate(tpl)}
              >
                Use
              </button>
            </div>
          ))}
        </div>
      )}

      {/* CUSTOM */}
      {tab === "custom" && (
        <div>
          {showCreate ? (
            <div
              className="card"
              style={{ marginBottom: 24, borderColor: "rgba(37,211,102,0.3)" }}
            >
              <div className="card-title">🛠️ Build Custom Automation</div>

              {/* Basic settings */}
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Automation Name *</label>
                  <input
                    id="automationName"
                    className="form-input"
                    placeholder="e.g. VIP Customer Welcome"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Trigger Event *</label>
                  <select
                    id="automationTrigger"
                    className="form-select"
                    value={form.trigger_type}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, trigger_type: e.target.value }))
                    }
                  >
                    {Object.entries(TRIGGER_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {form.trigger_type === "keyword-reply" && (
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">
                    Keywords (comma-separated)
                  </label>
                  <input
                    className="form-input"
                    placeholder="help, support, price, order"
                    value={form.keywords}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, keywords: e.target.value }))
                    }
                  />
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-secondary)",
                      marginTop: 4,
                    }}
                  >
                    The automation runs when any of these words appear in a
                    customer message
                  </div>
                </div>
              )}

              {/* Step type picker */}
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}
                >
                  ➕ Add a Step:
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {ALL_STEP_TYPES.map((st) => (
                    <button
                      key={st.value}
                      onClick={() => addStep(st.value)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 8,
                        border: "1px dashed var(--border)",
                        background: "var(--bg-elevated)",
                        color: "var(--text-secondary)",
                        cursor: "pointer",
                        fontSize: 12,
                        transition: "all 0.2s",
                      }}
                      onMouseOver={(e) =>
                        (e.target.style.borderColor = "var(--green)")
                      }
                      onMouseOut={(e) =>
                        (e.target.style.borderColor = "var(--border)")
                      }
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Steps */}
              {steps.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "24px",
                    border: "2px dashed var(--border)",
                    borderRadius: 12,
                    color: "var(--text-secondary)",
                    fontSize: 13,
                  }}
                >
                  No steps yet — click a step type above to add your first step
                </div>
              )}

              {steps.map((s, idx) => (
                <div
                  key={s.id}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    marginBottom: 12,
                    overflow: "hidden",
                  }}
                >
                  {/* Step header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 14px",
                      background: "var(--bg-elevated)",
                      cursor: "pointer",
                    }}
                    onClick={() =>
                      setStepEditOpen(stepEditOpen === s.id ? null : s.id)
                    }
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: "var(--bg-card)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "var(--green)",
                        border: "1px solid var(--border)",
                        flexShrink: 0,
                      }}
                    >
                      {idx + 1}
                    </div>
                    {STEP_ICONS[s.type] || <span>📌</span>}
                    <div style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>
                      {s.label || s.type}
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveStep(s.id, -1);
                        }}
                        disabled={idx === 0}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--text-secondary)",
                          padding: "2px 4px",
                          opacity: idx === 0 ? 0.3 : 1,
                        }}
                      >
                        ↑
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveStep(s.id, 1);
                        }}
                        disabled={idx === steps.length - 1}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--text-secondary)",
                          padding: "2px 4px",
                          opacity: idx === steps.length - 1 ? 0.3 : 1,
                        }}
                      >
                        ↓
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeStep(s.id);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#ef4444",
                          padding: "2px 6px",
                          fontSize: 14,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Step editor (expandable) */}
                  {stepEditOpen === s.id && (
                    <div style={{ padding: "14px 16px" }}>
                      <div className="form-group">
                        <label className="form-label">Step Label</label>
                        <input
                          className="form-input"
                          value={s.label || ""}
                          onChange={(e) =>
                            updateStep(s.id, { label: e.target.value })
                          }
                          placeholder="e.g. Send welcome message"
                        />
                      </div>

                      {(s.type === "send_whatsapp" ||
                        s.type === "send_invoice_whatsapp") && (
                        <div className="form-group">
                          <label className="form-label">WhatsApp Message</label>
                          <textarea
                            className="form-input"
                            rows={4}
                            style={{
                              resize: "vertical",
                              fontFamily: "inherit",
                            }}
                            placeholder={
                              "Hi {{name}}, your order {{order_id}} is confirmed! Total: ₹{{amount}}"
                            }
                            value={s.message || ""}
                            onChange={(e) =>
                              updateStep(s.id, { message: e.target.value })
                            }
                          />
                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--text-secondary)",
                              marginTop: 4,
                            }}
                          >
                            Shortcodes: <code>{"{{name}}"}</code>{" "}
                            <code>{"{{order_id}}"}</code>{" "}
                            <code>{"{{amount}}"}</code>{" "}
                            <code>{"{{product}}"}</code>{" "}
                            <code>{"{{tracking_url}}"}</code>{" "}
                            <code>{"{{invoice_url}}"}</code>
                          </div>
                        </div>
                      )}

                      {s.type === "send_email" && (
                        <>
                          <div className="form-group">
                            <label className="form-label">Email Subject</label>
                            <input
                              className="form-input"
                              placeholder="e.g. Your order {{order_id}} is confirmed!"
                              value={s.subject || ""}
                              onChange={(e) =>
                                updateStep(s.id, { subject: e.target.value })
                              }
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">
                              Email Body (HTML supported)
                            </label>
                            <textarea
                              className="form-input"
                              rows={6}
                              style={{
                                resize: "vertical",
                                fontFamily: "monospace",
                                fontSize: 12,
                              }}
                              placeholder={
                                "<p>Hi {{name}},</p><p>Your order <b>#{{order_id}}</b> has been confirmed.</p>"
                              }
                              value={s.body || ""}
                              onChange={(e) =>
                                updateStep(s.id, { body: e.target.value })
                              }
                            />
                            <div
                              style={{
                                fontSize: 11,
                                color: "var(--text-secondary)",
                                marginTop: 4,
                              }}
                            >
                              Use <code>{"{{name}}"}</code>,{" "}
                              <code>{"{{order_id}}"}</code>,{" "}
                              <code>{"{{amount}}"}</code>, etc. HTML tags like{" "}
                              <code>&lt;b&gt;</code>,{" "}
                              <code>&lt;a href&gt;</code> are supported.
                            </div>
                          </div>
                        </>
                      )}

                      {s.type === "wait" && (
                        <div
                          style={{
                            display: "flex",
                            gap: 10,
                            alignItems: "center",
                          }}
                        >
                          <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Duration</label>
                            <input
                              className="form-input"
                              type="number"
                              min="1"
                              value={s.delay || "1"}
                              onChange={(e) =>
                                updateStep(s.id, { delay: e.target.value })
                              }
                            />
                          </div>
                          <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Unit</label>
                            <select
                              className="form-select"
                              value={s.unit || "hours"}
                              onChange={(e) =>
                                updateStep(s.id, { unit: e.target.value })
                              }
                            >
                              {["minutes", "hours", "days"].map((u) => (
                                <option key={u} value={u}>
                                  {u}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}

                      {s.type === "tag_contact" && (
                        <div className="form-group">
                          <label className="form-label">Tag Name</label>
                          <input
                            className="form-input"
                            placeholder="e.g. VIP, Repeat-Buyer, High-Value"
                            value={s.tag || ""}
                            onChange={(e) =>
                              updateStep(s.id, { tag: e.target.value })
                            }
                          />
                        </div>
                      )}

                      {s.type === "webhook" && (
                        <div className="grid-2">
                          <div className="form-group">
                            <label className="form-label">Webhook URL</label>
                            <input
                              className="form-input"
                              placeholder="https://yoursite.com/webhook"
                              value={s.url || ""}
                              onChange={(e) =>
                                updateStep(s.id, { url: e.target.value })
                              }
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Method</label>
                            <select
                              className="form-select"
                              value={s.method || "POST"}
                              onChange={(e) =>
                                updateStep(s.id, { method: e.target.value })
                              }
                            >
                              {["POST", "GET", "PUT"].map((m) => (
                                <option key={m} value={m}>
                                  {m}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button
                  id="saveAutomationBtn"
                  className="btn btn-primary"
                  onClick={create}
                >
                  <CheckCircle size={15} /> Create Automation
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowCreate(false);
                    setSteps([]);
                    setStepEditOpen(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🛠️</div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
                Build a Custom Automation
              </div>
              <div
                style={{
                  color: "var(--text-secondary)",
                  fontSize: 13,
                  marginBottom: 20,
                  maxWidth: 400,
                  margin: "0 auto 20px",
                }}
              >
                Design your own multi-step workflow with WhatsApp messages,
                emails, delays, tags, and webhooks.
              </div>
              <button
                className="btn btn-primary"
                onClick={() => setShowCreate(true)}
              >
                <Plus size={16} /> Build Your First Automation
              </button>
            </div>
          )}
        </div>
      )}

      {/* Your Automations */}
      <div className="card">
        <div className="card-title">
          Your Automations
          <span
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              fontWeight: 400,
              marginLeft: 8,
            }}
          >
            ({automations.length})
          </span>
        </div>
        {automations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">⚡</div>
            <p>No automations yet. Use a template from the tabs above.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {automations.map((a) => (
              <div
                key={a.id}
                style={{
                  background: "var(--bg-elevated)",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 13 }}>
                      {a.name}
                    </span>
                    <span className="badge badge-blue">
                      {TRIGGER_LABELS[a.trigger_type] || a.trigger_type}
                    </span>
                    <span
                      className={`badge ${a.is_active ? "badge-green" : "badge-gray"}`}
                    >
                      {a.is_active ? "Active" : "Paused"}
                    </span>
                    {a.steps?.length > 0 && (
                      <span
                        style={{ fontSize: 10, color: "var(--text-secondary)" }}
                      >
                        {a.steps.length} steps
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-secondary)",
                      marginTop: 3,
                    }}
                  >
                    {a.runs || 0} runs · created{" "}
                    {new Date(a.created_at).toLocaleDateString()}
                    {a.last_run &&
                      ` · last run ${new Date(a.last_run).toLocaleString()}`}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => simulateRun(a.id)}
                  >
                    ▶ Test
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => toggle(a.id)}
                  >
                    {a.is_active ? (
                      <>
                        <ToggleRight size={13} color="var(--green)" /> Pause
                      </>
                    ) : (
                      <>
                        <ToggleLeft size={13} /> Activate
                      </>
                    )}
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => del(a.id)}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Shortcodes reference */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-title">📌 Available Variables (Shortcodes)</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 8,
          }}
        >
          {[
            ["{{name}}", "Customer full name"],
            ["{{order_id}}", "Order number"],
            ["{{amount}}", "Order amount"],
            ["{{product}}", "Product name"],
            ["{{delivery_date}}", "Delivery date"],
            ["{{tracking_url}}", "Tracking link"],
            ["{{tracking_number}}", "Tracking code"],
            ["{{courier}}", "Courier name"],
            ["{{cancel_reason}}", "Cancellation reason"],
            ["{{driver_name}}", "Delivery driver"],
            ["{{eta}}", "Estimated arrival"],
            ["{{invoice_url}}", "Invoice download link"],
            ["{{review_url}}", "Review/rating link"],
            ["{{email}}", "Customer email"],
            ["{{phone}}", "Customer phone"],
          ].map(([code, desc]) => (
            <div
              key={code}
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                padding: "7px 12px",
                background: "var(--bg-elevated)",
                borderRadius: 8,
                border: "1px solid var(--border)",
              }}
            >
              <code
                style={{
                  color: "var(--green)",
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {code}
              </code>
              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                {desc}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
