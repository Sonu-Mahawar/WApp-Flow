import { useEffect, useState, useCallback } from "react";
import { waApi } from "../store.js";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  MessageSquare,
  Users,
  Zap,
  BarChart3,
  TrendingUp,
  CheckCircle,
  RefreshCw,
  Activity,
  ArrowUpRight,
  Star,
  Bell,
  AlertCircle,
} from "lucide-react";

// ─── Demo fallback data (shown when backend is not connected) ─────────────────
function generateDemoChart() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.map((d) => ({
    date: d,
    sent: Math.floor(Math.random() * 150 + 50),
    received: Math.floor(Math.random() * 80 + 20),
  }));
}

const DEMO_METRICS = {
  messages_sent: 1247,
  delivery_rate: 96.4,
  read_rate: 78.2,
  total_contacts: 384,
  campaigns_completed: 12,
  active_automations: 5,
  response_time_avg: "2m 14s",
};

const DEMO_CHART = generateDemoChart();

// ─── Custom tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "10px 14px",
        fontSize: 12,
      }}
    >
      <div
        style={{
          color: "var(--text-secondary)",
          marginBottom: 6,
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      {payload.map((p) => (
        <div
          key={p.name}
          style={{
            color: p.color,
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <span>{p.name}</span>
          <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
};

export default function OverviewPage() {
  const [metrics, setMetrics] = useState(null);
  const [chart, setChart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [m, c] = await Promise.all([
        waApi.get("/analytics/overview"),
        waApi.get("/analytics/messages-chart"),
      ]);
      setMetrics(m.data.metrics);
      setChart(c.data.chart || []);
      setIsDemo(false);
    } catch {
      // Backend not connected — show demo data
      setMetrics(DEMO_METRICS);
      setChart(DEMO_CHART);
      setIsDemo(true);
    } finally {
      setLoading(false);
      setLastRefreshed(new Date());
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const stats = [
    {
      label: "Messages Sent",
      value: metrics?.messages_sent?.toLocaleString() ?? "—",
      icon: "📤",
      color: "#25D366",
      bg: "rgba(37,211,102,0.1)",
      change: "+18%",
      trend: "up",
    },
    {
      label: "Delivery Rate",
      value: `${metrics?.delivery_rate ?? 0}%`,
      icon: "✅",
      color: "#4F8EF7",
      bg: "rgba(79,142,247,0.1)",
      change: "+2.1%",
      trend: "up",
    },
    {
      label: "Read Rate",
      value: `${metrics?.read_rate ?? 0}%`,
      icon: "👁️",
      color: "#8B5CF6",
      bg: "rgba(139,92,246,0.1)",
      change: "+5.4%",
      trend: "up",
    },
    {
      label: "Total Contacts",
      value: metrics?.total_contacts?.toLocaleString() ?? "—",
      icon: "👥",
      color: "#F59E0B",
      bg: "rgba(245,158,11,0.1)",
      change: "+43",
      trend: "up",
    },
    {
      label: "Campaigns Done",
      value: metrics?.campaigns_completed ?? "—",
      icon: "📢",
      color: "#06B6D4",
      bg: "rgba(6,182,212,0.1)",
      change: "+3",
      trend: "up",
    },
    {
      label: "Response Time",
      value: metrics?.response_time_avg ?? "—",
      icon: "⚡",
      color: "#EF4444",
      bg: "rgba(239,68,68,0.1)",
      change: "-30s",
      trend: "up",
    },
  ];

  return (
    <div>
      {/* Demo data banner */}
      {isDemo && !loading && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.25)",
            borderRadius: 10,
            padding: "10px 16px",
            marginBottom: 20,
            fontSize: 13,
          }}
        >
          <AlertCircle size={14} color="#f59e0b" />
          <span style={{ color: "#f59e0b", fontWeight: 600 }}>Demo Mode</span>
          <span style={{ color: "var(--text-secondary)" }}>
            — Connect your backend API and database to see live data. Go to
            Settings → WhatsApp API to configure.
          </span>
          <button
            onClick={fetchData}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "1px solid rgba(245,158,11,0.4)",
              borderRadius: 6,
              padding: "3px 10px",
              cursor: "pointer",
              color: "#f59e0b",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <RefreshCw size={11} /> Retry
          </button>
        </div>
      )}

      {/* Stats grid */}
      <div className="stats-grid">
        {(loading ? Array(6).fill(null) : stats).map((s, i) => (
          <div
            key={i}
            className="stat-card"
            style={{ opacity: loading ? 0.5 : 1 }}
          >
            {loading ? (
              <div
                style={{
                  height: 80,
                  background: "var(--bg-elevated)",
                  borderRadius: 10,
                  animation: "pulse 1.5s infinite",
                }}
              />
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 12,
                  }}
                >
                  <div
                    className="stat-card-icon"
                    style={{ background: s.bg, color: s.color, fontSize: 20 }}
                  >
                    {s.icon}
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      color: s.trend === "up" ? "var(--green)" : "#ef4444",
                      background:
                        s.trend === "up"
                          ? "rgba(37,211,102,0.1)"
                          : "rgba(239,68,68,0.1)",
                      padding: "2px 8px",
                      borderRadius: 20,
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    <ArrowUpRight size={10} /> {s.change}
                  </span>
                </div>
                <div className="stat-card-label">{s.label}</div>
                <div className="stat-card-value" style={{ color: s.color }}>
                  {s.value}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Message Volume Area Chart */}
        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <div className="card-title" style={{ marginBottom: 0 }}>
              📊 Message Volume (7 Days)
            </div>
            <button
              onClick={fetchData}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 12,
              }}
            >
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chart}>
              <defs>
                <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#25D366" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#25D366" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="recvGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F8EF7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4F8EF7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.04)"
              />
              <XAxis
                dataKey="date"
                stroke="var(--text-muted)"
                tick={{ fontSize: 11 }}
              />
              <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="sent"
                stroke="#25D366"
                strokeWidth={2}
                fill="url(#sentGrad)"
                name="Sent"
              />
              <Area
                type="monotone"
                dataKey="received"
                stroke="#4F8EF7"
                strokeWidth={2}
                fill="url(#recvGrad)"
                name="Received"
              />
            </AreaChart>
          </ResponsiveContainer>
          <div
            style={{
              display: "flex",
              gap: 16,
              justifyContent: "center",
              marginTop: 8,
            }}
          >
            {[
              ["#25D366", "Sent"],
              ["#4F8EF7", "Received"],
            ].map(([color, label]) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 11,
                  color: "var(--text-secondary)",
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 2,
                    background: color,
                    borderRadius: 2,
                  }}
                />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Platform Status */}
        <div className="card">
          <div className="card-title">🟢 Platform Status</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              {
                label: "WhatsApp API",
                status: "Operational",
                color: "var(--green)",
                dot: "●",
              },
              {
                label: "Message Delivery",
                status: "Operational",
                color: "var(--green)",
                dot: "●",
              },
              {
                label: "Automation Engine",
                status: "Operational",
                color: "var(--green)",
                dot: "●",
              },
              {
                label: "AI Chatbot",
                status: "Operational",
                color: "var(--green)",
                dot: "●",
              },
              {
                label: "Webhooks",
                status: isDemo ? "Pending Setup" : "Operational",
                color: isDemo ? "#f59e0b" : "var(--green)",
                dot: "●",
              },
              {
                label: "Database",
                status: isDemo ? "Not Connected" : "Operational",
                color: isDemo ? "#ef4444" : "var(--green)",
                dot: "●",
              },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  background: "var(--bg-elevated)",
                  borderRadius: 8,
                }}
              >
                <span style={{ fontSize: 13 }}>{item.label}</span>
                <span
                  style={{ fontSize: 11, color: item.color, fontWeight: 600 }}
                >
                  {item.dot} {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid-2">
        {/* Quick Actions */}
        <div className="card">
          <div className="card-title">⚡ Quick Actions</div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
          >
            {[
              {
                label: "Send Message",
                href: "/messages",
                icon: "💬",
                color: "#25D366",
              },
              {
                label: "New Campaign",
                href: "/campaigns",
                icon: "📢",
                color: "#4F8EF7",
              },
              {
                label: "Add Contact",
                href: "/contacts",
                icon: "👤",
                color: "#F59E0B",
              },
              {
                label: "New Automation",
                href: "/automations",
                icon: "⚡",
                color: "#8B5CF6",
              },
              {
                label: "Create Template",
                href: "/templates",
                icon: "📝",
                color: "#06B6D4",
              },
              {
                label: "Configure AI",
                href: "/ai-chatbot",
                icon: "🤖",
                color: "#EF4444",
              },
            ].map((a) => (
              <a
                key={a.href}
                href={a.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "var(--bg-elevated)",
                  color: "var(--text-primary)",
                  textDecoration: "none",
                  fontSize: 12,
                  fontWeight: 500,
                  border: "1px solid var(--border)",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bg-hover)";
                  e.currentTarget.style.borderColor = a.color + "44";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--bg-elevated)";
                  e.currentTarget.style.borderColor = "var(--border)";
                }}
              >
                <span style={{ fontSize: 16 }}>{a.icon}</span>
                {a.label}
              </a>
            ))}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="card">
          <div className="card-title">📋 Recent Activity</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              {
                icon: "💬",
                text: "Message sent to +91 98765 43210",
                time: "2m ago",
                color: "#25D366",
              },
              {
                icon: "🤖",
                text: "AI handled 3 customer queries",
                time: "14m ago",
                color: "#8B5CF6",
              },
              {
                icon: "📢",
                text: "Summer Campaign: 1,200 delivered",
                time: "1h ago",
                color: "#4F8EF7",
              },
              {
                icon: "👤",
                text: "5 new contacts imported",
                time: "2h ago",
                color: "#F59E0B",
              },
              {
                icon: "✅",
                text: "Template 'Order Confirm' approved",
                time: "3h ago",
                color: "#25D366",
              },
              {
                icon: "⚡",
                text: "Cart recovery automation triggered",
                time: "4h ago",
                color: "#06B6D4",
              },
            ].map((a, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "7px 0",
                  borderBottom: i < 5 ? "1px solid var(--border)" : "none",
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: a.color + "18",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  {a.icon}
                </div>
                <div style={{ flex: 1, fontSize: 12, lineHeight: 1.4 }}>
                  <div style={{ color: "var(--text-primary)" }}>{a.text}</div>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--text-muted)",
                    flexShrink: 0,
                  }}
                >
                  {a.time}
                </span>
              </div>
            ))}
          </div>
          {lastRefreshed && (
            <div
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                marginTop: 12,
                textAlign: "right",
              }}
            >
              Updated {lastRefreshed.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
