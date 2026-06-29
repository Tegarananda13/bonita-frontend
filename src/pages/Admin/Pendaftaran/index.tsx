import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useAuth } from "../../../context/AuthContext";
import "./AdminPendaftaran.css";

// ── Types ────────────────────────────────────────────────────────────────────

interface PendaftaranItem {
  id: string;
  nomor_pendaftaran: string;
  nama_customer: string;
  paket: string;
  payment_status: string;
  document_status: string;
  status: string;
  tanggal_daftar: string;
  assigned?: boolean; // sudah di-assign ke admin lain
}

interface DetailPendaftaran {
  id: string;
  nomor_pendaftaran: string;
  nama_customer: string;
  no_hp: string;
  email: string;
  paket: string;
  harga: number;
  tanggal_berangkat: string;
  payment_status: string;
  document_status: string;
  status: string;
  admin_pic?: string; // nama admin yang handle
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

const fmtRupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  proses:    { label: "Proses",    cls: "status-proses" },
  selesai:   { label: "Selesai",   cls: "status-selesai" },
  batal:     { label: "Batal",     cls: "status-batal" },
  menunggu:  { label: "Menunggu",  cls: "status-menunggu" },
  lunas:     { label: "Lunas",     cls: "status-lunas" },
  belum:     { label: "Belum",     cls: "status-belum" },
  pending:   { label: "Pending",   cls: "status-pending" },
  dp:        { label: "DP",        cls: "status-dp" },
  terverifikasi: { label: "Terverifikasi", cls: "status-verified" },
  ditolak:   { label: "Ditolak",  cls: "status-ditolak" },
  lengkap:   { label: "Lengkap",  cls: "status-selesai" },
  revisi:    { label: "Perlu Revisi", cls: "status-batal" },
};

const StatusPill = ({ value }: { value: string }) => {
  const s = STATUS_MAP[value?.toLowerCase()] ?? { label: value, cls: "status-proses" };
  return <span className={`status-pill ${s.cls}`}>{s.label}</span>;
};

// ── Detail Modal ───────────────────────────────────────────────────────────────

