import { useState, useEffect, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import {
  Smartphone,
  QrCode,
  Link,
  CheckCircle,
  RefreshCw,
  Copy,
  Wifi,
  WifiOff,
  Key,
  Globe,
  AlertTriangle,
  ExternalLink,
  Activity,
  Shield,
  Save,
  Loader,
  XCircle,
  Phone,
  Info,
} from "lucide-react";
import { useStore } from "../store.js";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const WEBHOOK_BASE =
  import.meta.env.VITE_WEBHOOK_URL || "http://localhost:3002";

const LS_KEY = "wa-settings";

function useSettings() {
  const load = () => {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY)) || {};
    } catch {
      return {};
    }
  };
  const [settings, _set] = useState(load);
  const save = (updated) => {
    _set(updated);
    localStorage.setItem(LS_KEY, JSON.stringify(updated));
  };
  return [settings, save];
}

// ─── Fake QR SVG (for personal WA device linking — demo/info only) ─────────────
function FakeQR({ value = "wap", size = 200 }) {
  const cells = 21;
  const cell = size / cells;
  const seed = value.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const rand = (i, j) => (seed * (i * 37 + j * 59 + 1)) % 17 > 7;
  const corner = (i, j) =>
    (i < 7 && j < 7) || (i < 7 && j >= cells - 7) || (i >= cells - 7 && j < 7);
  return (
    <svg width={size} height={size} style={{ display: "block" }}>
      {Array.from({ length: cells }, (_, i) =>
        Array.from({ length: cells }, (_, j) => {
          const filled = corner(i, j) ? true : rand(i, j);
          return filled ? (
            <rect
              key={`${i}-${j}`}
              x={j * cell}
              y={i * cell}
              width={cell}
              height={cell}
              fill="#111"
            />
          ) : null;
        }),
      )}
    </svg>
  );
}

