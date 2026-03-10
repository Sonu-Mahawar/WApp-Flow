import { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import {
  Bot,
  Sparkles,
  Send,
  Trash2,
  Copy,
  Download,
  Zap,
  FileText,
  RefreshCw,
} from "lucide-react";

// Internal AI config — not exposed to user
const _API_KEY = "AIzaSyA4yU8Jz0nqZuU6AqTtqDteq-Ngx6e0iQw";
const _MODEL = "gemini-2.5-flash";

const SYSTEM_PROMPT = `You are an intelligent WhatsApp Business AI assistant built into a business automation platform.
You help businesses with customer support, WhatsApp message drafting, order management, automation setup, and marketing.
Be concise, friendly, and helpful. Format responses for WhatsApp (short paragraphs, use emojis where appropriate).

IMPORTANT: When the user asks you to "generate a template", "create a template", or describes a WhatsApp message template use-case,
respond with ONLY a valid JSON object (no markdown fences, no explanation) in this exact format:
{
  "isTemplate": true,
  "name": "snake_case_name",
  "category": "MARKETING|UTILITY|AUTHENTICATION",
  "header_text": "Optional header",
  "body_text": "Body with {{name}} {{order_id}} variables",
  "footer_text": "Optional footer",
  "keywords": ["keyword1", "keyword2"]
}
For all other messages, respond normally in plain text.`;

// Tech shortcode quick prompts
const QUICK_PROMPTS = [
  {
    label: "📦 Order Msg",
    prompt:
      "Write a WhatsApp message for order confirmation with order ID and amount",
  },
  {
    label: "🛒 Cart Recovery",
    prompt:
      "Draft a WhatsApp cart abandonment recovery message with product name and discount",
  },
  {
    label: "🚚 Shipping Update",
    prompt:
      "Write a WhatsApp shipping update message with tracking number and delivery date",
  },
  {
    label: "⭐ Review Request",
    prompt:
      "Create a WhatsApp message asking customer for a product review after delivery",
  },
  {
    label: "🏷️ Flash Sale",
    prompt:
      "Write a WhatsApp broadcast message for a 24-hour flash sale with discount code",
  },
  {
    label: "💳 Payment Reminder",
    prompt:
      "Draft a polite WhatsApp payment reminder message for COD order confirmation",
  },
];

const TEMPLATE_PROMPTS = [
  {
    label: "Order Confirmation",
    prompt:
      "generate a template for order confirmation with customer name, order ID, amount, and delivery date",
  },
  {
    label: "Shipping Update",
    prompt:
      "generate a template for shipping dispatch with tracking number and courier name",
  },
  {
    label: "Delivery Done",
    prompt: "generate a template for order delivered with review request link",
  },
  {
    label: "Cart Recovery",
    prompt:
      "generate a template for cart abandoned recovery with product name and discount",
  },
  {
    label: "OTP Verify",
    prompt: "generate an authentication template for OTP verification",
  },
  {
    label: "COD Confirm",
    prompt: "generate a template for cash on delivery order confirmation",
  },
];

async function callAI(history, userMessage, retries = 3) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${_MODEL}:generateContent?key=${_API_KEY}`;
  const contents = [
    ...history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: userMessage }] },
  ];
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
        }),
      });
      if (res.status === 429 || res.status === 503) {
        if (attempt < retries - 1) {
          await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
          continue;
        }
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Error ${res.status}`);
      }
      const data = await res.json();
      return (
        data?.candidates?.[0]?.content?.parts?.[0]?.text || "*(no response)*"
      );
    } catch (e) {
      if (attempt === retries - 1) throw e;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
}

function isTemplateJSON(text) {
  try {
    const cleaned = text
      .trim()
      .replace(/^```json?\s*/i, "")
      .replace(/```\s*$/i, "");
    const obj = JSON.parse(cleaned);
    return obj.isTemplate && obj.name && obj.body_text ? obj : null;
  } catch {
    return null;
  }
}

function saveTemplateToStorage(tpl) {
  const LS_KEY = "wa-templates";
  try {
    const existing = JSON.parse(localStorage.getItem(LS_KEY)) || [];
    if (existing.find((t) => t.name === tpl.name)) return false;
    existing.unshift({
      ...tpl,
      id: Date.now().toString(),
      status: "approved",
      created_at: new Date().toISOString(),
    });
    localStorage.setItem(LS_KEY, JSON.stringify(existing));
    return true;
  } catch {
    return false;
  }
}

