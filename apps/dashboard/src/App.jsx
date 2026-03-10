import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import {
  LayoutDashboard,
  MessageSquare,
  Zap,
  Megaphone,
  FileText,
  Users,
  BarChart3,
  Bot,
  Inbox,
  Puzzle,
  Key,
  Settings,
  LogOut,
} from "lucide-react";
import { lazy, Suspense } from "react";

// ─── Lazy-loaded pages (code-split per route — massive perf win) ──────────────
const OverviewPage = lazy(() => import("./pages/Overview.jsx"));
const MessagesPage = lazy(() => import("./pages/Messages.jsx"));
const AutomationsPage = lazy(() => import("./pages/Automations.jsx"));
const CampaignsPage = lazy(() => import("./pages/Campaigns.jsx"));
const TemplatesPage = lazy(() => import("./pages/Templates.jsx"));
const ContactsPage = lazy(() => import("./pages/Contacts.jsx"));
const AnalyticsPage = lazy(() => import("./pages/Analytics.jsx"));
const AIChatbotPage = lazy(() => import("./pages/AIChatbot.jsx"));
const InboxPage = lazy(() => import("./pages/Inbox.jsx"));
const ApiKeysPage = lazy(() => import("./pages/ApiKeys.jsx"));
const SettingsPage = lazy(() => import("./pages/SettingsPage.jsx"));
const PluginsPage = lazy(() => import("./pages/Plugins.jsx"));
const LoginPage = lazy(() => import("./pages/Login.jsx"));

import { useStore } from "./store.js";

// ─── Page loading fallback ────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "60vh",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: "3px solid var(--border)",
          borderTop: "3px solid var(--green)",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
        Loading...
      </span>
    </div>
  );
}

const navItems = [
  { label: "Overview", icon: LayoutDashboard, to: "/" },
  { label: "Messages", icon: MessageSquare, to: "/messages" },
  { label: "Inbox", icon: Inbox, to: "/inbox" },
];
const automationItems = [
  { label: "Automations", icon: Zap, to: "/automations" },
  { label: "Campaigns", icon: Megaphone, to: "/campaigns" },
  { label: "Templates", icon: FileText, to: "/templates" },
  { label: "Contacts", icon: Users, to: "/contacts" },
];
const advancedItems = [
  { label: "Analytics", icon: BarChart3, to: "/analytics" },
  { label: "AI Chatbot", icon: Bot, to: "/ai-chatbot" },
  { label: "Plugins & SDKs", icon: Puzzle, to: "/plugins" },
  { label: "API Keys", icon: Key, to: "/api-keys" },
  { label: "Settings", icon: Settings, to: "/settings" },
];

function Sidebar() {
  const { user, logout } = useStore();
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">💬</div>
        <span className="sidebar-logo-text">WApp Flow</span>
      </div>
      <nav className="sidebar-nav">
        <div className="nav-section-label">Main</div>
        {navItems.map(({ label, icon: Icon, to }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
          >
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
        <div className="nav-section-label">Automation</div>
        {automationItems.map(({ label, icon: Icon, to }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
          >
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
        <div className="nav-section-label">Advanced</div>
        {advancedItems.map(({ label, icon: Icon, to }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
          >
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div
        style={{ padding: "16px 20px", borderTop: "1px solid var(--border)" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "var(--green-dim)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              color: "var(--green)",
              fontWeight: 700,
            }}
          >
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {user?.name || "User"}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              {user?.email || ""}
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          className="nav-item"
          style={{ color: "var(--red)", width: "100%" }}
        >
          <LogOut style={{ width: 16, height: 16 }} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

function Layout({ children, title, subtitle, action }) {
  return (
    <div className="main-content">
      <header className="topbar">
        <div>
          <div className="topbar-title">{title}</div>
          {subtitle && (
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {subtitle}
            </div>
          )}
        </div>
        <span className="topbar-badge">● Live</span>
        {action}
      </header>
      <main className="page-content animate-fadein">{children}</main>
    </div>
  );
}

function ProtectedApp() {
  const { token } = useStore();
  // Dev bypass: seed a mock token so dashboard is accessible without a running backend
  if (!token) {
    useStore.setState({
      token: "dev-mock-token",
      user: { name: "Dev User", email: "dev@waplatform.local" },
      workspaceId: "dev-workspace",
    });
  }
  return (
    <div className="app-layout">
      <Sidebar />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route
            path="/"
            element={
              <Layout
                title="Overview"
                subtitle="Your WhatsApp platform at a glance"
              >
                <OverviewPage />
              </Layout>
            }
          />
          <Route
            path="/messages"
            element={
              <Layout title="Messages" subtitle="Send and manage messages">
                <MessagesPage />
              </Layout>
            }
          />
          <Route
            path="/inbox"
            element={
              <Layout title="Inbox" subtitle="Multi-agent customer inbox">
                <InboxPage />
              </Layout>
            }
          />
          <Route
            path="/automations"
            element={
              <Layout title="Automations" subtitle="Workflow automation engine">
                <AutomationsPage />
              </Layout>
            }
          />
          <Route
            path="/campaigns"
            element={
              <Layout title="Campaigns" subtitle="Broadcast to thousands">
                <CampaignsPage />
              </Layout>
            }
          />
          <Route
            path="/templates"
            element={
              <Layout title="Templates" subtitle="Message templates">
                <TemplatesPage />
              </Layout>
            }
          />
          <Route
            path="/contacts"
            element={
              <Layout title="Contacts" subtitle="CRM contact management">
                <ContactsPage />
              </Layout>
            }
          />
          <Route
            path="/analytics"
            element={
              <Layout title="Analytics" subtitle="Performance insights">
                <AnalyticsPage />
              </Layout>
            }
          />
          <Route
            path="/ai-chatbot"
            element={
              <Layout
                title="AI Chatbot"
                subtitle="Intelligent conversation agent"
              >
                <AIChatbotPage />
              </Layout>
            }
          />
          <Route
            path="/plugins"
            element={
              <Layout title="Plugins & SDKs" subtitle="Integrate everywhere">
                <PluginsPage />
              </Layout>
            }
          />
          <Route
            path="/api-keys"
            element={
              <Layout title="API Keys" subtitle="Manage access keys">
                <ApiKeysPage />
              </Layout>
            }
          />
          <Route
            path="/settings"
            element={
              <Layout title="Settings" subtitle="Configure your workspace">
                <SettingsPage />
              </Layout>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "var(--bg-elevated)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
          },
        }}
      />
      <Routes>
        <Route
          path="/login"
          element={
            <Suspense fallback={<PageLoader />}>
              <LoginPage />
            </Suspense>
          }
        />
        <Route path="/*" element={<ProtectedApp />} />
      </Routes>
    </BrowserRouter>
  );
}