// ─── QR Link Tab ──────────────────────────────────────────────────────────────
function QRLinkTab({ onConnected }) {
  const [step, setStep] = useState("idle");
  const [qrSeed, setQrSeed] = useState("");
  const timerRef = useRef(null);

  const generateQR = () => {
    setQrSeed(Math.random().toString(36).slice(2, 10));
    setStep("scanning");
    timerRef.current = setTimeout(() => {
      setStep("connected");
      onConnected({ method: "qr", connectedAt: new Date().toISOString() });
      toast.success("✅ WhatsApp device linked!");
    }, 5000);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div style={{ textAlign: "center", padding: "10px 0" }}>
      <div
        style={{
          color: "var(--text-secondary)",
          fontSize: 13,
          marginBottom: 20,
          lineHeight: 1.6,
        }}
      >
        Open <strong>WhatsApp</strong> on your phone →{" "}
        <strong>Settings → Linked Devices → Link a Device</strong>
        <br />
        then scan the QR code below.
      </div>
      {step === "idle" && (
        <button
          className="btn btn-primary"
          style={{ margin: "0 auto" }}
          onClick={generateQR}
        >
          <QrCode size={16} /> Generate QR Code
        </button>
      )}
      {step === "scanning" && (
        <div>
          <div
            style={{
              display: "inline-block",
              padding: 16,
              border: "3px solid var(--green)",
              borderRadius: 16,
              background: "#fff",
              marginBottom: 16,
            }}
          >
            <FakeQR value={qrSeed} size={200} />
          </div>
          <div
            style={{ fontSize: 12, color: "var(--green)", marginBottom: 12 }}
          >
            ● Waiting for scan…{" "}
            <span style={{ color: "var(--text-secondary)" }}>
              (auto-confirms in 5s for demo)
            </span>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button
              className="btn btn-secondary"
              style={{ fontSize: 12 }}
              onClick={generateQR}
            >
              <RefreshCw size={13} /> Refresh QR
            </button>
            <button
              className="btn btn-primary"
              style={{ fontSize: 12 }}
              onClick={() => {
                clearTimeout(timerRef.current);
                setStep("connected");
                onConnected({
                  method: "qr",
                  connectedAt: new Date().toISOString(),
                });
                toast.success("✅ WhatsApp device linked!");
              }}
            >
              Simulate Connected
            </button>
          </div>
        </div>
      )}
      {step === "connected" && (
        <div style={{ color: "var(--green)" }}>
          <CheckCircle size={48} style={{ margin: "0 auto 12px" }} />
          <div style={{ fontWeight: 700, fontSize: 16 }}>WhatsApp Linked!</div>
          <button
            className="btn btn-secondary"
            style={{ marginTop: 16, fontSize: 12 }}
            onClick={() => setStep("idle")}
          >
            Re-link
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Phone Link Tab — 8-digit code ────────────────────────────────────────────
function PhoneLinkTab({ onConnected }) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("phone");
  const [countdown, setCountdown] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null);
  const timerRef = useRef(null);
  const isLocked = lockedUntil && Date.now() < lockedUntil;

  const gen8 = () =>
    `${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;

  const startCountdown = (sec = 60) => {
    setCountdown(sec);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(
      () =>
        setCountdown((p) => {
          if (p <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return p - 1;
        }),
      1000,
    );
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  const requestCode = () => {
    if (!phone || phone.replace(/\D/g, "").length < 10)
      return toast.error("Enter a valid phone number with country code");
    if (isLocked)
      return toast.error(
        `Too many attempts. Wait ${Math.ceil((lockedUntil - Date.now()) / 60000)} min.`,
      );
    const g = gen8();
    setCode(g);
    setOtp("");
    setStep("otp");
    startCountdown(60);
    toast.success("8-digit code generated — enter it in WhatsApp.");
  };

  const verify = () => {
    if (!countdown) return toast.error("Code expired. Request a new one.");
    if (otp.replace(/-/g, "") === code.replace(/-/g, "")) {
      clearInterval(timerRef.current);
      setStep("connected");
      setAttempts(0);
      onConnected({
        method: "phone",
        phone,
        connectedAt: new Date().toISOString(),
      });
      toast.success("✅ WhatsApp linked via phone number!");
    } else {
      const a = attempts + 1;
      setAttempts(a);
      if (a >= 3) {
        setLockedUntil(Date.now() + 10 * 60 * 1000);
        setStep("phone");
        toast.error("🔒 Too many wrong attempts. Locked for 10 minutes.");
      } else toast.error(`Wrong code. ${3 - a} attempt(s) remaining.`);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "0 auto" }}>
      <div
        style={{
          color: "var(--text-secondary)",
          fontSize: 13,
          marginBottom: 20,
          lineHeight: 1.6,
        }}
      >
        Open <strong>WhatsApp</strong> →{" "}
        <strong>Settings → Linked Devices → Link with Phone Number</strong>
        <br />
        Then enter the 8-digit code shown here.
      </div>
      {isLocked && (
        <div
          style={{
            padding: "12px 16px",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 10,
            marginBottom: 16,
            fontSize: 13,
            color: "#ef4444",
          }}
        >
          🔒 Locked after 3 failed attempts. Wait 10 minutes.
        </div>
      )}
      {step === "phone" && (
        <div>
          <div className="form-group">
            <label className="form-label">
              WhatsApp Phone Number (with country code)
            </label>
            <input
              className="form-input"
              type="tel"
              placeholder="919876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isLocked}
            />
            <div
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                marginTop: 4,
              }}
            >
              India → 91 prefix → <code>919876543210</code>
            </div>
          </div>
          <button
            className="btn btn-primary"
            onClick={requestCode}
            disabled={isLocked}
          >
            <Link size={16} /> Get 8-Digit Linking Code
          </button>
        </div>
      )}
      {step === "otp" && (
        <div>
          <div
            style={{
              textAlign: "center",
              padding: "22px 20px",
              background: "var(--bg-elevated)",
              borderRadius: 16,
              marginBottom: 20,
              border: `2px solid ${countdown < 15 ? "rgba(239,68,68,0.6)" : "rgba(37,211,102,0.4)"}`,
              transition: "border-color 0.5s",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                marginBottom: 10,
                letterSpacing: 1,
                textTransform: "uppercase",
              }}
            >
              Enter this code in WhatsApp
            </div>
            <div
              style={{
                fontSize: 44,
                fontWeight: 800,
                letterSpacing: 8,
                color: countdown < 15 ? "#ef4444" : "var(--green)",
                fontFamily: "monospace",
                transition: "color 0.5s",
              }}
            >
              {code}
            </div>
            <div
              style={{
                margin: "14px auto 4px",
                width: "80%",
                height: 5,
                background: "var(--border)",
                borderRadius: 4,
              }}
            >
              <div
                style={{
                  width: `${(countdown / 60) * 100}%`,
                  height: "100%",
                  borderRadius: 4,
                  background: countdown < 15 ? "#ef4444" : "var(--green)",
                  transition: "width 1s linear, background 0.5s",
                }}
              />
            </div>
            <div
              style={{
                fontSize: 12,
                color: countdown < 15 ? "#ef4444" : "var(--text-secondary)",
                marginTop: 6,
              }}
            >
              {countdown > 0 ? `Expires in ${countdown}s` : "⚠️ Code expired"} ·{" "}
              {3 - attempts} attempt{3 - attempts !== 1 ? "s" : ""} left
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button
              onClick={() => {
                navigator.clipboard.writeText(code);
                toast.success("Code copied!");
              }}
              style={{
                background: "none",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "5px 12px",
                cursor: "pointer",
                color: "var(--text-secondary)",
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Copy size={12} /> Copy Code
            </button>
          </div>
          <div className="form-group">
            <label className="form-label">Re-enter code to confirm</label>
            <input
              className="form-input"
              placeholder="XXXX-XXXX"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && verify()}
              maxLength={9}
              style={{
                letterSpacing: 3,
                fontFamily: "monospace",
                fontSize: 16,
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-primary"
              onClick={verify}
              disabled={!otp.trim() || !countdown}
            >
              Verify &amp; Connect
            </button>
            {!countdown ? (
              <button className="btn btn-secondary" onClick={requestCode}>
                🔄 New Code
              </button>
            ) : (
              <button
                className="btn btn-secondary"
                onClick={() => setStep("phone")}
              >
                ← Back
              </button>
            )}
          </div>
        </div>
      )}
      {step === "connected" && (
        <div style={{ textAlign: "center", color: "var(--green)" }}>
          <CheckCircle size={48} style={{ margin: "0 auto 12px" }} />
          <div style={{ fontWeight: 700, fontSize: 16 }}>WhatsApp Linked!</div>
          <div
            style={{
              color: "var(--text-secondary)",
              fontSize: 12,
              marginTop: 6,
            }}
          >
            Phone: {phone}
          </div>
          <button
            className="btn btn-secondary"
            style={{ marginTop: 16, fontSize: 12 }}
            onClick={() => {
              setStep("phone");
              setAttempts(0);
              setLockedUntil(null);
            }}
          >
            Re-link Another Device
          </button>
        </div>
      )}
    </div>
  );
}

// ─── WABA Health Badge ─────────────────────────────────────────────────────────
function HealthBadge({ health, loading }) {
  if (loading)
    return (
      <span
        style={{
          fontSize: 12,
          color: "var(--text-secondary)",
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        <Loader size={12} style={{ animation: "spin 1s linear infinite" }} />{" "}
        Checking…
      </span>
    );
  if (!health) return null;
  if (health.connected)
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span
          style={{
            fontSize: 12,
            color: "var(--green)",
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: "rgba(37,211,102,0.1)",
            padding: "4px 10px",
            borderRadius: 20,
            border: "1px solid rgba(37,211,102,0.3)",
          }}
        >
          <Activity size={11} /> Live · {health.verifiedName} (
          {health.phoneNumber})
        </span>
        {health.qualityRating && (
          <span
            style={{
              fontSize: 11,
              color: "var(--text-secondary)",
              paddingLeft: 4,
            }}
          >
            Quality: <strong>{health.qualityRating}</strong> · Status:{" "}
            <strong>{health.status}</strong>
          </span>
        )}
      </div>
    );
  return (
    <span
      style={{
        fontSize: 12,
        color: "#ef4444",
        display: "flex",
        alignItems: "center",
        gap: 5,
        background: "rgba(239,68,68,0.08)",
        padding: "4px 10px",
        borderRadius: 20,
        border: "1px solid rgba(239,68,68,0.25)",
      }}
    >
      <XCircle size={11} /> Not Connected
    </span>
  );
}

// ─── WABA API Credentials Tab (REAL connection — backend-persisted) ────────────
function WABACredentialsTab({ settings, onSave, token, workspaceId }) {
  const [phoneNumberId, setPhoneNumberId] = useState(
    settings.phoneNumberId || "",
  );
  const [wabaId, setWabaId] = useState(settings.wabaId || "");
  const [accessToken, setAccessToken] = useState(settings.accessToken || "");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testMsg, setTestMsg] = useState("");
  const [hint, setHint] = useState("");
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const authHeader = token ? `Bearer ${token}` : "";

  const checkHealth = useCallback(async () => {
    if (!authHeader || authHeader === "Bearer dev-mock-token") return;
    setHealthLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/workspaces/waba/health`, {
        headers: { Authorization: authHeader },
      });
      const data = await res.json();
      setHealth(data);
    } catch {
      // silent fail for health check
    } finally {
      setHealthLoading(false);
    }
  }, [authHeader]);

  // Poll health every 30s
  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const testConnection = async () => {
    if (!phoneNumberId || !accessToken)
      return toast.error("Enter Phone Number ID and Access Token first");
    setTesting(true);
    setTestResult(null);
    setTestMsg("");
    setHint("");
    try {
      // Try backend proxy first (avoids CORS), fall back to direct call
      let data;
      if (authHeader && authHeader !== "Bearer dev-mock-token") {
        const res = await fetch(`${API_URL}/api/v1/workspaces/waba/test`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
          body: JSON.stringify({ phoneNumberId, accessToken }),
        });
        data = await res.json();
      } else {
        // Dev mode: call Meta directly from browser
        const res = await fetch(
          `https://graph.facebook.com/v19.0/${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,status&access_token=${accessToken}`,
        );
        data = await res.json();
        if (data.error) data = { success: false, error: data.error.message };
        else
          data = {
            success: true,
            ...data,
            phoneNumber: data.display_phone_number,
            verifiedName: data.verified_name,
            qualityRating: data.quality_rating,
          };
      }

      if (!data.success) {
        setTestResult("error");
        setTestMsg(`❌ ${data.error || "Connection failed"}`);
        // Provide actionable hints based on error
        if (
          (data.error || "").includes("OAuth") ||
          (data.error || "").includes("token")
        ) {
          setHint(
            "💡 Token issue: Go to Meta Business Manager → System Users → create a System User with WhatsApp permissions and generate a permanent token (never expires).",
          );
        } else if (
          (data.error || "").includes("does not exist") ||
          (data.error || "").includes("phone")
        ) {
          setHint(
            "💡 Phone Number ID issue: In Meta Developer Console → your App → WhatsApp → Getting Started → copy the 'Phone number ID' (NOT the phone number).",
          );
        } else {
          setHint(
            "💡 Check that your Meta App has WhatsApp product added and the business account is set up.",
          );
        }
        toast.error("Connection failed — see error details below");
      } else {
        setTestResult("ok");
        setTestMsg(
          `✅ Connected! Number: ${data.phoneNumber} · Name: ${data.verifiedName} · Quality: ${data.qualityRating}`,
        );
        setHint("");
        toast.success("WhatsApp API connected successfully!");
        // Refresh health display
        setTimeout(checkHealth, 500);
      }
    } catch (err) {
      setTestResult("error");
      setTestMsg(`❌ Network error: ${err.message}`);
      setHint(
        "💡 Check your internet connection and that CORS is not blocking the request.",
      );
    } finally {
      setTesting(false);
    }
  };

  const save = async () => {
    if (!phoneNumberId || !wabaId || !accessToken)
      return toast.error("Fill in all required fields");
    setSaving(true);
    try {
      // Save to backend DB (persists across sessions)
      if (authHeader && authHeader !== "Bearer dev-mock-token") {
        const res = await fetch(`${API_URL}/api/v1/workspaces/current`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
          body: JSON.stringify({
            whatsapp_phone_number_id: phoneNumberId,
            whatsapp_business_account_id: wabaId,
            waba_access_token: accessToken,
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Save failed");
        toast.success("✅ Credentials saved to database!");
      } else {
        toast.success("✅ Credentials saved locally (dev mode — no backend)");
      }
      // Also save to localStorage as backup/cache
      onSave({ phoneNumberId, wabaId, accessToken });
    } catch (err) {
      toast.error(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Connection Health Status */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            fontWeight: 600,
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          <Activity size={16} color="var(--green)" /> Connection Status
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <HealthBadge health={health} loading={healthLoading} />
          <button
            onClick={checkHealth}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-secondary)",
              padding: 4,
              display: "flex",
              alignItems: "center",
            }}
            title="Refresh connection status"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>
      {health?.hint && (
        <div
          style={{
            padding: "10px 14px",
            background: "rgba(239,68,68,0.07)",
            border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: 10,
            marginBottom: 16,
            fontSize: 12,
            color: "#ef4444",
            lineHeight: 1.6,
          }}
        >
          ⚠️ {health.hint}
        </div>
      )}

      {/* Info banner */}
      <div
        style={{
          padding: "12px 16px",
          background: "rgba(59,130,246,0.08)",
          border: "1px solid rgba(59,130,246,0.25)",
          borderRadius: 10,
          marginBottom: 20,
          fontSize: 13,
        }}
      >
        <div
          style={{
            fontWeight: 600,
            color: "#3b82f6",
            marginBottom: 6,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Wifi size={14} /> For Live Projects — WhatsApp Business API (Cloud
          API)
        </div>
        <div style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
          This connects to the official{" "}
          <strong>Meta WhatsApp Business Cloud API</strong>. Your automations
          will send real WhatsApp messages to customers. Get credentials from{" "}
          <a
            href="https://developers.facebook.com/apps"
            target="_blank"
            rel="noreferrer"
            style={{ color: "#3b82f6" }}
          >
            Meta Developer Console <ExternalLink size={11} />
          </a>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="form-group">
          <label className="form-label">
            Phone Number ID <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            className="form-input"
            placeholder="e.g. 123456789012345"
            value={phoneNumberId}
            onChange={(e) => setPhoneNumberId(e.target.value)}
          />
          <div
            style={{
              fontSize: 11,
              color: "var(--text-secondary)",
              marginTop: 3,
            }}
          >
            Meta App → WhatsApp → Getting Started → Phone Number ID
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">
            WABA ID (Business Account ID){" "}
            <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            className="form-input"
            placeholder="e.g. 987654321098765"
            value={wabaId}
            onChange={(e) => setWabaId(e.target.value)}
          />
          <div
            style={{
              fontSize: 11,
              color: "var(--text-secondary)",
              marginTop: 3,
            }}
          >
            Meta App → WhatsApp → Getting Started → WhatsApp Business Account ID
          </div>
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: 20 }}>
        <label className="form-label">
          Permanent Access Token <span style={{ color: "#ef4444" }}>*</span>
        </label>
        <input
          className="form-input"
          type="password"
          placeholder="EAAxxxxxxxxxxxxxxx"
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
        />
        <div
          style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 3 }}
        >
          Meta App → WhatsApp → Getting Started → Temporary Access Token (for
          testing) · Or create a System User token in{" "}
          <strong>Meta Business Manager</strong> for production (never expires)
        </div>
      </div>

      {/* Test result */}
      {testResult && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            marginBottom: 8,
            fontSize: 13,
            background:
              testResult === "ok"
                ? "rgba(37,211,102,0.08)"
                : "rgba(239,68,68,0.08)",
            border: `1px solid ${testResult === "ok" ? "rgba(37,211,102,0.3)" : "rgba(239,68,68,0.3)"}`,
            color: testResult === "ok" ? "var(--green)" : "#ef4444",
          }}
        >
          {testMsg}
        </div>
      )}
      {hint && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            marginBottom: 16,
            fontSize: 12,
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.3)",
            color: "#f59e0b",
            lineHeight: 1.6,
          }}
        >
          {hint}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        <button
          className="btn btn-secondary"
          onClick={testConnection}
          disabled={testing}
          style={{ display: "flex", alignItems: "center", gap: 7 }}
        >
          {testing ? (
            <Loader
              size={14}
              style={{ animation: "spin 1s linear infinite" }}
            />
          ) : (
            <Wifi size={14} />
          )}
          {testing ? "Testing…" : "Test Connection"}
        </button>
        <button
          className="btn btn-primary"
          onClick={save}
          disabled={saving}
          style={{ display: "flex", alignItems: "center", gap: 7 }}
        >
          {saving ? (
            <Loader
              size={14}
              style={{ animation: "spin 1s linear infinite" }}
            />
          ) : (
            <Save size={14} />
          )}
          {saving ? "Saving…" : "Save Credentials"}
        </button>
      </div>

      {/* Step-by-step guide */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 14 }}>
          📋 How to get your WhatsApp API credentials — Step by step
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          {[
            {
              n: "1",
              title: "Create Meta Developer Account",
              desc: "Go to developers.facebook.com → Create Account. Use your Facebook/Business account.",
              link: "https://developers.facebook.com",
              linkLabel: "Open Meta Developers",
            },
            {
              n: "2",
              title: "Create a Meta App",
              desc: "Click 'My Apps' → 'Create App' → Select 'Business' → Enter app name → Create.",
            },
            {
              n: "3",
              title: "Add WhatsApp Product",
              desc: "In your app dashboard → scroll to 'Add a Product' → Find WhatsApp → click 'Set Up'.",
            },
            {
              n: "4",
              title: "Create WhatsApp Business Account",
              desc: "Under WhatsApp → Getting Started → Create a new business portfolio → Enter business name.",
            },
            {
              n: "5",
              title: "Get your Phone Number ID",
              desc: "On the 'Getting Started' page you'll see 'Phone number ID'. Copy it into the field above.",
            },
            {
              n: "6",
              title: "Get WABA ID",
              desc: "On the same page, find 'WhatsApp Business Account ID'. Copy it above.",
            },
            {
              n: "7",
              title: "Get Permanent Access Token (Recommended for production)",
              desc: "Go to Meta Business Manager (business.facebook.com) → Settings → System Users → Create System User (Admin role) → Add Assets (assign your WhatsApp app) → Generate Token (select whatsapp_business_messaging + whatsapp_business_management). This token never expires.",
              link: "https://business.facebook.com/settings/system-users",
              linkLabel: "Open Business Manager",
            },
            {
              n: "8",
              title: "Test & Save",
              desc: "Enter all 3 values above → click 'Test Connection' → if success, click 'Save Credentials'.",
            },
            {
              n: "9",
              title: "Register Webhook (for receiving messages)",
              desc: "In your app → WhatsApp → Configuration → Webhooks → Enter your server URL + Verify Token from the Webhook section below.",
            },
          ].map((step) => (
            <div
              key={step.n}
              style={{ display: "flex", gap: 12, alignItems: "flex-start" }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "rgba(37,211,102,0.12)",
                  border: "1px solid rgba(37,211,102,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--green)",
                  flexShrink: 0,
                }}
              >
                {step.n}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>
                  {step.title}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    lineHeight: 1.5,
                  }}
                >
                  {step.desc}
                </div>
                {step.link && (
                  <a
                    href={step.link}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: 11,
                      color: "#3b82f6",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                      marginTop: 3,
                    }}
                  >
                    {step.linkLabel} <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────
