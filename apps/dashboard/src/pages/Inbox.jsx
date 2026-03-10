import { useEffect, useState, useRef } from "react";
import { waApi } from "../store.js";
import {
  Send,
  CheckCheck,
  Search,
  Filter,
  Bot,
  Phone,
  MoreVertical,
  Paperclip,
  Smile,
} from "lucide-react";
import toast from "react-hot-toast";

const CONVERSATIONS = [
  {
    id: 1,
    name: "Rahul Sharma",
    phone: "919876543210",
    lastMsg: "Where is my order?",
    time: "2m",
    unread: 2,
    status: "open",
    avatar: "R",
    color: "#25D366",
  },
  {
    id: 2,
    name: "Priya Singh",
    phone: "919123456789",
    lastMsg: "Thank you so much! 🙏",
    time: "15m",
    unread: 0,
    status: "resolved",
    avatar: "P",
    color: "#4F8EF7",
  },
  {
    id: 3,
    name: "Amit Kumar",
    phone: "918765432109",
    lastMsg: "I want to return this product",
    time: "1h",
    unread: 1,
    status: "open",
    avatar: "A",
    color: "#8B5CF6",
  },
  {
    id: 4,
    name: "Sneha Patel",
    phone: "917890123456",
    lastMsg: "Do you have size 8 available?",
    time: "2h",
    unread: 0,
    status: "open",
    avatar: "S",
    color: "#F59E0B",
  },
  {
    id: 5,
    name: "Vikram Mehta",
    phone: "916543210987",
    lastMsg: "Please confirm my booking",
    time: "3h",
    unread: 1,
    status: "open",
    avatar: "V",
    color: "#06B6D4",
  },
  {
    id: 6,
    name: "Anita Rao",
    phone: "919988776655",
    lastMsg: "Got it, thanks!",
    time: "5h",
    unread: 0,
    status: "resolved",
    avatar: "A",
    color: "#EF4444",
  },
];

const MESSAGES_MAP = {
  1: [
    {
      id: 1,
      dir: "inbound",
      text: "Hi! Where is my order #1234?",
      time: "10:00 AM",
    },
    {
      id: 2,
      dir: "outbound",
      text: "Hello Rahul! 👋 Your order #1234 is out for delivery today. Expected by 6 PM. 🚚",
      time: "10:01 AM",
      status: "read",
    },
    {
      id: 3,
      dir: "inbound",
      text: "Great! Can I change the delivery address?",
      time: "10:03 AM",
    },
    {
      id: 4,
      dir: "outbound",
      text: "Sorry, once the order is dispatched we can't change the address. Please be available to receive it 😊",
      time: "10:04 AM",
      status: "delivered",
    },
    { id: 5, dir: "inbound", text: "Where is my order?", time: "10:07 AM" },
  ],
  2: [
    {
      id: 1,
      dir: "inbound",
      text: "I received my order. Excellent quality!",
      time: "9:30 AM",
    },
    {
      id: 2,
      dir: "outbound",
      text: "That's wonderful to hear, Priya! 🌟 We're so glad you love it!",
      time: "9:32 AM",
      status: "read",
    },
    { id: 3, dir: "inbound", text: "Thank you so much! 🙏", time: "9:33 AM" },
  ],
};

const AI_REPLIES = [
  "Your order is being processed and will be delivered within 2-3 business days.",
  "I understand your concern. Our support team will contact you within 24 hours.",
  "Thank you for reaching out! We're happy to help. Can you share more details?",
  "Your request has been noted. Expect a response by end of day.",
];

