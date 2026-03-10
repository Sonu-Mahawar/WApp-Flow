import { useState } from "react";
import toast from "react-hot-toast";
import { Plus, Trash2, Copy, Edit2, X, Check, Eye, Info } from "lucide-react";

const LS_KEY = "wa-templates";

const SAMPLE_TEMPLATES = [
  {
    id: "sample-1",
    name: "order_confirmation",
    category: "UTILITY",
    status: "approved",
    header_text: "Order Confirmed! 🎉",
    body_text:
      "Hi {{name}}, your order #{{order_id}} has been confirmed! 🛍️\n\nTotal: ₹{{amount}}\nDelivery by: {{delivery_date}}\n\nTrack here: {{tracking_url}}",
    footer_text: "Reply STOP to unsubscribe",
    created_at: new Date().toISOString(),
    keywords: ["order", "confirm", "purchase"],
    shortcode: "/order_confirm",
  },
  {
    id: "sample-2",
    name: "cart_abandoned",
    category: "MARKETING",
    status: "approved",
    header_text: "You left something behind! 🛒",
    body_text:
      "Hey {{name}}! 👋\n\nYour cart misses you! You left {{product}} in your cart.\n\nComplete your order now and get it delivered fast: {{tracking_url}}",
    footer_text: "Reply STOP to unsubscribe",
    created_at: new Date().toISOString(),
    keywords: ["cart", "abandon", "recover"],
    shortcode: "/cart_remind",
  },
  {
    id: "sample-3",
    name: "otp_verification",
    category: "AUTHENTICATION",
    status: "approved",
    header_text: "Your OTP",
    body_text:
      "Your {{business_name}} verification code is: *{{otp}}*\n\nValid for 10 minutes. Do NOT share this code with anyone.",
    footer_text: "",
    created_at: new Date().toISOString(),
    keywords: ["otp", "verify", "auth"],
    shortcode: "/send_otp",
  },
];

function loadTemplates() {
  try {
    const stored = JSON.parse(localStorage.getItem(LS_KEY));
    if (stored === null) return SAMPLE_TEMPLATES;
    return stored;
  } catch {
    return SAMPLE_TEMPLATES;
  }
}
function saveTemplates(t) {
  localStorage.setItem(LS_KEY, JSON.stringify(t));
}

const EMPTY_FORM = {
  name: "",
  category: "MARKETING",
  header_text: "",
  body_text: "",
  footer_text: "",
  keywords: "",
  shortcode: "",
};
const CATEGORIES = ["MARKETING", "UTILITY", "AUTHENTICATION"];
const SHORTCODES = [
  { code: "{{name}}", desc: "Contact name" },
  { code: "{{phone}}", desc: "Phone number" },
  { code: "{{order_id}}", desc: "Order ID" },
  { code: "{{amount}}", desc: "Amount / price" },
  { code: "{{product}}", desc: "Product name" },
  { code: "{{tracking_url}}", desc: "Tracking URL" },
  { code: "{{delivery_date}}", desc: "Delivery date" },
  { code: "{{otp}}", desc: "OTP code" },
  { code: "{{business_name}}", desc: "Business name" },
  { code: "{{1}}", desc: "Custom var 1" },
  { code: "{{2}}", desc: "Custom var 2" },
  { code: "{{3}}", desc: "Custom var 3" },
];

