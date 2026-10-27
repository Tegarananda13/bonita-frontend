import { useEffect, useState, useCallback } from "react";
import { LuEye, LuCheck, LuRefreshCw, LuX } from "react-icons/lu";
import axios from "axios";
import { useAuth } from "../../../context/AuthContext";
import { AdminPagination } from "../../../components/Pagination";
import "./AdminPengaduan.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PengaduanItem {
  id: string;
  nomor_pendaftaran: string;
  nama_customer: string;
  no_hp: string;
  paket: string;
  judul: string;
  kategori: string;
  status: string;
  created_at: string;
}

interface PengaduanDetail {
  id: string;
  judul: string;
  isi: string;
  kategori: string;
  status: string;
  created_at: string;
  updated_at: string;
  customer: {
    nama: string;
    nik: string;
    no_hp: string;
    email: string;
  };
  pendaftaran: {
    nomor_pendaftaran: string;
    paket: string;
    tanggal_berangkat: string;
    payment_status: string;
    document_status: string;
    status: string;
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }) : "-";

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: string }> = {
  menunggu:  { label: "Menunggu",  cls: "status-menunggu",  icon: "🕐" },
  diproses:  { label: "Diproses",  cls: "status-diproses",  icon: "⚙️" },
  selesai:   { label: "Selesai",   cls: "status-selesai",   icon: "✅" },
};

const KATEGORI_ICON: Record<string, string> = {
  Pembayaran:   "💳",
  Dokumen:      "📄",
  Jadwal:       "📅",
  Hotel:        "🏨",
  Transportasi: "✈️",
  Lainnya:      "💬",
};

const StatusPill = ({ value }: { value: string }) => {
  const cfg = STATUS_CONFIG[value?.toLowerCase()] ?? { label: value, cls: "status-default", icon: "❓" };
  return <span className={`peng-status-pill ${cfg.cls}`}>{cfg.icon} {cfg.label}</span>;
};

// ── Detail Modal ──────────────────────────────────────────────────────────────

