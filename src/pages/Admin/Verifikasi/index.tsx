import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import "./Verifikasi.css";

const API = "http://localhost:8080";

interface QueueItem {
  nomor_pendaftaran: string;
  nomor_invoice: string;
  nama_customer: string;
  nik_customer: string;
  total_jamaah: number;
  paket: string;
  tanggal_berangkat: string;
  total_tagihan: number;
  total_pembayaran: number;
  payment_status: string;
  document_status: string;
  tanggal_daftar: string;
  status: string;
  catatan_verifikasi_manager?: string;
  approved_by?: string;
  approved_at?: string;
  approver_nama?: string;
}

type TabType = "menunggu_verifikasi_manager" | "siap_berangkat" | "perlu_perbaikan";

interface ManagerBadges {
  menunggu_verifikasi: number;
  perlu_perbaikan: number;
  siap_berangkat: number;
}

interface DocItem {
  id: string;
  jenis: string;
  status: string;
  file: string;
  alasan_penolakan?: string;
  created_at?: string;
}

interface JamaahDetail {
  nomor_pendaftaran: string;
  nama: string;
  nik: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  jenis_kelamin: string;
  no_hp: string;
  email: string;
  alamat_lengkap: string;
  ambil_perlengkapan: boolean;
  harga_perlengkapan: number;
  document_status: string;
  dokumen_persyaratan: DocItem[];
  dokumen_perjalanan: DocItem[];
}

interface PayItem {
  ID?: string;
  id?: string;
  Jumlah?: number;
  jumlah?: number;
  Status?: string;
  status?: string;
  TanggalBayar?: string;
  tanggal_bayar?: string;
  BuktiPembayaran?: string;
  bukti_pembayaran?: string;
}

interface DetailVerifikasiData {
  pendaftaran: {
    nomor_pendaftaran: string;
    nomor_invoice: string;
    tanggal_daftar: string;
    status: string;
    document_status: string;
    payment_status: string;
    total_tagihan: number;
    total_pembayaran: number;
    total_perlengkapan: number;
    catatan_verifikasi_manager?: string;
    approved_by?: string;
    approved_at?: string;
    approver_nama?: string;
    approver?: { id?: string; nama?: string; Nama?: string; username?: string; role?: string };
  };
  paket: {
    id: string;
    nama_paket: string;
    jenis_paket: string;
    harga: number;
    tanggal_berangkat: string;
    durasi: number;
    deskripsi: string;
  };
  jamaah: JamaahDetail[];
  pembayaran: PayItem[];
}