function Preview({ tpl }) {
  const demoVars = {
    name: "Rahul",
    order_id: "ORD-4821",
    amount: "1,499",
    delivery_date: "12 Mar",
    tracking_url: "https://track.ly/xyz",
    product: "Nike Shoe",
    otp: "847261",
    business_name: "MyShop",
    1: "Value1",
    2: "Value2",
    3: "Value3",
  };
  const render = (txt) =>
    txt.replace(/\{\{(\w+)\}\}/g, (_, k) => demoVars[k] || `{{${k}}}`);
  return (
    <div
      style={{
        background: "#e8f5e9",
        borderRadius: 14,
        padding: 16,
        maxWidth: 320,
        boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
        fontFamily: "sans-serif",
      }}
    >
      {tpl.header_text && (
        <div
          style={{
            fontWeight: 700,
            fontSize: 14,
            marginBottom: 8,
            color: "#111",
          }}
        >
          {render(tpl.header_text)}
        </div>
      )}
      <div
        style={{
          fontSize: 13,
          color: "#333",
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
        }}
      >
        {render(tpl.body_text)}
      </div>
      {tpl.footer_text && (
        <div style={{ fontSize: 11, color: "#888", marginTop: 8 }}>
          {render(tpl.footer_text)}
        </div>
      )}
      <div
        style={{
          fontSize: 10,
          color: "#aaa",
          marginTop: 8,
          textAlign: "right",
        }}
      >
        ✓✓ 10:30 AM
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState(loadTemplates);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [previewId, setPreviewId] = useState(null);
  const [filterCat, setFilterCat] = useState("");
  const [showShortcodes, setShowShortcodes] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = templates.filter((t) => {
    const q = search.toLowerCase();
    return (
      (!filterCat || t.category === filterCat) &&
      (!q ||
        t.name.includes(q) ||
        (t.keywords || []).some((k) => k.includes(q)) ||
        (t.shortcode || "").includes(q))
    );
  });

  const insertShortcode = (code) => {
    setForm((f) => ({ ...f, body_text: f.body_text + code }));
    toast(`${code} inserted!`);
  };

  const save = () => {
    if (!form.name.trim() || !form.body_text.trim())
      return toast.error("Name and body are required");
    const safeName = form.name
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
    const rec = {
      ...form,
      name: safeName,
      keywords: form.keywords
        ? form.keywords
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean)
        : [],
      id: editId || Date.now().toString(),
      status: "approved",
      created_at: editId
        ? templates.find((t) => t.id === editId)?.created_at ||
          new Date().toISOString()
        : new Date().toISOString(),
    };
    const next = editId
      ? templates.map((t) => (t.id === editId ? rec : t))
      : [rec, ...templates];
    saveTemplates(next);
    setTemplates(next);
    toast.success(editId ? "Template updated!" : "Template created!");
    setForm(EMPTY_FORM);
    setShowCreate(false);
    setEditId(null);
  };

  const del = (id) => {
    if (!confirm("Delete template?")) return;
    const next = templates.filter((t) => t.id !== id);
    saveTemplates(next);
    setTemplates(next);
    toast.success("Deleted");
  };

  const startEdit = (t) => {
    setForm({
      name: t.name,
      category: t.category,
      header_text: t.header_text || "",
      body_text: t.body_text,
      footer_text: t.footer_text || "",
      keywords: (t.keywords || []).join(", "),
      shortcode: t.shortcode || "",
    });
    setEditId(t.id);
    setShowCreate(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const copyTemplate = (t) => {
    const text = `${t.header_text ? t.header_text + "\n\n" : ""}${t.body_text}${t.footer_text ? "\n\n" + t.footer_text : ""}`;
    navigator.clipboard.writeText(text);
    toast.success("Template text copied!");
  };

  const catColor = {
    MARKETING: "badge-blue",
    UTILITY: "badge-green",
    AUTHENTICATION: "badge-orange",
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Message Templates</h1>
          <p>Pre-approved WhatsApp templates with variables & shortcodes</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn btn-secondary"
            style={{ fontSize: 12 }}
            onClick={() => setShowShortcodes((v) => !v)}
          >
            <Info size={14} /> {showShortcodes ? "Hide" : "Show"} Shortcodes
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditId(null);
              setForm(EMPTY_FORM);
              setShowCreate(!showCreate);
            }}
          >
            <Plus size={16} /> New Template
          </button>
        </div>
      </div>

      {/* Shortcode Reference */}
      {showShortcodes && (
        <div
          className="card"
          style={{ marginBottom: 20, borderColor: "rgba(37,211,102,0.3)" }}
        >
          <div className="card-title">📌 Available Shortcodes & Variables</div>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: 12,
              marginBottom: 12,
            }}
          >
            Click any shortcode to insert it into the body of the template
            you're editing.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {SHORTCODES.map((s) => (
              <button
                key={s.code}
                onClick={() => showCreate && insertShortcode(s.code)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 8,
                  border: "1px solid rgba(37,211,102,0.4)",
                  background: "rgba(37,211,102,0.08)",
                  cursor: showCreate ? "pointer" : "default",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 2,
                }}
              >
                <code
                  style={{
                    color: "var(--green)",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {s.code}
                </code>
                <span style={{ color: "var(--text-secondary)", fontSize: 10 }}>
                  {s.desc}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Form */}
      {showCreate && (
        <div
          className="card"
          style={{ marginBottom: 24, borderColor: "rgba(37,211,102,0.3)" }}
        >
          <div className="card-title">
            {editId ? "✏️ Edit Template" : "➕ Create Template"}
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Template Name (snake_case)</label>
              <input
                className="form-input"
                placeholder="order_confirmation"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  marginTop: 4,
                }}
              >
                Spaces → underscores, lowercase only. Used as shortcode.
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">
              Header (optional, max 60 chars)
            </label>
            <input
              className="form-input"
              placeholder="Order Confirmed! 🎉"
              maxLength={60}
              value={form.header_text}
              onChange={(e) =>
                setForm((f) => ({ ...f, header_text: e.target.value }))
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              Body Text * — use {`{{name}}`}, {`{{order_id}}`}, etc.
            </label>
            <div style={{ position: "relative" }}>
              <textarea
                className="form-textarea"
                id="bodyTextArea"
                placeholder={`Hello {{name}}, your order #{{order_id}} has been confirmed!\n\nTotal: ₹{{amount}}\nDelivery by: {{delivery_date}}`}
                value={form.body_text}
                onChange={(e) =>
                  setForm((f) => ({ ...f, body_text: e.target.value }))
                }
                style={{ minHeight: 120 }}
              />
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                marginTop: 4,
              }}
            >
              {form.body_text.length}/1024 chars ·{" "}
              {(form.body_text.match(/\{\{[^}]+\}\}/g) || []).length} variables
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Footer (optional)</label>
              <input
                className="form-input"
                placeholder="Reply STOP to unsubscribe"
                value={form.footer_text}
                onChange={(e) =>
                  setForm((f) => ({ ...f, footer_text: e.target.value }))
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                Keywords (comma separated, for search)
              </label>
              <input
                className="form-input"
                placeholder="order, confirm, purchase"
                value={form.keywords}
                onChange={(e) =>
                  setForm((f) => ({ ...f, keywords: e.target.value }))
                }
              />
            </div>
          </div>

          {/* Live Preview */}
          {form.body_text && (
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  marginBottom: 8,
                  fontWeight: 600,
                }}
              >
                📱 Live Preview
              </div>
              <Preview tpl={form} />
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-primary" onClick={save}>
              <Check size={15} /> {editId ? "Update" : "Save Template"}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setShowCreate(false);
                setEditId(null);
                setForm(EMPTY_FORM);
              }}
            >
              <X size={15} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter + Search */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <input
          className="form-input"
          placeholder="Search by name, keyword or shortcode…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <div style={{ display: "flex", gap: 6 }}>
          {["", ...CATEGORIES].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              style={{
                padding: "5px 12px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                fontSize: 12,
                cursor: "pointer",
                background:
                  filterCat === cat ? "var(--green)" : "var(--bg-elevated)",
                color: filterCat === cat ? "#fff" : "var(--text-secondary)",
              }}
            >
              {cat || "All"}
            </button>
          ))}
        </div>
      </div>

      {/* Template Cards */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <p>No templates found. Create your first template above.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {filtered.map((t) => (
            <div
              key={t.id}
              style={{
                background: "var(--bg-card)",
                borderRadius: 14,
                padding: 20,
                border: "1px solid var(--border)",
                display: "flex",
                gap: 20,
                alignItems: "flex-start",
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <code
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--green)",
                    }}
                  >
                    {t.name}
                  </code>
                  <span
                    className={`badge ${catColor[t.category] || "badge-blue"}`}
                  >
                    {t.category}
                  </span>
                  <span className="badge badge-green">{t.status}</span>
                  {t.shortcode && (
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--text-secondary)",
                        background: "var(--bg-elevated)",
                        padding: "2px 8px",
                        borderRadius: 6,
                      }}
                    >
                      shortcode: {t.shortcode}
                    </span>
                  )}
                </div>
                {t.header_text && (
                  <div
                    style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}
                  >
                    {t.header_text}
                  </div>
                )}
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    marginBottom: 8,
                  }}
                >
                  {t.body_text}
                </div>
                {t.footer_text && (
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {t.footer_text}
                  </div>
                )}
                {(t.keywords || []).length > 0 && (
                  <div
                    style={{
                      marginTop: 8,
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    {t.keywords.map((k) => (
                      <span
                        key={k}
                        style={{
                          fontSize: 10,
                          background: "var(--bg-elevated)",
                          color: "var(--text-secondary)",
                          padding: "2px 8px",
                          borderRadius: 10,
                        }}
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  flexShrink: 0,
                }}
              >
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setPreviewId(previewId === t.id ? null : t.id)}
                >
                  <Eye size={12} /> Preview
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => copyTemplate(t)}
                >
                  <Copy size={12} /> Copy
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => startEdit(t)}
                >
                  <Edit2 size={12} /> Edit
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => del(t.id)}
                >
                  <Trash2 size={12} />
                </button>
              </div>
              {previewId === t.id && (
                <div style={{ position: "absolute" }}>
                  {/* Preview overlay */}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewId &&
        (() => {
          const t = templates.find((x) => x.id === previewId);
          if (!t) return null;
          return (
            <div
              onClick={() => setPreviewId(null)}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 100,
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: "var(--bg-card)",
                  borderRadius: 20,
                  padding: 32,
                  maxWidth: 440,
                  width: "90%",
                }}
              >
                <div
                  style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}
                >
                  📱 WhatsApp Preview
                </div>
                <div
                  style={{
                    background: "#128C7E",
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 20,
                  }}
                >
                  <Preview tpl={t} />
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={() => setPreviewId(null)}
                  style={{ width: "100%" }}
                >
                  Close
                </button>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