export default function InboxPage() {
  const [selected, setSelected] = useState(CONVERSATIONS[0]);
  const [messages, setMessages] = useState(MESSAGES_MAP[1] || []);
  const [reply, setReply] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sending, setSending] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);
  const bottomRef = useRef(null);

  const selectConv = (c) => {
    setSelected(c);
    setMessages(
      MESSAGES_MAP[c.id] || [
        { id: 1, dir: "inbound", text: c.lastMsg, time: "Just now" },
      ],
    );
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMsg = async () => {
    if (!reply.trim()) return;
    const msg = {
      id: Date.now(),
      dir: "outbound",
      text: reply.trim(),
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: "sent",
    };
    setMessages((prev) => [...prev, msg]);
    setReply("");
    setSending(true);
    try {
      await waApi.post("/messages/send", {
        phone: selected.phone,
        message: reply.trim(),
        type: "text",
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, status: "delivered" } : m)),
      );
    } catch {
      // Still show sent in demo mode
    } finally {
      setSending(false);
    }
  };

  const useAIReply = (text) => {
    setAiTyping(true);
    setTimeout(() => {
      setReply(text);
      setAiTyping(false);
    }, 600);
  };

  const filtered = CONVERSATIONS.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.lastMsg.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalUnread = CONVERSATIONS.reduce((sum, c) => sum + c.unread, 0);

  return (
    <div
      style={{
        display: "flex",
        height: "calc(100vh - 60px)",
        gap: 0,
        margin: "-28px",
        overflow: "hidden",
        background: "var(--bg-base)",
      }}
    >
      {/* ── Left: Conversation list ──────────────────────── */}
      <div
        style={{
          width: 320,
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 16px 12px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              Inbox
              {totalUnread > 0 && (
                <span
                  style={{
                    marginLeft: 8,
                    background: "var(--green)",
                    color: "#000",
                    borderRadius: 12,
                    padding: "1px 8px",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {totalUnread}
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {["all", "open", "resolved"].map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  style={{
                    padding: "3px 8px",
                    borderRadius: 6,
                    border: "1px solid var(--border)",
                    background:
                      statusFilter === f
                        ? "var(--green)"
                        : "var(--bg-elevated)",
                    color:
                      statusFilter === f ? "#000" : "var(--text-secondary)",
                    fontSize: 10,
                    fontWeight: statusFilter === f ? 700 : 400,
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div style={{ position: "relative" }}>
            <Search
              size={13}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
            <input
              className="form-input"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 32, fontSize: 12 }}
            />
          </div>
        </div>

        {/* Conversation list */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => selectConv(c)}
              style={{
                padding: "12px 16px",
                cursor: "pointer",
                borderBottom: "1px solid var(--border)",
                background:
                  selected?.id === c.id
                    ? "rgba(37,211,102,0.06)"
                    : "transparent",
                borderLeft:
                  selected?.id === c.id
                    ? "3px solid var(--green)"
                    : "3px solid transparent",
                transition: "all 0.15s",
              }}
            >
              <div
                style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: `${c.color}22`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    color: c.color,
                    fontSize: 16,
                    flexShrink: 0,
                    border: `2px solid ${c.color}44`,
                  }}
                >
                  {c.avatar}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 13 }}>
                      {c.name}
                    </span>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                      {c.time}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      marginTop: 2,
                    }}
                  >
                    {c.lastMsg}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        color:
                          c.status === "open"
                            ? "var(--green)"
                            : "var(--text-muted)",
                        fontWeight: 600,
                      }}
                    >
                      ● {c.status}
                    </span>
                    {c.unread > 0 && (
                      <span
                        style={{
                          background: "var(--green)",
                          color: "#000",
                          borderRadius: 10,
                          padding: "1px 6px",
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      >
                        {c.unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right: Chat window ───────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Chat header */}
        <div
          style={{
            padding: "12px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "var(--bg-base)",
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: `${selected?.color}22`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              color: selected?.color,
              fontSize: 16,
              border: `2px solid ${selected?.color}44`,
            }}
          >
            {selected?.avatar}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              {selected?.name}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              +{selected?.phone} ·{" "}
              <span
                style={{
                  color:
                    selected?.status === "open"
                      ? "var(--green)"
                      : "var(--text-muted)",
                  fontWeight: 600,
                }}
              >
                ● {selected?.status}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              title="Call"
              style={{
                padding: "7px 10px",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                cursor: "pointer",
                color: "var(--text-secondary)",
                display: "flex",
              }}
            >
              <Phone size={14} />
            </button>
            <button
              title="More"
              style={{
                padding: "7px 10px",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                cursor: "pointer",
                color: "var(--text-secondary)",
                display: "flex",
              }}
            >
              <MoreVertical size={14} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px",
            background: "#0b141a",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            backgroundImage:
              "radial-gradient(circle at 20% 80%, rgba(37,211,102,0.02) 0%, transparent 50%)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.3)",
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            Today · WhatsApp Encrypted
          </div>
          {messages.map((m) => (
            <div
              key={m.id}
              style={{
                display: "flex",
                justifyContent:
                  m.dir === "outbound" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "70%",
                  background: m.dir === "outbound" ? "#005c4b" : "#202c33",
                  borderRadius:
                    m.dir === "outbound"
                      ? "16px 16px 4px 16px"
                      : "16px 16px 16px 4px",
                  padding: "10px 14px",
                }}
              >
                <div
                  style={{ fontSize: 13, color: "#e9edef", lineHeight: 1.5 }}
                >
                  {m.text}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.4)",
                    textAlign: "right",
                    marginTop: 4,
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  {m.time}{" "}
                  {m.dir === "outbound" && (
                    <CheckCheck
                      size={12}
                      color={
                        m.status === "read"
                          ? "#53bdeb"
                          : "rgba(255,255,255,0.4)"
                      }
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
          {aiTyping && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div
                style={{
                  background: "#202c33",
                  borderRadius: "16px 16px 16px 4px",
                  padding: "10px 16px",
                  fontSize: 13,
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                🤖 AI is composing...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* AI Quick Replies */}
        <div
          style={{
            padding: "8px 16px",
            borderTop: "1px solid var(--border)",
            background: "var(--bg-base)",
            display: "flex",
            gap: 6,
            overflowX: "auto",
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: 4,
              flexShrink: 0,
            }}
          >
            <Bot size={11} /> AI:
          </span>
          {AI_REPLIES.map((r, i) => (
            <button
              key={i}
              onClick={() => useAIReply(r)}
              style={{
                padding: "4px 10px",
                borderRadius: 14,
                border: "1px solid rgba(37,211,102,0.3)",
                background: "transparent",
                color: "var(--green)",
                fontSize: 11,
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(37,211,102,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              {r.slice(0, 35)}...
            </button>
          ))}
        </div>

        {/* Reply bar */}
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            gap: 10,
            alignItems: "flex-end",
            background: "var(--bg-base)",
          }}
        >
          <button
            style={{
              padding: "9px",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              cursor: "pointer",
              color: "var(--text-secondary)",
              display: "flex",
            }}
          >
            <Paperclip size={15} />
          </button>
          <button
            style={{
              padding: "9px",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              cursor: "pointer",
              color: "var(--text-secondary)",
              display: "flex",
            }}
          >
            <Smile size={15} />
          </button>
          <textarea
            id="replyInput"
            className="form-textarea"
            style={{
              flex: 1,
              minHeight: 40,
              maxHeight: 120,
              resize: "vertical",
              fontSize: 13,
            }}
            placeholder="Type a message..."
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMsg();
              }
            }}
          />
          <button
            id="sendReplyBtn"
            className="btn btn-primary"
            onClick={sendMsg}
            disabled={sending || !reply.trim()}
            style={{ padding: "10px 16px" }}
          >
            <Send size={15} />
          </button>
        </div>
      </div>

      {/* ── Right panel: Contact info ────────────────────── */}
      <div
        style={{
          width: 240,
          borderLeft: "1px solid var(--border)",
          padding: "20px 16px",
          overflowY: "auto",
          flexShrink: 0,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: `${selected?.color}22`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              color: selected?.color,
              fontSize: 22,
              margin: "0 auto 10px",
              border: `2px solid ${selected?.color}44`,
            }}
          >
            {selected?.avatar}
          </div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{selected?.name}</div>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-secondary)",
              marginTop: 2,
            }}
          >
            +{selected?.phone}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            {
              label: "Status",
              value: selected?.status,
              color:
                selected?.status === "open"
                  ? "var(--green)"
                  : "var(--text-muted)",
            },
            { label: "First Contact", value: "Jan 12, 2025" },
            { label: "Total Messages", value: "47" },
            { label: "Last Active", value: selected?.time + " ago" },
            { label: "Tags", value: "customer, vip" },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                padding: "8px 10px",
                background: "var(--bg-elevated)",
                borderRadius: 8,
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: 2,
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: item.color || "var(--text-primary)",
                }}
              >
                {item.value}
              </div>
            </div>
          ))}
          <button
            className="btn btn-primary"
            style={{ marginTop: 8, justifyContent: "center", fontSize: 12 }}
          >
            📤 Send Template
          </button>
          <button
            className="btn btn-secondary"
            style={{ justifyContent: "center", fontSize: 12 }}
          >
            ✏️ Edit Contact
          </button>
        </div>
      </div>
    </div>
  );
}