const fmtDate = (d?: string) => {
  if (!d) return "-";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

const fmtDateTime = (d?: string) => {
  if (!d) return "-";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const fmtRupiah = (n?: number) => "Rp " + (n ?? 0).toLocaleString("id-ID");

const TRAVEL_TYPES = [
  { key: "visa", label: "Visa Saudi", icon: "🛂" },
  { key: "tiket_pesawat", label: "Tiket Pesawat", icon: "✈️" },
  { key: "nusuk", label: "Kartu Nusuk", icon: "📱" },
];

export default function VerifikasiManager() {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<TabType>("menunggu_verifikasi_manager");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [badges, setBadges] = useState<ManagerBadges>({
    menunggu_verifikasi: 0,
    perlu_perbaikan: 0,
    siap_berangkat: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedNomor, setSelectedNomor] = useState<string | null>(null);

  const fetchQueue = useCallback(async (tabToFetch: TabType = activeTab) => {
    if (!token) return;
    try {
      setLoading(true);
      const [queueRes, badgeRes] = await Promise.all([
        axios.get(`${API}/manager/verifikasi?status=${tabToFetch}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API}/manager/badges`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setQueue(queueRes.data?.data || []);
      setBadges(badgeRes.data || { menunggu_verifikasi: 0, perlu_perbaikan: 0, siap_berangkat: 0 });
    } catch {
      showToast("error", "Gagal memuat data verifikasi.");
    } finally {
      setLoading(false);
    }
  }, [token, activeTab, showToast]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearch("");
    fetchQueue(tab);
  };

  useEffect(() => {
    fetchQueue(activeTab);
  }, []);

  useEffect(() => {
    const handleRefresh = () => fetchQueue(activeTab);
    window.addEventListener("admin-badge-refresh", handleRefresh);
    return () => window.removeEventListener("admin-badge-refresh", handleRefresh);
  }, [fetchQueue, activeTab]);

  const filteredQueue = queue.filter((item) => {
    const q = search.toLowerCase();
    return (
      item.nomor_pendaftaran.toLowerCase().includes(q) ||
      (item.nomor_invoice && item.nomor_invoice.toLowerCase().includes(q)) ||
      item.nama_customer.toLowerCase().includes(q) ||
      item.paket.toLowerCase().includes(q) ||
      (item.approver_nama && item.approver_nama.toLowerCase().includes(q)) ||
      (item.catatan_verifikasi_manager && item.catatan_verifikasi_manager.toLowerCase().includes(q))
    );
  });

  return (
    <div className="verifikasi-page">
      {/* ── Top Header ── */}
      <div className="verifikasi-header">
        <div className="verifikasi-title-wrap">
          <h1>
            <span>🛡️</span> Verifikasi Pendaftaran
          </h1>
          <p>
            Pusat pengelolaan dan pemeriksaan akhir (Final Verification) berkas dan pembayaran jamaah oleh Administration Manager.
          </p>
        </div>
      </div>

      {/* ── Stats Overview (Klik untuk switch tab) ── */}
      <div className="verifikasi-stats">
        <div
          className={`verif-stat-card ${activeTab === "menunggu_verifikasi_manager" ? "active active-amber" : ""}`}
          onClick={() => handleTabChange("menunggu_verifikasi_manager")}
          title="Klik untuk membuka tab Menunggu Verifikasi"
        >
          <div className="verif-stat-icon stat-icon-amber">⏳</div>
          <div className="verif-stat-info">
            <span className="verif-stat-label">Menunggu Verifikasi</span>
            <span className="verif-stat-val">{badges.menunggu_verifikasi}</span>
            <span className="verif-stat-sub">antrean final verification</span>
          </div>
        </div>

        <div
          className={`verif-stat-card ${activeTab === "siap_berangkat" ? "active active-emerald" : ""}`}
          onClick={() => handleTabChange("siap_berangkat")}
          title="Klik untuk membuka tab Sudah Diverifikasi"
        >
          <div className="verif-stat-icon stat-icon-emerald">✅</div>
          <div className="verif-stat-info">
            <span className="verif-stat-label">Sudah Diverifikasi</span>
            <span className="verif-stat-val">{badges.siap_berangkat}</span>
            <span className="verif-stat-sub">disahkan Siap Berangkat</span>
          </div>
        </div>

        <div
          className={`verif-stat-card ${activeTab === "perlu_perbaikan" ? "active active-rose" : ""}`}
          onClick={() => handleTabChange("perlu_perbaikan")}
          title="Klik untuk membuka tab Perlu Perbaikan"
        >
          <div className="verif-stat-icon stat-icon-rose">⚠️</div>
          <div className="verif-stat-info">
            <span className="verif-stat-label">Perlu Perbaikan</span>
            <span className="verif-stat-val">{badges.perlu_perbaikan}</span>
            <span className="verif-stat-sub">dikembalikan ke Admin</span>
          </div>
        </div>
      </div>

      {/* ── Tabs Navigation Bar ── */}
      <div className="verif-tabs-bar">
        <div className="verif-tabs">
          <button
            type="button"
            className={`verif-tab ${activeTab === "menunggu_verifikasi_manager" ? "active" : ""}`}
            onClick={() => handleTabChange("menunggu_verifikasi_manager")}
          >
            <span>⏳</span> Menunggu Verifikasi
            <span className="verif-tab-badge badge-amber">{badges.menunggu_verifikasi}</span>
          </button>
          <button
            type="button"
            className={`verif-tab ${activeTab === "siap_berangkat" ? "active" : ""}`}
            onClick={() => handleTabChange("siap_berangkat")}
          >
            <span>✅</span> Sudah Diverifikasi
            <span className="verif-tab-badge badge-emerald">{badges.siap_berangkat}</span>
          </button>
          <button
            type="button"
            className={`verif-tab ${activeTab === "perlu_perbaikan" ? "active" : ""}`}
            onClick={() => handleTabChange("perlu_perbaikan")}
          >
            <span>⚠️</span> Perlu Perbaikan
            <span className="verif-tab-badge badge-rose">{badges.perlu_perbaikan}</span>
          </button>
        </div>
      </div>

      {/* ── Queue Table Card ── */}
      <div className="verifikasi-card">
        <div className="verifikasi-card-header">
          <div className="verifikasi-card-title">
            {activeTab === "menunggu_verifikasi_manager" && (
              <>
                <span>⏳</span> Antrean Menunggu Verifikasi ({filteredQueue.length})
              </>
            )}
            {activeTab === "siap_berangkat" && (
              <>
                <span>✅</span> Pendaftaran Sudah Diverifikasi ({filteredQueue.length})
              </>
            )}
            {activeTab === "perlu_perbaikan" && (
              <>
                <span>⚠️</span> Pendaftaran Perlu Perbaikan ({filteredQueue.length})
              </>
            )}
          </div>
          <div className="verifikasi-search-wrap">
            <span className="verifikasi-search-icon">🔍</span>
            <input
              type="text"
              className="verifikasi-search-input"
              placeholder="Cari nomor, invoice, nama..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>
            <div className="mini-spin-dark" style={{ margin: "0 auto 0.75rem" }} />
            Memuat data verifikasi...
          </div>
        ) : filteredQueue.length === 0 ? (
          <div className="verifikasi-empty">
            {activeTab === "menunggu_verifikasi_manager" && (
              <>
                <div className="verifikasi-empty-icon">🎉</div>
                <h3>Semua Pendaftaran Telah Diverifikasi</h3>
                <p>
                  Tidak ada pendaftaran yang sedang menunggu verifikasi Administration Manager saat ini.
                </p>
              </>
            )}
            {activeTab === "siap_berangkat" && (
              <>
                <div className="verifikasi-empty-icon">📂</div>
                <h3>Belum Ada Pendaftaran Yang Diverifikasi</h3>
                <p>
                  Pendaftaran yang telah Anda setujui dan sahkan akan muncul dan tercatat di sini.
                </p>
              </>
            )}
            {activeTab === "perlu_perbaikan" && (
              <>
                <div className="verifikasi-empty-icon">✨</div>
                <h3>Tidak Ada Pendaftaran Dalam Perbaikan</h3>
                <p>
                  Semua berkas berjalan lancar. Belum ada pendaftaran yang dikembalikan ke Admin untuk perbaikan.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="verifikasi-table-wrap">
            <table className="verifikasi-table">
              <thead>
                {activeTab === "menunggu_verifikasi_manager" && (
                  <tr>
                    <th>No. Pendaftaran &amp; Invoice</th>
                    <th>Nama / Jamaah</th>
                    <th>Paket &amp; Jadwal</th>
                    <th>Tagihan &amp; Pembayaran</th>
                    <th>Dokumen</th>
                    <th>Pembayaran</th>
                    <th>Tanggal Masuk</th>
                    <th style={{ textAlign: "center" }}>Aksi</th>
                  </tr>
                )}
                {activeTab === "siap_berangkat" && (
                  <tr>
                    <th>No. Pendaftaran &amp; Invoice</th>
                    <th>Nama / Jamaah</th>
                    <th>Paket &amp; Jadwal</th>
                    <th>Tagihan &amp; Pembayaran</th>
                    <th>Status Akhir</th>
                    <th>Disahkan Oleh &amp; Waktu Verifikasi</th>
                    <th style={{ textAlign: "center" }}>Aksi</th>
                  </tr>
                )}
                {activeTab === "perlu_perbaikan" && (
                  <tr>
                    <th>No. Pendaftaran &amp; Invoice</th>
                    <th>Nama / Jamaah</th>
                    <th>Paket &amp; Jadwal</th>
                    <th>Tagihan &amp; Pembayaran</th>
                    <th>Catatan Perbaikan Manager</th>
                    <th>Tanggal Masuk</th>
                    <th style={{ textAlign: "center" }}>Aksi</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {filteredQueue.map((item) => (
                  <tr key={item.nomor_pendaftaran}>
                    <td>
                      <div className="verifikasi-nomor-cell">
                        <span className="verifikasi-nomor-val">{item.nomor_pendaftaran}</span>
                        {item.nomor_invoice && (
                          <span className="verifikasi-invoice-val">{item.nomor_invoice}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="verifikasi-customer-cell">
                        <span className="verifikasi-customer-name">{item.nama_customer}</span>
                        {item.total_jamaah > 1 && (
                          <span className="verifikasi-customer-badge">
                            👥 {item.total_jamaah} Jamaah (Grup)
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600 }}>{item.paket}</div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                          🛫 {fmtDate(item.tanggal_berangkat)}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>
                          {fmtRupiah(item.total_pembayaran)}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                          dari {fmtRupiah(item.total_tagihan)}
                        </div>
                      </div>
                    </td>

                    {/* Kolom conditional sesuai Tab */}
                    {activeTab === "menunggu_verifikasi_manager" && (
                      <>
                        <td>
                          <span className="status-pill status-selesai">
                            ✓ {item.document_status === "lengkap" ? "Lengkap" : item.document_status}
                          </span>
                        </td>
                        <td>
                          <span className="status-pill status-lunas">
                            ✓ {item.payment_status === "lunas" ? "Lunas" : item.payment_status}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
                            {fmtDate(item.tanggal_daftar)}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className="verifikasi-btn-periksa"
                            onClick={() => setSelectedNomor(item.nomor_pendaftaran)}
                          >
                            🔍 Periksa
                          </button>
                        </td>
                      </>
                    )}

                    {activeTab === "siap_berangkat" && (
                      <>
                        <td>
                          <span className="status-pill status-selesai">
                            ✓ Siap Berangkat
                          </span>
                        </td>
                        <td>
                          <div className="verif-approver-cell">
                            <span className="verif-approver-name">
                              🛡️ {item.approver_nama || "Administration Manager"}
                            </span>
                            <span className="verif-approver-time">
                              {fmtDateTime(item.approved_at)}
                            </span>
                          </div>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className="verifikasi-btn-lihat"
                            onClick={() => setSelectedNomor(item.nomor_pendaftaran)}
                          >
                            👁️ Lihat
                          </button>
                        </td>
                      </>
                    )}

                    {activeTab === "perlu_perbaikan" && (
                      <>
                        <td>
                          <div className="verif-catatan-cell" title={item.catatan_verifikasi_manager}>
                            ⚠️ {item.catatan_verifikasi_manager || "Perlu perbaikan berkas"}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
                            {fmtDate(item.tanggal_daftar)}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className="verifikasi-btn-lihat"
                            onClick={() => setSelectedNomor(item.nomor_pendaftaran)}
                          >
                            👁️ Lihat
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Detail Modal ── */}
      {selectedNomor && (
        <DetailVerifikasiModal
          nomor={selectedNomor}
          token={token!}
          onClose={() => setSelectedNomor(null)}
          onSuccess={() => {
            setSelectedNomor(null);
            fetchQueue(activeTab);
            window.dispatchEvent(new Event("admin-badge-refresh"));
          }}
        />
      )}
    </div>
  );
}

// ── Detail Verifikasi Modal ──────────────────────────────────────────────────

function DetailVerifikasiModal({
  nomor,
  token,
  onClose,
  onSuccess,
}: {
  nomor: string;
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { showToast } = useToast();
  const [data, setData] = useState<DetailVerifikasiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Travel docs management state
  const [uploadingTravel, setUploadingTravel] = useState(false);
  const [selectedTravelType, setSelectedTravelType] = useState("visa");
  const [travelFile, setTravelFile] = useState<File | null>(null);

  // Perbaikan modal state
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [catatan, setCatatan] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);
  const [approving, setApproving] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/manager/verifikasi/${nomor}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data);
    } catch {
      showToast("error", "Gagal memuat detail verifikasi.");
      onClose();
    } finally {
      setLoading(false);
    }
  }, [nomor, token, showToast, onClose]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleApprove = async () => {
    if (!window.confirm("Apakah Anda yakin ingin menyetujui dan mengesahkan pendaftaran ini menjadi SIAP BERANGKAT?")) {
      return;
    }
    setApproving(true);
    try {
      const res = await axios.post(
        `${API}/manager/verifikasi/${nomor}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast("success", res.data?.message || "✓ Pendaftaran berhasil disetujui & disahkan!");
      onSuccess();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.error ?? "Gagal menyetujui pendaftaran.")
        : "Gagal menyetujui pendaftaran.";
      showToast("error", msg);
    } finally {
      setApproving(false);
    }
  };

  const handleSubmitPerbaikan = async () => {
    if (!catatan.trim()) {
      showToast("error", "Catatan perbaikan wajib diisi.");
      return;
    }
    setSubmittingNote(true);
    try {
      const res = await axios.post(
        `${API}/manager/verifikasi/${nomor}/perbaikan`,
        { catatan: catatan.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast("success", res.data?.message || "✓ Permintaan perbaikan berhasil dikirim ke Admin.");
      setShowNoteModal(false);
      onSuccess();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.error ?? "Gagal meminta perbaikan.")
        : "Gagal meminta perbaikan.";
      showToast("error", msg);
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleUploadTravelDoc = async (targetNomor: string) => {
    if (!travelFile) {
      showToast("error", "Pilih file dokumen perjalanan terlebih dahulu.");
      return;
    }
    setUploadingTravel(true);
    try {
      const fd = new FormData();
      fd.append("jenis", selectedTravelType);
      fd.append("file", travelFile);

      await axios.post(`${API}/manager/pendaftaran/${targetNomor}/dokumen-perjalanan`, fd, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      showToast("success", "✓ Dokumen perjalanan berhasil diupload.");
      setTravelFile(null);
      fetchDetail();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.error ?? "Gagal upload dokumen perjalanan.")
        : "Gagal upload dokumen perjalanan.";
      showToast("error", msg);
    } finally {
      setUploadingTravel(false);
    }
  };

  const handleDeleteTravelDoc = async (docId: string) => {
    if (!window.confirm("Hapus dokumen perjalanan ini?")) return;
    try {
      await axios.delete(`${API}/manager/dokumen-perjalanan/${docId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast("success", "Dokumen perjalanan berhasil dihapus.");
      fetchDetail();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.error ?? "Gagal menghapus dokumen.")
        : "Gagal menghapus dokumen.";
      showToast("error", msg);
    }
  };

  const handleOpenInvoice = async () => {
    if (!data?.pendaftaran.nomor_invoice) return;
    try {
      const res = await fetch(`${API}/admin/invoice?nomor=${data.pendaftaran.nomor_invoice}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        showToast("error", "Gagal membuka invoice.");
        return;
      }
      const html = await res.text();
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      showToast("error", "Gagal membuka invoice.");
    }
  };

  if (loading || !data) {
    return (
      <div className="verif-modal-overlay">
        <div className="verif-modal-panel" style={{ padding: "3rem", textAlign: "center" }}>
          <div className="mini-spin-dark" style={{ margin: "0 auto 1rem" }} />
          Memuat data verifikasi...
        </div>
      </div>
    );
  }

  const { pendaftaran, paket, jamaah, pembayaran } = data;

  return (
    <div className="verif-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="verif-modal-panel">
        {/* Header */}
        <div className="verif-modal-header">
          <div>
            <div className="verif-modal-title">
              {pendaftaran.status === "siap_berangkat" ? (
                <>
                  <span>🛡️</span> Detail Pendaftaran Terverifikasi — Siap Berangkat
                </>
              ) : pendaftaran.status === "perlu_perbaikan" ? (
                <>
                  <span>⚠️</span> Detail Pendaftaran — Perlu Perbaikan
                </>
              ) : (
                <>
                  <span>🛡️</span> Pemeriksaan Pendaftaran — Administration Manager
                </>
              )}
            </div>
            <div className="verif-modal-sub">
              {pendaftaran.nomor_pendaftaran} {pendaftaran.nomor_invoice ? `• ${pendaftaran.nomor_invoice}` : ""}
            </div>
          </div>
          <button type="button" className="verif-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="verif-modal-body">
          {/* Stamp Banner jika Siap Berangkat */}
          {pendaftaran.status === "siap_berangkat" && (
            <div className="verif-stamp-banner">
              <div className="verif-stamp-left">
                <div className="verif-stamp-icon">✓</div>
                <div>
                  <div className="verif-stamp-title">
                    Pendaftaran Telah Disahkan Menjadi Siap Berangkat
                  </div>
                  <div className="verif-stamp-desc">
                    Disahkan oleh{" "}
                    <strong>
                      {pendaftaran.approver?.nama || pendaftaran.approver?.Nama || pendaftaran.approver_nama || "Administration Manager"}
                    </strong>{" "}
                    pada {fmtDateTime(pendaftaran.approved_at)}. Seluruh persyaratan berkas jamaah dan pelunasan invoice telah tervalidasi final.
                  </div>
                </div>
              </div>
              <span className="verif-readonly-pill">🔒 Mode Read-Only</span>
            </div>
          )}

          {/* Banner jika Perlu Perbaikan */}
          {pendaftaran.status === "perlu_perbaikan" && (
            <div className="verif-perbaikan-banner">
              <div className="verif-perbaikan-icon">⚠️</div>
              <div className="verif-perbaikan-content">
                <div className="verif-perbaikan-title">
                  Pendaftaran Memerlukan Perbaikan Dari Tim Admin
                </div>
                <div className="verif-perbaikan-desc">
                  Pendaftaran ini telah dikembalikan ke antrean Admin dengan catatan perbaikan berikut:
                </div>
                <div className="verif-perbaikan-text">
                  {pendaftaran.catatan_verifikasi_manager || "(Tidak ada rincian catatan)"}
                </div>
              </div>
            </div>
          )}

          {/* 1. Ringkasan Status & Paket */}
          <div className="verif-section">
            <div className="verif-section-title">
              <span>📋 Ringkasan Pendaftaran &amp; Tagihan</span>
              {pendaftaran.status === "siap_berangkat" ? (
                <span className="status-pill status-selesai">✓ Siap Berangkat</span>
              ) : pendaftaran.status === "perlu_perbaikan" ? (
                <span className="status-pill status-batal">⚠️ Perlu Perbaikan</span>
              ) : (
                <span className="status-pill status-menunggu">Menunggu Verifikasi Manager</span>
              )}
            </div>
            <div className="verif-grid-3">
              <div className="verif-info-item">
                <span className="verif-info-label">Paket Umroh</span>
                <span className="verif-info-val">{paket.nama_paket} ({paket.jenis_paket})</span>
              </div>
              <div className="verif-info-item">
                <span className="verif-info-label">Tanggal Keberangkatan</span>
                <span className="verif-info-val">{fmtDate(paket.tanggal_berangkat)}</span>
              </div>
              <div className="verif-info-item">
                <span className="verif-info-label">Total Jamaah</span>
                <span className="verif-info-val">{jamaah.length} Orang</span>
              </div>
              <div className="verif-info-item">
                <span className="verif-info-label">Total Tagihan</span>
                <span className="verif-info-val">{fmtRupiah(pendaftaran.total_tagihan)}</span>
              </div>
              <div className="verif-info-item">
                <span className="verif-info-label">Total Dibayar</span>
                <span className="verif-info-val" style={{ color: "#059669" }}>
                  {fmtRupiah(pendaftaran.total_pembayaran)}
                </span>
              </div>
              <div className="verif-info-item">
                <span className="verif-info-label">Status Pembayaran</span>
                <span className="verif-info-val" style={{ color: "#059669" }}>✓ Lunas</span>
              </div>
            </div>
          </div>

          {/* 2. Data Jamaah & Dokumen Persyaratan (Read-only for Manager) */}
          <div className="verif-section">
            <div className="verif-section-title">
              <span>👥 Data Jamaah &amp; Dokumen Persyaratan ({(jamaah || []).length})</span>
              <span style={{ fontSize: "0.74rem", color: "#64748b", fontWeight: 500 }}>
                *Dokumen persyaratan diperiksa tanpa mengubah status satuan
              </span>
            </div>

            {(jamaah || []).map((j, idx) => (
              <div key={j.nomor_pendaftaran} className="verif-jamaah-card">
                <div className="verif-jamaah-header">
                  <div>
                    <span style={{ color: "#1a6b43", fontWeight: 700, marginRight: 6 }}>
                      #{idx + 1}
                    </span>
                    <span className="verif-jamaah-name">{j.nama}</span>
                    <span style={{ fontSize: "0.78rem", color: "#64748b", marginLeft: 8 }}>
                      ({j.nomor_pendaftaran})
                    </span>
                  </div>
                  <span className="status-pill status-selesai">
                    ✓ Dokumen {j.document_status === "lengkap" ? "Lengkap" : j.document_status}
                  </span>
                </div>

                <div className="verif-grid-3">
                  <div className="verif-info-item">
                    <span className="verif-info-label">NIK</span>
                    <span className="verif-info-val" style={{ fontFamily: "monospace" }}>{j.nik}</span>
                  </div>
                  <div className="verif-info-item">
                    <span className="verif-info-label">Tempat / Tanggal Lahir</span>
                    <span className="verif-info-val">{j.tempat_lahir}, {fmtDate(j.tanggal_lahir)}</span>
                  </div>
                  <div className="verif-info-item">
                    <span className="verif-info-label">Jenis Kelamin / No HP</span>
                    <span className="verif-info-val">{j.jenis_kelamin || "-"} • {j.no_hp || "-"}</span>
                  </div>
                </div>

                {/* Dokumen Persyaratan Jamaah */}
                <div style={{ marginTop: "0.85rem" }}>
                  <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                    Dokumen Persyaratan:
                  </div>
                  <div className="verif-docs-grid">
                    {(j.dokumen_persyaratan || []).length === 0 ? (
                      <div style={{ fontSize: "0.78rem", color: "#94a3b8", fontStyle: "italic", padding: "0.4rem 0" }}>
                        Belum ada dokumen persyaratan yang diunggah
                      </div>
                    ) : (
                      (j.dokumen_persyaratan || []).map((d) => (
                        <div key={d.id} className="verif-doc-item">
                          <div className="verif-doc-info">
                            <span className="verif-doc-name" style={{ textTransform: "capitalize" }}>
                              {d.jenis.replace(/_/g, " ")}
                            </span>
                            <span className="verif-doc-status" style={{ color: "#059669", fontWeight: 600 }}>
                              ✓ {d.status}
                            </span>
                          </div>
                          {d.file && (
                            <button
                              type="button"
                              className="verif-doc-btn-preview"
                              onClick={() => setPreviewUrl(d.file)}
                            >
                              👁️ Lihat
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Dokumen Perjalanan (Manager Only Upload & View) */}
                <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px dashed #e2e8f0" }}>
                  <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "#1e40af", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 4 }}>
                    <span>✈️</span> Dokumen Perjalanan (Visa, Tiket, Nusuk) — Dikelola Manager:
                  </div>

                  <div className="verif-travel-grid">
                    {TRAVEL_TYPES.map((t) => {
                      const doc = (j.dokumen_perjalanan || []).find((td) => td.jenis.toLowerCase() === t.key);
                      return (
                        <div key={t.key} className={`verif-travel-item ${doc ? "" : "empty"}`}>
                          <div className="verif-travel-item-top">
                            <span className="verif-travel-label">
                              <span>{t.icon}</span> {t.label}
                            </span>
                            {doc ? (
                              <div className="verif-travel-actions">
                                <button
                                  type="button"
                                  className="verif-doc-btn-preview"
                                  onClick={() => setPreviewUrl(doc.file)}
                                >
                                  👁️ Buka
                                </button>
                                <button
                                  type="button"
                                  style={{
                                    background: "#fee2e2",
                                    color: "#dc2626",
                                    border: "1px solid #fecaca",
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    padding: "3px 7px",
                                    borderRadius: 6,
                                    cursor: "pointer",
                                  }}
                                  onClick={() => handleDeleteTravelDoc(doc.id)}
                                >
                                  🗑️
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Belum diunggah</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Form Upload Travel Doc untuk Jamaah Ini */}
                  <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap", background: "#f0fdf4", padding: "0.6rem 0.85rem", borderRadius: 8 }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#166534" }}>
                      + Unggah Dokumen Perjalanan:
                    </span>
                    <select
                      style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #86efac", fontSize: "0.78rem" }}
                      value={selectedTravelType}
                      onChange={(e) => setSelectedTravelType(e.target.value)}
                    >
                      {TRAVEL_TYPES.map((t) => (
                        <option key={t.key} value={t.key}>{t.label}</option>
                      ))}
                    </select>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      style={{ fontSize: "0.75rem" }}
                      onChange={(e) => setTravelFile(e.target.files?.[0] ?? null)}
                    />
                    <button
                      type="button"
                      disabled={uploadingTravel || !travelFile}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 6,
                        border: "none",
                        background: "#166534",
                        color: "#ffffff",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        cursor: travelFile ? "pointer" : "not-allowed",
                        opacity: travelFile ? 1 : 0.6,
                      }}
                      onClick={() => handleUploadTravelDoc(j.nomor_pendaftaran)}
                    >
                      {uploadingTravel ? "Mengunggah..." : "Upload"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 3. Riwayat Pembayaran (Read-only for Manager) */}
          <div className="verif-section">
            <div className="verif-section-title">
              <span>💳 Riwayat Pembayaran ({(pembayaran || []).length})</span>
              <span className="status-pill status-lunas">Invoice Lunas</span>
            </div>
            {(pembayaran || []).length === 0 ? (
              <div style={{ fontSize: "0.82rem", color: "#64748b" }}>Tidak ada riwayat pembayaran.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {(pembayaran || []).map((p, idx) => {
                  const bayarJumlah = p.Jumlah ?? p.jumlah ?? 0;
                  const bayarTanggal = p.TanggalBayar ?? p.tanggal_bayar ?? "";
                  const bayarStatus = p.Status ?? p.status ?? "";
                  const bayarBukti = p.BuktiPembayaran ?? p.bukti_pembayaran ?? "";

                  return (
                    <div
                      key={p.ID ?? p.id ?? idx}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: 8,
                        padding: "0.75rem 1rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.88rem" }}>
                          {fmtRupiah(bayarJumlah)}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                          📅 {fmtDate(bayarTanggal)} • Status: <strong style={{ color: "#059669" }}>{bayarStatus}</strong>
                        </div>
                      </div>
                      {bayarBukti && (
                        <button
                          type="button"
                          className="verif-doc-btn-preview"
                          onClick={() => setPreviewUrl(bayarBukti)}
                        >
                          👁️ Bukti Transfer
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer / Actions */}
        <div className="verif-modal-footer">
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <button type="button" className="portal-btn-outline" onClick={onClose} style={{ padding: "0.55rem 1rem" }}>
              Tutup
            </button>
            {pendaftaran.nomor_invoice && (
              <button type="button" className="verif-btn-invoice" onClick={handleOpenInvoice}>
                🧾 Lihat Invoice
              </button>
            )}
          </div>

          <div className="verif-action-group">
            {pendaftaran.status === "menunggu_verifikasi_manager" && (
              <>
                <button
                  type="button"
                  className="verif-btn-perbaikan"
                  onClick={() => {
                    setCatatan("");
                    setShowNoteModal(true);
                  }}
                  disabled={approving}
                >
                  ⚠️ Minta Perbaikan
                </button>
                <button
                  type="button"
                  className="verif-btn-approve"
                  onClick={handleApprove}
                  disabled={approving}
                >
                  {approving ? "Memproses..." : "🛡️ Setujui & Sahkan"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Sub-modal: Minta Perbaikan ── */}
      {showNoteModal && (
        <div
          className="verif-modal-overlay"
          style={{ zIndex: 1100 }}
          onClick={(e) => e.target === e.currentTarget && setShowNoteModal(false)}
        >
          <div className="verif-note-modal">
            <div className="verif-note-title">
              <span>⚠️</span> Minta Perbaikan Pendaftaran
            </div>
            <div className="verif-note-desc">
              Pendaftaran akan dikembalikan ke antrean Admin dengan status <strong>Perlu Perbaikan</strong>.
              Tuliskan instruksi perbaikan yang jelas:
            </div>
            <textarea
              className="verif-note-textarea"
              placeholder="Contoh: Mohon periksa kembali masa berlaku paspor jamaah nomor UMR-... karena kurang dari 6 bulan."
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              disabled={submittingNote}
              autoFocus
            />
            <div className="verif-note-actions">
              <button
                type="button"
                className="portal-btn-outline"
                onClick={() => setShowNoteModal(false)}
                disabled={submittingNote}
              >
                Batal
              </button>
              <button
                type="button"
                className="verif-btn-perbaikan"
                onClick={handleSubmitPerbaikan}
                disabled={submittingNote || !catatan.trim()}
              >
                {submittingNote ? "Mengirim..." : "Kirim Permintaan Perbaikan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── File Preview Modal ── */}
      {previewUrl && (
        <div
          className="verif-modal-overlay"
          style={{ zIndex: 1200 }}
          onClick={() => setPreviewUrl(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 16,
              maxWidth: "85vw",
              maxHeight: "85vh",
              padding: "1rem",
              position: "relative",
              overflow: "auto",
              textAlign: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                background: "#0f172a",
                color: "#ffffff",
                border: "none",
                borderRadius: "50%",
                width: 30,
                height: 30,
                cursor: "pointer",
              }}
              onClick={() => setPreviewUrl(null)}
            >
              ✕
            </button>
            {previewUrl.toLowerCase().endsWith(".pdf") ? (
              <iframe
                src={previewUrl}
                title="Preview PDF"
                style={{ width: "80vw", height: "80vh", border: "none" }}
              />
            ) : (
              <img
                src={previewUrl}
                alt="Preview Dokumen"
                style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain", borderRadius: 8 }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
