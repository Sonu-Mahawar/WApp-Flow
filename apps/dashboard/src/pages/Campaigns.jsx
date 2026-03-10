import { useEffect, useState } from "react";
import { waApi } from "../store.js";
import toast from "react-hot-toast";
import {
  Plus,
  Trash2,
  Megaphone,
  Play,
  Calendar,
  Users,
  BarChart3,
  Clock,
  X,
} from "lucide-react";

const DEMO_CAMPAIGNS = [
  {
    id: "c1",
    name: "Summer Sale 2025",
    status: "completed",
    sent_count: 1200,
    total_count: 1200,
    template_name: "Summer Offer",
    created_at: "2025-03-01",
    delivery_rate: 96,
  },
  {
    id: "c2",
    name: "New Product Launch",
    status: "running",
    sent_count: 760,
    total_count: 2000,
    template_name: "Product Launch",
    created_at: "2025-03-08",
    delivery_rate: 94,
  },
  {
    id: "c3",
    name: "Cart Recovery Q1",
    status: "scheduled",
    sent_count: 0,
    total_count: 500,
    template_name: "Cart Reminder",
    created_at: "2025-03-10",
    delivery_rate: 0,
  },
  {
    id: "c4",
    name: "Festive Diwali",
    status: "draft",
    sent_count: 0,
    total_count: 800,
    template_name: "Festival Greeting",
    created_at: "2025-03-05",
    delivery_rate: 0,
  },
];

