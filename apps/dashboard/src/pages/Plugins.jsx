export default function PluginsPage() {
  const plugins = [
    {
      name: "Shopify",
      icon: "🛍️",
      desc: "Order confirmation, abandoned cart, shipping updates, COD confirmation",
      status: "available",
      install: "Add webhook URL to Shopify admin → Notifications",
      badge: "badge-green",
    },
    {
      name: "WooCommerce",
      icon: "🏪",
      desc: "WordPress plugin — all order events, floating WhatsApp button, OTP",
      status: "available",
      install: "Upload whatsapp-automation.php to plugins folder",
      badge: "badge-green",
    },
    {
      name: "JavaScript SDK",
      icon: "⚡",
      desc: "npm install whatsapp-automation-sdk",
      status: "available",
      install:
        "import WA from 'whatsapp-automation-sdk'; WA.init({ apiKey: 'YOUR_KEY' })",
      badge: "badge-blue",
    },
    {
      name: "Python SDK",
      icon: "🐍",
      desc: "pip install whatsapp-automation",
      status: "available",
      install: 'import wa; wa.init(api_key="YOUR_KEY")',
      badge: "badge-blue",
    },

    {
      name: "Embeddable Widget",
      icon: "💬",
      desc: "Floating WhatsApp button for any website",
      status: "available",
      install:
        '<script src="https://yourdomain.com/widget.js" data-phone="91..."></script>',
      badge: "badge-purple",
    },
    {
      name: "React SDK",
      icon: "⚛️",
      desc: "React hooks and components (coming soon)",
      status: "soon",
      install: null,
      badge: "badge-orange",
    },
    {
      name: "Stripe / Razorpay",
      icon: "💳",
      desc: "WhatsApp checkout integration",
      status: "soon",
      install: null,
      badge: "badge-orange",
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Plugins & SDKs</h1>
          <p>Integrate WhatsApp automation into any platform</p>
        </div>
      </div>
      <div className="grid-2">
        {plugins.map((p) => (
          <div
            key={p.name}
            className="card"
            style={{ opacity: p.status === "soon" ? 0.6 : 1 }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 12,
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 28 }}>{p.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    {p.desc}
                  </div>
                </div>
              </div>
              <span className={`badge ${p.badge}`}>
                {p.status === "soon" ? "Coming Soon" : "Available"}
              </span>
            </div>
            {p.install && (
              <div
                style={{
                  background: "var(--bg-elevated)",
                  borderRadius: 8,
                  padding: "10px 12px",
                  fontSize: 11,
                  fontFamily: "monospace",
                  color: "var(--green)",
                  wordBreak: "break-all",
                  lineHeight: 1.6,
                }}
              >
                {p.install}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
