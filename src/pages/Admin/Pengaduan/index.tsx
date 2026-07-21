import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useAuth } from "../../../context/AuthContext";
import "./AdminPengaduan.css";

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
          `http://localhost:8080/admin/pengaduan/${pengaduanId}`,
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
      await axios.patch(
        `http://localhost:8080/admin/pengaduan/${pengaduanId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setData(prev => prev ? { ...prev, status: newStatus } : prev);
      setMsg("✅ Status berhasil diperbarui.");
      onStatusChanged();
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
          <button className="peng-modal-close" onClick={onClose}>✕</button>
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
                  { label: "Paket Umroh",    val: data.pendaftaran.paket },
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
                  {saving ? "Menyimpan..." : "Simpan Status"}
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

// ── Main Page ─────────────────────────────────────────────────────────────────

const AdminPengaduan = () => {
  const { token } = useAuth();
  const [list, setList] = useState<PengaduanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("semua");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [countMenunggu, setCountMenunggu] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:8080/admin/pengaduan", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setList(res.data?.data ?? []);
      setCountMenunggu(res.data?.count_menunggu ?? 0);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // Filter + Search
  const filtered = list.filter(p => {
    const matchStatus = filter === "semua" || p.status === filter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.nomor_pendaftaran?.toLowerCase().includes(q) ||
      p.nama_customer?.toLowerCase().includes(q) ||
      p.kategori?.toLowerCase().includes(q) ||
      p.judul?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const filters = [
    { key: "semua",    label: "Semua" },
    { key: "menunggu", label: "Menunggu" },
    { key: "diproses", label: "Diproses" },
    { key: "selesai",  label: "Selesai" },
  ];

  return (
    <div className="peng-page">
      {/* Header */}
      <div className="peng-header">
        <div className="peng-header-left">
          <h1 className="peng-title">
            📣 Pengaduan Customer
            {countMenunggu > 0 && (
              <span className="peng-badge-header">{countMenunggu}</span>
            )}
          </h1>
          <p className="peng-subtitle">
            Laporan pengaduan dari customer melalui Bonita Assistant.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="peng-toolbar">
        {/* Filter chips */}
        <div className="peng-filters">
          {filters.map(f => (
            <button
              key={f.key}
              className={`peng-filter-btn ${filter === f.key ? "active" : ""}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              {f.key === "menunggu" && countMenunggu > 0 && (
                <span className="peng-filter-badge">{countMenunggu}</span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="peng-search-wrap">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Cari nama, nomor, atau kategori..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="peng-search"
          />
        </div>
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
                <tr key={p.id} className={p.status === "menunggu" ? "row-menunggu" : ""}>
                  <td className="td-nomor">{p.nomor_pendaftaran}</td>
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
                    >
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
