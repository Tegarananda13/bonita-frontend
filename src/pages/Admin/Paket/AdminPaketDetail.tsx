import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../../context/AuthContext";
import "./AdminPaketDetail.css";

const API = "http://localhost:8080";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PaketInfo {
  id: string;
  nama_paket: string;
  jenis_paket: string;
  foto_paket: string;
  harga: number;
  durasi: number;
  tanggal_berangkat: string;
  deskripsi: string;
  kuota_max: number;
  kuota_terpakai: number;
  sisa_kuota: number;
  jumlah_fasilitas: number;
  is_aktif?: boolean;
  is_active?: boolean;
  is_finished?: boolean;
  IsActive?: boolean;
  IsFinished?: boolean;
}

interface Statistik {
  total_jamaah: number;
  jumlah_dp: number;
  jumlah_lunas: number;
  jumlah_siap_berangkat: number;
  jumlah_selesai: number;
  jumlah_batal: number;
}

interface JamaahRow {
  id: string;
  nomor_pendaftaran: string;
  nama_customer: string;
  pic: string;
  status: string;
  payment_status: string;
  document_status: string;
  tanggal_daftar: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const fmtDate = (s: string) => {
  if (!s) return "-";
  return new Date(s).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
};

const statusLabel: Record<string, { label: string; cls: string }> = {
  proses:               { label: "Proses",            cls: "st-proses" },
  menunggu_pembayaran:  { label: "Menunggu Bayar",    cls: "st-menunggu-bayar" },
  menunggu_dokumen:     { label: "Menunggu Dokumen",  cls: "st-menunggu-dok" },
  siap_berangkat:       { label: "Siap Berangkat",    cls: "st-siap" },
  selesai:              { label: "Selesai",            cls: "st-selesai" },
  batal:                { label: "Batal",              cls: "st-batal" },
};

const payLabel: Record<string, string> = {
  belum: "Belum Bayar",
  DP:    "DP",
  lunas: "Lunas",
};

const dokLabel: Record<string, string> = {
  belum:   "Belum",
  pending: "Menunggu",
  revisi:  "Revisi",
  lengkap: "Lengkap",
};

const jenisBadge: Record<string, string> = {
  Reguler:      "#6366f1",
  Exclusive:    "#f59e0b",
  "Plus Turki": "#0ea5e9",
  "Plus Dubai": "#8b5cf6",
  Ramadhan:     "#10b981",
  Syawal:       "#ef4444",
};

// ── Component ─────────────────────────────────────────────────────────────────

const AdminPaketDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [paket, setPaket] = useState<PaketInfo | null>(null);
  const [statistik, setStatistik] = useState<Statistik | null>(null);
  const [jamaah, setJamaah] = useState<JamaahRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal actions
  const [toggleConfirm, setToggleConfirm] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [toggleError, setToggleError] = useState("");