const DetailModal = ({
  pengaduanId,
  token,
  onClose,
  onStatusChanged,
}: {
  pengaduanId: string;
  token: string;
  onClose: () => void;
  onStatusChanged: () => void;
}) => {
  const [data, setData] = useState<PengaduanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/admin/pengaduan/${pengaduanId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setData(res.data);
        setNewStatus(res.data.status);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [pengaduanId, token]);

  const handleUpdateStatus = async () => {
    if (!data || newStatus === data.status) return;
    setSaving(true); setMsg("");
    try {
      const res = await axios.patch(
        `${API_BASE_URL}/admin/pengaduan/${pengaduanId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setData(prev => prev ? { ...prev, status: newStatus } : prev);
      const emailSent = res.data?.email_sent === true;
      setMsg(emailSent
        ? "✅ Status berhasil diperbarui. Email notifikasi terkirim ke customer."
        : "✅ Status berhasil diperbarui."
      );
      onStatusChanged();
      window.dispatchEvent(new CustomEvent("admin-badge-refresh"));
    } catch {
      setMsg("❌ Gagal mengubah status.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="peng-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="peng-modal">
        {/* Header */}
        <div className="peng-modal-header">
          <div>
            <div className="peng-modal-title">📋 Detail Pengaduan</div>
            {data && <div className="peng-modal-sub">{data.pendaftaran.nomor_pendaftaran}</div>}
          </div>
          <button className="peng-modal-close" onClick={onClose} aria-label="Tutup"><LuX size={16} /></button>
        </div>

        {/* Body */}
        <div className="peng-modal-body">
          {loading ? (
            <div className="peng-loading"><div className="peng-spin" /> Memuat detail...</div>
          ) : !data ? (
            <div className="peng-loading" style={{ color: "#ef4444" }}>Gagal memuat data.</div>
          ) : (
            <>
              {/* Status & Kategori */}
              <div className="peng-detail-status-row">
                <div>
                  <div className="peng-detail-label">Status Pengaduan</div>
                  <StatusPill value={data.status} />
                </div>
                <div>
                  <div className="peng-detail-label">Kategori</div>
                  <span className="peng-kategori-badge">
                    {KATEGORI_ICON[data.kategori] ?? "💬"} {data.kategori}
                  </span>
                </div>
                <div>
                  <div className="peng-detail-label">Tanggal</div>
                  <span style={{ fontSize: "0.83rem", color: "#64748b" }}>{fmtDate(data.created_at)}</span>
                </div>
              </div>

              {/* Isi Pengaduan */}
              <div className="peng-section-title">📝 Pengaduan</div>
              <div className="peng-isi-box">
                <div className="peng-detail-label" style={{ marginBottom: "0.4rem" }}>{data.judul}</div>
                <p className="peng-isi-text">{data.isi}</p>
              </div>

              {/* Data Customer */}
              <div className="peng-section-title">👤 Data Customer</div>
              <div className="peng-info-grid">
                {[
                  { label: "Nama",  val: data.customer.nama },
                  { label: "NIK",   val: data.customer.nik, mono: true },
                  { label: "No HP", val: data.customer.no_hp },
                  { label: "Email", val: data.customer.email },
                ].map(r => (
                  <div key={r.label} className="peng-info-item">
                    <div className="peng-detail-label">{r.label}</div>
                    <div className="peng-detail-val" style={r.mono ? { fontFamily: "monospace" } : undefined}>{r.val || "-"}</div>
                  </div>
                ))}
              </div>

              {/* Data Pendaftaran */}
              <div className="peng-section-title">🕌 Data Pendaftaran</div>
              <div className="peng-info-grid">
                {[
                  { label: "Nomor UMR",      val: data.pendaftaran.nomor_pendaftaran },
                  { label: "Paket Umrah",    val: data.pendaftaran.paket },
                  { label: "Tanggal Berangkat", val: data.pendaftaran.tanggal_berangkat ? new Date(data.pendaftaran.tanggal_berangkat).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }) : "-" },
                  { label: "Status Pembayaran", val: data.pendaftaran.payment_status },
                  { label: "Status Dokumen",    val: data.pendaftaran.document_status },
                  { label: "Status",            val: data.pendaftaran.status },
                ].map(r => (
                  <div key={r.label} className="peng-info-item">
                    <div className="peng-detail-label">{r.label}</div>
                    <div className="peng-detail-val">{r.val || "-"}</div>
                  </div>
                ))}
              </div>

              {/* Ubah Status */}
              <div className="peng-section-title">🔄 Ubah Status Pengaduan</div>
              <div className="peng-status-edit">
                <select
                  className="peng-status-select"
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}
                >
                  <option value="menunggu">🕐 Menunggu</option>
                  <option value="diproses">⚙️ Diproses</option>
                  <option value="selesai">✅ Selesai</option>
                </select>
                <button
                  className="peng-save-btn"
                  onClick={handleUpdateStatus}
                  disabled={saving || newStatus === data.status}
                >
                  {saving ? (
                    "Menyimpan..."
                  ) : (
                    <>
                      <LuCheck size={14} />
                      Simpan Status
                    </>
                  )}
                </button>
              </div>
              {msg && <div className="peng-msg">{msg}</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const sortPengaduan = (items: PengaduanItem[]) => {
  return [...items].sort((a, b) => {
    const rankA = a.status?.toLowerCase() === "menunggu" ? 0 : a.status?.toLowerCase() === "diproses" ? 1 : 2;
    const rankB = b.status?.toLowerCase() === "menunggu" ? 0 : b.status?.toLowerCase() === "diproses" ? 1 : 2;
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    const timeA = new Date(a.created_at).getTime() || 0;
    const timeB = new Date(b.created_at).getTime() || 0;
    return timeB - timeA;
  });
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const AdminPengaduan = () => {
  const { token } = useAuth();
  const [list, setList] = useState<PengaduanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("semua");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [countMenunggu, setCountMenunggu] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    menunggu: 0,
    diproses: 0,
    selesai: 0,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", String(page));
      params.append("limit", "10");
      if (filter && filter !== "semua") {
        params.append("status", filter);
      }
      if (search.trim()) {
        params.append("search", search.trim());
      }
      const res = await axios.get(`${API_BASE_URL}/admin/pengaduan?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const rawData: PengaduanItem[] = res.data?.data ?? [];
      const sortedData = sortPengaduan(rawData);

      // Handle stats count for filter cards (seperti halaman ulasan)
      if (res.data?.stats) {
        setStats({
          total: Number(res.data.stats.total ?? 0),
          menunggu: Number(res.data.stats.menunggu ?? 0),
          diproses: Number(res.data.stats.diproses ?? 0),
          selesai: Number(res.data.stats.selesai ?? 0),
        });
      } else {
        setStats({
          total: Number(res.data?.total ?? sortedData.length),
          menunggu: Number(res.data?.count_menunggu ?? sortedData.filter(p => p.status?.toLowerCase() === "menunggu").length),
          diproses: sortedData.filter(p => p.status?.toLowerCase() === "diproses").length,
          selesai: sortedData.filter(p => p.status?.toLowerCase() === "selesai").length,
        });
      }

      setCountMenunggu(Number(res.data?.count_menunggu ?? res.data?.stats?.menunggu ?? 0));

      const serverMeta = res.data?.meta;
      const total = Number(serverMeta?.total ?? res.data?.total ?? sortedData.length);

      // Pastikan hanya 10 item per halaman yang ditampilkan di tabel
      if (serverMeta && rawData.length <= 10) {
        setList(sortedData);
        setTotalPages(serverMeta.total_pages || 1);
        setTotalItems(total);
      } else {
        setTotalItems(total);
        setTotalPages(Math.ceil(total / 10) || 1);
        const start = (page - 1) * 10;
        setList(sortedData.slice(start, start + 10));
      }
    } catch {
      setList([]);
      setTotalPages(1);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [token, page, filter, search]);

  useEffect(() => { load(); }, [load]);

  const filtered = list;

  return (
    <div className="peng-page">
      {/* ── Header ── */}
      <div className="page-header">
        <div className="page-header-left">
          <h2>
            Pengaduan Customer
            {countMenunggu > 0 && (
              <span className="peng-badge-header">{countMenunggu}</span>
            )}
          </h2>
          <p>
            Laporan pengaduan dari customer melalui Bonita Assistant.
          </p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn-outline-sm" onClick={load} disabled={loading}>
            <LuRefreshCw size={14} className={loading ? "spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Stats Grid / Filter (Persis seperti di Halaman Ulasan Jamaah) ── */}
      <div className="peng-stats-grid">
        <div
          className={`peng-stat-card ${filter === "semua" ? "active" : ""}`}
          onClick={() => {
            setFilter("semua");
            setPage(1);
          }}
          title="Klik untuk melihat semua pengaduan"
        >
          <div className="stat-icon-wrap icon-all">💬</div>
          <div className="stat-info">
            <span className="stat-val">{stats.total}</span>
            <span className="stat-lbl">Total Pengaduan Masuk</span>
          </div>
        </div>

        <div
          className={`peng-stat-card ${filter === "menunggu" ? "active" : ""}`}
          onClick={() => {
            setFilter(filter === "menunggu" ? "semua" : "menunggu");
            setPage(1);
          }}
          title="Klik untuk filter Pengaduan Menunggu"
        >
          <div className="stat-icon-wrap icon-menunggu">🕐</div>
          <div className="stat-info">
            <span className="stat-val">{stats.menunggu}</span>
            <span className="stat-lbl">Menunggu Respon</span>
          </div>
        </div>

        <div
          className={`peng-stat-card ${filter === "diproses" ? "active" : ""}`}
          onClick={() => {
            setFilter(filter === "diproses" ? "semua" : "diproses");
            setPage(1);
          }}
          title="Klik untuk filter Pengaduan Diproses"
        >
          <div className="stat-icon-wrap icon-diproses">⚙️</div>
          <div className="stat-info">
            <span className="stat-val">{stats.diproses}</span>
            <span className="stat-lbl">Sedang Diproses</span>
          </div>
        </div>

        <div
          className={`peng-stat-card ${filter === "selesai" ? "active" : ""}`}
          onClick={() => {
            setFilter(filter === "selesai" ? "semua" : "selesai");
            setPage(1);
          }}
          title="Klik untuk filter Pengaduan Selesai"
        >
          <div className="stat-icon-wrap icon-selesai">✅</div>
          <div className="stat-info">
            <span className="stat-val">{stats.selesai}</span>
            <span className="stat-lbl">Pengaduan Selesai</span>
          </div>
        </div>
      </div>

      {/* Toolbar / Search */}
      <div className="peng-toolbar">
        <div className="peng-search-wrap">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Cari nama, nomor pendaftaran, atau kategori..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="peng-search"
          />
        </div>
        {!loading && (
          <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
            {totalItems} pengaduan ditemukan
          </span>
        )}
      </div>

      {/* Table */}
      <div className="peng-table-wrap">
        {loading ? (
          <div className="peng-loading"><div className="peng-spin" /> Memuat data...</div>
        ) : filtered.length === 0 ? (
          <div className="peng-empty">
            <div className="peng-empty-icon">📭</div>
            <div>Tidak ada pengaduan ditemukan.</div>
          </div>
        ) : (
          <table className="peng-table">
            <thead>
              <tr>
                <th>Nomor UMR</th>
                <th>Nama Customer</th>
                <th>Paket</th>
                <th>Kategori</th>
                <th>Judul</th>
                <th>Status</th>
                <th>Tanggal</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td className="td-nomor">
                    <span className="nomor-pill">{p.nomor_pendaftaran}</span>
                  </td>
                  <td>
                    <div className="peng-customer-cell">
                      <div className="peng-avatar">{p.nama_customer?.charAt(0)?.toUpperCase() ?? "?"}</div>
                      <div>
                        <div className="peng-customer-name">{p.nama_customer}</div>
                        <div className="peng-customer-hp">{p.no_hp}</div>
                      </div>
                    </div>
                  </td>
                  <td className="td-paket">{p.paket}</td>
                  <td>
                    <span className="peng-kategori-chip">
                      {KATEGORI_ICON[p.kategori] ?? "💬"} {p.kategori}
                    </span>
                  </td>
                  <td className="td-judul">{p.judul}</td>
                  <td><StatusPill value={p.status} /></td>
                  <td className="td-date">{fmtDate(p.created_at)}</td>
                  <td>
                    <button
                      className="peng-detail-btn"
                      onClick={() => setSelectedId(p.id)}
                      title="Lihat detail pengaduan"
                    >
                      <LuEye size={13} />
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && list.length > 0 && (
          <AdminPagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            currentCount={list.length}
            onPageChange={setPage}
            itemName="pengaduan"
          />
        )}
      </div>

      {/* Detail Modal */}
      {selectedId && (
        <DetailModal
          pengaduanId={selectedId}
          token={token ?? ""}
          onClose={() => setSelectedId(null)}
          onStatusChanged={load}
        />
      )}
    </div>
  );
};

export default AdminPengaduan;
