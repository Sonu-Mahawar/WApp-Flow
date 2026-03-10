import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store.js";
import toast from "react-hot-toast";
import { Eye, EyeOff, Shield, Zap, Lock } from "lucide-react";

function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: "Weak", color: "#ef4444" };
  if (score <= 2) return { score, label: "Fair", color: "#f59e0b" };
  if (score <= 3) return { score, label: "Good", color: "#06b6d4" };
  return { score, label: "Strong", color: "#25d366" };
}

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const { login, register } = useStore();
  const navigate = useNavigate();
  const pwStrength = getPasswordStrength(form.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isRegister && form.password.length < 8) {
      return toast.error("Password must be at least 8 characters");
    }
    setLoading(true);
    try {
      if (isRegister) {
        await register(form.name, form.email, form.password);
        toast.success("🎉 Account created! Welcome aboard.");
      } else {
        await login(form.email, form.password);
        toast.success("👋 Welcome back!");
      }
      navigate("/");
    } catch (err) {
      const msg = err.response?.data?.error || "Something went wrong";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(ellipse at 50% 0%, rgba(37,211,102,0.12) 0%, var(--bg-base) 55%)",
        padding: 20,
      }}
    >
      {/* Floating ambient orbs */}
      <div
        style={{
          position: "fixed",
          top: "15%",
          left: "10%",
          width: 300,
          height: 300,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(37,211,102,0.06), transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: "15%",
          right: "10%",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(79,142,247,0.05), transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{ width: "100%", maxWidth: 440, animation: "fadeIn 0.4s ease" }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div
            style={{
              width: 72,
              height: 72,
              background: "linear-gradient(135deg, #25D366, #128C4F)",
              borderRadius: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 34,
              margin: "0 auto 18px",
              boxShadow:
                "0 0 48px rgba(37,211,102,0.35), 0 0 80px rgba(37,211,102,0.1)",
            }}
          >
            💬
          </div>
          <h1
            style={{
              fontSize: 30,
              fontWeight: 800,
              background: "linear-gradient(135deg, #fff 30%, #a8ffcc)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "-0.5px",
            }}
          >
            WA Platform
          </h1>
          <p
            style={{
              color: "var(--text-secondary)",
              marginTop: 6,
              fontSize: 14,
            }}
          >
            WhatsApp Automation for{" "}
            <strong style={{ color: "var(--green)" }}>DigitalAtlus</strong>
          </p>
        </div>

        {/* Card */}
        <div
          className="card"
          style={{
            borderColor: "rgba(37,211,102,0.2)",
            background: "rgba(17,24,39,0.9)",
            backdropFilter: "blur(20px)",
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
            {isRegister ? "Create Account" : "Sign In"}
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: 13,
              marginBottom: 24,
            }}
          >
            {isRegister
              ? "Join thousands of businesses on WhatsApp"
              : "Access your WhatsApp automation dashboard"}
          </p>

          <form onSubmit={handleSubmit}>
            {isRegister && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  id="nameInput"
                  className="form-input"
                  placeholder="Your full name"
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                id="emailInput"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                autoComplete="username email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: "relative" }}>
                <input
                  id="passwordInput"
                  type={showPw ? "text" : "password"}
                  className="form-input"
                  placeholder="••••••••"
                  autoComplete={
                    isRegister ? "new-password" : "current-password"
                  }
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                  style={{ paddingRight: 44 }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-secondary)",
                    display: "flex",
                  }}
                  tabIndex={-1}
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password strength bar */}
              {isRegister && form.password && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: 3,
                          borderRadius: 2,
                          background:
                            i <= pwStrength.score
                              ? pwStrength.color
                              : "var(--border)",
                          transition: "background 0.3s",
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: pwStrength.color }}>
                    {pwStrength.label} password
                  </div>
                </div>
              )}
            </div>

            <button
              id="submitBtn"
              type="submit"
              className="btn btn-primary"
              style={{
                width: "100%",
                justifyContent: "center",
                marginTop: 8,
                height: 44,
                fontSize: 15,
              }}
              disabled={loading}
            >
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    className="animate-spin"
                    style={{ display: "inline-block" }}
                  >
                    ◌
                  </span>{" "}
                  Please wait...
                </span>
              ) : isRegister ? (
                "Create Account"
              ) : (
                "Sign In →"
              )}
            </button>
          </form>

          <p
            style={{
              textAlign: "center",
              marginTop: 20,
              color: "var(--text-secondary)",
              fontSize: 13,
            }}
          >
            {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setForm({ name: "", email: "", password: "" });
              }}
              style={{
                background: "none",
                border: "none",
                color: "var(--green)",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              {isRegister ? "Sign In" : "Sign Up Free"}
            </button>
          </p>
        </div>

        {/* Trust badges */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 24,
            marginTop: 24,
            flexWrap: "wrap",
          }}
        >
          {[
            { icon: <Shield size={13} />, text: "256-bit SSL" },
            { icon: <Lock size={13} />, text: "JWT Secured" },
            { icon: <Zap size={13} />, text: "Meta Official API" },
          ].map((b) => (
            <div
              key={b.text}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                color: "var(--text-muted)",
              }}
            >
              {b.icon} {b.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
