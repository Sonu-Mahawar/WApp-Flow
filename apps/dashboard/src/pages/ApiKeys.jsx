import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  Plus,
  Copy,
  Trash2,
  Key,
  Eye,
  EyeOff,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

const LS_KEY = "wa-api-keys";

function loadKeys() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) || [];
  } catch {
    return [];
  }
}
function saveKeys(keys) {
  localStorage.setItem(LS_KEY, JSON.stringify(keys));
}

function genKey() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let k = "wap_live_";
  for (let i = 0; i < 40; i++)
    k += chars[Math.floor(Math.random() * chars.length)];
  return k;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState(loadKeys);
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState(null);
  const [showKeys, setShowKeys] = useState({});

  const refresh = () => setKeys(loadKeys());

  const create = () => {
    if (!name.trim()) return toast.error("Enter a key name");
    const key = genKey();
    const rec = {
      id: Date.now().toString(),
      name: name.trim(),
      key,
      key_prefix: key.slice(0, 12),
      is_active: true,
      created_at: new Date().toISOString(),
      last_used_at: null,
    };
    const next = [...loadKeys(), rec];
    saveKeys(next);
    setKeys(next);
    setNewKey(key);
    setName("");
    toast.success("API key created — copy it now, it won't be shown again!");
  };

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  };

  const del = (id) => {
    if (!confirm("Delete this API key?")) return;
    const next = loadKeys().filter((k) => k.id !== id);
    saveKeys(next);
    setKeys(next);
    toast.success("Deleted");
  };

  const toggle = (id) => {
    const next = loadKeys().map((k) =>
      k.id === id ? { ...k, is_active: !k.is_active } : k,
    );
    saveKeys(next);
    setKeys(next);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>API Keys</h1>
          <p>Use keys to authenticate SDK and API calls</p>
        </div>
      </div>

      {newKey && (
        <div
          className="card"
          style={{
            marginBottom: 24,
            borderColor: "rgba(37,211,102,0.5)",
            background: "rgba(37,211,102,0.05)",
          }}
        >
          <div
            style={{ color: "var(--green)", fontWeight: 600, marginBottom: 8 }}
          >
            ⚠️ Copy your API key — it won't be shown again!
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <code
              style={{
                flex: 1,
                background: "var(--bg-elevated)",
                padding: "10px 14px",
                borderRadius: 8,
                fontFamily: "monospace",
                fontSize: 13,
                wordBreak: "break-all",
              }}
            >
              {newKey}
            </code>
            <button className="btn btn-primary" onClick={() => copy(newKey)}>
              <Copy size={14} /> Copy
            </button>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            style={{ marginTop: 10 }}
            onClick={() => setNewKey(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">
          <Key size={16} /> Create New API Key
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <input
            id="keyNameInput"
            className="form-input"
            placeholder="e.g. Shopify Integration"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
            style={{ flex: 1 }}
          />
          <button
            id="createKeyBtn"
            className="btn btn-primary"
            onClick={create}
          >
            <Plus size={16} /> Create
          </button>
        </div>
        <div
          style={{
            marginTop: 12,
            fontSize: 12,
            color: "var(--text-secondary)",
            lineHeight: 1.7,
          }}
        >
          <strong style={{ color: "var(--text-primary)" }}>Usage:</strong> Pass
          the key in the <code>x-api-key</code> header or{" "}
          <code>Authorization: Bearer &lt;key&gt;</code>.<br />
          <strong>Shortcodes:</strong> <code>{"{{api_key}}"}</code> in templates
          will be replaced with your active key.
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          Your API Keys{" "}
          <span
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              fontWeight: 400,
            }}
          >
            ({keys.length})
          </span>
        </div>
        {keys.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔑</div>
            <p>No API keys yet. Create one above.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Key</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id}>
                    <td style={{ fontWeight: 500 }}>{k.name}</td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <code
                          style={{
                            fontSize: 12,
                            background: "var(--bg-elevated)",
                            padding: "2px 8px",
                            borderRadius: 4,
                          }}
                        >
                          {showKeys[k.id]
                            ? k.key
                            : k.key_prefix + "••••••••••••"}
                        </code>
                        <button
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--text-secondary)",
                            padding: 2,
                          }}
                          onClick={() =>
                            setShowKeys((s) => ({ ...s, [k.id]: !s[k.id] }))
                          }
                        >
                          {showKeys[k.id] ? (
                            <EyeOff size={13} />
                          ) : (
                            <Eye size={13} />
                          )}
                        </button>
                        {showKeys[k.id] && (
                          <button
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "var(--text-secondary)",
                              padding: 2,
                            }}
                            onClick={() => copy(k.key)}
                          >
                            <Copy size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge ${k.is_active ? "badge-green" : "badge-gray"}`}
                      >
                        {k.is_active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td
                      style={{ color: "var(--text-secondary)", fontSize: 12 }}
                    >
                      {new Date(k.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => toggle(k.id)}
                          title={k.is_active ? "Disable" : "Enable"}
                        >
                          {k.is_active ? (
                            <ToggleRight size={14} color="var(--green)" />
                          ) : (
                            <ToggleLeft size={14} />
                          )}
                          {k.is_active ? "Disable" : "Enable"}
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => del(k.id)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-title">📚 SDK Quick Start</div>
        <div
          style={{
            marginBottom: 12,
            fontSize: 12,
            color: "var(--text-secondary)",
          }}
        >
          Replace <code style={{ color: "var(--green)" }}>YOUR_KEY</code> with
          any active key above.
        </div>
        <div className="grid-2">
          {[
            {
              lang: "JavaScript",
              code: `import WA from 'whatsapp-automation-sdk'\nWA.init({ apiKey: 'YOUR_KEY' })\nWA.send({ phone: '919876543210', message: 'Hello {{name}}!' })`,
            },
            {
              lang: "Python",
              code: `import wa\nwa.init(api_key='YOUR_KEY')\nwa.send_message('919876543210', 'Hello {{name}}!')`,
            },
            {
              lang: "cURL",
              code: `curl -X POST https://api.yourdomain.com/v1/messages/send \\\n  -H "x-api-key: YOUR_KEY" \\\n  -d '{"phone":"919876543210","message":"Hello!"}'`,
            },
            {
              lang: "PHP",
              code: `$wa = new WhatsApp\\Client(['api_key' => 'YOUR_KEY']);\n$wa->sendMessage('919876543210', 'Hello {{name}}!');`,
            },
          ].map((s) => (
            <div
              key={s.lang}
              style={{
                background: "var(--bg-elevated)",
                borderRadius: 10,
                padding: 16,
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--green)",
                  marginBottom: 10,
                }}
              >
                {s.lang}
              </div>
              <pre
                style={{
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  whiteSpace: "pre-wrap",
                  fontFamily: "monospace",
                  lineHeight: 1.6,
                }}
              >
                {s.code}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