const DetailModal = ({
  nomor,
  token,
  onClose,
  onAssigned,
}: {
  nomor: string;
  token: string;
  onClose: () => void;
  onAssigned: () => void;
}) => {
  const [data, setData] = useState<DetailPendaftaran | null>(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [assignSuccess, setAssignSuccess] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get(`http://localhost:8080/admin/pendaftaran/${nomor}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const p = res.data?.pendaftaran;
        setData({
          id: p?.ID ?? p?.id,
          nomor_pendaftaran: p?.NomorPendaftaran ?? p?.nomor_pendaftaran,
          nama_customer: p?.Customer?.Nama ?? p?.Customer?.nama,
          no_hp: p?.Customer?.NoHp ?? p?.Customer?.no_hp ?? "-",
          email: p?.Customer?.Email ?? p?.Customer?.email ?? "-",
          paket: p?.Paket?.NamaPaket ?? p?.Paket?.nama_paket,
          harga: p?.Paket?.Harga ?? p?.Paket?.harga ?? 0,
          tanggal_berangkat: p?.Paket?.TanggalBerangkat ?? p?.Paket?.tanggal_berangkat,
          payment_status: p?.PaymentStatus ?? p?.payment_status,
          document_status: p?.DocumentStatus ?? p?.document_status,
          status: p?.Status ?? p?.status,
          admin_pic: p?.User?.Nama ?? p?.User?.nama ?? null,
        });
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [nomor, token]);

  const handleAssign = async () => {
    if (!data) return;
    setAssignError("");
    try {
      setAssigning(true);
      await axios.put(`http://localhost:8080/admin/pendaftaran/${data.id}/assign`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAssignSuccess(true);
      onAssigned();
    } catch (err: unknown) {
      setAssignError(
        axios.isAxiosError(err)
          ? (err.response?.data?.error ?? "Gagal assign.")
          : "Gagal assign."
      );
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel">
        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="modal-title">📋 Detail Pendaftaran</div>
            {data && (
              <div className="modal-subtitle">{data.nomor_pendaftaran}</div>
            )}
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {loading ? (
            <div className="modal-loading">
              <div className="modal-spin" />
              Memuat detail...
            </div>
          ) : !data ? (
            <div className="modal-loading" style={{ color: "#ef4444" }}>
              Gagal memuat data pendaftaran.
            </div>
          ) : (
            <>
              {/* Status bar */}
              <div className="modal-status-row">
                <div className="modal-status-item">
                  <div className="modal-status-label">Status Keseluruhan</div>
                  <StatusPill value={data.status} />
                </div>
                <div className="modal-status-item">
                  <div className="modal-status-label">Pembayaran</div>
                  <StatusPill value={data.payment_status} />
                </div>
                <div className="modal-status-item">
                  <div className="modal-status-label">Dokumen</div>
                  <StatusPill value={data.document_status} />
                </div>
              </div>

              {/* Info jamaah */}
              <div className="modal-section-title">👤 Informasi Jamaah</div>
              <div className="modal-info-grid">
                <div className="modal-info-item">
                  <div className="modal-info-label">Nama Lengkap</div>
                  <div className="modal-info-val">{data.nama_customer}</div>
                </div>
                <div className="modal-info-item">
                  <div className="modal-info-label">No. HP</div>
                  <div className="modal-info-val">{data.no_hp}</div>
                </div>
                <div className="modal-info-item full">
                  <div className="modal-info-label">Email</div>
                  <div className="modal-info-val">{data.email}</div>
                </div>
              </div>

              {/* Info paket */}
              <div className="modal-section-title">🕌 Informasi Paket</div>
              <div className="modal-info-grid">
                <div className="modal-info-item full">
                  <div className="modal-info-label">Nama Paket</div>
                  <div className="modal-info-val">{data.paket}</div>
                </div>
                <div className="modal-info-item">
                  <div className="modal-info-label">Harga</div>
                  <div className="modal-info-val" style={{ color: "#4f46e5", fontWeight: 800 }}>
                    {fmtRupiah(data.harga)}
                  </div>
                </div>
                <div className="modal-info-item">
                  <div className="modal-info-label">Tanggal Berangkat</div>
                  <div className="modal-info-val">{data.tanggal_berangkat ? fmtDate(data.tanggal_berangkat) : "-"}</div>
                </div>
              </div>

              {/* Assign PIC */}
              <div className="modal-assign-section">
                <div className="modal-section-title">👷 PIC / Admin Penangggung Jawab</div>

                {data.admin_pic ? (
                  <div className="modal-pic-assigned">
                    <div className="modal-pic-avatar">
                      {data.admin_pic.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="modal-pic-name">{data.admin_pic}</div>
                      <div className="modal-pic-label">Admin PIC yang menangani jamaah ini</div>
                    </div>
                    <div className="modal-pic-badge">✓ Assigned</div>
                  </div>
                ) : assignSuccess ? (
                  <div className="modal-assign-success">
                    ✅ Berhasil! Anda telah menjadi PIC untuk jamaah ini.
                  </div>
                ) : (
                  <div className="modal-assign-empty">
                    <div className="modal-assign-empty-icon">👤</div>
                    <div className="modal-assign-empty-text">
                      Belum ada admin yang mengambil tanggung jawab jamaah ini.
                    </div>
                    {assignError && (
                      <div className="modal-assign-error">{assignError}</div>
                    )}
                    <button
                      className="modal-assign-btn"
                      onClick={handleAssign}
                      disabled={assigning}
                    >
                      {assigning ? (
                        <><div className="mini-spin-w" />Memproses...</>
                      ) : (
                        <>🙋 Jadikan Saya PIC Jamaah Ini</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="modal-close-full-btn" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

const AdminPendaftaran = () => {
  const { token } = useAuth();

  const [list, setList] = useState<PendaftaranItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("semua");
  const [activeView, setActiveView] = useState<"semua" | "milik-saya">("semua");
  const [detailNomor, setDetailNomor] = useState<string | null>(null);
  const [jamaahSayaKey, setJamaahSayaKey] = useState(0);

  const authH = useCallback(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:8080/admin/pendaftaran", {
        headers: authH(),
      });
      setList(res.data?.data ?? []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [authH]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Filter ──
  const filtered = list.filter((p) => {
    const matchSearch =
      p.nama_customer?.toLowerCase().includes(search.toLowerCase()) ||
      p.nomor_pendaftaran?.toLowerCase().includes(search.toLowerCase()) ||
      p.paket?.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      filterStatus === "semua" || p.status?.toLowerCase() === filterStatus;
    return matchSearch && matchStatus;
  });

  // ── Stats ──
  const countByStatus = (s: string) =>
    list.filter((p) => p.status?.toLowerCase() === s).length;

  return (
    <div className="pendaftaran-admin-page">
      {/* ── Header ── */}
      <div className="page-header">
        <div className="page-header-left">
          <h2>Pendaftaran Jamaah</h2>
          <p>Monitor, kelola, dan assign PIC untuk setiap pendaftaran jamaah umroh.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn-outline-sm" onClick={fetchData}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* ── View Tabs ── */}
      <div className="view-tabs">
        <button
          className={`view-tab ${activeView === "semua" ? "active" : ""}`}
          onClick={() => setActiveView("semua")}
        >
          📋 Semua Pendaftaran
          <span className="view-tab-count">{list.length}</span>
        </button>
        <button
          className={`view-tab ${activeView === "milik-saya" ? "active" : ""}`}
          onClick={() => setActiveView("milik-saya")}
        >
          👤 Jamaah Saya (PIC)
        </button>
      </div>

      {activeView === "semua" ? (
        <>
          {/* ── Stats ── */}
          {!loading && (
            <div className="pendaftaran-stats-row">
              {[
                { icon: "📋", label: "Total",    value: list.length,             cls: "" },
                { icon: "⏳", label: "Proses",   value: countByStatus("proses"), cls: "s-proses" },
                { icon: "✅", label: "Selesai",  value: countByStatus("selesai"), cls: "s-selesai" },
                { icon: "❌", label: "Batal",    value: countByStatus("batal"),  cls: "s-batal" },
              ].map((s) => (
                <div
                  className={`pendaftaran-stat-card ${s.cls}`}
                  key={s.label}
                  onClick={() => setFilterStatus(s.label === "Total" ? "semua" : s.label.toLowerCase())}
                  style={{ cursor: "pointer" }}
                >
                  <div className="pendaftaran-stat-icon">{s.icon}</div>
                  <div>
                    <div className="pendaftaran-stat-value">{s.value}</div>
                    <div className="pendaftaran-stat-label">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Toolbar ── */}
          <div className="pendaftaran-toolbar">
            <div className="toolbar-search">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Cari nama, nomor pendaftaran, atau paket..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="semua">Semua Status</option>
              <option value="proses">Proses</option>
              <option value="selesai">Selesai</option>
              <option value="batal">Batal</option>
            </select>
            {!loading && (
              <span className="result-count">{filtered.length} pendaftaran</span>
            )}
          </div>

          {/* ── Table ── */}
          <div className="pendaftaran-table-card">
            <table className="pendaftaran-table">
              <thead>
                <tr>
                  <th>No. Pendaftaran</th>
                  <th>Jamaah</th>
                  <th>Paket</th>
                  <th>Status</th>
                  <th>Pembayaran</th>
                  <th>Dokumen</th>
                  <th>Tanggal</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={8}>
                        <div className="table-skel-row">
                          <div className="skel" style={{ width: 120, height: 12 }} />
                          <div className="skel" style={{ width: 100, height: 12 }} />
                          <div className="skel" style={{ width: 140, height: 12 }} />
                          <div className="skel" style={{ width: 70, height: 20, borderRadius: 999 }} />
                          <div className="skel" style={{ width: 70, height: 20, borderRadius: 999 }} />
                          <div className="skel" style={{ width: 70, height: 20, borderRadius: 999 }} />
                          <div className="skel" style={{ width: 80, height: 12 }} />
                          <div className="skel" style={{ width: 80, height: 28, borderRadius: 8 }} />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="table-empty">
                        <div className="table-empty-icon">📋</div>
                        <p>{search || filterStatus !== "semua" ? "Tidak ada data yang cocok." : "Belum ada pendaftaran."}</p>
                        {(search || filterStatus !== "semua") && (
                          <button
                            className="btn-outline-sm"
                            onClick={() => { setSearch(""); setFilterStatus("semua"); }}
                            style={{ marginTop: "0.75rem" }}
                          >
                            Reset Filter
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <span className="nomor-pendaftaran">{p.nomor_pendaftaran}</span>
                      </td>
                      <td>
                        <div className="customer-cell">
                          <div className="customer-avatar">
                            {p.nama_customer?.charAt(0)?.toUpperCase() ?? "?"}
                          </div>
                          <span className="customer-name">{p.nama_customer}</span>
                        </div>
                      </td>
                      <td>
                        <span className="paket-name-small">{p.paket}</span>
                      </td>
                      <td><StatusPill value={p.status} /></td>
                      <td><StatusPill value={p.payment_status} /></td>
                      <td><StatusPill value={p.document_status} /></td>
                      <td>
                        <span className="date-cell">{fmtDate(p.tanggal_daftar)}</span>
                      </td>
                      <td>
                        <button
                          className="detail-btn"
                          onClick={() => setDetailNomor(p.nomor_pendaftaran)}
                        >
                          Detail & Assign
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        // ── Tab "Jamaah Saya" ──
        <JamaahSayaView token={token} authH={authH} refreshKey={jamaahSayaKey} />
      )}

      {/* ── Detail Modal ── */}
      {detailNomor && (
        <DetailModal
          nomor={detailNomor}
          token={token ?? ""}
          onClose={() => setDetailNomor(null)}
          onAssigned={() => {
            fetchData();
            setJamaahSayaKey((k) => k + 1); // trigger JamaahSayaView refresh
            setActiveView("milik-saya"); // pindah ke tab jamaah saya
          }}
        />
      )}
    </div>
  );
};

// ── Jamaah Saya View ──────────────────────────────────────────────────────────

const JamaahSayaView = ({
  token,
  authH,
  refreshKey,
}: {
  token: string | null;
  authH: () => { Authorization: string };
  refreshKey: number;
}) => {
  const [list, setList] = useState<PendaftaranItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        // ambil semua, filter yang assigned ke admin ini
        // backend mengembalikan user_id; frontend filter berdasarkan yang assigned
        const res = await axios.get("http://localhost:8080/admin/pendaftaran/saya", {
          headers: authH(),
        });
        setList(res.data?.data ?? []);
      } catch {
        // fallback: endpoint belum ada, tampilkan empty
        setList([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [authH, refreshKey]);

  return (
    <div>
      <div className="my-jamaah-header">
        <div className="my-jamaah-info">
          <div className="my-jamaah-icon">👤</div>
          <div>
            <div className="my-jamaah-title">Jamaah Saya</div>
            <div className="my-jamaah-sub">
              Daftar jamaah yang menjadi tanggung jawab Anda sebagai PIC.
            </div>
          </div>
        </div>
        <div className="my-jamaah-count">{list.length} jamaah</div>
      </div>

      {loading ? (
        <div className="pendaftaran-table-card">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="table-skel-row" style={{ padding: "1rem 1.25rem" }}>
              <div className="skel" style={{ width: 36, height: 36, borderRadius: "50%" }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <div className="skel" style={{ width: "35%", height: 12 }} />
                <div className="skel" style={{ width: "55%", height: 10 }} />
              </div>
              <div className="skel" style={{ width: 80, height: 22, borderRadius: 999 }} />
              <div className="skel" style={{ width: 100, height: 12 }} />
            </div>
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="my-jamaah-empty">
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>👥</div>
          <div style={{ fontWeight: 700, color: "#1e293b", marginBottom: "0.4rem", fontSize: "1rem" }}>
            Belum Ada Jamaah
          </div>
          <p style={{ fontSize: "0.85rem", color: "#94a3b8", lineHeight: 1.6 }}>
            Anda belum menjadi PIC untuk jamaah manapun.<br />
            Buka tab "Semua Pendaftaran" dan klik "Detail & Assign" untuk mengambil tanggung jawab jamaah.
          </p>
        </div>
      ) : (
        <div className="my-jamaah-grid">
          {list.map((p) => (
            <div key={p.id} className="my-jamaah-card">
              <div className="my-jamaah-card-top">
                <div className="my-jamaah-avatar">
                  {p.nama_customer?.charAt(0)?.toUpperCase() ?? "?"}
                </div>
                <div className="my-jamaah-card-info">
                  <div className="my-jamaah-name">{p.nama_customer}</div>
                  <div className="my-jamaah-nomor">{p.nomor_pendaftaran}</div>
                </div>
                <StatusPill value={p.status} />
              </div>
              <div className="my-jamaah-card-paket">{p.paket}</div>
              <div className="my-jamaah-card-status-row">
                <div className="my-jamaah-status-item">
                  <span className="my-jamaah-status-label">Bayar</span>
                  <StatusPill value={p.payment_status} />
                </div>
                <div className="my-jamaah-status-item">
                  <span className="my-jamaah-status-label">Dokumen</span>
                  <StatusPill value={p.document_status} />
                </div>
              </div>
              <div className="my-jamaah-card-date">
                Daftar: {fmtDate(p.tanggal_daftar)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminPendaftaran;
