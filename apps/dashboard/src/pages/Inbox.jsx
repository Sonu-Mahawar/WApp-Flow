import { useEffect, useState } from "react";
import { waApi } from "../store.js";

const MOCK_CONVERSATIONS = [
  {
    id: 1,
    name: "Rahul Sharma",
    phone: "919876543210",
    lastMessage: "Where is my order?",
    time: "2m ago",
    unread: 2,
    status: "open",
  },
  {
    id: 2,
    name: "Priya Singh",
    phone: "919123456789",
    lastMessage: "Thank you so much!",
    time: "15m ago",
    unread: 0,
    status: "resolved",
  },
  {
    id: 3,
    name: "Amit Kumar",
    phone: "918765432109",
    lastMessage: "I want to return this product",
    time: "1h ago",
    unread: 1,
    status: "open",
  },
  {
    id: 4,
    name: "Sneha Patel",
    phone: "917890123456",
    lastMessage: "Do you have size 8?",
    time: "2h ago",
    unread: 0,
    status: "open",
  },
];

const MOCK_MESSAGES = [
  {
    id: 1,
    direction: "inbound",
    content: "Hi! Where is my order #1234?",
    time: "10:00 AM",
  },
  {
    id: 2,
    direction: "outbound",
    content:
      "Hello Rahul! Your order #1234 is out for delivery today. Expected by 6 PM. 🚚",
    time: "10:01 AM",
  },
  {
    id: 3,
    direction: "inbound",
    content: "Great! Can I change the address?",
    time: "10:03 AM",
  },
  {
    id: 4,
    direction: "outbound",
    content:
      "Sorry, once the order is out for delivery we cannot change the address. Please be available to receive it 😊",
    time: "10:04 AM",
  },
];

export default function InboxPage() {
  const [selected, setSelected] = useState(MOCK_CONVERSATIONS[0]);
  const [reply, setReply] = useState("");

  return (
    <div
      style={{
        display: "flex",
        height: "calc(100vh - 60px)",
        gap: 0,
        margin: "-28px",
        overflow: "hidden",
      }}
    >
      {/* Conversation list */}
      <div
        style={{
          width: 300,
          borderRight: "1px solid var(--border)",
          overflowY: "auto",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            padding: "16px 16px 12px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <input
            className="form-input"
            placeholder="Search conversations..."
            style={{ fontSize: 13 }}
          />
        </div>
        {MOCK_CONVERSATIONS.map((c) => (
          <div
            key={c.id}
            onClick={() => setSelected(c)}
            style={{
              padding: "14px 16px",
              cursor: "pointer",
              borderBottom: "1px solid var(--border)",
              background:
                selected?.id === c.id ? "var(--green-dim)" : "transparent",
              transition: "background 0.15s",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    background: "var(--bg-elevated)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    color: "var(--green)",
                    fontSize: 15,
                  }}
                >
                  {c.name[0]}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-secondary)",
                      marginTop: 2,
                    }}
                  >
                    {c.lastMessage.slice(0, 30)}...
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                  {c.time}
                </div>
                {c.unread > 0 && (
                  <div
                    style={{
                      background: "var(--green)",
                      color: "#000",
                      borderRadius: "50%",
                      width: 18,
                      height: 18,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 700,
                      marginTop: 4,
                      marginLeft: "auto",
                    }}
                  >
                    {c.unread}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chat window */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "var(--green-dim)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              color: "var(--green)",
            }}
          >
            {selected?.name[0]}
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>{selected?.name}</div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              {selected?.phone} ·{" "}
              <span
                className={`badge badge-${selected?.status === "open" ? "green" : "gray"} `}
                style={{ padding: "1px 6px", fontSize: 10 }}
              >
                {selected?.status}
              </span>
            </div>
          </div>
        </div>
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 20,
            background: "#0b141a",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {MOCK_MESSAGES.map((m) => (
            <div
              key={m.id}
              style={{
                display: "flex",
                justifyContent:
                  m.direction === "outbound" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "70%",
                  background:
                    m.direction === "outbound" ? "#005c4b" : "#202c33",
                  borderRadius:
                    m.direction === "outbound"
                      ? "16px 16px 4px 16px"
                      : "16px 16px 16px 4px",
                  padding: "10px 14px",
                }}
              >
                <div
                  style={{ fontSize: 13, color: "#e9edef", lineHeight: 1.5 }}
                >
                  {m.content}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.4)",
                    textAlign: "right",
                    marginTop: 4,
                  }}
                >
                  {m.time}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            gap: 10,
          }}
        >
          <input
            id="replyInput"
            className="form-input"
            style={{ flex: 1 }}
            placeholder="Type a reply..."
            value={reply}
            onChange={(e) => setReply(e.target.value)}
          />
          <button
            id="sendReplyBtn"
            className="btn btn-primary"
            onClick={() => {
              if (reply) {
                setReply("");
              }
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
