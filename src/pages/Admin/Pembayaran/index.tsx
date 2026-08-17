import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useAuth } from "../../../context/AuthContext";
import "./AdminPembayaran.css";

interface PembayaranItem {
  id: string;
  nomor_pendaftaran: string;
  nama_customer: string;
  jumlah: number;
  status: string;
  tanggal_pembayaran: string;
}

interface DetailDataType {
  bukti?: string;
  jumlah?: number;
  paket?: string;
  nomorInvoice?: string;
  jamaah: { nama: string; nik: string }[];
}

const fmtRupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const AdminPembayaran = () => {
  const { token } = useAuth();
  const [list, setList] = useState<PembayaranItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [detailModal, setDetailModal] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<DetailDataType | null>(null);

  const authH = useCallback(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:8080/admin/pembayaran/pending", {
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
    setDetailData(null);
    try {
      const res = await axios.get(`http://localhost:8080/admin/pembayaran/${id}`, {
        headers: authH(),
      });
      const p = res.data?.pembayaran;

      // Ambil daftar jamaah dari Invoice.Pendaftaran[]
      const pendaftaranArr: Record<string, unknown>[] = p?.Invoice?.Pendaftaran ?? [];
      const jamaahList = pendaftaranArr.map((pd) => ({
        nama: String((pd.Nama as string) ?? "-"),
        nik:  String((pd.NIK  as string) ?? "-"),
      }));

      // Nama paket dari Pendaftaran pertama
      const paket =
        (p?.Invoice?.NamaPaket as string) ||
        "-";

      setDetailData({
        bukti:        p?.BuktiPembayaran ?? p?.bukti_pembayaran,
        jumlah:       p?.Jumlah ?? p?.jumlah,
        paket,
        nomorInvoice: p?.Invoice?.NomorInvoice ?? "-",
        jamaah:       jamaahList,
      });
    } catch {
      setDetailData({ jamaah: [] });
    }
  };

  const handleVerify = async (id: string, status: "diterima" | "ditolak") => {
    setError("");
    setSuccess("");
    try {
      setVerifying(id + status);
      await axios.put(`http://localhost:8080/admin/pembayaran/${id}/verifikasi`, { status }, {
        headers: authH(),
      });
      setSuccess(`Pembayaran berhasil di${status === "diterima" ? "terima" : "tolak"}.`);
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

  return (
    <div className="admin-verify-page">
      <div className="page-header">
        <div className="page-header-left">
          <h2>Verifikasi Pembayaran</h2>
          <p>Tinjau dan verifikasi bukti pembayaran dari jamaah.</p>
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

      {success && (
        <div className="alert-success">✓ {success}</div>
      )}
      {error && (
        <div className="alert-error">✕ {error}</div>
      )}

      {/* Stats */}
      {!loading && (
        <div className="verify-stats">
          <div className="verify-stat-card">
            <div className="verify-stat-icon">⏳</div>
            <div>
              <div className="verify-stat-val">{list.length}</div>
              <div className="verify-stat-label">Menunggu Verifikasi</div>
            </div>
          </div>
          <div className="verify-stat-card">
            <div className="verify-stat-icon">💰</div>
            <div>
              <div className="verify-stat-val">
                {fmtRupiah(list.reduce((s, p) => s + (p.jumlah ?? 0), 0))}
              </div>
              <div className="verify-stat-label">Total Pending</div>
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
              <th>Jumlah</th>
              <th>Tanggal</th>
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
                    <p>Tidak ada pembayaran yang perlu diverifikasi.</p>
                  </div>
                </td>
              </tr>
            ) : (
              list.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="customer-cell">
                      <div className="customer-av">
                        {p.nama_customer?.charAt(0)?.toUpperCase() ?? "?"}
                      </div>
                      <span className="customer-nm">{p.nama_customer}</span>
                    </div>
                  </td>
                  <td>
                    <span className="nomor-pill">{p.nomor_pendaftaran}</span>
                  </td>
                  <td>
                    <span className="jumlah-text">{fmtRupiah(p.jumlah)}</span>
                  </td>
                  <td>
                    <span className="date-text">{fmtDate(p.tanggal_pembayaran)}</span>
                  </td>
                  <td>
                    <button className="detail-open-btn" onClick={() => fetchDetail(p.id)}>
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

      {/* Detail / Verifikasi Modal */}
      {detailModal && (
        <div
          className="verify-modal-overlay"
          onClick={(e) => e.target === e.currentTarget && !verifying && setDetailModal(null)}
        >
          <div className="verify-modal">
            <div className="verify-modal-header">
              <div className="verify-modal-title">🔍 Tinjau Pembayaran</div>
              <button
                className="verify-modal-close"
                onClick={() => { setDetailModal(null); setDetailData(null); }}
                disabled={!!verifying}
              >
                ✕
              </button>
            </div>

            <div className="verify-modal-body">
              {!detailData ? (
                <div style={{ textAlign: "center", padding: "1.5rem", color: "#94a3b8" }}>
                  Memuat detail...
                </div>
              ) : (
                <>
                  {/* Invoice & Paket */}
                  <div className="verify-detail-grid">
                    <div className="verify-detail-item">
                      <div className="verify-detail-label">Invoice</div>
                      <div className="verify-detail-val" style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                        {detailData.nomorInvoice ?? "-"}
                      </div>
                    </div>
                    <div className="verify-detail-item">
                      <div className="verify-detail-label">Paket</div>
                      <div className="verify-detail-val">{detailData.paket ?? "-"}</div>
                    </div>
                    <div className="verify-detail-item">
                      <div className="verify-detail-label">Jumlah Jamaah</div>
                      <div className="verify-detail-val">
                        <span style={{
                          background: "#ede9fe", color: "#6d28d9",
                          padding: "2px 10px", borderRadius: 999,
                          fontSize: "0.85rem", fontWeight: 700,
                        }}>
                          👥 {detailData.jamaah.length} Orang
                        </span>
                      </div>
                    </div>
                    <div className="verify-detail-item full">
                      <div className="verify-detail-label">Jumlah Pembayaran</div>
                      <div className="verify-detail-val" style={{ fontSize: "1.25rem", fontWeight: 800, color: "#4f46e5" }}>
                        {fmtRupiah(detailData.jumlah ?? 0)}
                      </div>
                    </div>
                  </div>

                  {/* Daftar Jamaah */}
                  <div style={{ marginBottom: "1rem" }}>
                    <div className="verify-detail-label" style={{ marginBottom: "0.5rem" }}>Daftar Jamaah</div>
                    {detailData.jamaah.length === 0 ? (
                      <div style={{ fontSize: "0.85rem", color: "#94a3b8", padding: "0.5rem 0" }}>
                        Tidak ada data jamaah
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        {detailData.jamaah.map((j, idx) => (
                          <div key={idx} style={{
                            display: "flex", alignItems: "center", gap: "0.75rem",
                            background: "#f8fafc", borderRadius: 10,
                            padding: "0.5rem 0.875rem",
                            border: "1px solid #e8edf5",
                          }}>
                            <span style={{
                              background: "#ede9fe", color: "#6d28d9",
                              width: 22, height: 22, borderRadius: "50%",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: "0.7rem", fontWeight: 700, flexShrink: 0,
                            }}>
                              {idx + 1}
                            </span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#1e293b" }}>
                                {j.nama}
                              </div>
                              {j.nik && j.nik !== "-" && (
                                <div style={{ fontSize: "0.75rem", color: "#64748b", fontFamily: "monospace" }}>
                                  NIK: {j.nik}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bukti Pembayaran */}
                  {detailData.bukti ? (
                    <div className="verify-bukti-section">
                      <div className="verify-bukti-label">Bukti Pembayaran</div>
                      <a href={detailData.bukti} target="_blank" rel="noreferrer">
                        <img
                          src={detailData.bukti}
                          alt="Bukti pembayaran"
                          className="verify-bukti-img"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      </a>
                      <a href={detailData.bukti} target="_blank" rel="noreferrer" className="verify-bukti-link">
                        📎 Buka file bukti
                      </a>
                    </div>
                  ) : (
                    <div className="verify-no-bukti">
                      ⚠️ Bukti pembayaran belum diupload oleh jamaah.
                    </div>
                  )}
                </>
              )}
            </div>

            {detailData?.bukti && (
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
                  {verifying === detailModal + "diterima" ? "Menerima..." : "✓ Terima Pembayaran"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPembayaran;