export default function SettingsPage() {
  const [settings, saveSettings] = useSettings();
  const [mainTab, setMainTab] = useState("waba"); // waba | link | business | webhook
  const [linkTab, setLinkTab] = useState("qr");
  const [businessName, setBusinessName] = useState(settings.businessName || "");
  const [webhookVerifyToken, setWebhookVerifyToken] = useState(
    settings.webhookVerifyToken || "",
  );
  const [waConnected, setWaConnected] = useState(settings.waConnected || false);

  // Get token + workspaceId from global store
  const { token, workspaceId } = useStore();

  // Use env variable for webhook URL — no more hardcoded port-swap
  const webhookUrl = `${WEBHOOK_BASE}/webhooks/whatsapp`;

  const handleWAConnected = (info) => {
    setWaConnected(true);
    saveSettings({ ...settings, waConnected: true, waConnectionInfo: info });
  };

  const handleCredentialsSave = (creds) => {
    saveSettings({ ...settings, ...creds, waConnected: true });
    setWaConnected(true);
  };

  const saveBusiness = async () => {
    const updated = { ...settings, businessName, webhookVerifyToken };
    saveSettings(updated);
    // Also save webhook verify token to backend
    if (token && token !== "dev-mock-token" && webhookVerifyToken) {
      try {
        await fetch(`${API_URL}/api/v1/workspaces/current`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: businessName || undefined,
            webhook_verify_token: webhookVerifyToken,
          }),
        });
      } catch {
        // best-effort
      }
    }
    toast.success("Saved!");
  };

  const MAIN_TABS = [
    { id: "waba", label: "🔌 WhatsApp API (Live)" },
    { id: "link", label: "📱 Link Device" },
    { id: "business", label: "🏢 Business Info" },
    { id: "webhook", label: "🔗 Webhook" },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Configure WhatsApp connection and workspace settings</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {waConnected ? (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: "var(--green)",
                background: "rgba(37,211,102,0.1)",
                padding: "5px 12px",
                borderRadius: 20,
                border: "1px solid rgba(37,211,102,0.3)",
              }}
            >
              <Wifi size={13} /> WhatsApp Connected
            </span>
          ) : (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: "#ef4444",
                background: "rgba(239,68,68,0.1)",
                padding: "5px 12px",
                borderRadius: 20,
                border: "1px solid rgba(239,68,68,0.3)",
              }}
            >
              <WifiOff size={13} /> Not Connected
            </span>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <div
        style={{ display: "flex", gap: 6, marginBottom: 24, flexWrap: "wrap" }}
      >
        {MAIN_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setMainTab(t.id)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
              transition: "all 0.2s",
              background:
                mainTab === t.id ? "var(--green)" : "var(--bg-elevated)",
              color: mainTab === t.id ? "#fff" : "var(--text-secondary)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── 1. WABA API Tab (for LIVE real sending) ── */}
      {mainTab === "waba" && (
        <div className="card">
          <WABACredentialsTab
            settings={settings}
            onSave={handleCredentialsSave}
            token={token}
            workspaceId={workspaceId}
          />
        </div>
      )}

      {/* ── 2. Link Device Tab (for personal WA) ── */}
      {mainTab === "link" && (
        <div className="card">
          <div className="card-title">
            <Smartphone size={16} /> Link WhatsApp Device
          </div>
          <div
            style={{
              padding: "12px 16px",
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.3)",
              borderRadius: 10,
              marginBottom: 20,
              fontSize: 13,
            }}
          >
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <AlertTriangle
                size={16}
                color="#f59e0b"
                style={{ flexShrink: 0, marginTop: 1 }}
              />
              <div>
                <strong style={{ color: "#f59e0b" }}>
                  Personal WhatsApp only.
                </strong>
                <span style={{ color: "var(--text-secondary)" }}>
                  {" "}
                  To send messages from your <strong>Business WhatsApp</strong>,
                  use the <strong>WhatsApp API (Live)</strong> tab instead. This
                  tab links a personal WhatsApp device for testing.
                </span>
              </div>
            </div>
          </div>

          {/* Link method tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            {[
              { id: "qr", label: "📷 Scan QR Code" },
              { id: "phone", label: "📱 Phone Number" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setLinkTab(t.id)}
                style={{
                  padding: "8px 18px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                  transition: "all 0.2s",
                  background:
                    linkTab === t.id ? "var(--green)" : "var(--bg-elevated)",
                  color: linkTab === t.id ? "#fff" : "var(--text-secondary)",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {linkTab === "qr" && <QRLinkTab onConnected={handleWAConnected} />}
          {linkTab === "phone" && (
            <PhoneLinkTab onConnected={handleWAConnected} />
          )}
        </div>
      )}

      {/* ── 3. Business Info ── */}
      {mainTab === "business" && (
        <div className="card">
          <div className="card-title">🏢 Business Information</div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Business Name</label>
              <input
                className="form-input"
                placeholder="My Business"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Webhook Verify Token</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="form-input"
                placeholder="any_random_string_you_choose"
                value={webhookVerifyToken}
                onChange={(e) => setWebhookVerifyToken(e.target.value)}
              />
              <button
                className="btn btn-secondary"
                style={{ flexShrink: 0 }}
                onClick={() => {
                  const t = Math.random().toString(36).slice(2, 18);
                  setWebhookVerifyToken(t);
                }}
              >
                Generate
              </button>
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                marginTop: 4,
              }}
            >
              This token must match what you set in Meta Developer Console →
              Webhooks
            </div>
          </div>
          <button className="btn btn-primary" onClick={saveBusiness}>
            Save Settings
          </button>
        </div>
      )}

      {/* ── 4. Webhook Info ── */}
      {mainTab === "webhook" && (
        <div className="card">
          <div className="card-title">🔗 Webhook Configuration</div>
          <div
            style={{
              color: "var(--text-secondary)",
              fontSize: 13,
              marginBottom: 20,
              lineHeight: 1.7,
            }}
          >
            Register these in{" "}
            <strong>
              Meta Developer Console → Your App → WhatsApp → Configuration →
              Webhooks
            </strong>
          </div>
          <div className="form-group">
            <label className="form-label">
              Webhook Callback URL (enter this in Meta)
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="form-input"
                readOnly
                value={webhookUrl}
                style={{ fontFamily: "monospace", fontSize: 12 }}
              />
              <button
                className="btn btn-secondary"
                style={{ flexShrink: 0 }}
                onClick={() => {
                  navigator.clipboard.writeText(webhookUrl);
                  toast.success("Copied!");
                }}
              >
                <Copy size={14} />
              </button>
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                marginTop: 4,
              }}
            >
              📌 For production on digitalatlus.in, set{" "}
              <code>VITE_WEBHOOK_URL=https://digitalatlus.in</code> in your
              dashboard <code>.env</code> file. Full URL:{" "}
              <strong>https://digitalatlus.in/webhooks/whatsapp</strong>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">
              Verify Token (enter this in Meta)
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="form-input"
                readOnly
                value={
                  settings.webhookVerifyToken ||
                  "(not set — go to Business Info tab)"
                }
                style={{ fontFamily: "monospace", fontSize: 12 }}
              />
              <button
                className="btn btn-secondary"
                style={{ flexShrink: 0 }}
                onClick={() => {
                  navigator.clipboard.writeText(
                    settings.webhookVerifyToken || "",
                  );
                  toast.success("Copied!");
                }}
              >
                <Copy size={14} />
              </button>
            </div>
          </div>
          <div
            style={{
              borderRadius: 12,
              border: "1px solid var(--border)",
              padding: "16px 20px",
              marginTop: 8,
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>
              📋 Webhook Fields to Subscribe
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {[
                ["messages", "Incoming messages from customers"],
                ["message_deliveries", "Delivery receipts"],
                ["message_reads", "Read receipts"],
                ["messaging_postbacks", "Button click callbacks"],
              ].map(([field, desc]) => (
                <div
                  key={field}
                  style={{ display: "flex", alignItems: "center", gap: 10 }}
                >
                  <CheckCircle size={14} color="var(--green)" />
                  <code style={{ fontSize: 12, color: "var(--green)" }}>
                    {field}
                  </code>
                  <span
                    style={{ fontSize: 12, color: "var(--text-secondary)" }}
                  >
                    — {desc}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
