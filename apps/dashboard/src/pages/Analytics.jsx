import { useEffect, useState, useCallback } from "react";
import { waApi } from "../store.js";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
} from "lucide-react";

const COLORS = [
  "#25D366",
  "#4F8EF7",
  "#8B5CF6",
  "#F59E0B",
  "#EF4444",
  "#06B6D4",
];
const DEMO = {
  metrics: {
    messages_sent: 4820,
    delivery_rate: 96.4,
    read_rate: 78.9,
    total_contacts: 1284,
    campaigns_completed: 27,
  },
  chart: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => ({
    date: d,
    sent: Math.floor(Math.random() * 400 + 200),
    received: Math.floor(Math.random() * 180 + 80),
  })),
  conversion: {
    abandoned_carts: 342,
    recovered_carts: 218,
    conversion_rate: 63.7,
    orders: 891,
  },
};

const CT = ({ active, payload, label }) => {
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
          marginBottom: 4,
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

function StatCard({ label, value, sub, color, icon, trend }) {
  return (
    <div className="stat-card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 10,
        }}
      >
        <div
          className="stat-card-icon"
          style={{ background: `${color}18`, color, fontSize: 20 }}
        >
          {icon}
        </div>
        {trend !== undefined && (
          <span
            style={{
              fontSize: 11,
              color: trend >= 0 ? "var(--green)" : "#ef4444",
              background:
                trend >= 0 ? "rgba(37,211,102,0.1)" : "rgba(239,68,68,0.1)",
              padding: "2px 8px",
              borderRadius: 20,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            {trend >= 0 ? <TrendingUp size={9} /> : <TrendingDown size={9} />}{" "}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value" style={{ color }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [activeChart, setActiveChart] = useState("area");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, c, cv] = await Promise.all([
        waApi.get(`/analytics/overview?days=${days}`),
        waApi.get(`/analytics/messages-chart?days=${days}`),
        waApi.get("/analytics/conversion-rate"),
      ]);
      setData({
        metrics: o.data.metrics,
        chart: c.data.chart || [],
        conversion: cv.data,
      });
      setIsDemo(false);
    } catch {
      setData(DEMO);
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const exportCSV = () => {
    if (!data?.chart?.length) return;
    const csv = [
      "Date,Sent,Received",
      ...data.chart.map((r) => `${r.date},${r.sent || 0},${r.received || 0}`),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `analytics-${days}d.csv`;
    a.click();
  };

  const m = data?.metrics || {};
  const cv = data?.conversion || {};
  const pieData = [
    { name: "Sent", value: m.messages_sent || 0 },
    {
      name: "Delivered",
      value: Math.round(
        ((m.messages_sent || 0) * (m.delivery_rate || 0)) / 100,
      ),
    },
    {
      name: "Read",
      value: Math.round(((m.messages_sent || 0) * (m.read_rate || 0)) / 100),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Analytics</h1>
          <p>WhatsApp performance metrics and insights</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {isDemo && (
            <span
              style={{
                fontSize: 11,
                background: "rgba(245,158,11,0.1)",
                border: "1px solid rgba(245,158,11,0.3)",
                color: "#f59e0b",
                padding: "4px 10px",
                borderRadius: 20,
                fontWeight: 600,
              }}
            >
              Demo Data
            </span>
          )}
          {/* Date range selector */}
          <div
            style={{
              display: "flex",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            {[7, 14, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                style={{
                  padding: "6px 12px",
                  background: days === d ? "var(--green)" : "transparent",
                  color: days === d ? "#000" : "var(--text-secondary)",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: days === d ? 700 : 400,
                  transition: "all 0.15s",
                }}
              >
                {d}d
              </button>
            ))}
          </div>
          <button
            onClick={exportCSV}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "7px 12px",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              cursor: "pointer",
              color: "var(--text-secondary)",
              fontSize: 12,
            }}
          >
            <Download size={13} /> Export
          </button>
          <button
            onClick={load}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "7px 12px",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              cursor: "pointer",
              color: "var(--text-secondary)",
              fontSize: 12,
            }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI cards */}
      {loading ? (
        <div className="stats-grid">
          {Array(5)
            .fill(null)
            .map((_, i) => (
              <div
                key={i}
                style={{
                  height: 100,
                  borderRadius: 12,
                  background: "var(--bg-elevated)",
                  animation: "pulse 1.5s infinite",
                }}
              />
            ))}
        </div>
      ) : (
        <div className="stats-grid">
          <StatCard
            label="Messages Sent"
            value={(m.messages_sent || 0).toLocaleString()}
            sub={`Last ${days} days`}
            color="#25D366"
            icon="📤"
            trend={18}
          />
          <StatCard
            label="Delivery Rate"
            value={`${m.delivery_rate || 0}%`}
            sub="Delivered/Sent"
            color="#4F8EF7"
            icon="✅"
            trend={2.1}
          />
          <StatCard
            label="Read Rate"
            value={`${m.read_rate || 0}%`}
            sub="Read/Delivered"
            color="#8B5CF6"
            icon="👁️"
            trend={5.4}
          />
          <StatCard
            label="Total Contacts"
            value={(m.total_contacts || 0).toLocaleString()}
            sub="In CRM"
            color="#F59E0B"
            icon="👥"
            trend={12}
          />
          <StatCard
            label="Cart Recovery"
            value={`${cv.conversion_rate || 0}%`}
            sub={`${cv.recovered_carts || 0} recovered`}
            color="#06B6D4"
            icon="🛒"
            trend={8}
          />
        </div>
      )}

      {/* Charts row */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
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
              📊 Message Volume
            </div>
            <div
              style={{
                display: "flex",
                gap: 2,
                background: "var(--bg-elevated)",
                borderRadius: 6,
                padding: 2,
              }}
            >
              {[
                ["area", "▲ Area"],
                ["bar", "▊ Bar"],
              ].map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setActiveChart(v)}
                  style={{
                    padding: "3px 10px",
                    fontSize: 11,
                    background:
                      activeChart === v ? "var(--green)" : "transparent",
                    color: activeChart === v ? "#000" : "var(--text-secondary)",
                    border: "none",
                    borderRadius: 5,
                    cursor: "pointer",
                    fontWeight: activeChart === v ? 700 : 400,
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            {activeChart === "area" ? (
              <AreaChart data={data?.chart || []}>
                <defs>
                  <linearGradient id="gSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#25D366" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#25D366" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gRecv" x1="0" y1="0" x2="0" y2="1">
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
                  tick={{ fontSize: 10 }}
                />
                <YAxis stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                <Tooltip content={<CT />} />
                <Area
                  type="monotone"
                  dataKey="sent"
                  stroke="#25D366"
                  strokeWidth={2}
                  fill="url(#gSent)"
                  name="Sent"
                />
                <Area
                  type="monotone"
                  dataKey="received"
                  stroke="#4F8EF7"
                  strokeWidth={2}
                  fill="url(#gRecv)"
                  name="Received"
                />
              </AreaChart>
            ) : (
              <BarChart data={data?.chart || []}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.04)"
                />
                <XAxis
                  dataKey="date"
                  stroke="var(--text-muted)"
                  tick={{ fontSize: 10 }}
                />
                <YAxis stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                <Tooltip content={<CT />} />
                <Bar
                  dataKey="sent"
                  fill="#25D366"
                  radius={[4, 4, 0, 0]}
                  name="Sent"
                />
                <Bar
                  dataKey="received"
                  fill="#4F8EF7"
                  radius={[4, 4, 0, 0]}
                  name="Received"
                />
              </BarChart>
            )}
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
            ].map(([c, l]) => (
              <div
                key={l}
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
                    background: c,
                    borderRadius: 2,
                  }}
                />
                {l}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-title">🍩 Message Funnel</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                labelLine={false}
                fontSize={11}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Funnel stats */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-around",
              marginTop: 8,
            }}
          >
            {pieData.map((p, i) => (
              <div key={p.name} style={{ textAlign: "center" }}>
                <div
                  style={{ fontSize: 18, fontWeight: 700, color: COLORS[i] }}
                >
                  {p.value.toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                  {p.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cart recovery + performance breakdown */}
      <div className="grid-2">
        <div className="card">
          <div className="card-title">🛒 Abandoned Cart Recovery</div>
          <div className="grid-3" style={{ marginBottom: 16 }}>
            {[
              {
                label: "Abandoned",
                value: cv.abandoned_carts || 0,
                color: "#EF4444",
                icon: "🛒",
              },
              {
                label: "Reminders Sent",
                value: cv.abandoned_carts || 0,
                color: "#F59E0B",
                icon: "📤",
              },
              {
                label: "Recovered",
                value: cv.recovered_carts || 0,
                color: "#25D366",
                icon: "✅",
              },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  textAlign: "center",
                  padding: "16px 10px",
                  background: "var(--bg-elevated)",
                  borderRadius: 10,
                  border: `1px solid ${s.color}22`,
                }}
              >
                <div style={{ fontSize: 22 }}>{s.icon}</div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: s.color,
                    marginTop: 4,
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-secondary)",
                    marginTop: 2,
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
          {/* Recovery rate bar */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 6,
                fontSize: 12,
              }}
            >
              <span style={{ color: "var(--text-secondary)" }}>
                Recovery Rate
              </span>
              <span style={{ fontWeight: 700, color: "#25D366" }}>
                {cv.conversion_rate || 0}%
              </span>
            </div>
            <div
              style={{
                height: 6,
                background: "var(--bg-elevated)",
                borderRadius: 3,
              }}
            >
              <div
                style={{
                  height: "100%",
                  borderRadius: 3,
                  width: `${cv.conversion_rate || 0}%`,
                  background: "linear-gradient(90deg, #25D366, #128C4F)",
                  transition: "width 0.8s ease",
                }}
              />
            </div>
            <div
              style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}
            >
              {cv.orders || 0} total orders placed
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">📈 Performance Insights</div>
          {[
            {
              label: "Best day",
              value: "Wednesday",
              sub: "Highest open rate",
              icon: "🗓️",
            },
            {
              label: "Peak hour",
              value: "10 AM – 12 PM",
              sub: "Most messages read",
              icon: "⏰",
            },
            {
              label: "Avg response time",
              value: "2m 14s",
              sub: "Agent reply speed",
              icon: "⚡",
            },
            {
              label: "Opt-out rate",
              value: "0.8%",
              sub: "Industry avg: 2.3%",
              icon: "🚫",
            },
            {
              label: "Template approval",
              value: "98%",
              sub: "Meta approval rate",
              icon: "✅",
            },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                background: "var(--bg-elevated)",
                borderRadius: 8,
                marginBottom: 8,
              }}
            >
              <div style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {item.label}
                </div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  {item.value}
                </div>
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--text-muted)",
                  textAlign: "right",
                }}
              >
                {item.sub}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
