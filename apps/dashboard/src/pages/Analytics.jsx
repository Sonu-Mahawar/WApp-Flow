import { useEffect, useState, useRef } from "react";
import { waApi } from "../store.js";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = ["#25D366", "#4F8EF7", "#8B5CF6", "#F59E0B", "#EF4444"];

export default function AnalyticsPage() {
  const [overview, setOverview] = useState(null);
  const [chart, setChart] = useState([]);
  const [conversion, setConversion] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      waApi.get("/analytics/overview", { days: 30 }),
      waApi.get("/analytics/messages-chart", { days: 14 }),
      waApi.get("/analytics/conversion-rate"),
    ])
      .then(([o, c, cv]) => {
        setOverview(o.data.metrics);
        setChart(c.data.chart || []);
        setConversion(cv.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div style={{ color: "var(--text-secondary)", padding: 40 }}>
        Loading analytics...
      </div>
    );
  const m = overview || {};

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

  const tooltipStyle = {
    background: "var(--bg-elevated)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: 12,
  };

  return (
    <div>
      <div className="stats-grid">
        {[
          {
            label: "Messages Sent",
            value: m.messages_sent?.toLocaleString() || "0",
            color: "#25D366",
          },
          {
            label: "Delivery Rate",
            value: `${m.delivery_rate || 0}%`,
            color: "#4F8EF7",
          },
          {
            label: "Read Rate",
            value: `${m.read_rate || 0}%`,
            color: "#8B5CF6",
          },
          {
            label: "Cart Recovery",
            value: `${conversion?.conversion_rate || 0}%`,
            color: "#F59E0B",
          },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-card-label">{s.label}</div>
            <div className="stat-card-value" style={{ color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-title">📈 Daily Message Volume</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chart}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
              />
              <XAxis
                dataKey="date"
                stroke="var(--text-muted)"
                tick={{ fontSize: 10 }}
              />
              <YAxis stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
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
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="card-title">🍩 Message Funnel</div>
          <ResponsiveContainer width="100%" height={220}>
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
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="card-title">🛒 Abandoned Cart Recovery</div>
        <div className="grid-3">
          {[
            {
              label: "Abandoned Carts",
              value: conversion?.abandoned_carts || 0,
              color: "#EF4444",
            },
            {
              label: "Reminders Sent",
              value: conversion?.abandoned_carts || 0,
              color: "#F59E0B",
            },
            {
              label: "Recovered",
              value: conversion?.recovered_carts || 0,
              color: "#25D366",
            },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                textAlign: "center",
                padding: 20,
                background: "var(--bg-elevated)",
                borderRadius: 10,
              }}
            >
              <div style={{ fontSize: 32, fontWeight: 800, color: s.color }}>
                {s.value}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  marginTop: 4,
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
