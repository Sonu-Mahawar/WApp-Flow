import { useState, useEffect, useRef } from "react";
import { waApi } from "../store.js";
import toast from "react-hot-toast";
import {
  Send,
  Clock,
  CheckCheck,
  AlertCircle,
  FileText,
  Image,
  Phone,
  User,
} from "lucide-react";

const HISTORY_KEY = "wa-sent-messages";

function useSentHistory() {
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    } catch {
      return [];
    }
  });
  const add = (msg) => {
    const updated = [
      { ...msg, id: Date.now(), sentAt: new Date().toLocaleTimeString() },
      ...history,
    ].slice(0, 20);
    setHistory(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  };
  return [history, add];
}

const QUICK_TEMPLATES = [
  {
    label: "Welcome",
    text: "Hi {{name}}! 👋 Welcome to our service. We're excited to have you!",
  },
  {
    label: "Order Update",
    text: "Your order #{{orderId}} has been {{status}}. Track it here: {{link}}",
  },
  {
    label: "Support",
    text: "Hi! Thanks for reaching out. Our team will respond within 2 hours.",
  },
  {
    label: "Reminder",
    text: "Friendly reminder: Your appointment is on {{date}} at {{time}}. Reply CONFIRM to confirm.",
  },
];

export default function MessagesPage() {
  const [form, setForm] = useState({
    phone: "",
    message: "",
    type: "text",
    mediaUrl: "",
  });
  const [sending, setSending] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [history, addToHistory] = useSentHistory();
  const textRef = useRef(null);

  const MAX_CHARS = 4096;
  const phoneIsValid = form.phone.replace(/\D/g, "").length >= 10;

  const sendMsg = async (e) => {
    e.preventDefault();
    if (!form.phone || !form.message)
      return toast.error("Phone and message are required");
    if (!phoneIsValid)
      return toast.error(
        "Enter a valid phone number with country code (e.g. 919876543210)",
      );
    if (form.message.length > MAX_CHARS)
      return toast.error(`Message too long (max ${MAX_CHARS} chars)`);
    setSending(true);
    try {
      await waApi.post("/messages/send", {
        phone: form.phone.replace(/\D/g, ""),
        message: form.message,
        type: form.type,
        ...(form.mediaUrl && { mediaUrl: form.mediaUrl }),
      });
      toast.success(`✅ Message sent to +${form.phone.replace(/\D/g, "")}`);
      addToHistory({
        phone: form.phone,
        message: form.message,
        type: form.type,
        status: "sent",
      });
      setForm((f) => ({ ...f, message: "", mediaUrl: "" }));
      setCharCount(0);
    } catch (err) {
      const apiErr = err.response?.data?.error || "Failed to send";
      toast.error(apiErr);
      addToHistory({
        phone: form.phone,
        message: form.message,
        type: form.type,
        status: "failed",
        error: apiErr,
      });
    } finally {
      setSending(false);
    }
  };

  const handleTemplateClick = (text) => {
    setForm((f) => ({ ...f, message: text }));
    setCharCount(text.length);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Send Message</h1>
          <p>Send WhatsApp messages directly to any phone number</p>
        </div>
        <span
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            background: "var(--bg-elevated)",
            padding: "5px 12px",
            borderRadius: 20,
            border: "1px solid var(--border)",
          }}
        >
          Meta Cloud API
        </span>
      </div>

      <div className="grid-2" style={{ alignItems: "start", gap: 20 }}>
        {/* Compose form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <div className="card-title">💬 Compose Message</div>
            <form onSubmit={sendMsg}>
              {/* Phone */}
              <div className="form-group">
                <label className="form-label">
                  <Phone
                    size={11}
                    style={{ display: "inline", marginRight: 4 }}
                  />
                  Recipient Phone Number{" "}
                  <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="phoneInput"
                    className="form-input"
                    placeholder="919876543210 (with country code)"
                    value={form.phone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, phone: e.target.value }))
                    }
                    style={{
                      paddingRight: 80,
                      borderColor:
                        form.phone && !phoneIsValid ? "#ef4444" : undefined,
                    }}
                  />
                  {form.phone && (
                    <span
                      style={{
                        position: "absolute",
                        right: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontSize: 11,
                        color: phoneIsValid ? "var(--green)" : "#ef4444",
                      }}
                    >
                      {phoneIsValid ? "✓ Valid" : "Invalid"}
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
                  India: 91XXXXXXXXXX · US: 1XXXXXXXXXX · Format: country code +
                  number, no spaces
                </div>
              </div>

              {/* Type */}
              <div className="form-group">
                <label className="form-label">Message Type</label>
                <select
                  id="msgType"
                  className="form-select"
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, type: e.target.value }))
                  }
                >
                  <option value="text">📝 Text Message</option>
                  <option value="image">🖼️ Image with Caption</option>
                  <option value="document">📄 Document</option>
                  <option value="video">🎥 Video</option>
                  <option value="template">📋 Template Message</option>
                </select>
              </div>

              {/* Media URL */}
              {(form.type === "image" ||
                form.type === "document" ||
                form.type === "video") && (
                <div className="form-group">
                  <label className="form-label">
                    Media URL <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    className="form-input"
                    placeholder="https://example.com/file.jpg"
                    value={form.mediaUrl}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, mediaUrl: e.target.value }))
                    }
                  />
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-secondary)",
                      marginTop: 3,
                    }}
                  >
                    URL must be publicly accessible. Supported: JPG, PNG, PDF,
                    MP4
                  </div>
                </div>
              )}

              {/* Message text */}
              <div className="form-group">
                <label
                  className="form-label"
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>
                    Message {form.type === "image" ? "(Caption)" : ""}
                  </span>
                  <span
                    style={{
                      color:
                        charCount > MAX_CHARS * 0.9
                          ? "#ef4444"
                          : "var(--text-muted)",
                      fontWeight: "normal",
                      textTransform: "none",
                    }}
                  >
                    {charCount}/{MAX_CHARS}
                  </span>
                </label>
                <textarea
                  id="messageText"
                  ref={textRef}
                  className="form-textarea"
                  placeholder="Type your message here... Use *bold*, _italic_, ~strikethrough~"
                  value={form.message}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, message: e.target.value }));
                    setCharCount(e.target.value.length);
                  }}
                  style={{
                    minHeight: 120,
                    borderColor: charCount > MAX_CHARS ? "#ef4444" : undefined,
                  }}
                />
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-secondary)",
                    marginTop: 3,
                  }}
                >
                  WhatsApp formatting: *bold* | _italic_ | ~strikethrough~ |
                  ```code```
                </div>
              </div>

              <button
                id="sendBtn"
                type="submit"
                className="btn btn-primary"
                disabled={sending || !form.phone || !form.message}
                style={{ width: "100%", justifyContent: "center" }}
              >
                <Send size={16} />
                {sending ? "Sending..." : "Send via WhatsApp"}
              </button>
            </form>
          </div>

          {/* Quick templates */}
          <div className="card">
            <div className="card-title">⚡ Quick Templates</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              {QUICK_TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  onClick={() => handleTemplateClick(t.text)}
                  style={{
                    padding: "8px 12px",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    cursor: "pointer",
                    color: "var(--text-primary)",
                    fontSize: 12,
                    fontWeight: 500,
                    textAlign: "left",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = "var(--green)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = "var(--border)")
                  }
                >
                  📋 {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Preview + History */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* WhatsApp Preview */}
          <div className="card">
            <div className="card-title">📱 Live Preview</div>
            <div
              style={{
                background: "#0b141a",
                borderRadius: 16,
                padding: 20,
                minHeight: 280,
                backgroundImage:
                  "radial-gradient(circle at 20% 80%, rgba(37,211,102,0.03) 0%, transparent 50%)",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.3)",
                  textAlign: "center",
                  marginBottom: 12,
                }}
              >
                Today
              </div>
              {form.type === "image" && form.mediaUrl && (
                <div
                  style={{
                    maxWidth: "75%",
                    marginLeft: "auto",
                    marginBottom: 4,
                    borderRadius: "12px 12px 4px 12px",
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <img
                    src={form.mediaUrl}
                    alt="preview"
                    style={{ width: "100%", display: "block" }}
                    onError={(e) => (e.target.style.display = "none")}
                  />
                </div>
              )}
              <div
                style={{
                  background:
                    form.type === "image" ? "rgba(32,44,51,0.9)" : "#202c33",
                  borderRadius:
                    form.type === "image"
                      ? "0 0 4px 12px"
                      : "12px 12px 4px 12px",
                  padding: "10px 12px",
                  maxWidth: "75%",
                  marginLeft: "auto",
                  marginBottom: 2,
                }}
              >
                <p
                  style={{
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: "#e9edef",
                    margin: 0,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {form.message || (
                    <span style={{ color: "rgba(255,255,255,0.3)" }}>
                      Your message preview...
                    </span>
                  )}
                </p>
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.4)",
                    textAlign: "right",
                    marginTop: 5,
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  {new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  <CheckCheck size={12} color="#53bdeb" />
                </div>
              </div>
              <div
                style={{
                  textAlign: "center",
                  marginTop: 16,
                  fontSize: 11,
                  color: "rgba(255,255,255,0.25)",
                }}
              >
                →{" "}
                {form.phone ? `+${form.phone.replace(/\D/g, "")}` : "recipient"}
              </div>
            </div>
          </div>

          {/* Sent history */}
          {history.length > 0 && (
            <div className="card">
              <div className="card-title">📜 Recent Sends</div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  maxHeight: 300,
                  overflowY: "auto",
                }}
              >
                {history.map((h) => (
                  <div
                    key={h.id}
                    style={{
                      display: "flex",
                      gap: 10,
                      padding: "8px 10px",
                      background: "var(--bg-elevated)",
                      borderRadius: 8,
                      alignItems: "flex-start",
                      border: `1px solid ${h.status === "failed" ? "rgba(239,68,68,0.2)" : "var(--border)"}`,
                    }}
                  >
                    <span
                      style={{
                        color: h.status === "sent" ? "var(--green)" : "#ef4444",
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      {h.status === "sent" ? (
                        <CheckCheck size={13} />
                      ) : (
                        <AlertCircle size={13} />
                      )}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        +{h.phone}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text-secondary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          marginTop: 1,
                        }}
                      >
                        {h.message}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--text-muted)",
                        flexShrink: 0,
                      }}
                    >
                      {h.sentAt}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
