import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../../context/AuthContext";
import "./Dashboard.css";

interface DashboardData {
  total_paket?: number;
  total_pendaftaran?: number;
  total_pembayaran_pending?: number;
  total_dokumen_pending?: number;
}

interface ManagerBadgeData {
  menunggu_verifikasi: number;
  perlu_perbaikan: number;
  siap_berangkat: number;
}

const quicklinks = [
  { to: "/admin/paket", icon: "✨", label: "Paket Umroh" },
  { to: "/admin/pendaftaran", icon: "👥", label: "Pendaftaran" },
  { to: "/admin/pembayaran", icon: "💳", label: "Pembayaran" },
  { to: "/admin/dokumen", icon: "📄", label: "Dokumen" },
];

const AdminDashboard = () => {
  const { token, role } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [managerBadges, setManagerBadges] = useState<ManagerBadgeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const isManager = role === "owner" || role === "manager" || role === "administration_manager";

    const fetchDashboard = async () => {
      try {
        const reqs: Promise<any>[] = [
          axios.get("http://localhost:8080/admin/dashboard", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ];
        if (isManager) {
          reqs.push(
            axios.get("http://localhost:8080/manager/badges", {
              headers: { Authorization: `Bearer ${token}` },
            })
          );
        }

        const [res, mgrRes] = await Promise.all(reqs);
        setData(res.data);
        if (mgrRes) {
          setManagerBadges(mgrRes.data);
        }
        setError(false);
      } catch {
        setData({});
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [token, role]);

  const hour = new Date().getHours();
  const greeting =
    hour < 11 ? "Selamat Pagi" : hour < 15 ? "Selamat Siang" : hour < 19 ? "Selamat Sore" : "Selamat Malam";

  const adminStats = [
    {
      icon: "✨",
      iconClass: "stat-icon-green",
      label: "Total Paket",
      value: data?.total_paket ?? 0,
      sub: "paket tersedia",
      to: "/admin/paket",
    },
    {
      icon: "👥",
      iconClass: "stat-icon-emerald",
      label: "Pendaftaran",
      value: data?.total_pendaftaran ?? 0,
      sub: "jamaah terdaftar",
      to: "/admin/pendaftaran",
    },
    {
      icon: "💳",
      iconClass: "stat-icon-amber",
      label: "Pembayaran Pending",
      value: data?.total_pembayaran_pending ?? 0,
      sub: "menunggu verifikasi",
      to: "/admin/pembayaran",
    },
    {
      icon: "📄",
      iconClass: "stat-icon-rose",
      label: "Dokumen Pending",
      value: data?.total_dokumen_pending ?? 0,
      sub: "menunggu verifikasi",
      to: "/admin/dokumen",
    },
  ];

  const managerStats = [
    {
      icon: "⏳",
      iconClass: "stat-icon-amber",
      label: "Menunggu Verifikasi",
      value: managerBadges?.menunggu_verifikasi ?? 0,
      sub: "antrean verifikasi Manager",
      to: "/admin/verifikasi",
    },
    {
      icon: "⚠️",
      iconClass: "stat-icon-rose",
      label: "Perlu Perbaikan",
      value: managerBadges?.perlu_perbaikan ?? 0,
      sub: "dikembalikan ke Admin",
      to: "/admin/pendaftaran",
    },
    {
      icon: "✅",
      iconClass: "stat-icon-emerald",
      label: "Siap Berangkat",
      value: managerBadges?.siap_berangkat ?? 0,
      sub: "disahkan Manager",
      to: "/admin/pendaftaran",
    },
    {
      icon: "👥",
      iconClass: "stat-icon-green",
      label: "Total Pendaftaran",
      value: data?.total_pendaftaran ?? 0,
      sub: "seluruh jamaah",
      to: "/admin/pendaftaran",
    },
  ];

  const isManager = role === "owner" || role === "manager" || role === "administration_manager";
  const stats = isManager ? managerStats : adminStats;

  return (
    <div className="dashboard-page">
      {/* Welcome */}
      <div className="dashboard-welcome">
        <div className="welcome-text">
          <h2>{greeting}, {isManager ? "Administration Manager 🛡️" : "Admin"}!</h2>
          <p>
            {isManager
              ? "Berikut ringkasan verifikasi akhir dan aktivitas pendaftaran Bonita Umroh."
              : "Berikut ringkasan aktivitas hari ini di Bonita Umroh."}
          </p>
        </div>
        <div className="welcome-icon">🕌</div>
      </div>

      {/* Error banner */}
      {error && !loading && (
        <div style={{
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: "10px",
          padding: "0.75rem 1rem",
          fontSize: "0.82rem",
          color: "#dc2626",
          marginBottom: "1rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}>
          ⚠️ Gagal memuat data dashboard. Pastikan backend berjalan.
        </div>
      )}

      {/* Stats */}
      <div>
        <div className="dashboard-section-title">
          {isManager ? "Ringkasan Verifikasi & Status" : "Ringkasan"}
        </div>
        {loading ? (
          <div className="dashboard-skeleton-stats">
            {[1, 2, 3, 4].map((i) => (
              <div className="dash-skel-card" key={i}>
                <div className="dash-skel-icon" />
                <div className="dash-skel-body">
                  <div className="dash-skel-line" style={{ width: "50%" }} />
                  <div className="dash-skel-line" style={{ width: "30%", height: 24 }} />
                  <div className="dash-skel-line" style={{ width: "70%" }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="dashboard-stats">
            {stats.map((s, i) => (
              <Link to={s.to} className="stat-card" key={i} style={{ textDecoration: "none" }}>
                <div className={`stat-card-icon ${s.iconClass}`}>{s.icon}</div>
                <div className="stat-card-body">
                  <div className="stat-card-label">{s.label}</div>
                  <div className="stat-card-value">{s.value}</div>
                  <div className="stat-card-sub">{s.sub}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div>
        <div className="dashboard-section-title">Akses Cepat</div>
        <div className="dashboard-quicklinks">
          {isManager && (
            <Link to="/admin/verifikasi" className="quicklink-card">
              <div className="quicklink-icon">🛡️</div>
              Verifikasi Pendaftaran
            </Link>
          )}
          {quicklinks.map((q) => (
            <Link to={q.to} className="quicklink-card" key={q.to}>
              <div className="quicklink-icon">{q.icon}</div>
              {q.label}
            </Link>
          ))}
          {isManager && (
            <Link to="/admin/manajemen-admin" className="quicklink-card">
              <div className="quicklink-icon">👤</div>
              Manajemen Admin
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
