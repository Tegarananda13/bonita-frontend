import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../../context/AuthContext";
import "./AdminPaketDetail.css";

const API = "http://localhost:8080";

// ── Types ─────────────────────────────────────────────────────────────────────

interface GambarPaketItem {
  id: string | null;
  url: string;
  urutan: number;
  is_utama: boolean;
}

interface PaketInfo {
  id: string;
  nama_paket: string;
  jenis_paket: string;
  foto_paket: string;
  gambar_paket?: GambarPaketItem[];
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

interface FasilitasItem {
  id: string;
  nama_fasilitas: string;
  deskripsi?: string;
  foto_fasilitas?: Array<{ id: string; url: string; urutan: number }>;
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
  belum:         "Belum",
  pending:       "Pending",
  belum_lengkap: "Belum Lengkap",
  revisi:        "Revisi",
  lengkap:       "Lengkap",
};

const jenisBadge: Record<string, string> = {
  Reguler:      "#1a6b43",
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
  const [gambarPaket, setGambarPaket] = useState<GambarPaketItem[]>([]);
  const [activeFotoIdx, setActiveFotoIdx] = useState<number>(0);
  const [fasilitas, setFasilitas] = useState<FasilitasItem[]>([]);
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
      const rawPaket = res.data.paket;
      let rawGambar: Array<any> = res.data.gambar_paket ?? rawPaket?.gambar_paket ?? rawPaket?.GambarPaket ?? [];

      const coverUrl = rawPaket?.foto_paket || rawPaket?.FotoPaket || "";
      if (rawGambar.length === 0 && coverUrl) {
        rawGambar = [{ id: null, url: coverUrl, urutan: 1, is_utama: true }];
      }

      const normalizedGambar: GambarPaketItem[] = rawGambar
        .map((g: any, i: number) => ({
          id: g.id || g.ID || null,
          url: g.url || g.file_path || g.FilePath || "",
          urutan: g.urutan ?? g.Urutan ?? (i + 1),
          is_utama: Boolean(g.is_utama ?? g.IsUtama),
        }))
        .filter((g: GambarPaketItem) => Boolean(g.url));

      let utamaIndex = normalizedGambar.findIndex((g) => g.is_utama);
      if (utamaIndex === -1 && normalizedGambar.length > 0) {
        utamaIndex = 0;
      }

      const resolvedFoto = normalizedGambar[utamaIndex]?.url || coverUrl;

      setPaket({
        ...rawPaket,
        foto_paket: resolvedFoto,
        gambar_paket: normalizedGambar,
      });
      setGambarPaket(normalizedGambar);
      setActiveFotoIdx(utamaIndex >= 0 ? utamaIndex : 0);
      setFasilitas(res.data.fasilitas ?? []);
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
          <button type="button" className="apd-back-btn" onClick={() => navigate("/admin/paket")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Kembali
          </button>
          <h1 className="apd-title">Detail Paket Umroh</h1>
          <p className="apd-subtitle">Informasi lengkap, jadwal keberangkatan, fasilitas, dan status paket umroh.</p>
        </div>

        <div className="apd-header-actions">
          {isFinished ? (
            <span className="apd-badge-finished">
              ⚫ Paket Selesai
            </span>
          ) : (
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
              Selesai
            </button>
          )}

          {!isFinished && (
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
                Nonaktifkan Paket
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Aktifkan Paket
              </>
            )}
          </button>
          )}
        </div>
      </div>

      {/* ── Info Paket ── */}
      <div className="apd-card apd-info-card">
        <div className="apd-foto-wrap">
          <div className="apd-foto-main-box">
            {((gambarPaket.length > 0 && gambarPaket[activeFotoIdx]?.url) || paket.foto_paket) ? (
              <img
                src={gambarPaket[activeFotoIdx]?.url || paket.foto_paket}
                alt={paket.nama_paket}
                className="apd-foto"
                onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK; }}
              />
            ) : (
              <div className="apd-foto-placeholder">
                <span className="apd-foto-placeholder-icon">🕌</span>
                <span className="apd-foto-placeholder-text">Tidak ada foto</span>
              </div>
            )}
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

          {/* Galeri seluruh foto paket */}
          {gambarPaket.length > 1 && (
            <div className="apd-foto-gallery" title="Seluruh foto paket">
              {gambarPaket.map((g, idx) => (
                <button
                  type="button"
                  key={g.id || idx}
                  className={`apd-foto-thumb-btn ${idx === activeFotoIdx ? "active" : ""}`}
                  onClick={() => setActiveFotoIdx(idx)}
                  title={`Foto ${idx + 1}${g.is_utama ? " (Foto Utama)" : ""}`}
                >
                  <img
                    src={g.url}
                    alt={`Thumbnail ${idx + 1}`}
                    className="apd-foto-thumb"
                    onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK; }}
                  />
                  {g.is_utama && <span className="apd-foto-thumb-star" title="Foto Utama">★</span>}
                </button>
              ))}
            </div>
          )}
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
              <div className="apd-info-value">{fasilitas.length || paket.jumlah_fasilitas} item</div>
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

          {/* ── Box Daftar Fasilitas Paket ── */}
          <div className="apd-fasilitas-section">
            <div className="apd-fasilitas-header">
              <div className="apd-fasilitas-title">
                <span>⭐ Fasilitas Paket</span>
              </div>
              <span className="apd-fasilitas-count">
                {fasilitas.length} Item
              </span>
            </div>

            {fasilitas.length === 0 ? (
              <p className="apd-fasilitas-empty">Belum ada fasilitas yang didaftarkan pada paket ini.</p>
            ) : (
              <div className="apd-fasilitas-grid">
                {fasilitas.map((f) => (
                  <div key={f.id} className="apd-fasilitas-item">
                    <span className="apd-fasilitas-check">✓</span>
                    <span className="apd-fasilitas-name">{f.nama_fasilitas}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Statistik (KPI) ── */}
      {statistik && (
        <div className="apd-statistik-grid">
          {[
            { label: "Total Jamaah", value: statistik.total_jamaah, icon: "👥", cls: "st-total" },
            { label: "Siap Berangkat", value: statistik.jumlah_siap_berangkat, icon: "✈️", cls: "st-siap-b" },
          ].map((s) => (
            <div key={s.label} className={`apd-stat-card ${s.cls}`}>
              <div className="apd-stat-icon-wrap">{s.icon}</div>
              <div className="apd-stat-info">
                <div className="apd-stat-value">{s.value}</div>
                <div className="apd-stat-label">{s.label}</div>
              </div>
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
