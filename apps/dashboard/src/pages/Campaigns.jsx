import { useEffect, useState } from "react";
import { waApi } from "../store.js";
import toast from "react-hot-toast";
import { Plus, Trash2, Megaphone } from "lucide-react";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", template_id: "" });
  const [loading, setLoading] = useState(true);

  const load = () => {
    Promise.all([waApi.get("/campaigns"), waApi.get("/templates")])
      .then(([c, t]) => {
        setCampaigns(c.data.campaigns);
        setTemplates(t.data.templates);
      })
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!form.name || !form.template_id)
      return toast.error("Name and template required");
    try {
      await waApi.post("/campaigns", form);
      toast.success("Campaign created!");
      setShowCreate(false);
      load();
    } catch {
      toast.error("Failed");
    }
  };

  const launch = async (id) => {
    if (
      !confirm(
        "Launch this campaign now? This will send to all opted-in contacts.",
      )
    )
      return;
    try {
      await waApi.post(`/campaigns/${id}/launch`);
      toast.success("Campaign launched!");
      load();
    } catch {
      toast.error("Launch failed");
    }
  };

  const del = async (id) => {
    if (!confirm("Delete campaign?")) return;
    await waApi.delete(`/campaigns/${id}`);
    toast.success("Deleted");
    load();
  };

  const statusColor = {
    draft: "badge-gray",
    running: "badge-orange",
    completed: "badge-green",
    scheduled: "badge-blue",
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Campaigns</h1>
          <p>Broadcast messages to all your contacts</p>
        </div>
        <button
          id="createCampaignBtn"
          className="btn btn-primary"
          onClick={() => setShowCreate(!showCreate)}
        >
          <Plus size={16} /> New Campaign
        </button>
      </div>

      {showCreate && (
        <div
          className="card"
          style={{ marginBottom: 24, borderColor: "rgba(37,211,102,0.3)" }}
        >
          <div className="card-title">Create Campaign</div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Campaign Name</label>
              <input
                id="campaignName"
                className="form-input"
                placeholder="Summer Sale Blast"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">Template</label>
              <select
                id="campaignTemplate"
                className="form-select"
                value={form.template_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, template_id: e.target.value }))
                }
              >
                <option value="">Select template...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            id="saveCampaignBtn"
            className="btn btn-primary"
            onClick={create}
          >
            Create Campaign
          </button>
        </div>
      )}

      <div className="card">
        <div className="card-title">
          <Megaphone size={16} /> All Campaigns
        </div>
        {loading ? (
          <p style={{ color: "var(--text-secondary)" }}>Loading...</p>
        ) : campaigns.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📢</div>
            <p>No campaigns yet.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Sent</th>
                  <th>Total</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500 }}>{c.name}</td>
                    <td>
                      <span
                        className={`badge ${statusColor[c.status] || "badge-gray"}`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td>{c.sent_count || 0}</td>
                    <td>{c.total_count || 0}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        {c.status === "draft" && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => launch(c.id)}
                          >
                            🚀 Launch
                          </button>
                        )}
                        {c.status === "draft" && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => del(c.id)}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