const STATUS_CONFIG = {
  draft: {
    label: "Draft",
    color: "#6B7280",
    bg: "rgba(107,114,128,0.1)",
    icon: "✏️",
  },
  scheduled: {
    label: "Scheduled",
    color: "#4F8EF7",
    bg: "rgba(79,142,247,0.1)",
    icon: "📅",
  },
  running: {
    label: "Running",
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.1)",
    icon: "🔄",
  },
  completed: {
    label: "Done",
    color: "#25D366",
    bg: "rgba(37,211,102,0.1)",
    icon: "✅",
  },
  paused: {
    label: "Paused",
    color: "#EF4444",
    bg: "rgba(239,68,68,0.1)",
    icon: "⏸️",
  },
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [form, setForm] = useState({
    name: "",
    template_id: "",
    scheduled_at: "",
  });
  const [filter, setFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const [c, t] = await Promise.all([
        waApi.get("/campaigns"),
        waApi.get("/templates"),
      ]);
      setCampaigns(c.data.campaigns || []);
      setTemplates(t.data.templates || []);
    } catch {
      setCampaigns(DEMO_CAMPAIGNS);
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!form.name.trim()) return toast.error("Campaign name is required");
    if (!form.template_id) return toast.error("Please select a template");
    try {
      await waApi.post("/campaigns", form);
      toast.success("✅ Campaign created!");
      setShowCreate(false);
      setForm({ name: "", template_id: "", scheduled_at: "" });
      load();
    } catch {
      if (isDemo) {
        const newC = {
          id: `c${Date.now()}`,
          name: form.name,
          status: form.scheduled_at ? "scheduled" : "draft",
          sent_count: 0,
          total_count: 0,
          template_name: "Custom",
          created_at: new Date().toISOString().split("T")[0],
          delivery_rate: 0,
        };
        setCampaigns((prev) => [newC, ...prev]);
        toast.success("✅ Campaign created! (Demo mode)");
        setShowCreate(false);
        setForm({ name: "", template_id: "", scheduled_at: "" });
      } else {
        toast.error("Failed to create campaign");
      }
    }
  };

  const launch = async (id) => {
    if (
      !confirm(
        "🚀 Launch this campaign? Messages will be sent to all opted-in contacts immediately.",
      )
    )
      return;
    try {
      await waApi.post(`/campaigns/${id}/launch`);
      toast.success("🚀 Campaign launched!");
      load();
    } catch {
      setCampaigns((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: "running" } : c)),
      );
      toast.success("🚀 Campaign launched! (Demo mode)");
    }
  };

  const del = async (id) => {
    if (!confirm("Delete this campaign?")) return;
    try {
      await waApi.delete(`/campaigns/${id}`);
    } catch {}
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
    toast.success("Deleted");
  };

  const filtered = campaigns.filter(
    (c) => filter === "all" || c.status === filter,
  );

  const stats = {
    total: campaigns.length,
    active: campaigns.filter((c) => c.status === "running").length,
    completed: campaigns.filter((c) => c.status === "completed").length,
    totalSent: campaigns.reduce((s, c) => s + (c.sent_count || 0), 0),
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Campaigns</h1>
          <p>Broadcast WhatsApp messages to your contact segments</p>
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
              }}
            >
              Demo
            </span>
          )}
          <button
            id="createCampaignBtn"
            className="btn btn-primary"
            onClick={() => setShowCreate((v) => !v)}
          >
            {showCreate ? <X size={15} /> : <Plus size={15} />}{" "}
            {showCreate ? "Cancel" : "New Campaign"}
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[
          {
            label: "Total Campaigns",
            value: stats.total,
            icon: "📢",
            color: "#4F8EF7",
          },
          {
            label: "Active Now",
            value: stats.active,
            icon: "🔄",
            color: "#F59E0B",
          },
          {
            label: "Completed",
            value: stats.completed,
            icon: "✅",
            color: "#25D366",
          },
          {
            label: "Total Sent",
            value: stats.totalSent.toLocaleString(),
            icon: "📤",
            color: "#8B5CF6",
          },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div
              className="stat-card-icon"
              style={{
                background: `${s.color}18`,
                color: s.color,
                fontSize: 20,
              }}
            >
              {s.icon}
            </div>
            <div className="stat-card-label">{s.label}</div>
            <div className="stat-card-value" style={{ color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Create form */}
      {showCreate && (
        <div
          className="card"
          style={{
            marginBottom: 20,
            borderColor: "rgba(37,211,102,0.3)",
            borderWidth: 1,
          }}
        >
          <div className="card-title">✨ Create New Campaign</div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Campaign Name *</label>
              <input
                id="campaignName"
                className="form-input"
                placeholder="e.g. Summer Sale Blast 2025"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">WhatsApp Template *</label>
              <select
                id="campaignTemplate"
                className="form-select"
                value={form.template_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, template_id: e.target.value }))
                }
              >
                <option value="">Select an approved template...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
                {isDemo && (
                  <>
                    <option value="demo1">Welcome Message</option>
                    <option value="demo2">Order Confirmation</option>
                    <option value="demo3">Summer Offer</option>
                  </>
                )}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">
                <Calendar
                  size={11}
                  style={{ display: "inline", marginRight: 4 }}
                />
                Schedule (optional)
              </label>
              <input
                type="datetime-local"
                className="form-input"
                value={form.scheduled_at}
                onChange={(e) =>
                  setForm((f) => ({ ...f, scheduled_at: e.target.value }))
                }
              />
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  marginTop: 3,
                }}
              >
                Leave empty to save as draft and launch manually
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">
                <Users
                  size={11}
                  style={{ display: "inline", marginRight: 4 }}
                />
                Target Audience
              </label>
              <select className="form-select">
                <option>All opted-in contacts</option>
                <option>VIP customers only</option>
                <option>New contacts (last 30 days)</option>
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button
              id="saveCampaignBtn"
              className="btn btn-primary"
              onClick={create}
            >
              <Megaphone size={14} />{" "}
              {form.scheduled_at ? "Schedule Campaign" : "Create Campaign"}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div className="card-title" style={{ marginBottom: 0 }}>
            <Megaphone size={15} /> All Campaigns ({filtered.length})
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {["all", "draft", "scheduled", "running", "completed"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  background:
                    filter === f ? "var(--green)" : "var(--bg-elevated)",
                  color: filter === f ? "#000" : "var(--text-secondary)",
                  fontSize: 11,
                  fontWeight: filter === f ? 700 : 400,
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Array(3)
              .fill(null)
              .map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 70,
                    borderRadius: 10,
                    background: "var(--bg-elevated)",
                    animation: "pulse 1.5s infinite",
                  }}
                />
              ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📢</div>
            <p>
              {filter === "all"
                ? "No campaigns yet."
                : `No ${filter} campaigns.`}
            </p>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowCreate(true)}
            >
              Create First Campaign
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((c) => {
              const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.draft;
              const pct =
                c.total_count > 0
                  ? Math.round((c.sent_count / c.total_count) * 100)
                  : 0;
              return (
                <div
                  key={c.id}
                  style={{
                    padding: "16px",
                    background: "var(--bg-elevated)",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 10,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>
                        {c.name}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text-secondary)",
                          marginTop: 2,
                        }}
                      >
                        Template:{" "}
                        <span style={{ color: "var(--text-primary)" }}>
                          {c.template_name || "—"}
                        </span>
                        {c.created_at && <> · Created {c.created_at}</>}
                      </div>
                    </div>
                    <span
                      style={{
                        background: cfg.bg,
                        color: cfg.color,
                        borderRadius: 16,
                        padding: "3px 10px",
                        fontSize: 11,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {cfg.icon} {cfg.label}
                    </span>
                  </div>

                  {/* Progress bar */}
                  {(c.status === "running" || c.status === "completed") && (
                    <div style={{ marginBottom: 10 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 11,
                          color: "var(--text-secondary)",
                          marginBottom: 4,
                        }}
                      >
                        <span>
                          Progress: {c.sent_count.toLocaleString()} /{" "}
                          {c.total_count.toLocaleString()}
                        </span>
                        <span style={{ color: cfg.color, fontWeight: 700 }}>
                          {pct}%
                        </span>
                      </div>
                      <div
                        style={{
                          height: 5,
                          background: "var(--bg-base)",
                          borderRadius: 3,
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            borderRadius: 3,
                            width: `${pct}%`,
                            background:
                              c.status === "completed"
                                ? "linear-gradient(90deg,#25D366,#128C4F)"
                                : "linear-gradient(90deg,#F59E0B,#D97706)",
                            transition: "width 0.8s ease",
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                      {[
                        ["📤", "Sent", c.sent_count || 0],
                        ["👥", "Total", c.total_count || 0],
                        [
                          "✅",
                          "Delivery",
                          c.status === "completed"
                            ? `${c.delivery_rate || 0}%`
                            : "—",
                        ],
                      ].map(([icon, label, val]) => (
                        <div
                          key={label}
                          style={{
                            display: "flex",
                            gap: 5,
                            alignItems: "center",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {icon} <span>{label}:</span>{" "}
                          <strong style={{ color: "var(--text-primary)" }}>
                            {val}
                          </strong>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {c.status === "draft" && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => launch(c.id)}
                        >
                          <Play size={11} /> Launch
                        </button>
                      )}
                      {c.status === "running" && (
                        <button className="btn btn-secondary btn-sm">
                          ⏸ Pause
                        </button>
                      )}
                      {c.status === "completed" && (
                        <button className="btn btn-secondary btn-sm">
                          <BarChart3 size={11} /> Report
                        </button>
                      )}
                      {["draft", "completed"].includes(c.status) && (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => del(c.id)}
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