// WhatsApp-style chat bubble
function ChatBubble({ msg, onSaveTemplate }) {
  const isUser = msg.role === "user";
  const tpl = !isUser ? isTemplateJSON(msg.content) : null;
  const copy = () => {
    navigator.clipboard.writeText(msg.content);
    toast.success("Copied!");
  };

  if (tpl) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "flex-start",
          marginBottom: 14,
          gap: 8,
          alignItems: "flex-end",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Bot size={16} color="#fff" />
        </div>
        <div
          style={{
            maxWidth: "78%",
            background: "var(--bg-elevated)",
            border: "1px solid rgba(79,70,229,0.4)",
            borderRadius: "18px 18px 18px 4px",
            padding: "14px 16px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "#7c3aed",
              fontWeight: 700,
              marginBottom: 10,
              letterSpacing: 0.5,
            }}
          >
            ✨ AI GENERATED TEMPLATE
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <code style={{ fontSize: 12, color: "#4f46e5", fontWeight: 700 }}>
                {tpl.name}
              </code>
              <span
                style={{
                  fontSize: 10,
                  background: "rgba(79,70,229,0.12)",
                  color: "#4f46e5",
                  padding: "2px 8px",
                  borderRadius: 8,
                }}
              >
                {tpl.category}
              </span>
            </div>
            {tpl.header_text && (
              <div style={{ fontWeight: 600, fontSize: 13 }}>
                {tpl.header_text}
              </div>
            )}
            <div
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                whiteSpace: "pre-wrap",
                lineHeight: 1.6,
                padding: "8px 12px",
                background: "var(--bg-card)",
                borderRadius: 8,
                border: "1px solid var(--border)",
              }}
            >
              {tpl.body_text}
            </div>
            {tpl.footer_text && (
              <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                {tpl.footer_text}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              onClick={() => {
                const saved = saveTemplateToStorage(tpl);
                if (saved)
                  toast.success("✅ Template saved to Templates page!");
                else toast("Template name already exists in Templates");
              }}
              style={{
                flex: 1,
                padding: "7px 14px",
                borderRadius: 8,
                border: "none",
                background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                color: "#fff",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <FileText size={13} /> Save to Templates
            </button>
            <button
              onClick={copy}
              style={{
                padding: "7px 12px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--bg-card)",
                color: "var(--text-secondary)",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              <Copy size={13} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: 12,
        gap: 8,
        alignItems: "flex-end",
      }}
    >
      {!isUser && (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #25D366, #128C7E)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Bot size={16} color="#fff" />
        </div>
      )}
      <div
        style={{
          maxWidth: "72%",
          background: isUser
            ? "linear-gradient(135deg, #25D366, #128C7E)"
            : "var(--bg-elevated)",
          color: isUser ? "#fff" : "var(--text-primary)",
          borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          padding: "10px 14px",
          fontSize: 13.5,
          lineHeight: 1.5,
          boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
          border: isUser ? "none" : "1px solid var(--border)",
          position: "relative",
        }}
      >
        <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {msg.content}
        </div>
        {!isUser && (
          <button
            onClick={copy}
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-secondary)",
              opacity: 0.5,
              padding: 2,
            }}
            title="Copy"
          >
            <Copy size={11} />
          </button>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 8,
        marginBottom: 12,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #25D366, #128C7E)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Bot size={16} color="#fff" />
      </div>
      <div
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "18px 18px 18px 4px",
          padding: "12px 18px",
          display: "flex",
          gap: 5,
          alignItems: "center",
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "var(--green)",
              animation: "bounce 1.2s infinite",
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

const INITIAL_MSG = {
  role: "assistant",
  content:
    '👋 Hi! I\'m your AI Business Assistant. I can help you:\n\n• Draft WhatsApp messages for any occasion\n• Generate ready-to-use message templates (just ask!)\n• Answer questions about automation & marketing\n• Write campaign copy, replies, and more\n\nTry: "generate a template for order confirmation" or ask anything!',
};

export default function AIChatbotPage() {
  const [messages, setMessages] = useState([INITIAL_MSG]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("chat"); // chat | templates
  const [templateDesc, setTemplateDesc] = useState("");
  const [genTemplate, setGenTemplate] = useState(null);
  const [genLoading, setGenLoading] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    const userMsg = { role: "user", content: msg };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    setLoading(true);
    try {
      const reply = await callAI(messages, msg);
      setMessages([...newHistory, { role: "assistant", content: reply }]);
    } catch (e) {
      const errText = e.message?.toLowerCase() || "";
      let friendly = `❌ ${e.message}`;
      if (errText.includes("quota") || errText.includes("429"))
        friendly = "⏳ AI is busy right now. Wait a moment and try again.";
      if (errText.includes("expired") || errText.includes("invalid"))
        friendly = "🔑 API key issue. Please check your key in the settings.";
      if (errText.includes("network") || errText.includes("fetch"))
        friendly = "🌐 No internet connection. Check your network and retry.";
      setMessages([...newHistory, { role: "assistant", content: friendly }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const clearChat = () => {
    setMessages([INITIAL_MSG]);
    toast.success("Chat cleared");
  };

  const exportChat = () => {
    const text = messages
      .map((m) => `[${m.role.toUpperCase()}]\n${m.content}`)
      .join("\n\n---\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ai-chat-export.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Chat exported!");
  };

  const generateTemplateFromDesc = async () => {
    if (!templateDesc.trim()) return toast.error("Describe the template");
    setGenLoading(true);
    setGenTemplate(null);
    try {
      const reply = await callAI(
        [],
        `generate a template for: ${templateDesc}`,
      );
      const tpl = isTemplateJSON(reply);
      if (tpl) {
        setGenTemplate(tpl);
        toast.success("Template generated!");
      } else {
        toast.error("AI couldn't generate a template. Try rephrasing.");
      }
    } catch (e) {
      toast.error(
        e.message?.includes("quota")
          ? "AI busy, try again shortly"
          : `Error: ${e.message}`,
      );
    } finally {
      setGenLoading(false);
    }
  };

  return (
    <div>
      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        .ai-tab { padding: 8px 20px; border-radius: 8px; border: 1px solid var(--border); background: none; color: var(--text-secondary); cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.2s; }
        .ai-tab.active { background: var(--green); color: #fff; border-color: var(--green); }
      `}</style>

      {/* Header — no branding */}
      <div className="page-header">
        <div>
          <h1>AI Assistant</h1>
          <p>Smart AI for WhatsApp messages, templates & automation help</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={exportChat}
            style={{
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "6px 12px",
              cursor: "pointer",
              color: "var(--text-secondary)",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Download size={13} /> Export Chat
          </button>
          <button
            onClick={clearChat}
            style={{
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "6px 12px",
              cursor: "pointer",
              color: "var(--text-secondary)",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Trash2 size={13} /> Clear
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button
          className={`ai-tab ${tab === "chat" ? "active" : ""}`}
          onClick={() => setTab("chat")}
        >
          💬 AI Chat
        </button>
        <button
          className={`ai-tab ${tab === "templates" ? "active" : ""}`}
          onClick={() => setTab("templates")}
        >
          ✨ Generate Template
        </button>
      </div>

      {/* CHAT TAB */}
      {tab === "chat" && (
        <div>
          {/* Chat window */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "14px 14px 0 0",
              overflow: "hidden",
            }}
          >
            {/* Chat header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderBottom: "1px solid var(--border)",
                background: "var(--bg-elevated)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #25D366, #128C7E)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Bot size={18} color="#fff" />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>
                    AI Business Assistant
                  </div>
                  <div style={{ fontSize: 11, color: "var(--green)" }}>
                    ● Online · Ready
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div
              style={{
                height: 400,
                overflowY: "auto",
                padding: 16,
                background:
                  "radial-gradient(ellipse at top, rgba(37,211,102,0.04) 0%, transparent 60%), var(--bg-primary)",
              }}
            >
              {messages.map((msg, i) => (
                <ChatBubble key={i} msg={msg} />
              ))}
              {loading && <TypingIndicator />}
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Input */}
          <div
            style={{
              display: "flex",
              gap: 10,
              padding: "14px 16px",
              borderTop: "1px solid var(--border)",
              alignItems: "flex-end",
              background: "var(--bg-card)",
              borderRadius: "0 0 14px 14px",
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask anything, or say: generate a template for order confirmation…"
              rows={1}
              style={{
                flex: 1,
                resize: "none",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "10px 14px",
                color: "var(--text-primary)",
                fontSize: 13.5,
                lineHeight: 1.5,
                outline: "none",
                fontFamily: "inherit",
                maxHeight: 100,
                overflowY: "auto",
              }}
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              style={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                background:
                  loading || !input.trim()
                    ? "var(--bg-elevated)"
                    : "linear-gradient(135deg, #25D366, #128C7E)",
                border: "none",
                cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s",
                flexShrink: 0,
              }}
            >
              <Send
                size={17}
                color={
                  loading || !input.trim() ? "var(--text-secondary)" : "#fff"
                }
              />
            </button>
          </div>

          {/* Quick prompts */}
          <div style={{ marginTop: 12 }}>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                marginBottom: 8,
                fontWeight: 600,
              }}
            >
              💬 QUICK MESSAGES
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginBottom: 12,
              }}
            >
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => send(p.prompt)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 20,
                    border: "1px solid var(--border)",
                    background: "var(--bg-elevated)",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    fontSize: 11.5,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.borderColor = "var(--green)";
                    e.target.style.color = "var(--green)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = "var(--border)";
                    e.target.style.color = "var(--text-secondary)";
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                marginBottom: 8,
                fontWeight: 600,
              }}
            >
              ✨ GENERATE TEMPLATE
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {TEMPLATE_PROMPTS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => send(p.prompt)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 20,
                    border: "1px dashed rgba(79,70,229,0.5)",
                    background: "rgba(79,70,229,0.06)",
                    color: "#7c3aed",
                    cursor: "pointer",
                    fontSize: 11.5,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = "rgba(79,70,229,0.14)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "rgba(79,70,229,0.06)";
                  }}
                >
                  📋 {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TEMPLATE GENERATOR TAB */}
      {tab === "templates" && (
        <div className="card">
          <div className="card-title">
            <Sparkles size={16} /> AI Template Generator
          </div>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: 13,
              marginBottom: 20,
              lineHeight: 1.6,
            }}
          >
            Describe what you need — the AI will write a complete WhatsApp
            Business API template. Click <strong>"Save to Templates"</strong> to
            add it directly to your Templates library.
          </p>

          <div className="form-group">
            <label className="form-label">Describe Your Template</label>
            <textarea
              className="form-textarea"
              placeholder="e.g. Send shipping update to customer with tracking number and estimated delivery date"
              value={templateDesc}
              onChange={(e) => setTemplateDesc(e.target.value)}
              style={{ minHeight: 100 }}
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 20,
              flexWrap: "wrap",
            }}
          >
            {TEMPLATE_PROMPTS.map((p) => (
              <button
                key={p.label}
                onClick={() =>
                  setTemplateDesc(
                    p.prompt.replace("generate a template for ", ""),
                  )
                }
                style={{
                  padding: "5px 12px",
                  borderRadius: 16,
                  border: "1px solid var(--border)",
                  background: "var(--bg-elevated)",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: 11.5,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            className="btn btn-primary"
            onClick={generateTemplateFromDesc}
            disabled={genLoading}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <Sparkles size={15} />
            {genLoading ? "Generating…" : "Generate Template"}
          </button>

          {genTemplate && (
            <div
              style={{
                marginTop: 24,
                background: "var(--bg-elevated)",
                borderRadius: 14,
                padding: 20,
                border: "1px solid rgba(79,70,229,0.4)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 14,
                }}
              >
                <div
                  style={{ fontSize: 12, color: "#7c3aed", fontWeight: 700 }}
                >
                  ✨ GENERATED TEMPLATE
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => {
                      const saved = saveTemplateToStorage(genTemplate);
                      if (saved) toast.success("✅ Saved to Templates page!");
                      else toast("Template already exists");
                    }}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 8,
                      border: "none",
                      background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    Save to Templates
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        JSON.stringify(genTemplate, null, 2),
                      );
                      toast.success("Copied!");
                    }}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: "var(--bg-card)",
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    <Copy size={13} />
                  </button>
                </div>
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-secondary)",
                      marginBottom: 4,
                      fontWeight: 600,
                      textTransform: "uppercase",
                    }}
                  >
                    Name
                  </div>
                  <code
                    style={{
                      fontSize: 13,
                      color: "#4f46e5",
                      background: "rgba(79,70,229,0.1)",
                      padding: "3px 10px",
                      borderRadius: 6,
                    }}
                  >
                    {genTemplate.name}
                  </code>
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 11,
                      background: "var(--bg-card)",
                      color: "var(--text-secondary)",
                      padding: "2px 8px",
                      borderRadius: 6,
                      border: "1px solid var(--border)",
                    }}
                  >
                    {genTemplate.category}
                  </span>
                </div>
                {genTemplate.header_text && (
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-secondary)",
                        marginBottom: 4,
                        fontWeight: 600,
                        textTransform: "uppercase",
                      }}
                    >
                      Header
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      {genTemplate.header_text}
                    </div>
                  </div>
                )}
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-secondary)",
                      marginBottom: 4,
                      fontWeight: 600,
                      textTransform: "uppercase",
                    }}
                  >
                    Body
                  </div>
                  <div
                    style={{
                      fontSize: 13.5,
                      lineHeight: 1.6,
                      background: "var(--bg-card)",
                      borderRadius: 8,
                      padding: "10px 14px",
                      border: "1px solid var(--border)",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {genTemplate.body_text}
                  </div>
                </div>
                {genTemplate.footer_text && (
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-secondary)",
                        marginBottom: 4,
                        fontWeight: 600,
                        textTransform: "uppercase",
                      }}
                    >
                      Footer
                    </div>
                    <div
                      style={{ fontSize: 12, color: "var(--text-secondary)" }}
                    >
                      {genTemplate.footer_text}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
