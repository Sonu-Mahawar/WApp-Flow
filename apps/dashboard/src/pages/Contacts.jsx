import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  Plus,
  Trash2,
  Upload,
  Search,
  Tag,
  Phone,
  Mail,
  User,
  Edit2,
  X,
  Check,
} from "lucide-react";
import Papa from "papaparse";

const LS_KEY = "wa-contacts";

function loadContacts() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) || [];
  } catch {
    return [];
  }
}
function saveContacts(contacts) {
  localStorage.setItem(LS_KEY, JSON.stringify(contacts));
}

const EMPTY_FORM = { phone: "", name: "", email: "", tags: "", notes: "" };

export default function ContactsPage() {
  const [contacts, setContacts] = useState(loadContacts);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [filterTag, setFilterTag] = useState("");

  const allTags = [...new Set(contacts.flatMap((c) => c.tags || []))];

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      (c.name || "").toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.email || "").toLowerCase().includes(q);
    const matchTag = !filterTag || (c.tags || []).includes(filterTag);
    return matchSearch && matchTag;
  });

  const save = () => {
    if (!form.phone.trim()) return toast.error("Phone number is required");
    const tags = form.tags
      ? form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];
    if (editId) {
      const next = loadContacts().map((c) =>
        c.id === editId ? { ...c, ...form, tags } : c,
      );
      saveContacts(next);
      setContacts(next);
      toast.success("Contact updated!");
      setEditId(null);
    } else {
      if (loadContacts().find((c) => c.phone === form.phone))
        return toast.error("Phone already exists");
      const rec = {
        id: Date.now().toString(),
        ...form,
        tags,
        opted_in: true,
        created_at: new Date().toISOString(),
      };
      const next = [rec, ...loadContacts()];
      saveContacts(next);
      setContacts(next);
      toast.success("Contact added!");
    }
    setForm(EMPTY_FORM);
    setShowAdd(false);
  };

  const del = (id) => {
    if (!confirm("Delete contact?")) return;
    const next = loadContacts().filter((c) => c.id !== id);
    saveContacts(next);
    setContacts(next);
    toast.success("Deleted");
  };

  const startEdit = (c) => {
    setForm({
      phone: c.phone,
      name: c.name || "",
      email: c.email || "",
      tags: (c.tags || []).join(", "),
      notes: c.notes || "",
    });
    setEditId(c.id);
    setShowAdd(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleOptIn = (id) => {
    const next = loadContacts().map((c) =>
      c.id === id ? { ...c, opted_in: !c.opted_in } : c,
    );
    saveContacts(next);
    setContacts(next);
  };

  const importCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        let added = 0;
        const current = loadContacts();
        const next = [...current];
        data.forEach((row) => {
          const phone = (row.phone || row.Phone || row.mobile || "").replace(
            /\D/g,
            "",
          );
          if (!phone) return;
          if (next.find((c) => c.phone === phone)) return;
          next.push({
            id: Date.now().toString() + Math.random(),
            phone,
            name: row.name || row.Name || "",
            email: row.email || row.Email || "",
            tags: row.tags ? row.tags.split(",").map((t) => t.trim()) : [],
            notes: row.notes || "",
            opted_in: true,
            created_at: new Date().toISOString(),
          });
          added++;
        });
        saveContacts(next);
        setContacts(next);
        toast.success(`Imported ${added} new contacts!`);
      },
      error: () => toast.error("CSV parse error"),
    });
    e.target.value = "";
  };

  const exportCSV = () => {
    const csv = Papa.unparse(
      contacts.map((c) => ({
        phone: c.phone,
        name: c.name,
        email: c.email,
        tags: (c.tags || []).join(", "),
        notes: c.notes,
        opted_in: c.opted_in,
      })),
    );
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contacts.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported!");
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>CRM Contacts</h1>
          <p>
            {contacts.length.toLocaleString()} contacts ·{" "}
            {contacts.filter((c) => c.opted_in).length} opted in
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <label
            className="btn btn-secondary btn-sm"
            style={{ cursor: "pointer" }}
          >
            <Upload size={14} /> Import CSV
            <input
              type="file"
              accept=".csv"
              onChange={importCSV}
              style={{ display: "none" }}
            />
          </label>
          <button className="btn btn-secondary btn-sm" onClick={exportCSV}>
            ⬇ Export
          </button>
          <button
            id="addContactBtn"
            className="btn btn-primary"
            onClick={() => {
              setEditId(null);
              setForm(EMPTY_FORM);
              setShowAdd(!showAdd);
            }}
          >
            <Plus size={16} /> Add Contact
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAdd && (
        <div
          className="card"
          style={{ marginBottom: 20, borderColor: "rgba(37,211,102,0.3)" }}
        >
          <div className="card-title">
            {editId ? "✏️ Edit Contact" : "➕ New Contact"}
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">
                <Phone size={12} /> Phone * (with country code)
              </label>
              <input
                id="contactPhone"
                className="form-input"
                placeholder="919876543210"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                <User size={12} /> Full Name
              </label>
              <input
                className="form-input"
                placeholder="John Doe"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                <Mail size={12} /> Email
              </label>
              <input
                type="email"
                className="form-input"
                placeholder="john@example.com"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                <Tag size={12} /> Tags (comma separated)
              </label>
              <input
                className="form-input"
                placeholder="customer, vip, mumbai"
                value={form.tags}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tags: e.target.value }))
                }
              />
            </div>
            <div className="form-group" style={{ gridColumn: "1/-1" }}>
              <label className="form-label">Notes</label>
              <input
                className="form-input"
                placeholder="Order history, preferences..."
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              id="saveContactBtn"
              className="btn btn-primary"
              onClick={save}
            >
              <Check size={15} /> {editId ? "Update" : "Save Contact"}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setShowAdd(false);
                setEditId(null);
                setForm(EMPTY_FORM);
              }}
            >
              <X size={15} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="card">
        <div
          style={{
            display: "flex",
            gap: 10,
            marginBottom: 16,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-secondary)",
              }}
            />
            <input
              id="searchContacts"
              className="form-input"
              placeholder="Search name, phone, email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 36 }}
            />
          </div>
          {allTags.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                onClick={() => setFilterTag("")}
                style={{
                  padding: "4px 10px",
                  borderRadius: 16,
                  border: "1px solid var(--border)",
                  fontSize: 11,
                  background: !filterTag
                    ? "var(--green)"
                    : "var(--bg-elevated)",
                  color: !filterTag ? "#fff" : "var(--text-secondary)",
                  cursor: "pointer",
                }}
              >
                All
              </button>
              {allTags.map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterTag(t === filterTag ? "" : t)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 16,
                    border: "1px solid var(--border)",
                    fontSize: 11,
                    background:
                      filterTag === t ? "var(--green)" : "var(--bg-elevated)",
                    color: filterTag === t ? "#fff" : "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <p>
              {search || filterTag
                ? "No contacts match your filter."
                : "No contacts yet. Add your first contact above or import a CSV."}
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Tags</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500 }}>
                      {c.name || (
                        <span style={{ color: "var(--text-secondary)" }}>
                          —
                        </span>
                      )}
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: 13 }}>
                      {c.phone}
                    </td>
                    <td
                      style={{ color: "var(--text-secondary)", fontSize: 12 }}
                    >
                      {c.email || "—"}
                    </td>
                    <td>
                      {(c.tags || []).map((t) => (
                        <span
                          key={t}
                          className="badge badge-purple"
                          style={{ marginRight: 4, marginBottom: 2 }}
                        >
                          {t}
                        </span>
                      ))}
                    </td>
                    <td>
                      <button
                        onClick={() => toggleOptIn(c.id)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        <span
                          className={`badge ${c.opted_in ? "badge-green" : "badge-red"}`}
                        >
                          {c.opted_in ? "Opted In" : "Opted Out"}
                        </span>
                      </button>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => startEdit(c)}
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => del(c.id)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div
              style={{
                padding: "8px 0",
                fontSize: 12,
                color: "var(--text-secondary)",
              }}
            >
              Showing {filtered.length} of {contacts.length} contacts
            </div>
          </div>
        )}
      </div>

      {/* Keywords guide */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-title">📌 Shortcodes for Templates</div>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: 13,
            marginBottom: 14,
          }}
        >
          Use these in your message templates to personalize messages
          automatically:
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 10,
          }}
        >
          {[
            { code: "{{name}}", desc: "Contact's full name" },
            { code: "{{phone}}", desc: "Phone number" },
            { code: "{{email}}", desc: "Email address" },
            { code: "{{order_id}}", desc: "Order number" },
            { code: "{{amount}}", desc: "Payment amount" },
            { code: "{{product}}", desc: "Product name" },
            { code: "{{tracking_url}}", desc: "Shipping tracking link" },
            { code: "{{delivery_date}}", desc: "Expected delivery date" },
            { code: "{{otp}}", desc: "One-time password" },
            { code: "{{business_name}}", desc: "Your business name" },
          ].map((s) => (
            <div
              key={s.code}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                padding: "8px 12px",
                background: "var(--bg-elevated)",
                borderRadius: 8,
                border: "1px solid var(--border)",
              }}
            >
              <code
                style={{
                  color: "var(--green)",
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {s.code}
              </code>
              <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                {s.desc}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
