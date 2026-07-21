import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { useEffect, useState } from "react";
import axios from "axios";
import "./AdminLayout.css";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles: string[];
}

const navItems: NavItem[] = [
  {
    to: "/admin/dashboard",
    label: "Dashboard",
    roles: ["admin", "owner"],
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <rect width="7" height="9" x="3" y="3" rx="1" />
        <rect width="7" height="5" x="14" y="3" rx="1" />
        <rect width="7" height="9" x="14" y="12" rx="1" />
        <rect width="7" height="5" x="3" y="16" rx="1" />
      </svg>
    ),
  },
  {
    to: "/admin/paket",
    label: "Paket Umroh",
    roles: ["admin", "owner"],
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      </svg>
    ),
  },
  {
    to: "/admin/pendaftaran",
    label: "Pendaftaran",
    roles: ["admin", "owner"],
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    to: "/admin/pembayaran",
    label: "Pembayaran",
    roles: ["admin", "owner"],
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <rect width="20" height="14" x="2" y="5" rx="2" />
        <line x1="2" x2="22" y1="10" y2="10" />
      </svg>
    ),
  },
  {
    to: "/admin/dokumen",
    label: "Dokumen",
    roles: ["admin", "owner"],
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        <path d="M10 9H8M16 13H8M16 17H8" />
      </svg>
    ),
  },
  // Owner only
  {
    to: "/admin/manajemen-admin",
    label: "Manajemen Admin",
    roles: ["owner"],
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M19 8v6M22 11h-6" />
      </svg>
    ),
  },
  // Pengaduan
  {
    to: "/admin/pengaduan",
    label: "Pengaduan",
    roles: ["admin", "owner"],
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
];

// ─────────────────────────────────────────────────────────────────

const pageTitle: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/paket": "Paket Umroh",
  "/admin/pendaftaran": "Pendaftaran",
  "/admin/pembayaran": "Pembayaran",
  "/admin/dokumen": "Dokumen",
  "/admin/manajemen-admin": "Manajemen Admin",
  "/admin/pengaduan": "Pengaduan",
};

const AdminLayout = () => {
  const { role, logout, token } = useAuth();
  const navigate = useNavigate();
  const [badgePengaduan, setBadgePengaduan] = useState(0);

  // Fetch jumlah pengaduan menunggu untuk badge sidebar
  useEffect(() => {
    if (!token) return;
    const fetchBadge = async () => {
      try {
        const res = await axios.get("http://localhost:8080/admin/pengaduan", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setBadgePengaduan(res.data?.count_menunggu ?? 0);
      } catch { /* silent */ }
    };
    fetchBadge();
    // refresh setiap 60 detik
    const interval = setInterval(fetchBadge, 60000);
    return () => clearInterval(interval);
  }, [token]);

  const currentPath = window.location.pathname;
  const title = Object.entries(pageTitle).find(([key]) =>
    currentPath.startsWith(key)
  )?.[1] ?? "Admin";

  const handleLogout = () => {
    logout();
    navigate("/admin/login", { replace: true });
  };

  const visibleNavItems = navItems.filter((item) =>
    role ? item.roles.includes(role) : false
  );

  return (
    <div className="admin-layout">
      {/* ── Sidebar ── */}
      <aside className="admin-sidebar">
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">🕌</div>
          <div className="sidebar-brand-text">
            <div className="sidebar-brand-name">Bonita Umroh</div>
            <div className="sidebar-brand-sub">Admin Portal</div>
          </div>
        </div>

        {/* Role badge */}
        <div className="sidebar-role-badge">
          <div className="sidebar-role-dot" />
          <div className="sidebar-role-info">
            <div className="sidebar-role-name">
              {role === "owner" ? "Owner" : "Administrator"}
            </div>
            <div className="sidebar-role-label">{role}</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="sidebar-nav-section">
            <div className="sidebar-nav-label">Menu</div>
            {visibleNavItems
              .filter((item) => item.roles.includes("admin"))
              .map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `sidebar-nav-item ${isActive ? "active" : ""}`
                  }
                >
                  <span className="sidebar-nav-icon">{item.icon}</span>
                  {item.label}
                  {item.to === "/admin/pengaduan" && badgePengaduan > 0 && (
                    <span className="sidebar-pengaduan-badge">{badgePengaduan}</span>
                  )}
                </NavLink>
              ))}
          </div>

          {/* Owner-only section */}
          {role === "owner" && (
            <div className="sidebar-nav-section">
              <div className="sidebar-nav-label">Owner</div>
              {navItems
                .filter((item) => !item.roles.includes("admin"))
                .map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `sidebar-nav-item ${isActive ? "active" : ""}`
                    }
                  >
                    <span className="sidebar-nav-icon">{item.icon}</span>
                    {item.label}
                  </NavLink>
                ))}
            </div>
          )}
        </nav>

        {/* Logout */}
        <div className="sidebar-footer">
          <button className="sidebar-logout-btn" onClick={handleLogout}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" x2="9" y1="12" y2="12" />
            </svg>
            Keluar
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="admin-main">
        {/* Top bar */}
        <header className="admin-topbar">
          <span className="admin-topbar-title">{title}</span>
          <div className="admin-topbar-right">
            <div className={`admin-role-chip ${role === "owner" ? "role-chip-owner" : "role-chip-admin"}`}>
              {role === "owner" ? "👑" : "🔧"} {role}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