  const [finishConfirm, setFinishConfirm] = useState(false);
  const [finishLoading, setFinishLoading] = useState(false);
  const [finishError, setFinishError] = useState("");

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(`${API}/admin/paket/${id}/detail`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPaket(res.data.paket);
      setStatistik(res.data.statistik);
      setJamaah(res.data.jamaah ?? []);
    } catch {
      setError("Gagal memuat detail paket.");
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const isFinished = paket
    ? (paket.is_finished !== undefined
        ? Boolean(paket.is_finished)
        : Boolean(paket.IsFinished))
    : false;

  const isActive = paket
    ? (paket.is_active !== undefined
        ? Boolean(paket.is_active)
        : (paket.IsActive !== undefined ? Boolean(paket.IsActive) : Boolean(paket.is_aktif)))
    : false;

  const handleToggleStatus = async () => {
    if (!paket) return;
    try {
      setToggleLoading(true);
      setToggleError("");
      const newStatus = !isActive;
      await axios.patch(
        `${API}/admin/paket/${paket.id}/status`,
        { is_active: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setToggleConfirm(false);
      await fetchDetail();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.error ?? "Gagal mengubah status paket.")
        : "Gagal mengubah status paket.";
      setToggleError(msg);
    } finally {
      setToggleLoading(false);
    }
  };

  const handleFinishPaket = async () => {
    if (!paket) return;
    try {
      setFinishLoading(true);
      setFinishError("");
      await axios.patch(
        `${API}/admin/paket/${paket.id}/finish`,
        { is_finished: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFinishConfirm(false);
      await fetchDetail();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.error ?? "Gagal menyelesaikan paket.")
        : "Gagal menyelesaikan paket.";
      setFinishError(msg);
    } finally {
      setFinishLoading(false);
    }
  };

  if (loading) return (
    <div className="apd-loading">
      <div className="apd-spinner" />
      Memuat detail paket...
    </div>
  );

  if (error || !paket) return (
    <div className="apd-error">
      <span>⚠️</span>
      <p>{error || "Paket tidak ditemukan."}</p>
      <button className="apd-back-btn" onClick={() => navigate("/admin/paket")}>
        ← Kembali
      </button>
    </div>
  );

  const jenisBg = jenisBadge[paket.jenis_paket] ?? "#1a6b43";
  const FALLBACK = "https://images.unsplash.com/photo-1537039557005-6e3bcde2e5e5?w=800&q=80";

  // Badge status helper
  const getStatusBadge = () => {
    if (isFinished) {
      return {
        label: "⚫ Selesai",
        bg: "#f1f5f9",
        color: "#475569",
        border: "1px solid #cbd5e1",
      };
    }
    if (isActive) {
      return {
        label: "🟢 Aktif",
        bg: "#dcfce7",
        color: "#166534",
        border: "1px solid #bbf7d0",
      };
    }
    return {
      label: "🔴 Tidak Aktif",
      bg: "#fee2e2",
      color: "#991b1b",
      border: "1px solid #fecaca",
    };
  };

  const statusBadge = getStatusBadge();

  return (
    <div className="apd-page">

      {/* ── Header ── */}
      <div className="apd-header">
        <div className="apd-header-left">
          <button className="apd-back-btn" onClick={() => navigate("/admin/paket")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Kembali ke Daftar Paket
          </button>
          <h1 className="apd-title">Detail Paket Umroh</h1>
        </div>

        <div className="apd-header-actions">
          {isFinished ? (
            <span className="apd-badge-finished">
              ⚫ Paket Selesai
            </span>
          ) : (
            <>
              {isActive && (
                <button
                  type="button"
                  className="apd-btn-finish"
                  onClick={() => {
                    setFinishError("");
                    setFinishConfirm(true);
                  }}
                  title="Selesaikan paket ini"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Selesaikan
                </button>
              )}
              <button
                type="button"
                className={isActive ? "apd-btn-deactivate" : "apd-btn-activate"}
                onClick={() => {
                  setToggleError("");
                  setToggleConfirm(true);
                }}
                title={isActive ? "Nonaktifkan paket" : "Aktifkan paket"}
              >
                {isActive ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                    </svg>
                    Nonaktifkan
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Aktifkan
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Info Paket ── */}
      <div className="apd-card apd-info-card">
        <div className="apd-foto-wrap">
          <img
            src={paket.foto_paket || FALLBACK}
            alt={paket.nama_paket}
            className="apd-foto"
            onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK; }}
          />
          <span
            className="apd-status-badge"
            style={{
              background: statusBadge.bg,
              color: statusBadge.color,
              border: statusBadge.border,
            }}
          >
            {statusBadge.label}
          </span>
        </div>

        <div className="apd-info-body">
          <div className="apd-jenis-badge" style={{ background: jenisBg }}>
            {paket.jenis_paket || "Umum"}
          </div>
          <h2 className="apd-nama">{paket.nama_paket}</h2>
          {paket.deskripsi && <p className="apd-deskripsi">{paket.deskripsi}</p>}

          <div className="apd-grid">
            <div className="apd-info-item">
              <div className="apd-info-label">💰 Harga</div>
              <div className="apd-info-value highlight">{fmtRupiah(paket.harga)}</div>
            </div>
            <div className="apd-info-item">
              <div className="apd-info-label">📅 Keberangkatan</div>
              <div className="apd-info-value">{fmtDate(paket.tanggal_berangkat)}</div>
            </div>
            <div className="apd-info-item">
              <div className="apd-info-label">⏱️ Durasi</div>
              <div className="apd-info-value">{paket.durasi} hari</div>
            </div>
            <div className="apd-info-item">
              <div className="apd-info-label">⭐ Fasilitas</div>
              <div className="apd-info-value">{paket.jumlah_fasilitas} item</div>
            </div>
          </div>

          {/* Kuota bar */}
          <div className="apd-kuota-section">
            <div className="apd-kuota-row">
              <div className="apd-kuota-item">
                <span className="apd-kuota-num">{paket.kuota_max}</span>
                <span className="apd-kuota-lbl">Maks</span>
              </div>
              <div className="apd-kuota-item">
                <span className="apd-kuota-num filled">{paket.kuota_terpakai}</span>
                <span className="apd-kuota-lbl">Terpakai</span>
              </div>
              <div className="apd-kuota-item">
                <span className="apd-kuota-num sisa">{paket.sisa_kuota}</span>
                <span className="apd-kuota-lbl">Tersisa</span>
              </div>
            </div>
            <div className="apd-progress-bar">
              <div
                className="apd-progress-fill"
                style={{ width: `${paket.kuota_max > 0 ? (paket.kuota_terpakai / paket.kuota_max) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Statistik ── */}
      {statistik && (
        <div className="apd-statistik-grid">
          {[
            { label: "Total Jamaah", value: statistik.total_jamaah, icon: "👥", cls: "st-total" },
            { label: "Masih DP",     value: statistik.jumlah_dp,    icon: "💳", cls: "st-dp"    },
            { label: "Lunas",        value: statistik.jumlah_lunas,  icon: "✅", cls: "st-lunas" },
            { label: "Siap Berangkat", value: statistik.jumlah_siap_berangkat, icon: "✈️", cls: "st-siap-b" },
            { label: "Selesai",      value: statistik.jumlah_selesai, icon: "🏁", cls: "st-done"  },
          ].map((s) => (
            <div key={s.label} className={`apd-stat-card ${s.cls}`}>
              <div className="apd-stat-icon">{s.icon}</div>
              <div className="apd-stat-value">{s.value}</div>
              <div className="apd-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tabel Jamaah ── */}
      <div className="apd-card">
        <div className="apd-section-header">
          <h3 className="apd-section-title">👥 Daftar Jamaah</h3>
          <span className="apd-count-badge">{jamaah.length} jamaah</span>
        </div>

        {jamaah.length === 0 ? (
          <div className="apd-empty">
            <div className="apd-empty-icon">🕌</div>
            <p>Belum ada jamaah yang mengambil paket ini.</p>
          </div>
        ) : (
          <div className="apd-table-wrap">
            <table className="apd-table">
              <thead>
                <tr>
                  <th>Nama Customer</th>
                  <th>No. Pendaftaran</th>
                  <th>PIC Admin</th>
                  <th>Status</th>
                  <th>Pembayaran</th>
                  <th>Dokumen</th>
                  <th>Tgl Daftar</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {jamaah.map((j) => {
                  const stInfo = statusLabel[j.status] ?? { label: j.status, cls: "st-proses" };
                  return (
                    <tr key={j.id}>
                      <td className="apd-td-nama">{j.nama_customer}</td>
                      <td>
                        <span className="apd-nomor">{j.nomor_pendaftaran}</span>
                      </td>
                      <td>{j.pic || "-"}</td>
                      <td>
                        <span className={`apd-badge ${stInfo.cls}`}>{stInfo.label}</span>
                      </td>
                      <td>
                        <span className={`apd-badge-pay pay-${j.payment_status}`}>
                          {payLabel[j.payment_status] ?? j.payment_status}
                        </span>
                      </td>
                      <td>
                        <span className={`apd-badge-dok dok-${j.document_status}`}>
                          {dokLabel[j.document_status] ?? j.document_status}
                        </span>
                      </td>
                      <td className="apd-td-date">{fmtDate(j.tanggal_daftar)}</td>
                      <td>
                        <button
                          className="apd-detail-btn"
                          onClick={() => navigate(`/admin/pendaftaran?nomor=${j.nomor_pendaftaran}`)}
                          title="Lihat detail jamaah"
                        >
                          Lihat Detail
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Toggle Status Confirm Modal ── */}
      {toggleConfirm && (
        <div
          className="apd-confirm-overlay"
          onClick={(e) => e.target === e.currentTarget && !toggleLoading && setToggleConfirm(false)}
        >
          <div className="apd-confirm-box">
            <div className="apd-confirm-icon">{isActive ? "🔴" : "🟢"}</div>
            <h3>{isActive ? "Nonaktifkan Paket?" : "Aktifkan Paket?"}</h3>
            <p>
              Paket <strong>"{paket.nama_paket}"</strong> akan diubah statusnya menjadi{" "}
              <strong>{isActive ? "Nonaktif" : "Aktif"}</strong>.
              {isActive && (
                <span className="apd-confirm-warning">
                  ⚠️ Paket tidak dapat dinonaktifkan jika masih ada jamaah dengan status proses berjalan.
                </span>
              )}
            </p>
            {toggleError && (
              <div className="apd-confirm-error">
                {toggleError}
              </div>
            )}
            <div className="apd-confirm-actions">
              <button
                type="button"
                className="apd-confirm-cancel"
                onClick={() => setToggleConfirm(false)}
                disabled={toggleLoading}
              >
                Batal
              </button>
              <button
                type="button"
                className={isActive ? "apd-confirm-delete-btn" : "apd-confirm-activate-btn"}
                onClick={handleToggleStatus}
                disabled={toggleLoading}
              >
                {toggleLoading
                  ? "Memproses..."
                  : isActive ? "Ya, Nonaktifkan" : "Ya, Aktifkan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Finish Paket Confirm Modal ── */}
      {finishConfirm && (
        <div
          className="apd-confirm-overlay"
          onClick={(e) => e.target === e.currentTarget && !finishLoading && setFinishConfirm(false)}
        >
          <div className="apd-confirm-box">
            <div className="apd-confirm-icon">⚫</div>
            <h3>Selesaikan Paket?</h3>
            <p>
              Seluruh jamaah pada paket <strong>"{paket.nama_paket}"</strong> yang belum selesai
              akan otomatis diubah statusnya menjadi <strong>Selesai</strong>.{" "}
              <span className="apd-confirm-warning">
                ⚠️ Perubahan ini tidak dapat dibatalkan.
              </span>
            </p>
            {finishError && (
              <div className="apd-confirm-error">
                {finishError}
              </div>
            )}
            <div className="apd-confirm-actions">
              <button
                type="button"
                className="apd-confirm-cancel"
                onClick={() => setFinishConfirm(false)}
                disabled={finishLoading}
              >
                Batal
              </button>
              <button
                type="button"
                className="apd-confirm-finish-btn"
                onClick={handleFinishPaket}
                disabled={finishLoading}
              >
                {finishLoading ? "Memproses..." : "Ya, Selesaikan Paket"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminPaketDetail;
