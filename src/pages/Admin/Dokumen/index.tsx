import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useAuth } from "../../../context/AuthContext";
import "../Pembayaran/AdminPembayaran.css";

interface DokumenItem {
  id: string;
  nomor_pendaftaran: string;
  nama_customer: string;
  jenis_dokumen: string;
  status: string;
  tanggal_upload: string;
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

const DOK_ICONS: Record<string, string> = {
  paspor: "🛂", ktp: "🪪", foto: "🖼️", vaksin: "💉", lainnya: "📄",
};

const AdminDokumen = () => {
  const { token } = useAuth();
  const [list, setList] = useState<DokumenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [detailModal, setDetailModal] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<{file?: string; jenis?: string; nama?: string; paket?: string} | null>(null);

  const authH = useCallback(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:8080/admin/dokumen/pending", {
        headers: authH(),
      });
      setList(res.data?.data ?? []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [authH]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const fetchDetail = async (id: string) => {
    setDetailModal(id);
    try {
      const res = await axios.get(`http://localhost:8080/admin/dokumen/${id}`, {
        headers: authH(),
      });
      const d = res.data?.dokumen;
      setDetailData({
        file: d?.FilePath ?? d?.file_path,
        jenis: d?.JenisDokumen ?? d?.jenis_dokumen,
        nama: d?.Pendaftaran?.Customer?.Nama ?? d?.Pendaftaran?.Customer?.nama,
        paket: d?.Pendaftaran?.Paket?.NamaPaket ?? d?.Pendaftaran?.Paket?.nama_paket,
      });
    } catch {
      setDetailData(null);
    }
  };

  const handleVerify = async (id: string, status: "diterima" | "ditolak") => {
    setError("");
    setSuccess("");
    try {
      setVerifying(id + status);
      await axios.put(`http://localhost:8080/admin/dokumen/${id}/verifikasi`, { status }, {
        headers: authH(),
      });
      setSuccess(`Dokumen berhasil di${status === "diterima" ? "terima" : "tolak"}.`);
      setDetailModal(null);
      setDetailData(null);
      fetchList();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: unknown) {
      setError(axios.isAxiosError(err) ? (err.response?.data?.error ?? "Gagal memverifikasi.") : "Gagal memverifikasi.");
    } finally {
      setVerifying(null);
    }
  };

  const isImageFile = (url: string = "") =>
    /\.(jpg|jpeg|png|webp|gif)$/i.test(url) || url.includes("storage.googleapis") || url.includes("supabase");

  return (
    <div className="admin-verify-page">
      <div className="page-header">
        <div className="page-header-left">
          <h2>Verifikasi Dokumen</h2>
          <p>Tinjau dan verifikasi dokumen yang diupload jamaah.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn-outline-sm" onClick={fetchList}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {success && <div className="alert-success">✓ {success}</div>}
      {error && <div className="alert-error">✕ {error}</div>}

      {/* Stats */}
      {!loading && (
        <div className="verify-stats">
          <div className="verify-stat-card">
            <div className="verify-stat-icon">📂</div>
            <div>
              <div className="verify-stat-val">{list.length}</div>
              <div className="verify-stat-label">Menunggu Verifikasi</div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="verify-table-card">
        <table className="verify-table">
          <thead>
            <tr>
              <th>Jamaah</th>
              <th>No. Pendaftaran</th>
              <th>Jenis Dokumen</th>
              <th>Tanggal Upload</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={5}>
                    <div className="skel-row">
                      <div className="skel" style={{ width: 32, height: 32, borderRadius: "50%" }} />
                      <div className="skel" style={{ width: "20%", height: 12 }} />
                      <div className="skel" style={{ width: "25%", height: 12 }} />
                      <div className="skel" style={{ width: "15%", height: 12 }} />
                      <div className="skel" style={{ width: "20%", height: 12 }} />
                      <div className="skel" style={{ width: 90, height: 28, borderRadius: 8 }} />
                    </div>
                  </td>
                </tr>
              ))
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="verify-empty">
                    <div>✅</div>
                    <p>Tidak ada dokumen yang perlu diverifikasi.</p>
                  </div>
                </td>
              </tr>
            ) : (
              list.map((d) => (
                <tr key={d.id}>
                  <td>
                    <div className="customer-cell">
                      <div className="customer-av">
                        {d.nama_customer?.charAt(0)?.toUpperCase() ?? "?"}
                      </div>
                      <span className="customer-nm">{d.nama_customer}</span>
                    </div>
                  </td>
                  <td>
                    <span className="nomor-pill">{d.nomor_pendaftaran}</span>
                  </td>
                  <td>
                    <span className="jenis-badge">
                      {DOK_ICONS[d.jenis_dokumen] ?? "📄"} {d.jenis_dokumen}
                    </span>
                  </td>
                  <td>
                    <span className="date-text">{fmtDate(d.tanggal_upload)}</span>
                  </td>
                  <td>
                    <button className="detail-open-btn" onClick={() => fetchDetail(d.id)}>
                      Tinjau
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

      {/* Modal */}
      {detailModal && (
        <div
          className="verify-modal-overlay"
          onClick={(e) => e.target === e.currentTarget && !verifying && setDetailModal(null)}
        >
          <div className="verify-modal">
            <div className="verify-modal-header">
              <div className="verify-modal-title">📄 Tinjau Dokumen</div>
              <button
                className="verify-modal-close"
                onClick={() => { setDetailModal(null); setDetailData(null); }}
                disabled={!!verifying}
              >
                ✕
              </button>
            </div>

            <div className="verify-modal-body">
              {detailData ? (
                <>
                  <div className="verify-detail-grid">
                    <div className="verify-detail-item">
                      <div className="verify-detail-label">Jamaah</div>
                      <div className="verify-detail-val">{detailData.nama ?? "-"}</div>
                    </div>
                    <div className="verify-detail-item">
                      <div className="verify-detail-label">Jenis Dokumen</div>
                      <div className="verify-detail-val" style={{ textTransform: "capitalize" }}>
                        {DOK_ICONS[detailData.jenis ?? ""] ?? "📄"} {detailData.jenis}
                      </div>
                    </div>
                    <div className="verify-detail-item full">
                      <div className="verify-detail-label">Paket</div>
                      <div className="verify-detail-val">{detailData.paket ?? "-"}</div>
                    </div>
                  </div>

                  {detailData.file ? (
                    <div className="verify-bukti-section">
                      <div className="verify-bukti-label">File Dokumen</div>
                      {isImageFile(detailData.file) ? (
                        <img
                          src={detailData.file}
                          alt="Dokumen"
                          className="verify-bukti-img"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <div style={{ background: "#f1f5f9", borderRadius: 10, padding: "1.5rem", textAlign: "center", marginBottom: "0.75rem" }}>
                          <div style={{ fontSize: "2.5rem" }}>📄</div>
                          <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.5rem" }}>File PDF/Dokumen</div>
                        </div>
                      )}
                      <a href={detailData.file} target="_blank" rel="noreferrer" className="verify-bukti-link">
                        📎 Buka file dokumen
                      </a>
                    </div>
                  ) : (
                    <div className="verify-no-bukti">⚠️ File dokumen tidak tersedia.</div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "1.5rem", color: "#94a3b8" }}>
                  Memuat detail...
                </div>
              )}
            </div>

            <div className="verify-modal-footer">
              <button
                className="verify-btn-tolak"
                onClick={() => handleVerify(detailModal!, "ditolak")}
                disabled={!!verifying}
              >
                {verifying === detailModal + "ditolak" ? "Menolak..." : "✕ Tolak"}
              </button>
              <button
                className="verify-btn-terima"
                onClick={() => handleVerify(detailModal!, "diterima")}
                disabled={!!verifying}
              >
                {verifying === detailModal + "diterima" ? "Menerima..." : "✓ Terima Dokumen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDokumen;
