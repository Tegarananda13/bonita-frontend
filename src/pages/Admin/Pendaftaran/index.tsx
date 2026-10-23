import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LuEye, LuPlus, LuRefreshCw, LuX, LuCheck, LuChevronDown } from "react-icons/lu";
import axios from "axios";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { AdminPagination } from "../../../components/Pagination";
import "./AdminPendaftaran.css";

// ── Types ────────────────────────────────────────────────────────────────────

interface PendaftaranItem {
  nomor_pendaftaran: string;
  nomor_invoice?: string;
  nama_customer: string;
  paket: string;
  payment_status: string;
  document_status: string;
  status: string;
  tanggal_daftar: string;
  total_tagihan?: number;
  total_pembayaran?: number;
  registered_by_label?: string;
  registration_source?: string;
  assigned?: boolean;
  catatan_verifikasi_manager?: string;
  user_id?: string | null;
  admin_id?: string | null;
  admin_pic?: string | null;
  alasan_pembatalan?: string;
  dibatalkan_pada?: string;
  dibatalkan_oleh?: string;
  dibatalkan_oleh_nama?: string;
}

interface DetailPendaftaran {
  nomor_pendaftaran: string;
  nama_customer: string;
  nik: string;
  no_hp: string;
  email: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  jenis_kelamin: string;
  alamat_lengkap?: string;
  provinsi?: string;
  kabupaten_kota?: string;
  kecamatan?: string;
  kelurahan_desa?: string;
  kode_pos?: string;
  paket: string;
  harga: number;
  total_tagihan: number;
  total_pembayaran: number;
  total_perlengkapan: number;
  ambil_perlengkapan: boolean;
  harga_perlengkapan: number;
  nomor_invoice: string;
  tanggal_berangkat: string;
  payment_status: string;
  document_status: string;
  status: string;
  catatan_verifikasi_manager?: string;
  approved_by?: string;
  approved_at?: string;
  approver_nama?: string;
  approver?: { id?: string; nama?: string; Nama?: string; username?: string; role?: string };
  alasan_pembatalan?: string;
  dibatalkan_pada?: string;
  dibatalkan_oleh?: string;
  dibatalkan_oleh_nama?: string;
  admin_pic?: string;
  user_id?: string | null;
  admin_id?: string | null;
  registration_source?: string;
  registered_by?: string;
  registered_by_label?: string;
  grup_count: number; // jumlah jamaah dalam invoice yang sama (1 = individu)
  grup_jamaah?: {
    nomor_pendaftaran: string;
    nama: string;
    nik: string;
    status?: string;
    alasan_pembatalan?: string;
    ambil_perlengkapan: boolean;
    harga_perlengkapan: number;
    no_hp?: string;
    email?: string;
    tempat_lahir?: string;
    tanggal_lahir?: string;
    jenis_kelamin?: string;
    alamat_lengkap?: string;
    provinsi?: string;
    kabupaten_kota?: string;
    kecamatan?: string;
    kelurahan_desa?: string;
    kode_pos?: string;
  }[];
  info_perlengkapan?: {
    harga: number;
    nama: string;
    items: string[];
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d: string) => {
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
  }) + " WIB";
};

const fmtRupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");

const TRAVEL_DOC_TYPES = [
  { key: "visa", label: "Visa", icon: "🛂", desc: "Visa Resmi Kerajaan Arab Saudi" },
  { key: "tiket_pesawat", label: "Tiket Pesawat", icon: "✈️", desc: "E-Ticket Penerbangan PP" },
  { key: "nusuk", label: "Kartu Nusuk", icon: "📱", desc: "Kartu / Izin Masuk Nusuk" },
];

const TRAVEL_DOC_CONFIGS = TRAVEL_DOC_TYPES;

const isTravelDoc = (jenis: string) => ["visa", "tiket_pesawat", "nusuk"].includes(jenis?.toLowerCase());

// ── Shared Modal Styles & Form Helpers ──
export const fmtPayInput = (raw: string) => {
  const digits = raw.replace(/[^\d]/g, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export const inlineModal: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  background: "rgba(15, 23, 42, 0.65)",
  backdropFilter: "blur(8px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1rem",
  animation: "fadeIn 0.18s ease",
};

export const inlineBox: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: "20px",
  width: "100%",
  maxWidth: "460px",
  boxShadow: "0 25px 80px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.08)",
  overflow: "hidden",
  animation: "slideUp 0.22s cubic-bezier(0.34,1.56,0.64,1)",
};

export const inlineLabel: React.CSSProperties = {
  display: "block",
  fontSize: "0.77rem",
  fontWeight: 700,
  color: "#64748b",
  marginBottom: "0.35rem",
  marginTop: "1rem",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

export const inlineInput: React.CSSProperties = {
  width: "100%",
  padding: "0.65rem 0.875rem",
  border: "2px solid #e2e8f0",
  borderRadius: "10px",
  fontSize: "0.9rem",
  color: "#1e293b",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s",
  background: "#f8fafc",
};

export const inlineActions: React.CSSProperties = {
  display: "flex",
  gap: "0.75rem",
  padding: "1rem 1.5rem 1.5rem",
  justifyContent: "flex-end",
  borderTop: "1px solid #f1f5f9",
};

export const btnCancel: React.CSSProperties = {
  padding: "0.55rem 1.25rem",
  borderRadius: "10px",
  border: "2px solid #e2e8f0",
  background: "#fff",
  cursor: "pointer",
  fontSize: "0.85rem",
  fontWeight: 600,
  color: "#64748b",
  transition: "all 0.15s",
};

export const btnSubmit: React.CSSProperties = {
  padding: "0.55rem 1.5rem",
  borderRadius: "10px",
  border: "none",
  background: "linear-gradient(135deg, #1a6b43 0%, #0f5132 100%)",
  color: "#fff",
  cursor: "pointer",
  fontSize: "0.85rem",
  fontWeight: 700,
  boxShadow: "0 4px 15px rgba(26,107,67,0.35)",
  transition: "all 0.15s",
};

export const actionBtn = (color: string): React.CSSProperties => ({
  fontSize: "0.72rem",
  fontWeight: 600,
  color,
  background: "transparent",
  border: "none",
  cursor: "pointer",
  padding: "2px 6px",
  borderRadius: "6px",
  display: "inline-flex",
  alignItems: "center",
  gap: "3px",
});

export const addBtn: React.CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 700,
  color: "#1a6b43",
  background: "#f0fdf4",
  border: "none",
  borderRadius: "8px",
  padding: "4px 12px",
  cursor: "pointer",
};

export const getFileName = (url: string = ""): string => {
  try {
    const cleanUrl = url.split("?")[0];
    const rawName = cleanUrl.substring(cleanUrl.lastIndexOf("/") + 1);
    const decoded = decodeURIComponent(rawName);
    return decoded.replace(/^\d+_/, "") || decoded || "Dokumen";
  } catch {
    return "Dokumen";
  }
};

export const getFileExt = (url: string = ""): string => {
  try {
    const cleanUrl = url.split("?")[0];
    const ext = cleanUrl.split(".").pop();
    if (ext && ext.length <= 5) return ext;
    return "pdf";
  } catch {
    return "pdf";
  }
};

export const downloadFile = async (url: string, filename: string) => {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(blobUrl);
    document.body.removeChild(a);
  } catch {
    window.open(url, "_blank");
  }
};

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  proses: { label: "Proses", cls: "status-proses" },
  sedang_diproses: { label: "Sedang Diproses", cls: "status-proses" },
  menunggu_verifikasi_manager: { label: "Menunggu Verifikasi Manager", cls: "status-menunggu" },
  perlu_perbaikan: { label: "Perlu Perbaikan", cls: "status-batal" },
  selesai: { label: "Selesai", cls: "status-selesai" },
  batal: { label: "Batal", cls: "status-batal" },
  kadaluarsa: { label: "Kadaluarsa", cls: "status-kadaluarsa" },
  menunggu: { label: "Menunggu", cls: "status-menunggu" },
  lunas: { label: "Lunas", cls: "status-lunas" },
  belum: { label: "Belum", cls: "status-belum" },
  pending: { label: "Pending", cls: "status-pending" },
  dp: { label: "DP", cls: "status-dp" },
  terverifikasi: { label: "Terverifikasi", cls: "status-verified" },
  diterima: { label: "Diterima", cls: "status-verified" },
  ditolak: { label: "Ditolak", cls: "status-ditolak" },
  lengkap: { label: "Lengkap", cls: "status-selesai" },
  revisi: { label: "Revisi", cls: "status-batal" },
  belum_lengkap: { label: "Belum Lengkap", cls: "status-pending" },
  siap_berangkat: { label: "Siap Berangkat", cls: "status-siap" },
  menunggu_pembayaran: { label: "Menunggu Bayar", cls: "status-pending" },
  menunggu_dokumen: { label: "Menunggu Dokumen", cls: "status-pending" },
};

const StatusPill = ({ value }: { value: string }) => {
  const s = STATUS_MAP[value?.toLowerCase()] ?? { label: value, cls: "status-proses" };
  return <span className={`status-pill ${s.cls}`}>{s.label}</span>;
};

// ── Detail Modal ───────────────────────────────────────────────────────────────

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const JENIS_DOKUMEN = [
  { value: "paspor", label: "Paspor", required: true },
  { value: "ktp", label: "KTP", required: true },
  { value: "kartu_keluarga", label: "Kartu Keluarga", required: true },
  { value: "akta_lahir", label: "Akta Lahir", required: true },
  { value: "vaksin", label: "Vaksin", required: true },
  { value: "pas_foto", label: "Pas Foto", required: true },
  { value: "lainnya", label: "Lainnya", required: false },
];

type PayItem = { id: string; jumlah: number; status: string; tanggal: string; bukti: string };
type DocItem = { id: string; jenis: string; status: string; file_path: string; created_at?: string };

// Set jenis dokumen yang wajib (required)
export const REQUIRED_JENIS = new Set(JENIS_DOKUMEN.filter(j => j.required).map(j => j.value));
// Lookup label dari value (backward-compat: "foto"/"akte_lahir" lama → label baru)
const JENIS_LABEL_MAP: Record<string, string> = Object.fromEntries(
  [...JENIS_DOKUMEN.map(j => [j.value, j.label]), ["foto", "Pas Foto"], ["akte_lahir", "Akta Lahir"]]
);
const getDocLabel = (jenis: string) => JENIS_LABEL_MAP[jenis] ?? jenis;

const JENIS_ICON_MAP: Record<string, string> = {
  paspor: "🛂",
  ktp: "🪪",
  kartu_keluarga: "👨‍👩‍👧",
  akta_lahir: "📜",
  akte_lahir: "📜",
  vaksin: "💉",
  pas_foto: "🖼️",
  foto: "🖼️",
  lainnya: "📄",
};
const getDocIcon = (jenis: string) => JENIS_ICON_MAP[jenis?.toLowerCase()] ?? "📄";

// ── Modal Assign Pendaftaran ─────────────────────────────────────────────────

interface AssignModalProps {
  nomor: string;
  token: string;
  onClose: () => void;
  onAssigned: () => void;
  initialData?: PendaftaranItem | DetailPendaftaran | null;
}

const AssignModal = ({
  nomor,
  token,
  onClose,
  onAssigned,
  initialData,
}: AssignModalProps) => {
  const { role } = useAuth();
  const isManager = role === "owner" || role === "manager" || role === "administration_manager";
  const { showToast } = useToast();
  const [data, setData] = useState<DetailPendaftaran | null>(null);
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<{ id: string; nama: string; username?: string; role?: string; is_active?: boolean }[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const authH = { Authorization: `Bearer ${token}` };

  // Fetch detail pendaftaran
  useEffect(() => {
    let isMounted = true;
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API}/admin/pendaftaran/${nomor}`, { headers: authH });
        if (isMounted) {
          const p = res.data?.pendaftaran;
          setData({
            nomor_pendaftaran: p?.NomorPendaftaran ?? p?.nomor_pendaftaran ?? nomor,
            nama_customer: p?.Customer?.Nama ?? p?.Customer?.nama ?? "-",
            nik: p?.Customer?.NIK ?? p?.Customer?.nik ?? "-",
            no_hp: p?.Customer?.NoHP ?? p?.Customer?.NoHp ?? p?.Customer?.no_hp ?? "-",
            email: p?.Customer?.Email ?? p?.Customer?.email ?? "-",
            tempat_lahir: p?.Customer?.TempatLahir ?? p?.Customer?.tempat_lahir ?? "-",
            tanggal_lahir: p?.Customer?.TanggalLahir ?? p?.Customer?.tanggal_lahir ?? "",
            jenis_kelamin: p?.Customer?.JenisKelamin ?? p?.Customer?.jenis_kelamin ?? "-",
            paket: p?.Paket?.NamaPaket ?? p?.Paket?.nama_paket ?? "-",
            harga: p?.Paket?.Harga ?? p?.Paket?.harga ?? 0,
            tanggal_berangkat: p?.Paket?.TanggalBerangkat ?? p?.Paket?.tanggal_berangkat ?? "",
            payment_status: p?.payment_status ?? p?.PaymentStatus ?? p?.Invoice?.StatusPembayaran ?? "",
            total_tagihan: p?.total_tagihan ?? p?.Paket?.Harga ?? 0,
            total_pembayaran: p?.total_pembayaran ?? 0,
            total_perlengkapan: p?.total_perlengkapan ?? 0,
            ambil_perlengkapan: p?.ambil_perlengkapan ?? false,
            harga_perlengkapan: p?.harga_perlengkapan ?? 0,
            nomor_invoice: p?.nomor_invoice ?? "",
            document_status: p?.DocumentStatus ?? p?.document_status ?? "",
            status: p?.Status ?? p?.status ?? "",
            admin_pic: p?.User?.Nama ?? p?.User?.nama ?? null,
            user_id: p?.user_id ?? p?.UserID ?? p?.User?.ID ?? p?.User?.id ?? null,
            admin_id: p?.admin_id ?? p?.user_id ?? p?.UserID ?? p?.User?.ID ?? p?.User?.id ?? null,
            grup_count: Array.isArray(res.data?.grup_jamaah) ? res.data.grup_jamaah.length : 1,
          });
        }
      } catch {
        if (isMounted && initialData) {
          setData(initialData as unknown as DetailPendaftaran);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetail();
    return () => { isMounted = false; };
  }, [nomor, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch admin list hanya untuk manager
  useEffect(() => {
    let isMounted = true;
    if (!isManager) {
      setAdmins([]);
      return;
    }
    const fetchAdmins = async () => {
      try {
        const res = await axios.get(`${API}/manager/admin`, { headers: authH });
        const list = res.data?.admins ?? [];
        if (isMounted && Array.isArray(list)) {
          // Hanya tampilkan Admin yang memenuhi ketentuan penugasan (is_active !== false dan role === 'admin')
          const valid = list
            .filter((a: Record<string, unknown>) => a.is_active !== false && (a.role === "admin" || !a.role))
            .map((a: Record<string, unknown>) => ({
              id: String(a.id ?? ""),
              nama: String(a.nama ?? ""),
              username: a.username ? String(a.username) : undefined,
              role: a.role ? String(a.role) : "admin",
              is_active: a.is_active !== false,
            }));
          setAdmins(valid);
          if (valid.length > 0) {
            setSelectedAdminId((prev) => {
              if (prev && valid.some((a) => a.id === prev)) return prev;
              const currentPic = data?.admin_pic || initialData?.admin_pic;
              if (currentPic && typeof currentPic === "string") {
                const found = valid.find((a) => a.nama.toLowerCase() === currentPic.toLowerCase());
                if (found) return found.id;
              }
              return valid[0].id;
            });
          } else {
            setSelectedAdminId("");
          }
        }
      } catch {
        if (isMounted) {
          setAdmins([]);
          setSelectedAdminId("");
        }
      }
    };
    fetchAdmins();
    return () => { isMounted = false; };
  }, [token, isManager, data?.admin_pic]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle submit assign
  const handleSubmitAssign = async () => {
    if (!selectedAdminId || !selectedAdmin) {
      setError("Pilih Admin yang valid untuk ditugaskan.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await axios.put(`${API}/admin/pendaftaran/${nomor}/assign`, { admin_id: selectedAdminId }, { headers: authH });
      showToast("success", "✓ Pendaftaran berhasil ditugaskan.");
      onAssigned();
      onClose();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? (err.response?.data?.error ?? "Gagal menugaskan pendaftaran.") : "Gagal menugaskan pendaftaran.";
      setError(msg);
      showToast("error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedAdmin = admins.find((a) => a.id === selectedAdminId) || null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && !submitting && onClose()}>
      <div className="modal-panel assign-modal-panel">
        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="modal-title">
              <span>👥</span> Assign Pendaftaran
            </div>
            <div className="modal-subtitle">
              {nomor} {data?.nomor_invoice ? `• ${data.nomor_invoice}` : ""}
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} disabled={submitting} aria-label="Tutup">
            <LuX size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {loading && !data ? (
            <div className="modal-loading">
              <div className="modal-spin" />
              Memuat data pendaftaran...
            </div>
          ) : (
            <>
              {/* Ringkasan Pendaftaran */}
              <div className="modal-section">
                <div className="modal-section-title">
                  <span>📋 Ringkasan Pendaftaran</span>
                  {data?.status && <StatusPill value={data.status} />}
                </div>
                <div className="modal-grid-2">
                  <div className="modal-info-item">
                    <span className="modal-info-label">Nama Jamaah</span>
                    <span className="modal-info-val">{data?.nama_customer || "-"}</span>
                  </div>
                  <div className="modal-info-item">
                    <span className="modal-info-label">NIK / No HP</span>
                    <span className="modal-info-val">
                      <span style={{ fontFamily: "monospace" }}>{data?.nik || "-"}</span>
                      {data?.no_hp ? ` • ${data.no_hp}` : ""}
                    </span>
                  </div>
                  <div className="modal-info-item">
                    <span className="modal-info-label">Paket Umroh</span>
                    <span className="modal-info-val">{data?.paket || "-"}</span>
                  </div>
                  <div className="modal-info-item">
                    <span className="modal-info-label">Tanggal Berangkat</span>
                    <span className="modal-info-val">{fmtDate(data?.tanggal_berangkat || "")}</span>
                  </div>
                  <div className="modal-info-item">
                    <span className="modal-info-label">Status Pembayaran</span>
                    <div style={{ marginTop: 2 }}>
                      <StatusPill value={data?.payment_status || ""} />
                    </div>
                  </div>
                  <div className="modal-info-item">
                    <span className="modal-info-label">PIC Saat Ini</span>
                    <div style={{ marginTop: 2 }}>
                      {data?.admin_pic ? (
                        <span className="status-pill status-selesai">✓ {data.admin_pic}</span>
                      ) : (
                        <span className="status-pill status-menunggu">Belum Ditugaskan</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Penugasan */}
              <div className="modal-section" style={{ background: "#ffffff" }}>
                <div className="modal-section-title">
                  <span>👷 Penugasan Admin PIC</span>
                </div>
                <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0 0 1rem 0", lineHeight: 1.5 }}>
                  Pilih admin yang akan bertanggung jawab untuk memverifikasi kelengkapan dokumen, memantau pembayaran, dan mendampingi proses jamaah hingga keberangkatan.
                </p>

                <div style={{ marginBottom: "1rem" }}>
                  <label className="modal-info-label" style={{ display: "block", marginBottom: "0.4rem" }}>
                    Pilih Admin Penanggung Jawab
                  </label>
                  <select
                    className="assign-select"
                    value={selectedAdminId}
                    onChange={(e) => setSelectedAdminId(e.target.value)}
                    disabled={submitting || admins.length === 0}
                  >
                    {admins.length === 0 ? (
                      <option value="">-- Tidak ada admin aktif tersedia --</option>
                    ) : (
                      <>
                        {!selectedAdminId && <option value="">-- Pilih Admin PIC --</option>}
                        {admins.map((adm) => (
                          <option key={adm.id} value={adm.id}>
                            {adm.nama} {adm.username ? `(@${adm.username})` : ""}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>

                {/* Preview Admin Terpilih */}
                {selectedAdmin ? (
                  <div className="assign-preview-card">
                    <div className="assign-preview-avatar">
                      {(selectedAdmin.nama || "A").trim().charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="assign-preview-name">{selectedAdmin.nama}</div>
                      <div className="assign-preview-role">
                        {selectedAdmin.username ? `@${selectedAdmin.username}` : "@admin"} • Penanggung Jawab (PIC)
                      </div>
                    </div>
                    <span style={{ fontSize: "0.74rem", background: "#dcfce7", color: "#166534", padding: "0.2rem 0.65rem", borderRadius: 999, fontWeight: 700 }}>
                      Siap Ditugaskan
                    </span>
                  </div>
                ) : (
                  <div className="assign-preview-empty" style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "1rem",
                    background: "#f8fafc",
                    border: "1.5px dashed #cbd5e1",
                    borderRadius: 10,
                    color: "#64748b",
                    fontSize: "0.85rem",
                  }}>
                    <span>⚠️ Belum ada Admin yang dipilih atau tidak ada Admin aktif yang tersedia</span>
                  </div>
                )}

                {error && (
                  <div className="modal-assign-error" style={{ marginTop: "1rem" }}>
                    ⚠️ {error}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button
            type="button"
            className="modal-btn-secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Batal
          </button>
          <button
            type="button"
            className="modal-btn-primary"
            onClick={handleSubmitAssign}
            disabled={submitting || !selectedAdminId || !selectedAdmin || admins.length === 0}
          >
            {submitting ? (
              <>
                <div className="mini-spin-w" /> Menugaskan Admin...
              </>
            ) : (
              <>
                <LuCheck size={14} /> Tugaskan Admin
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Detail Modal ─────────────────────────────────────────────────────────────

export const DetailModal = ({
  nomor,
  token,
  onClose,
  onAssigned,
  embedded = false,
  onDataLoaded,
}: {
  nomor: string;
  token: string;
  onClose: () => void;
  onAssigned?: () => void;
  /** true = dirender inline di dalam Detail Grup (tanpa overlay/header/footer, tanpa ringkasan invoice & riwayat pembayaran). */
  embedded?: boolean;
  /** Dipanggil setiap data detail (re)load; dipakai Detail Grup agar ringkasan invoice & badge baris tetap sinkron. */
  onDataLoaded?: (d: DetailPendaftaran) => void;
}) => {
  const { nama: authNama, role } = useAuth();
  const isManager = role === "owner" || role === "manager" || role === "administration_manager";
  const [data, setData] = useState<DetailPendaftaran | null>(null);
  const [loading, setLoading] = useState(true);

  // Detail selalu fokus pada SATU jamaah: yang nomor pendaftarannya dikirim lewat prop `nomor`.
  // (Pemilihan anggota grup ditangani oleh accordion di GrupDetailModal, bukan di sini.)
  useEffect(() => {
    if (data) onDataLoaded?.(data);
  }, [data, onDataLoaded]);

  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [assignSuccess, setAssignSuccess] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [payments, setPayments] = useState<PayItem[]>([]);
  const [docs, setDocs] = useState<DocItem[]>([]);
  const { showToast } = useToast();

  const travelDocsMap = useMemo(() => {
    const map: Record<string, DocItem | undefined> = {};
    for (const cfg of TRAVEL_DOC_CONFIGS) {
      const found = docs.find((d) => d.jenis?.toLowerCase() === cfg.key);
      map[cfg.key] = found;
    }
    return map;
  }, [docs]);

  // ── Modal Tambah/Edit Pembayaran ──
  const [showPayModal, setShowPayModal] = useState(false);
  const [editPay, setEditPay] = useState<PayItem | null>(null);
  const [payJumlah, setPayJumlah] = useState("");
  const [payTanggal, setPayTanggal] = useState(new Date().toISOString().split("T")[0]);
  const [payFile, setPayFile] = useState<File | null>(null);
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payError, setPayError] = useState("");

  // ── Modal Upload/Edit Dokumen ──
  const [showDocModal, setShowDocModal] = useState(false);
  const [editDoc, setEditDoc] = useState<DocItem | null>(null);
  const [docJenis, setDocJenis] = useState("paspor");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docSubmitting, setDocSubmitting] = useState(false);
  const [docError, setDocError] = useState("");

  // ── Konfirmasi hapus ──
  const [deletingPayId, setDeletingPayId] = useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [submittingAjukan, setSubmittingAjukan] = useState(false);

  // ── Modal Pembatalan Pendaftaran ──
  const [showBatalModal, setShowBatalModal] = useState(false);
  const [batalAlasan, setBatalAlasan] = useState("");
  const [batalSubmitting, setBatalSubmitting] = useState(false);
  const [batalError, setBatalError] = useState("");

  const handleConfirmBatal = async () => {
    const trimmed = batalAlasan.trim();
    if (!trimmed) {
      setBatalError("Alasan pembatalan wajib diisi dan tidak boleh hanya berupa spasi.");
      return;
    }
    if (!data) return;
    setBatalSubmitting(true);
    setBatalError("");
    try {
      const res = await axios.post(
        `${API}/admin/pendaftaran/${data.nomor_pendaftaran}/batal`,
        { alasan: trimmed },
        { headers: authH }
      );
      showToast("success", res.data?.message || "✓ Pendaftaran jamaah berhasil dibatalkan.");
      setShowBatalModal(false);
      setBatalAlasan("");
      await fetchData();
      window.dispatchEvent(new Event("admin-badge-refresh"));
      onAssigned?.();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.error ?? "Gagal membatalkan pendaftaran.")
        : "Gagal membatalkan pendaftaran.";
      setBatalError(msg);
      showToast("error", msg);
    } finally {
      setBatalSubmitting(false);
    }
  };

  // ── Modal Ubah Perlengkapan ──
  const [showPerlengkapanModal, setShowPerlengkapanModal] = useState(false);
  const [perlengkapanSelectedNomor, setPerlengkapanSelectedNomor] = useState("");
  const [perlengkapanChoice, setPerlengkapanChoice] = useState(false);
  const [perlengkapanSubmitting, setPerlengkapanSubmitting] = useState(false);
  const [perlengkapanError, setPerlengkapanError] = useState("");

  const openEditPerlengkapan = (targetNomor?: string) => {
    const chosenNomor = targetNomor || data?.nomor_pendaftaran || "";
    setPerlengkapanSelectedNomor(chosenNomor);
    if (data?.grup_jamaah && data.grup_jamaah.length > 0) {
      const found = data.grup_jamaah.find((g) => g.nomor_pendaftaran === chosenNomor);
      if (found) {
        setPerlengkapanChoice(found.ambil_perlengkapan);
      } else {
        setPerlengkapanChoice(data.ambil_perlengkapan);
      }
    } else {
      setPerlengkapanChoice(data?.ambil_perlengkapan ?? false);
    }
    setPerlengkapanError("");
    setShowPerlengkapanModal(true);
  };

  const handleSelectJamaahPerlengkapan = (nomorDipilih: string) => {
    setPerlengkapanSelectedNomor(nomorDipilih);
    if (data?.grup_jamaah) {
      const found = data.grup_jamaah.find((g) => g.nomor_pendaftaran === nomorDipilih);
      if (found) {
        setPerlengkapanChoice(found.ambil_perlengkapan);
      }
    }
  };

  const submitPerlengkapan = async () => {
    if (!perlengkapanSelectedNomor) return;
    setPerlengkapanSubmitting(true);
    setPerlengkapanError("");
    try {
      const res = await axios.put(
        `${API}/admin/pendaftaran/${perlengkapanSelectedNomor}/perlengkapan`,
        { ambil_perlengkapan: perlengkapanChoice },
        { headers: authH }
      );
      showToast("success", res.data?.message || "✓ Pilihan perlengkapan berhasil diperbarui.");
      setShowPerlengkapanModal(false);
      await fetchData();
      window.dispatchEvent(new Event("admin-badge-refresh"));
      onAssigned?.();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.error ?? "Gagal memperbarui pilihan perlengkapan.")
        : "Gagal memperbarui pilihan perlengkapan.";
      setPerlengkapanError(msg);
      showToast("error", msg);
    } finally {
      setPerlengkapanSubmitting(false);
    }
  };

  const authH = { Authorization: `Bearer ${token}` };

  const handleAjukanVerifikasi = async () => {
    if (!data) return;
    setSubmittingAjukan(true);
    try {
      const res = await axios.post(`${API}/admin/pendaftaran/${data.nomor_pendaftaran}/ajukan-verifikasi`, {}, {
        headers: authH,
      });
      showToast("success", res.data?.message || "✓ Pendaftaran berhasil diajukan ulang ke Administration Manager.");
      await fetchData();
      window.dispatchEvent(new Event("admin-badge-refresh"));
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? (err.response?.data?.error ?? "Gagal mengajukan verifikasi.") : "Gagal mengajukan verifikasi.";
      showToast("error", msg);
    } finally {
      setSubmittingAjukan(false);
    }
  };

  const handleOpenInvoice = async () => {
    if (!data?.nomor_invoice) return;
    try {
      const res = await fetch(`${API}/admin/invoice?nomor=${data.nomor_invoice}`, {
        headers: authH,
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

  // ── Fetch data ──
  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/admin/pendaftaran/${nomor}`, {
        headers: authH,
      });
      const p = res.data?.pendaftaran;
      setData({
        nomor_pendaftaran: p?.NomorPendaftaran ?? p?.nomor_pendaftaran,
        nama_customer: p?.Customer?.Nama ?? p?.Customer?.nama,
        nik: p?.Customer?.NIK ?? p?.Customer?.nik ?? "-",
        no_hp: p?.Customer?.NoHP ?? p?.Customer?.NoHp ?? p?.Customer?.no_hp ?? "-",
        email: p?.Customer?.Email ?? p?.Customer?.email ?? "-",
        tempat_lahir: p?.Customer?.TempatLahir ?? p?.Customer?.tempat_lahir ?? "-",
        tanggal_lahir: p?.Customer?.TanggalLahir ?? p?.Customer?.tanggal_lahir ?? "",
        jenis_kelamin: p?.Customer?.JenisKelamin ?? p?.Customer?.jenis_kelamin ?? "-",
        alamat_lengkap: p?.Customer?.AlamatLengkap ?? p?.Customer?.alamat_lengkap ?? "",
        provinsi: p?.Customer?.Provinsi ?? p?.Customer?.provinsi ?? "",
        kabupaten_kota: p?.Customer?.KabupatenKota ?? p?.Customer?.kabupaten_kota ?? "",
        kecamatan: p?.Customer?.Kecamatan ?? p?.Customer?.kecamatan ?? "",
        kelurahan_desa: p?.Customer?.KelurahanDesa ?? p?.Customer?.kelurahan_desa ?? "",
        kode_pos: p?.Customer?.KodePos ?? p?.Customer?.kode_pos ?? "",
        paket: p?.Paket?.NamaPaket ?? p?.Paket?.nama_paket,
        harga: p?.Paket?.Harga ?? p?.Paket?.harga ?? 0,
        tanggal_berangkat: p?.Paket?.TanggalBerangkat ?? p?.Paket?.tanggal_berangkat,
        payment_status: p?.payment_status ?? p?.PaymentStatus ?? p?.Invoice?.StatusPembayaran ?? "",
        total_tagihan: p?.total_tagihan ?? p?.Paket?.Harga ?? 0,
        total_pembayaran: p?.total_pembayaran ?? 0,
        total_perlengkapan: p?.total_perlengkapan ?? 0,
        ambil_perlengkapan: p?.ambil_perlengkapan ?? false,
        harga_perlengkapan: p?.harga_perlengkapan ?? 0,
        nomor_invoice: p?.nomor_invoice ?? "",
        document_status: p?.DocumentStatus ?? p?.document_status,
        status: p?.Status ?? p?.status,
        catatan_verifikasi_manager: p?.CatatanVerifikasiManager ?? p?.catatan_verifikasi_manager,
        approved_by: p?.ApprovedBy ?? p?.approved_by,
        approved_at: p?.ApprovedAt ?? p?.approved_at,
        approver: p?.Approver ?? p?.approver,
        approver_nama: p?.approver_nama ?? p?.Approver?.Nama ?? p?.approver?.nama ?? p?.Approver?.nama,
        alasan_pembatalan: p?.alasan_pembatalan ?? p?.AlasanPembatalan,
        dibatalkan_pada: p?.dibatalkan_pada ?? p?.DibatalkanPada,
        dibatalkan_oleh: p?.dibatalkan_oleh ?? p?.DibatalkanOleh,
        dibatalkan_oleh_nama: p?.dibatalkan_oleh_nama ?? p?.Pembatal?.Nama ?? p?.Pembatal?.nama,
        admin_pic: p?.User?.Nama ?? p?.User?.nama ?? null,
        user_id: p?.user_id ?? p?.UserID ?? p?.User?.ID ?? p?.User?.id ?? null,
        admin_id: p?.admin_id ?? p?.user_id ?? p?.UserID ?? p?.User?.ID ?? p?.User?.id ?? null,
        registration_source: p?.registration_source ?? "customer",
        registered_by: p?.registered_by ?? "Self",
        registered_by_label: p?.registered_by_label ?? "👤 Customer",
        grup_count: Array.isArray(res.data?.grup_jamaah) ? res.data.grup_jamaah.length : 1,
        grup_jamaah: Array.isArray(res.data?.grup_jamaah)
          ? res.data.grup_jamaah.map((g: Record<string, unknown>) => ({
              nomor_pendaftaran: String(g.nomor_pendaftaran ?? ""),
              nama: String(g.nama ?? ""),
              nik: String(g.nik ?? "-"),
              status: String(g.status ?? ""),
              alasan_pembatalan: g.alasan_pembatalan ? String(g.alasan_pembatalan) : undefined,
              ambil_perlengkapan: Boolean(g.ambil_perlengkapan),
              harga_perlengkapan: Number(g.harga_perlengkapan ?? 0),
              no_hp: g.no_hp ? String(g.no_hp) : "-",
              email: g.email ? String(g.email) : "-",
              tempat_lahir: g.tempat_lahir ? String(g.tempat_lahir) : "-",
              tanggal_lahir: g.tanggal_lahir ? String(g.tanggal_lahir) : "",
              jenis_kelamin: g.jenis_kelamin ? String(g.jenis_kelamin) : "-",
              alamat_lengkap: g.alamat_lengkap ? String(g.alamat_lengkap) : "",
              provinsi: g.provinsi ? String(g.provinsi) : "",
              kabupaten_kota: g.kabupaten_kota ? String(g.kabupaten_kota) : "",
              kecamatan: g.kecamatan ? String(g.kecamatan) : "",
              kelurahan_desa: g.kelurahan_desa ? String(g.kelurahan_desa) : "",
              kode_pos: g.kode_pos ? String(g.kode_pos) : "",
            }))
          : [],
        info_perlengkapan: res.data?.info_perlengkapan,
      });
      const rawBayar = res.data?.pembayaran ?? [];
      const mappedBayar: PayItem[] = rawBayar.map((b: Record<string, unknown>) => ({
        id: String(b.ID ?? b.id ?? ""),
        jumlah: (b.Jumlah ?? b.jumlah ?? 0) as number,
        status: (b.Status ?? b.status ?? "") as string,
        tanggal: (b.TanggalBayar ?? b.tanggal_bayar ?? b.tanggal ?? "") as string,
        bukti: String(b.BuktiPembayaran ?? b.bukti_pembayaran ?? ""),
      }));
      mappedBayar.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
      setPayments(mappedBayar);

      const rawDok = res.data?.dokumen ?? [];
      const mappedDocs: DocItem[] = rawDok.map((d: Record<string, unknown>) => ({
        id: String(d.ID ?? d.id ?? ""),
        jenis: String(d.JenisDokumen ?? d.jenis_dokumen ?? d.Jenis ?? d.jenis ?? "-"),
        status: (d.StatusValidasi ?? d.status_validasi ?? d.Status ?? d.status ?? "") as string,
        file_path: String(d.FilePath ?? d.file_path ?? ""),
        created_at: String(d.CreatedAt ?? d.created_at ?? ""),
      }));
      mappedDocs.sort((a, b) => {
        if (!a.created_at && !b.created_at) return 0;
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
      setDocs(mappedDocs);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nomor, token]);

  useEffect(() => {
    void Promise.resolve().then(() => fetchData());
  }, [fetchData]);

  const handleAssign = async () => {
    if (!data) return;
    setAssignError("");
    try {
      setAssigning(true);
      await axios.put(`${API}/admin/pendaftaran/${data.nomor_pendaftaran}/assign`, {}, { headers: authH });
      setAssignSuccess(true);
      showToast("success", "✓ Berhasil mengambil tanggung jawab sebagai PIC pendaftaran ini.");
      setData((prev) => (prev ? { ...prev, admin_pic: authNama || "Saya" } : null));
      await fetchData();
      onAssigned?.();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? (err.response?.data?.error ?? "Gagal mengambil pendaftaran.") : "Gagal mengambil pendaftaran.";
      setAssignError(msg);
      showToast("error", msg);
    } finally {
      setAssigning(false);
    }
  };



  const openAddPay = () => {
    setEditPay(null);
    setPayJumlah("");
    setPayTanggal(new Date().toISOString().split("T")[0]);
    setPayFile(null);
    setPayError("");
    setShowPayModal(true);
  };

  const openEditPay = (pay: PayItem) => {
    setEditPay(pay);
    setPayJumlah(fmtPayInput(String(Math.round(pay.jumlah))));
    setPayTanggal(pay.tanggal ? pay.tanggal.split("T")[0] : new Date().toISOString().split("T")[0]);
    setPayFile(null);
    setPayError("");
    setShowPayModal(true);
  };

  const submitPay = async () => {
    if (!data) return;
    setPayError("");
    const nominal = parseFloat(payJumlah.replace(/[^\d]/g, ""));
    if (!nominal || isNaN(nominal) || nominal <= 0) {
      setPayError("Jumlah pembayaran tidak valid");
      showToast("error", "Jumlah pembayaran tidak valid.");
      return;
    }
    setPaySubmitting(true);
    try {
      const fd = new FormData();
      fd.append("jumlah", String(nominal));
      fd.append("tanggal_bayar", payTanggal);
      if (payFile) fd.append("bukti", payFile);

      if (editPay) {
        await axios.put(`${API}/admin/pembayaran/${editPay.id}/admin`, fd, { headers: authH });
      } else {
        await axios.post(`${API}/admin/pendaftaran/${data.nomor_pendaftaran}/pembayaran`, fd, { headers: authH });
      }
      setShowPayModal(false);
      await fetchData();
      showToast("success", "Bukti pembayaran berhasil disimpan.");
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? (err.response?.data?.error ?? "Bukti pembayaran gagal disimpan.") : "Bukti pembayaran gagal disimpan.";
      setPayError(msg);
      showToast("error", msg);
    } finally {
      setPaySubmitting(false);
    }
  };

  const deletePay = async (id: string) => {
    setDeletingPayId(id);
    try {
      await axios.delete(`${API}/admin/pembayaran/${id}/admin`, { headers: authH });
      await fetchData();
      showToast("success", "Pembayaran berhasil dihapus.");
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? (err.response?.data?.error ?? "Pembayaran gagal dihapus.") : "Pembayaran gagal dihapus.";
      showToast("error", msg);
    } finally {
      setDeletingPayId(null);
    }
  };

  // ── Dokumen helpers ──
  const openAddDoc = () => {
    setEditDoc(null);
    setDocJenis("paspor");
    setDocFile(null);
    setDocError("");
    setShowDocModal(true);
  };


  const openEditDoc = (doc: DocItem) => {
    setEditDoc(doc);
    setDocJenis(doc.jenis);
    setDocFile(null);
    setDocError("");
    setShowDocModal(true);
  };

  const submitDoc = async () => {
    if (!data) return;
    setDocError("");
    if ((!editDoc || isTravelDoc(docJenis)) && !docFile) {
      setDocError("File wajib dipilih");
      showToast("error", "File dokumen wajib dipilih.");
      return;
    }
    setDocSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("jenis", docJenis);
      if (docFile) fd.append("file", docFile);

      if (editDoc) {
        await axios.put(`${API}/admin/dokumen/${editDoc.id}/admin`, fd, { headers: authH });
      } else {
        await axios.post(`${API}/admin/pendaftaran/${data.nomor_pendaftaran}/dokumen`, fd, { headers: authH });
      }
      setShowDocModal(false);
      await fetchData();
      if (docJenis === "visa") {
        showToast("success", "✓ Visa berhasil diupload.");
      } else if (docJenis === "tiket_pesawat") {
        showToast("success", "✓ Tiket pesawat berhasil diupload.");
      } else if (docJenis === "nusuk") {
        showToast("success", "✓ Nusuk berhasil diupload.");
      } else {
        showToast("success", "Dokumen berhasil diupload.");
      }
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? (err.response?.data?.error ?? "Dokumen gagal diupload.") : "Dokumen gagal diupload.";
      setDocError(msg);
      showToast("error", msg);
    } finally {
      setDocSubmitting(false);
    }
  };

  const deleteDoc = async (id: string) => {
    setDeletingDocId(id);
    try {
      await axios.delete(`${API}/admin/dokumen/${id}/admin`, { headers: authH });
      await fetchData();
      showToast("success", "Dokumen berhasil dihapus.");
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? (err.response?.data?.error ?? "Dokumen gagal dihapus.") : "Dokumen gagal dihapus.";
      showToast("error", msg);
    } finally {
      setDeletingDocId(null);
    }
  };

  // ── Label pembayaran (DP / Pembayaran 2 / dst.) ──
  const payLabel = (idx: number) => {
    const num = payments.length - idx;
    return num === 1 ? "DP" : `Pembayaran ${num}`;
  };



  return (
    <>
      {/* ── Modal Tambah/Edit Pembayaran ── */}
      {showPayModal && (
        <div style={inlineModal} onClick={(e) => e.target === e.currentTarget && !paySubmitting && setShowPayModal(false)}>
          <div style={inlineBox}>
            {/* Header gradient */}
            <div style={{
              background: "linear-gradient(135deg, #1a6b43 0%, #0f5132 100%)",
              padding: "1.25rem 1.5rem",
              display: "flex", alignItems: "center", gap: "0.75rem",
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: "12px",
                background: "rgba(255,255,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.2rem",
              }}>
                {editPay ? "✏️" : "💳"}
              </div>
              <div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}>
                  {editPay ? "Edit Pembayaran" : "Tambah Pembayaran"}
                </div>
                <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.78rem", marginTop: "2px" }}>
                  {data?.nomor_pendaftaran}
                </div>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: "1.25rem 1.5rem" }}>
              {payError && (
                <div style={{
                  background: "#fef2f2", color: "#dc2626", borderRadius: "10px",
                  padding: "0.65rem 1rem", fontSize: "0.82rem", marginBottom: "0.75rem",
                  border: "1.5px solid #fecaca", display: "flex", alignItems: "center", gap: "0.5rem",
                }}>
                  <span>⚠️</span> {payError}
                </div>
              )}

              {/* Jumlah */}
              <label style={inlineLabel}>Jumlah Pembayaran *</label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)",
                  color: "#94a3b8", fontWeight: 700, fontSize: "0.85rem", pointerEvents: "none",
                }}>Rp</span>
                <input
                  style={{ ...inlineInput, paddingLeft: "2.5rem", fontWeight: 600, fontSize: "1rem", color: "#1e293b" }}
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={payJumlah}
                  onChange={e => setPayJumlah(fmtPayInput(e.target.value))}
                  disabled={paySubmitting}
                />
              </div>
              {payJumlah && (
                <div style={{ fontSize: "0.75rem", color: "#1a6b43", marginTop: "4px", fontWeight: 600 }}>
                  {(() => {
                    const num = parseInt(payJumlah.replace(/[^\d]/g, ""), 10);
                    return isNaN(num) ? "" : `Rp ${num.toLocaleString("id-ID")}`;
                  })()}
                </div>
              )}

              {/* Tanggal */}
              <label style={inlineLabel}>Tanggal Pembayaran *</label>
              <input
                style={inlineInput}
                type="date"
                value={payTanggal}
                max={new Date().toISOString().split("T")[0]}
                onChange={e => setPayTanggal(e.target.value)}
                disabled={paySubmitting}
              />

              {/* File Upload */}
              <label style={inlineLabel}>Bukti Pembayaran {editPay ? "(opsional — ganti jika perlu)" : "(opsional)"}</label>
              <div style={{
                border: "2px dashed #bbf7d0",
                borderRadius: "10px",
                padding: "0.875rem",
                background: payFile ? "#f0fdf4" : "#f8fafc",
                textAlign: "center",
                transition: "all 0.2s",
                cursor: "pointer",
              }}>
                <input
                  id="pay-file-input"
                  type="file"
                  accept="image/*,.pdf"
                  style={{ display: "none" }}
                  onChange={e => setPayFile(e.target.files?.[0] ?? null)}
                  disabled={paySubmitting}
                />
                <label htmlFor="pay-file-input" style={{ cursor: "pointer", display: "block" }}>
                  {payFile ? (
                    <div style={{ color: "#059669", fontWeight: 600, fontSize: "0.84rem" }}>
                      ✅ {payFile.name}
                      <div style={{ color: "#64748b", fontWeight: 400, fontSize: "0.75rem", marginTop: "2px" }}>
                        {(payFile.size / 1024).toFixed(0)} KB — klik untuk ganti
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: "#94a3b8", fontSize: "0.83rem" }}>
                      <div style={{ fontSize: "1.5rem", marginBottom: "4px" }}>📁</div>
                      <div style={{ fontWeight: 600, color: "#1a6b43" }}>Pilih file</div>
                      <div style={{ fontSize: "0.75rem", marginTop: "2px" }}>JPG, PNG, atau PDF</div>
                    </div>
                  )}
                </label>
              </div>
              {editPay?.bukti && !payFile && (
                <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "5px", textAlign: "center" }}>
                  Saat ini:{" "}
                  <a href={editPay.bukti} target="_blank" rel="noreferrer" style={{ color: "#1a6b43", fontWeight: 600 }}>Lihat bukti lama</a>
                </div>
              )}
            </div>

            <div style={inlineActions}>
              <button style={btnCancel} onClick={() => setShowPayModal(false)} disabled={paySubmitting}>
                Batal
              </button>
              <button style={{ ...btnSubmit, opacity: paySubmitting ? 0.7 : 1 }} onClick={submitPay} disabled={paySubmitting}>
                {paySubmitting ? (
                  <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" style={{ animation: "spin 0.7s linear infinite" }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
                    Menyimpan...
                  </span>
                ) : "💾 Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Upload/Edit Dokumen ── */}
      {showDocModal && (
        <div style={inlineModal} onClick={(e) => e.target === e.currentTarget && !docSubmitting && setShowDocModal(false)}>
          <div style={inlineBox}>
            {/* Header gradient */}
            <div style={{
              background: "linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)",
              padding: "1.25rem 1.5rem",
              display: "flex", alignItems: "center", gap: "0.75rem",
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: "12px",
                background: "rgba(255,255,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.2rem",
              }}>
                {editDoc ? "✏️" : "📎"}
              </div>
              <div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}>
                  {isTravelDoc(docJenis)
                    ? (editDoc ? "Ganti Dokumen Perjalanan" : "Upload Dokumen Perjalanan")
                    : (editDoc ? "Edit Dokumen Persyaratan" : "Upload Dokumen Persyaratan")}
                </div>
                <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.78rem", marginTop: "2px" }}>
                  {data?.nomor_pendaftaran}
                </div>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: "1.25rem 1.5rem" }}>
              {docError && (
                <div style={{
                  background: "#fef2f2", color: "#dc2626", borderRadius: "10px",
                  padding: "0.65rem 1rem", fontSize: "0.82rem", marginBottom: "0.75rem",
                  border: "1.5px solid #fecaca", display: "flex", alignItems: "center", gap: "0.5rem",
                }}>
                  <span>⚠️</span> {docError}
                </div>
              )}

              {/* Jenis Dokumen */}
              {isTravelDoc(docJenis) ? (
                <div style={{
                  background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: "10px",
                  padding: "0.75rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem"
                }}>
                  <span style={{ fontSize: "1.5rem" }}>
                    {TRAVEL_DOC_TYPES.find(t => t.key === docJenis)?.icon || "✈️"}
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, color: "#1e40af", fontSize: "0.9rem" }}>
                      Dokumen Perjalanan: {TRAVEL_DOC_TYPES.find(t => t.key === docJenis)?.label}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                      {editDoc ? "File lama akan digantikan dengan file yang Anda pilih." : "Unggah dokumen perjalanan untuk jamaah ini."}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <label style={inlineLabel}>Jenis Dokumen *</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.25rem" }}>
                    {JENIS_DOKUMEN.map(j => (
                      <button
                        key={j.value}
                        onClick={() => !docSubmitting && setDocJenis(j.value)}
                        disabled={docSubmitting}
                        style={{
                          padding: "0.6rem 0.75rem",
                          borderRadius: "10px",
                          border: docJenis === j.value ? "2px solid #2563eb" : "2px solid #e2e8f0",
                          background: docJenis === j.value ? "#eff6ff" : "#f8fafc",
                          color: docJenis === j.value ? "#1d4ed8" : "#64748b",
                          fontWeight: docJenis === j.value ? 700 : 500,
                          fontSize: "0.82rem",
                          cursor: "pointer",
                          transition: "all 0.15s",
                          textAlign: "left",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "0.25rem",
                        }}
                      >
                        <span>{docJenis === j.value ? "✓ " : ""}{j.label}</span>
                        {j.required && (
                          <span style={{ color: "#ef4444", fontSize: "0.72rem", fontWeight: 700, flexShrink: 0 }}>★</span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* File Upload */}
              <label style={{ ...inlineLabel, marginTop: "1.25rem" }}>
                {editDoc ? "Ganti File (opsional)" : "File Dokumen *"}
              </label>
              <div style={{
                border: "2px dashed #bae6fd",
                borderRadius: "10px",
                padding: "1rem",
                background: docFile ? "#f0fdf4" : "#f0f9ff",
                textAlign: "center",
                transition: "all 0.2s",
              }}>
                <input
                  id="doc-file-input"
                  type="file"
                  accept="image/*,.pdf"
                  style={{ display: "none" }}
                  onChange={e => setDocFile(e.target.files?.[0] ?? null)}
                  disabled={docSubmitting}
                />
                <label htmlFor="doc-file-input" style={{ cursor: "pointer", display: "block" }}>
                  {docFile ? (
                    <div style={{ color: "#059669", fontWeight: 600, fontSize: "0.84rem" }}>
                      ✅ {docFile.name}
                      <div style={{ color: "#64748b", fontWeight: 400, fontSize: "0.75rem", marginTop: "2px" }}>
                        {(docFile.size / 1024).toFixed(0)} KB — klik untuk ganti
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: "#94a3b8", fontSize: "0.83rem" }}>
                      <div style={{ fontSize: "1.5rem", marginBottom: "4px" }}>📄</div>
                      <div style={{ fontWeight: 600, color: "#2563eb" }}>Pilih file</div>
                      <div style={{ fontSize: "0.75rem", marginTop: "2px" }}>JPG, PNG, atau PDF</div>
                    </div>
                  )}
                </label>
              </div>
              {editDoc?.file_path && !docFile && (
                <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "5px", textAlign: "center" }}>
                  Saat ini:{" "}
                  <a href={editDoc.file_path} target="_blank" rel="noreferrer" style={{ color: "#2563eb", fontWeight: 600 }}>Lihat file lama</a>
                </div>
              )}
            </div>

            <div style={inlineActions}>
              <button style={btnCancel} onClick={() => setShowDocModal(false)} disabled={docSubmitting}>
                Batal
              </button>
              <button
                style={{
                  ...btnSubmit,
                  background: "linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)",
                  boxShadow: "0 4px 15px rgba(37,99,235,0.4)",
                  opacity: docSubmitting ? 0.7 : 1,
                }}
                onClick={submitDoc}
                disabled={docSubmitting}
              >
                {docSubmitting ? (
                  <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" style={{ animation: "spin 0.7s linear infinite" }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
                    Mengupload...
                  </span>
                ) : "📤 Upload"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Ubah Perlengkapan ── */}
      {showPerlengkapanModal && (() => {
        const currentJamaah = data?.grup_jamaah?.find((g) => g.nomor_pendaftaran === perlengkapanSelectedNomor);
        const currentJamaahChoice = currentJamaah ? currentJamaah.ambil_perlengkapan : data?.ambil_perlengkapan ?? false;
        const currentJamaahName = currentJamaah ? currentJamaah.nama : data?.nama_customer ?? "-";
        const defaultPrice = data?.info_perlengkapan?.harga ?? (data?.harga_perlengkapan && data.harga_perlengkapan > 0 ? data.harga_perlengkapan : 1450000);
        const defaultItems = data?.info_perlengkapan?.items ?? [
          'Koper 22"',
          'Koper 24"',
          'Kain Ihram / Mukena',
          'Ikat Pinggang',
          'Buku Doa',
          'Tas Paspor / Tas Pinggang',
        ];

        const deltaPrice = (perlengkapanChoice ? defaultPrice : 0) - (currentJamaahChoice ? defaultPrice : 0);
        const currentTotalTagihan = data?.total_tagihan ?? (data?.harga ?? 0) * (data?.grup_count ?? 1);
        const simulatedTotalTagihan = Math.max(0, currentTotalTagihan + deltaPrice);
        const currentTotalPembayaran = data?.total_pembayaran ?? 0;
        const simulatedSisaTagihan = Math.max(0, simulatedTotalTagihan - currentTotalPembayaran);
        const simulatedStatus = currentTotalPembayaran >= simulatedTotalTagihan && simulatedTotalTagihan > 0
          ? "lunas"
          : currentTotalPembayaran > 0
          ? "dp"
          : "belum";

        return (
          <div style={inlineModal} onClick={(e) => e.target === e.currentTarget && !perlengkapanSubmitting && setShowPerlengkapanModal(false)}>
            <div style={{ ...inlineBox, maxWidth: "520px" }}>
              {/* Header gradient */}
              <div style={{
                background: "linear-gradient(135deg, #15803d 0%, #166534 100%)",
                padding: "1.25rem 1.5rem",
                display: "flex", alignItems: "center", gap: "0.75rem",
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "12px",
                  background: "rgba(255,255,255,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.3rem",
                }}>
                  🧳
                </div>
                <div>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}>
                    Ubah Pilihan Perlengkapan
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.78rem", marginTop: "2px" }}>
                    {data?.paket} {data?.nomor_invoice ? `• ${data.nomor_invoice}` : ""}
                  </div>
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: "1.25rem 1.5rem", maxHeight: "75vh", overflowY: "auto" }}>
                {perlengkapanError && (
                  <div style={{
                    background: "#fef2f2", color: "#dc2626", borderRadius: "10px",
                    padding: "0.65rem 1rem", fontSize: "0.82rem", marginBottom: "0.75rem",
                    border: "1.5px solid #fecaca", display: "flex", alignItems: "center", gap: "0.5rem",
                  }}>
                    <span>⚠️</span> {perlengkapanError}
                  </div>
                )}

                {/* Selector Jamaah jika pendaftaran grup */}
                {data?.grup_jamaah && data.grup_jamaah.length > 1 && (
                  <div style={{ marginBottom: "1rem" }}>
                    <label style={inlineLabel}>Pilih Jamaah Yang Ingin Diubah</label>
                    <select
                      style={inlineInput}
                      value={perlengkapanSelectedNomor}
                      onChange={(e) => handleSelectJamaahPerlengkapan(e.target.value)}
                      disabled={perlengkapanSubmitting}
                    >
                      {data.grup_jamaah.map((g, idx) => (
                        <option key={g.nomor_pendaftaran} value={g.nomor_pendaftaran}>
                          #{idx + 1} {g.nama} ({g.nomor_pendaftaran}) — {g.ambil_perlengkapan ? "Mengambil Perlengkapan" : "Tidak Mengambil"}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Info Jamaah Terpilih */}
                <div style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "0.75rem 1rem",
                  marginBottom: "1rem",
                }}>
                  <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, letterSpacing: "0.04em" }}>JAMAAH TERPILIH</div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>
                    {currentJamaahName}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b", fontFamily: "monospace" }}>
                    {perlengkapanSelectedNomor}
                  </div>
                </div>

                {/* Pilihan Toggle / Checkbox Perlengkapan */}
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.85rem",
                    padding: "1rem 1.15rem",
                    borderRadius: "12px",
                    border: `2px solid ${perlengkapanChoice ? "#22c55e" : "#cbd5e1"}`,
                    background: perlengkapanChoice ? "#f0fdf4" : "#ffffff",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={perlengkapanChoice}
                    onChange={(e) => setPerlengkapanChoice(e.target.checked)}
                    disabled={perlengkapanSubmitting}
                    style={{ width: "1.2rem", height: "1.2rem", marginTop: "2px", accentColor: "#16a34a", cursor: "pointer" }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.92rem", color: perlengkapanChoice ? "#15803d" : "#1e293b" }}>
                        Ambil Perlengkapan Tambahan
                      </span>
                      <span style={{
                        fontWeight: 700,
                        fontSize: "0.82rem",
                        color: "#166534",
                        background: "#dcfce7",
                        padding: "0.2rem 0.6rem",
                        borderRadius: 6,
                      }}>
                        + {fmtRupiah(defaultPrice)} / orang
                      </span>
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "4px", lineHeight: "1.4" }}>
                      Menyediakan paket koper resmi Bonita Umroh dan seragam ibadah lengkap untuk jamaah ini.
                    </div>
                  </div>
                </label>

                {/* Rincian item perlengkapan */}
                <div style={{
                  marginTop: "0.85rem",
                  padding: "0.85rem 1rem",
                  borderRadius: "10px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#334155", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span>📦</span> Rincian Perlengkapan Termasuk:
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                    {defaultItems.map((item, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          padding: "0.25rem 0.6rem",
                          borderRadius: "6px",
                          background: perlengkapanChoice ? "#dcfce7" : "#e2e8f0",
                          color: perlengkapanChoice ? "#166534" : "#475569",
                          border: perlengkapanChoice ? "1px solid #bbf7d0" : "1px solid #cbd5e1",
                        }}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Simulasi & Penyesuaian Tagihan Invoice */}
                <div style={{
                  marginTop: "1rem",
                  padding: "0.9rem 1.15rem",
                  borderRadius: "12px",
                  background: "#f1f5f9",
                  border: "1.5px solid #cbd5e1",
                }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.6rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>💳 Penyesuaian Tagihan Invoice</span>
                    <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 500 }}>
                      {data?.nomor_invoice ? `Invoice: ${data.nomor_invoice}` : ""}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.82rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
                      <span>Perubahan Biaya Perlengkapan:</span>
                      <strong style={{ color: deltaPrice > 0 ? "#16a34a" : deltaPrice < 0 ? "#dc2626" : "#64748b" }}>
                        {deltaPrice > 0 ? `+ ${fmtRupiah(deltaPrice)}` : deltaPrice < 0 ? `- ${fmtRupiah(Math.abs(deltaPrice))}` : "Tidak berubah"}
                      </strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#0f172a", borderTop: "1px dashed #cbd5e1", paddingTop: "0.4rem" }}>
                      <span>Total Tagihan Baru:</span>
                      <strong style={{ fontSize: "0.92rem", color: "#1e293b" }}>{fmtRupiah(simulatedTotalTagihan)}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#059669" }}>
                      <span>Total Pembayaran Masuk (Tetap):</span>
                      <strong>{fmtRupiah(currentTotalPembayaran)}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#b91c1c", fontWeight: 600 }}>
                      <span>Sisa Tagihan Setelah Perubahan:</span>
                      <strong>{fmtRupiah(simulatedSisaTagihan)}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                      <span style={{ color: "#475569" }}>Status Pembayaran Baru:</span>
                      <StatusPill value={simulatedStatus} />
                    </div>
                  </div>
                </div>
              </div>

              <div style={inlineActions}>
                <button style={btnCancel} onClick={() => setShowPerlengkapanModal(false)} disabled={perlengkapanSubmitting}>
                  Batal
                </button>
                <button
                  style={{
                    ...btnSubmit,
                    background: "linear-gradient(135deg, #15803d 0%, #166534 100%)",
                    boxShadow: "0 4px 15px rgba(22,101,52,0.35)",
                    opacity: perlengkapanSubmitting ? 0.7 : 1,
                  }}
                  onClick={submitPerlengkapan}
                  disabled={perlengkapanSubmitting}
                >
                  {perlengkapanSubmitting ? (
                    <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" style={{ animation: "spin 0.7s linear infinite" }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
                      Menyimpan...
                    </span>
                  ) : "💾 Simpan Perubahan"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Modal Konfirmasi Pembatalan ── */}
      {showBatalModal && data && (
        <div style={inlineModal} onClick={(e) => e.target === e.currentTarget && !batalSubmitting && setShowBatalModal(false)}>
          <div style={{ ...inlineBox, maxWidth: "520px" }}>
            {/* Header warning / red gradient */}
            <div style={{
              background: "linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)",
              padding: "1.25rem 1.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{
                  width: 42,
                  height: 42,
                  borderRadius: "12px",
                  background: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.3rem",
                  color: "#fff",
                }}>
                  ⚠️
                </div>
                <div>
                  <div style={{ color: "#fff", fontWeight: 800, fontSize: "1.05rem" }}>
                    Konfirmasi Pembatalan Pendaftaran
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.78rem", marginTop: "2px" }}>
                    Tindakan ini akan membatalkan keberangkatan jamaah
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !batalSubmitting && setShowBatalModal(false)}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                  width: 32,
                  height: 32,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <LuX size={16} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "1.35rem 1.5rem" }}>
              {/* Notice no-refund */}
              <div style={{
                background: "#fff1f2",
                border: "1.5px solid #fecdd3",
                borderRadius: "10px",
                padding: "0.75rem 1rem",
                marginBottom: "1rem",
                fontSize: "0.82rem",
                color: "#9f1239",
                lineHeight: 1.45,
              }}>
                <strong>Perhatian:</strong> Bonita Umroh tidak memiliki kebijakan pengembalian dana (refund). Pembatalan hanya mengubah status pendaftaran dan mengembalikan kuota kursi. Invoice dan riwayat pembayaran tetap tersimpan.
              </div>

              {batalError && (
                <div style={{
                  background: "#fef2f2",
                  color: "#dc2626",
                  borderRadius: "10px",
                  padding: "0.65rem 1rem",
                  fontSize: "0.82rem",
                  marginBottom: "1rem",
                  border: "1.5px solid #fecaca",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}>
                  <span>⚠️</span> {batalError}
                </div>
              )}

              {/* Data Identitas Jamaah */}
              <div style={{
                background: "#f8fafc",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                padding: "1rem 1.25rem",
                marginBottom: "1.25rem",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.75rem 1rem",
              }}>
                <div>
                  <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>Nomor Pendaftaran</div>
                  <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#1e293b", fontFamily: "monospace", marginTop: "2px" }}>
                    {data.nomor_pendaftaran}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>Nama Jamaah</div>
                  <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#1e293b", marginTop: "2px" }}>
                    {data.nama_customer}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>Paket Umroh</div>
                  <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#1e293b", marginTop: "2px" }}>
                    {data.paket}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>Status Pembayaran</div>
                  <div style={{ marginTop: "4px" }}>
                    <StatusPill value={data.payment_status} />
                  </div>
                </div>
              </div>

              {/* Alasan Pembatalan Input */}
              <label style={{ ...inlineLabel, marginTop: 0 }}>
                Alasan Pembatalan <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <textarea
                style={{
                  ...inlineInput,
                  minHeight: "90px",
                  resize: "vertical",
                  fontFamily: "inherit",
                  lineHeight: 1.5,
                }}
                placeholder="Contoh: Jamaah mengalami kendala kesehatan mendadak sehingga tidak memungkinkan untuk berangkat."
                value={batalAlasan}
                onChange={(e) => {
                  setBatalAlasan(e.target.value);
                  if (batalError) setBatalError("");
                }}
                disabled={batalSubmitting}
              />
              <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "4px" }}>
                Alasan ini wajib diisi dan akan disimpan di basis data.
              </div>
            </div>

            {/* Actions */}
            <div style={inlineActions}>
              <button
                type="button"
                style={btnCancel}
                onClick={() => setShowBatalModal(false)}
                disabled={batalSubmitting}
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={handleConfirmBatal}
                disabled={batalSubmitting || !batalAlasan.trim()}
                style={{
                  padding: "0.55rem 1.4rem",
                  borderRadius: "10px",
                  border: "none",
                  background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  boxShadow: "0 4px 15px rgba(220,38,38,0.35)",
                  transition: "all 0.15s",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  opacity: batalSubmitting || !batalAlasan.trim() ? 0.6 : 1,
                }}
              >
                {batalSubmitting ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" style={{ animation: "spin 0.7s linear infinite" }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
                    Membatalkan...
                  </>
                ) : (
                  <>
                    <span>🚫</span> Konfirmasi Pembatalan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Modal ── */}
      <div
        className={embedded ? "grup-embedded-overlay" : "modal-overlay"}
        onClick={(e) => !embedded && e.target === e.currentTarget && onClose()}
      >
        <div className={embedded ? "grup-embedded-panel" : "modal-panel"}>
          {/* Header */}
          {!embedded && <div className="modal-header">
            <div>
              <div className="modal-title">
                <span>📋</span> Detail Pendaftaran
              </div>
              {data && (
                <div className="modal-subtitle">
                  {data.nomor_pendaftaran} {data.nomor_invoice ? `• ${data.nomor_invoice}` : ""}
                </div>
              )}
            </div>
            <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Tutup" title="Tutup">
              <LuX size={16} />
            </button>
          </div>}

          {/* Body */}
          <div className="modal-body">
            {loading ? (
              <div className="modal-loading">
                <div className="modal-spin" />
                Memuat data detail pendaftaran...
              </div>
            ) : !data ? (
              <div className="modal-loading" style={{ color: "#ef4444" }}>
                Gagal memuat data pendaftaran.
              </div>
            ) : (
              <>
                {/* ── Bagian Informasi Pembatalan (Jika Status Batal) ── */}
                {data.status === "batal" && (
                  <div style={{
                    background: "linear-gradient(135deg, #fff1f2, #ffe4e6)",
                    border: "1.5px solid #fecdd3",
                    borderRadius: 14,
                    padding: "1.25rem 1.5rem",
                    marginBottom: "1.25rem",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <span style={{ fontSize: "1.4rem" }}>🚫</span>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "#9f1239" }}>
                            Informasi Pembatalan
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "#be123c" }}>
                            Pendaftaran jamaah ini telah dibatalkan
                          </div>
                        </div>
                      </div>
                      <span className="status-pill status-batal" style={{ fontSize: "0.82rem", padding: "4px 12px", fontWeight: 800 }}>
                        Status: Batal
                      </span>
                    </div>

                    <div style={{
                      background: "#ffffff",
                      borderRadius: "10px",
                      padding: "1rem 1.25rem",
                      border: "1px solid #ffe4e6",
                    }}>
                      <div style={{ marginBottom: "0.75rem" }}>
                        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#9f1239", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.3rem" }}>
                          Alasan Pembatalan:
                        </div>
                        <div style={{ fontSize: "0.92rem", color: "#1e293b", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                          {data.alasan_pembatalan || "(Tidak ada alasan dicatat)"}
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem", paddingTop: "0.75rem", borderTop: "1px dashed #fecdd3" }}>
                        <div>
                          <div style={{ fontSize: "0.72rem", color: "#9f1239", fontWeight: 600 }}>Dibatalkan Pada:</div>
                          <div style={{ fontSize: "0.85rem", color: "#1e293b", fontWeight: 700, marginTop: "2px" }}>
                            {data.dibatalkan_pada ? fmtDateTime(data.dibatalkan_pada) : "-"}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: "0.72rem", color: "#9f1239", fontWeight: 600 }}>Dibatalkan Oleh:</div>
                          <div style={{ fontSize: "0.85rem", color: "#1e293b", fontWeight: 700, marginTop: "2px" }}>
                            {data.dibatalkan_oleh_nama || "Admin Bonita"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {/* ── Banner Siap Berangkat (Pengesahan Manager) ── */}
                {!embedded && data.status === "siap_berangkat" && (
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
                            {data.approver?.nama || data.approver?.Nama || data.approver_nama || "Administration Manager"}
                          </strong>{" "}
                          pada {fmtDateTime(data.approved_at)}. Seluruh persyaratan berkas jamaah dan pelunasan invoice telah tervalidasi final.
                        </div>
                      </div>
                    </div>
                    <span className="verif-readonly-pill">🔒 Siap Berangkat</span>
                  </div>
                )}

                {/* ── Banner Perlu Perbaikan dari Manager ── */}
                {!embedded && data.status === "perlu_perbaikan" && (
                  <div className="verif-perbaikan-banner">
                    <div className="verif-perbaikan-icon">⚠️</div>
                    <div className="verif-perbaikan-content">
                      <div className="verif-perbaikan-title">
                        Pendaftaran Memerlukan Perbaikan Dari Tim Admin
                      </div>
                      <div className="verif-perbaikan-desc">
                        Pendaftaran ini dikembalikan oleh Administration Manager dengan catatan perbaikan berikut:
                      </div>
                      <div className="verif-perbaikan-text">
                        {data.catatan_verifikasi_manager || "(Tidak ada rincian catatan perbaikan)"}
                      </div>
                      <div style={{ marginTop: 12 }}>
                        <button
                          type="button"
                          disabled={submittingAjukan}
                          onClick={handleAjukanVerifikasi}
                          className="modal-btn-primary"
                          style={{
                            background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
                            boxShadow: "0 2px 8px rgba(220, 38, 38, 0.3)",
                          }}
                        >
                          {submittingAjukan ? "Mengajukan..." : "🛡️ Ajukan Verifikasi Ulang ke Manager"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── 1. Ringkasan Pendaftaran & Tagihan ── */}
                {!embedded && (<div className="modal-section">
                  <div className="modal-section-title">
                    <span>📋 Ringkasan Pendaftaran &amp; Tagihan</span>
                    {data.status === "siap_berangkat" ? (
                      <span className="status-pill status-selesai">✓ Siap Berangkat</span>
                    ) : data.status === "perlu_perbaikan" ? (
                      <span className="status-pill status-batal">⚠️ Perlu Perbaikan</span>
                    ) : (
                      <StatusPill value={data.status} />
                    )}
                  </div>
                  <div className="modal-grid-3">
                    <div className="modal-info-item">
                      <span className="modal-info-label">Paket Umroh</span>
                      <span className="modal-info-val">{data.paket || "-"}</span>
                    </div>
                    <div className="modal-info-item">
                      <span className="modal-info-label">Tanggal Keberangkatan</span>
                      <span className="modal-info-val">{fmtDate(data.tanggal_berangkat)}</span>
                    </div>
                    <div className="modal-info-item">
                      <span className="modal-info-label">Total Jamaah</span>
                      <span className="modal-info-val">{data.grup_count ?? 1} Orang</span>
                    </div>
                    <div className="modal-info-item">
                      <span className="modal-info-label">Total Tagihan</span>
                      <span className="modal-info-val">{fmtRupiah(data.total_tagihan ?? data.harga ?? 0)}</span>
                    </div>
                    <div className="modal-info-item">
                      <span className="modal-info-label">Total Dibayar</span>
                      <span className="modal-info-val" style={{ color: "#059669" }}>
                        {fmtRupiah(data.total_pembayaran ?? 0)}
                      </span>
                    </div>
                    <div className="modal-info-item">
                      <span className="modal-info-label">Status Pembayaran</span>
                      <div style={{ marginTop: 2 }}>
                        <StatusPill value={data.payment_status} />
                      </div>
                    </div>
                    <div className="modal-info-item">
                      <span className="modal-info-label">Status Dokumen</span>
                      <div style={{ marginTop: 2 }}>
                        <StatusPill value={data.document_status} />
                      </div>
                    </div>
                    <div className="modal-info-item">
                      <span className="modal-info-label">Asal Pendaftaran</span>
                      <span className="modal-info-val" style={{ textTransform: "capitalize" }}>
                        {data.registration_source === "admin"
                          ? "Admin"
                          : data.registration_source === "chatbot"
                          ? "AI Chatbot"
                          : "Customer"}
                      </span>
                    </div>
                    <div className="modal-info-item">
                      <span className="modal-info-label">Didaftarkan Oleh</span>
                      <span
                        className="modal-info-val"
                        style={{
                          fontWeight: 700,
                          color:
                            data.registration_source === "admin"
                              ? "#1a6b43"
                              : data.registration_source === "chatbot"
                              ? "#0369a1"
                              : "#374151",
                        }}
                      >
                        {data.registered_by_label ?? "👤 Customer"}
                      </span>
                    </div>
                  </div>
                </div>)}

                {/* ── 2. Data Jamaah ── */}
                <div className="modal-section">
                  <div className="modal-section-title">
                    <span>👥 {embedded ? "Informasi Biodata Jamaah" : "Data Jamaah"}</span>
                  </div>

                    <div className="modal-jamaah-card">
                      {!embedded && (
                      <div className="modal-jamaah-header">
                        <div>
                          <span className="modal-jamaah-name">{data.nama_customer || "-"}</span>
                          <span style={{ fontSize: "0.78rem", color: "#64748b", marginLeft: 8 }}>
                            ({data.nomor_pendaftaran})
                          </span>
                        </div>
                      </div>
                      )}
                      <div className="modal-grid-3">
                        <div className="modal-info-item">
                          <span className="modal-info-label">Nama Lengkap</span>
                          <span className="modal-info-val">{data.nama_customer || "-"}</span>
                        </div>
                        <div className="modal-info-item">
                          <span className="modal-info-label">NIK</span>
                          <span className="modal-info-val" style={{ fontFamily: "monospace" }}>
                            {data.nik || "-"}
                          </span>
                        </div>
                        <div className="modal-info-item">
                          <span className="modal-info-label">Tempat / Tanggal Lahir</span>
                          <span className="modal-info-val">
                            {data.tempat_lahir || "-"}, {fmtDate(data.tanggal_lahir)}
                          </span>
                        </div>
                        <div className="modal-info-item">
                          <span className="modal-info-label">Jenis Kelamin</span>
                          <span className="modal-info-val">{data.jenis_kelamin || "-"}</span>
                        </div>
                        <div className="modal-info-item">
                          <span className="modal-info-label">Nomor HP</span>
                          <span className="modal-info-val">{data.no_hp || "-"}</span>
                        </div>
                        <div className="modal-info-item">
                          <span className="modal-info-label">Email</span>
                          <span className="modal-info-val">{data.email || "-"}</span>
                        </div>
                        <div className="modal-info-item full">
                          <span className="modal-info-label">Alamat Lengkap</span>
                          <span className="modal-info-val">
                            {data.alamat_lengkap ||
                              [data.kelurahan_desa, data.kecamatan, data.kabupaten_kota, data.provinsi, data.kode_pos]
                                .filter(Boolean)
                                .join(", ") ||
                              "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                </div>

                {/* ── 3. Informasi Paket Umroh & Perlengkapan ── */}
                {!embedded && (
                  <div className="modal-section">
                    <div className="modal-section-title">
                      <span>🕌 Informasi Paket Umroh &amp; Perlengkapan</span>
                    </div>
                    <div className="modal-grid-3">
                      <div className="modal-info-item">
                        <span className="modal-info-label">Nama Paket</span>
                        <span className="modal-info-val">{data.paket || "-"}</span>
                      </div>
                      <div className="modal-info-item">
                        <span className="modal-info-label">Harga Paket</span>
                        <span className="modal-info-val" style={{ color: "#1a6b43", fontWeight: 700 }}>
                          {fmtRupiah(data.harga || 0)}
                        </span>
                      </div>
                      <div className="modal-info-item">
                        <span className="modal-info-label">Tanggal Berangkat</span>
                        <span className="modal-info-val">{fmtDate(data.tanggal_berangkat)}</span>
                      </div>
                    </div>

                    {/* Card Perlengkapan Tambahan */}
                    <div
                      style={{
                        background: data.ambil_perlengkapan ? "#f0fdf4" : "#ffffff",
                        border: `1.5px solid ${data.ambil_perlengkapan ? "#86efac" : "#e2e8f0"}`,
                        borderRadius: 12,
                        padding: "0.9rem 1.15rem",
                        marginTop: "1rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: "0.5rem",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          <span style={{ fontSize: "1.2rem", color: data.ambil_perlengkapan ? "#16a34a" : "#94a3b8" }}>
                            {data.ambil_perlengkapan ? "☑" : "☐"}
                          </span>
                          <div>
                            <div
                              style={{
                                fontWeight: 700,
                                fontSize: "0.88rem",
                                color: data.ambil_perlengkapan ? "#15803d" : "#475569",
                              }}
                            >
                              {data.ambil_perlengkapan
                                ? `Mengambil Perlengkapan Tambahan — ${fmtRupiah(data.harga_perlengkapan)}`
                                : "Tidak Mengambil Perlengkapan Tambahan"}
                            </div>
                            {data.ambil_perlengkapan && (
                              <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 2 }}>
                                Koper 22" • Koper 24" • Kain Ihram • Mukena • Ikat Pinggang • Buku Doa • Tas Paspor
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                          {data.total_perlengkapan > 0 && (
                            <span
                              style={{
                                fontSize: "0.78rem",
                                fontWeight: 600,
                                color: "#166534",
                                background: "#dcfce7",
                                padding: "0.2rem 0.6rem",
                                borderRadius: 8,
                              }}
                            >
                              Total Invoice: {fmtRupiah(data.total_perlengkapan)}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditPerlengkapan(data.nomor_pendaftaran)}
                            style={{
                              background: "#ffffff",
                              border: "1.5px solid #16a34a",
                              color: "#15803d",
                              borderRadius: 8,
                              padding: "0.3rem 0.75rem",
                              fontSize: "0.78rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.35rem",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                              transition: "all 0.15s ease",
                            }}
                          >
                            ✏️ Ubah Perlengkapan
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── 4. Riwayat & Ringkasan Pembayaran ── */}
                {!embedded && (<div className="modal-section">
                  <div className="modal-section-title">
                    <span>💳 Riwayat &amp; Ringkasan Pembayaran</span>
                    <button style={addBtn} onClick={openAddPay}>
                      + Tambah Pembayaran
                    </button>
                  </div>

                  {/* Card Ringkasan Invoice */}
                  {(() => {
                    if (!data.nomor_invoice) {
                      return (
                        <div
                          style={{
                            background: "#ffffff",
                            border: "1.5px dashed #cbd5e1",
                            borderRadius: 12,
                            padding: "1rem 1.25rem",
                            textAlign: "center",
                            color: "#94a3b8",
                            fontSize: "0.84rem",
                            marginBottom: "1rem",
                          }}
                        >
                          Belum ada invoice terkait untuk pendaftaran ini.
                        </div>
                      );
                    }
                    const totalTagihan = data.total_tagihan ?? 0;
                    const totalPembayaran = data.total_pembayaran ?? 0;
                    const sisa = Math.max(0, totalTagihan - totalPembayaran);
                    const pct = totalTagihan > 0 ? Math.min((totalPembayaran / totalTagihan) * 100, 100) : 0;
                    const isGrup = (data.grup_count ?? 1) > 1;

                    return (
                      <div
                        style={{
                          background: "linear-gradient(135deg, #0f172a 0%, #0a2e1c 100%)",
                          borderRadius: 14,
                          padding: "1rem 1.25rem",
                          color: "#ffffff",
                          marginBottom: "1rem",
                          boxShadow: "0 4px 15px rgba(0,0,0,0.12)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "0.85rem",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "0.74rem",
                              fontWeight: 700,
                              color: "#86efac",
                              textTransform: "uppercase",
                              letterSpacing: "0.08em",
                            }}
                          >
                            {isGrup ? `Invoice Grup (${data.grup_count} Jamaah)` : "Invoice Individu"} •{" "}
                            {data.nomor_invoice}
                          </div>
                          <StatusPill value={data.payment_status} />
                        </div>
                        <div className="modal-grid-2" style={{ marginBottom: "1rem" }}>
                          <div>
                            <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginBottom: "2px" }}>
                              Total Tagihan
                            </div>
                            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#f8fafc" }}>
                              {fmtRupiah(totalTagihan)}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginBottom: "2px" }}>
                              Total Dibayar
                            </div>
                            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#4ade80" }}>
                              {fmtRupiah(totalPembayaran)}
                            </div>
                          </div>
                        </div>
                        {/* Progress Bar */}
                        <div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "0.75rem",
                              color: "#cbd5e1",
                              marginBottom: "0.4rem",
                            }}
                          >
                            <span>Progress Pembayaran</span>
                            <span>{pct.toFixed(1)}%</span>
                          </div>
                          <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 999, height: 8 }}>
                            <div
                              style={{
                                background: pct >= 100 ? "#34d399" : "#22c55e",
                                height: 8,
                                borderRadius: 999,
                                width: `${pct}%`,
                                transition: "width 0.4s",
                              }}
                            />
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "0.75rem",
                              color: "#94a3b8",
                              marginTop: "0.45rem",
                            }}
                          >
                            <span>
                              Sisa Tagihan: <strong style={{ color: "#f87171" }}>{fmtRupiah(sisa)}</strong>
                            </span>
                            {data.nomor_invoice && (
                              <button
                                type="button"
                                onClick={handleOpenInvoice}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#86efac",
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  textDecoration: "underline",
                                }}
                              >
                                Buka Lembar Invoice ↗
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Riwayat Pembayaran List */}
                  {payments.length === 0 ? (
                    <div style={{ fontSize: "0.82rem", color: "#94a3b8", fontStyle: "italic", padding: "0.5rem 0" }}>
                      Belum ada catatan pembayaran.
                    </div>
                  ) : (
                    payments.map((pay, i) => (
                      <div
                        key={pay.id || i}
                        style={{
                          background: "#ffffff",
                          borderRadius: "10px",
                          marginBottom: "0.55rem",
                          border: "1px solid #e2e8f0",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "0.65rem 1rem",
                            fontSize: "0.86rem",
                          }}
                        >
                          <span style={{ color: "#374151", fontWeight: 600 }}>
                            {payLabel(i)}
                            {pay.tanggal ? ` — ${fmtDate(pay.tanggal)}` : ""}
                          </span>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                            <span style={{ fontWeight: 700, color: "#1e293b" }}>{fmtRupiah(pay.jumlah)}</span>
                            <StatusPill value={pay.status} />
                          </div>
                        </div>
                        <div
                          style={{
                            borderTop: "1px solid #f1f5f9",
                            padding: "0.4rem 1rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.4rem",
                            background: "#f8fafc",
                            flexWrap: "wrap",
                          }}
                        >
                          {pay.bukti && (
                            <a
                              href={pay.bukti}
                              target="_blank"
                              rel="noreferrer"
                              style={{ ...actionBtn("#059669"), textDecoration: "none" }}
                            >
                              👁️ Lihat Bukti
                            </a>
                          )}
                          <button style={actionBtn("#1a6b43")} onClick={() => openEditPay(pay)}>
                            ✏ Edit
                          </button>
                          <button
                            style={actionBtn("#ef4444")}
                            onClick={() => deletePay(pay.id)}
                            disabled={deletingPayId === pay.id}
                          >
                            {deletingPayId === pay.id ? "⏳" : "🗑 Hapus"}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>)}

                {/* ── 5. Dokumen Persyaratan ── */}
                <div className="modal-section">
                  <div className="modal-section-title">
                    <span>📄 {embedded ? "Dokumen Persyaratan Jamaah" : "Dokumen Persyaratan"}</span>
                    <button style={addBtn} onClick={openAddDoc}>
                      + Upload Dokumen
                    </button>
                  </div>

                  {docs.filter((d) => !isTravelDoc(d.jenis)).length === 0 ? (
                    <div style={{ fontSize: "0.82rem", color: "#94a3b8", fontStyle: "italic", padding: "0.6rem 0" }}>
                      Belum ada dokumen persyaratan yang diunggah.
                    </div>
                  ) : (
                    <div className="modal-docs-grid">
                      {docs
                        .filter((d) => !isTravelDoc(d.jenis))
                        .map((dok, i) => (
                          <div key={dok.id || i} className="modal-doc-item">
                            <div className="modal-doc-info">
                              <span className="modal-doc-name" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                <span style={{ fontSize: "1.1rem" }}>{getDocIcon(dok.jenis)}</span>
                                <span>{getDocLabel(dok.jenis)}</span>
                              </span>
                              <span style={{ fontSize: "0.7rem", color: "#64748b" }}>
                                <StatusPill value={dok.status} />
                              </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                              {dok.file_path && (
                                <a
                                  href={dok.file_path}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="modal-doc-btn-preview"
                                  title="Lihat file dokumen"
                                >
                                  👁️ Lihat
                                </a>
                              )}
                              <button
                                type="button"
                                style={actionBtn("#1a6b43")}
                                onClick={() => openEditDoc(dok)}
                                title="Edit dokumen"
                              >
                                ✏
                              </button>
                              <button
                                type="button"
                                style={actionBtn("#ef4444")}
                                onClick={() => deleteDoc(dok.id)}
                                disabled={deletingDocId === dok.id}
                                title="Hapus dokumen"
                              >
                                {deletingDocId === dok.id ? "⏳" : "🗑"}
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* ── 6. Dokumen Perjalanan Jamaah (Read-Only) ── */}
                <div className="modal-section">
                  <div className="modal-section-title">
                    <span>✈️ {embedded ? "Dokumen Perjalanan Jamaah" : "Dokumen Perjalanan"}</span>
                    <span style={{ fontSize: "0.74rem", color: "#64748b", fontWeight: 600 }}>
                      Dikelola Administration Manager
                    </span>
                  </div>

                  <div className="modal-docs-grid">
                    {TRAVEL_DOC_CONFIGS.map((t) => {
                      const doc = travelDocsMap[t.key];
                      const hasFile = Boolean(doc && doc.file_path);
                      return (
                        <div key={t.key} className="modal-doc-item" style={{ background: hasFile ? "#f8fafc" : "#fafafa" }}>
                          <div className="modal-doc-info">
                            <span className="modal-doc-name" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                              <span style={{ fontSize: "1.1rem" }}>{t.icon}</span>
                              <span style={{ fontWeight: 600 }}>{t.label}</span>
                            </span>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: 2 }}>
                              {hasFile ? (
                                <StatusPill value={doc?.status || "diterima"} />
                              ) : (
                                <span
                                  style={{
                                    fontSize: "0.72rem",
                                    color: "#94a3b8",
                                    fontStyle: "italic",
                                    background: "#f1f5f9",
                                    padding: "2px 8px",
                                    borderRadius: "6px",
                                  }}
                                >
                                  Belum tersedia
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                            {hasFile ? (
                              <a
                                href={doc!.file_path}
                                target="_blank"
                                rel="noreferrer"
                                className="modal-doc-btn-preview"
                                title={`Lihat ${t.label}`}
                              >
                                👁️ Lihat
                              </a>
                            ) : (
                              <span
                                style={{
                                  fontSize: "0.75rem",
                                  color: "#cbd5e1",
                                  padding: "4px 8px",
                                  userSelect: "none",
                                }}
                              >
                                —
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── 7. Admin PIC / Penanggung Jawab ── */}
                {!embedded && (<div className="modal-assign-section">
                  <div className="modal-section-title" style={{ color: "#166534" }}>
                    <span>👷 Admin PIC / Penanggung Jawab</span>
                    {data.admin_pic ? (
                      <span className="modal-pic-badge">✓ Ditugaskan</span>
                    ) : (
                      <span className="status-pill status-menunggu">Belum Ditugaskan</span>
                    )}
                  </div>

                  {data.admin_pic ? (
                    <div className="modal-pic-assigned">
                      <div className="modal-pic-avatar">
                        {data.admin_pic.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                          <span className="modal-pic-name">{data.admin_pic}</span>
                          {authNama && data.admin_pic.trim().toLowerCase() === authNama.trim().toLowerCase() && (
                            <span style={{
                              background: "#dcfce7",
                              color: "#166534",
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              padding: "0.15rem 0.55rem",
                              borderRadius: 999,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                            }}>
                              ✓ Tanggung Jawab Anda
                            </span>
                          )}
                        </div>
                        <div className="modal-pic-label">
                          {authNama && data.admin_pic.trim().toLowerCase() === authNama.trim().toLowerCase()
                            ? "Pendaftaran ini menjadi tanggung jawab Anda sebagai Admin PIC."
                            : "Admin PIC yang bertanggung jawab menangani dan mendampingi pendaftaran ini."}
                        </div>
                      </div>
                      {/* Kontrol Ganti PIC HANYA untuk Administration Manager */}
                      {isManager && (
                        <button
                          type="button"
                          className="modal-btn-secondary"
                          style={{ padding: "0.45rem 0.85rem", fontSize: "0.78rem" }}
                          onClick={() => setShowAssignModal(true)}
                        >
                          🔄 Ganti PIC
                        </button>
                      )}
                    </div>
                  ) : assignSuccess ? (
                    <div className="modal-assign-success">
                      ✅ Berhasil! Anda telah menjadi PIC untuk pendaftaran ini.
                    </div>
                  ) : (
                    <div className="modal-assign-empty">
                      <div className="modal-assign-empty-icon">👤</div>
                      <div className="modal-assign-empty-text">
                        Belum ada Admin yang bertanggung jawab atas pendaftaran ini.
                      </div>
                      {assignError && (
                        <div className="modal-assign-error">⚠️ {assignError}</div>
                      )}
                      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", justifyContent: "center", marginTop: "0.5rem" }}>
                        {/* Jika Administration Manager, sediakan opsi Tugaskan ke Admin */}
                        {isManager && (
                          <button
                            type="button"
                            className="modal-btn-primary"
                            onClick={() => setShowAssignModal(true)}
                          >
                            <span>👥</span> Tugaskan ke Admin
                          </button>
                        )}
                        {/* Tombol Jadikan Saya PIC (HANYA INI yang tampil untuk Admin biasa) */}
                        <button
                          type="button"
                          className={isManager ? "modal-btn-secondary" : "modal-btn-primary"}
                          onClick={handleAssign}
                          disabled={assigning}
                        >
                          {assigning ? (
                            <><div className="mini-spin-w" /> Memproses...</>
                          ) : (
                            <><span>🙋</span> Jadikan Saya PIC</>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>)}
              </>
            )}
          </div>

          {/* Footer */}
          {!embedded && <div className="modal-footer">
            <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
              {data?.nomor_invoice && (
                <button
                  type="button"
                  className="modal-btn-secondary"
                  onClick={handleOpenInvoice}
                >
                  📄 Buka Lembar Invoice
                </button>
              )}
              {data && data.status !== "batal" && data.status !== "selesai" && data.status !== "kadaluarsa" && (
                <button
                  type="button"
                  className="modal-btn-danger"
                  style={{
                    backgroundColor: "#ef4444",
                    color: "#ffffff",
                    border: "none",
                    padding: "0.55rem 1rem",
                    borderRadius: "8px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem"
                  }}
                  onClick={() => setShowBatalModal(true)}
                >
                  <span>⚠️</span> Batalkan Pendaftaran
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
              {/* Tombol Assign PIC di footer DIHAPUS untuk Admin. Hanya untuk Manager bila belum ada PIC */}
              {isManager && !data?.admin_pic && (
                <button
                  type="button"
                  className="modal-btn-primary"
                  onClick={() => setShowAssignModal(true)}
                >
                  <span>👥</span> Assign PIC
                </button>
              )}
              <button type="button" className="modal-btn-secondary" onClick={onClose}>
                Tutup
              </button>
            </div>
          </div>}
        </div>
      </div>

      {/* ── Sub-Modal Assign Pendaftaran (Hanya untuk Administration Manager) ── */}
      {showAssignModal && isManager && data && (
        <AssignModal
          nomor={data.nomor_pendaftaran}
          token={token}
          initialData={data}
          onClose={() => setShowAssignModal(false)}
          onAssigned={() => {
            setShowAssignModal(false);
            fetchData();
            onAssigned?.();
          }}
        />
      )}
    </>
  );
};




// ── Main Component ────────────────────────────────────────────────────────────

// ── Invoice Group Type ──────────────────────────────────────────────────────

interface InvoiceGroup {
  nomor_invoice: string;
  paket: string;
  payment_status: string;
  total_tagihan: number;
  total_pembayaran: number;
  jamaah: PendaftaranItem[];
  tanggal: string;
}

// ── Helper: group list by nomor_invoice ─────────────────────────────────────

const groupByInvoice = (list: (PendaftaranItem & { nomor_invoice?: string; total_tagihan?: number; total_pembayaran?: number })[]): InvoiceGroup[] => {
  const map: Record<string, InvoiceGroup> = {};
  for (const p of list) {
    const key = p.nomor_invoice || p.nomor_pendaftaran;
    if (!map[key]) {
      map[key] = {
        nomor_invoice: key,
        paket: p.paket,
        payment_status: p.payment_status,
        total_tagihan: p.total_tagihan ?? 0,
        total_pembayaran: p.total_pembayaran ?? 0,
        jamaah: [],
        tanggal: p.tanggal_daftar,
      };
    }
    map[key].jamaah.push(p);
  }
  for (const g of Object.values(map)) {
    g.jamaah.sort((a, b) => {
      const timeA = new Date(a.tanggal_daftar).getTime();
      const timeB = new Date(b.tanggal_daftar).getTime();
      if (timeA !== timeB) return timeA - timeB;
      return a.nomor_pendaftaran.localeCompare(b.nomor_pendaftaran);
    });
    if (g.jamaah.length > 0) {
      g.tanggal = g.jamaah[0].tanggal_daftar;
      g.paket = g.jamaah[0].paket;
    }
  }
  return Object.values(map).filter(g => g.jamaah.length > 1);
};

// ── GrupDetailModal ──────────────────────────────────────────────────────────

const GrupDetailModal = ({
  nomorInvoice,
  token,
  allPendaftaran,
  onClose,
  onChanged,
}: {
  nomorInvoice: string;
  token: string;
  allPendaftaran: (PendaftaranItem & { nomor_invoice?: string; total_tagihan?: number; total_pembayaran?: number })[];
  onClose: () => void;
  /** Dipanggil saat modal ditutup bila ada perubahan data jamaah/pembayaran di dalam modal (untuk refresh daftar). */
  onChanged?: () => void;
}) => {
  const jamaahInGrup = useMemo(() => {
    const filtered = allPendaftaran.filter(p => (p.nomor_invoice || p.nomor_pendaftaran) === nomorInvoice);
    return filtered.slice().sort((a, b) => {
      const timeA = new Date(a.tanggal_daftar).getTime();
      const timeB = new Date(b.tanggal_daftar).getTime();
      if (timeA !== timeB) return timeA - timeB;
      return a.nomor_pendaftaran.localeCompare(b.nomor_pendaftaran);
    });
  }, [allPendaftaran, nomorInvoice]);
  const first = jamaahInGrup[0];

  const [totalTagihan, setTotalTagihan] = useState(first?.total_tagihan ?? 0);
  const [totalPembayaran, setTotalPembayaran] = useState(first?.total_pembayaran ?? 0);
  const [totalPerlengkapan, setTotalPerlengkapan] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState(first?.payment_status ?? "");
  const [tanggalBerangkat, setTanggalBerangkat] = useState("");
  const [regSource, setRegSource] = useState(first?.registration_source ?? "");
  const [regByLabel, setRegByLabel] = useState(first?.registered_by_label ?? "");
  const [grupJamaah, setGrupJamaah] = useState<{ nomor_pendaftaran: string; nama: string; nik: string }[]>([]);
  const [groupStatus, setGroupStatus] = useState(first?.status ?? "");
  const [groupCatatan, setGroupCatatan] = useState(first?.catatan_verifikasi_manager ?? "");
  const [submittingAjukanGrup, setSubmittingAjukanGrup] = useState(false);

  const kontakUtama = (grupJamaah.length > 0 ? grupJamaah[0].nama : "") || first?.nama_customer || "";

  // Jamaah yang sedang terbuka diidentifikasi lewat nomor_pendaftaran (bukan index). Default: jamaah pertama.
  const [openNomor, setOpenNomor] = useState<string | null>(first?.nomor_pendaftaran ?? null);
  // Status terbaru per jamaah (hasil load detail) agar badge baris ikut berubah setelah edit dokumen/dll.
  const [liveInfo, setLiveInfo] = useState<Record<string, { status: string; document_status: string }>>({});
  const syncSigRef = useRef<Record<string, string>>({});
  const dirtyRef = useRef(false);
  const { showToast } = useToast();

  // ── Modal Tambah Pembayaran Grup ──
  const [showPayModal, setShowPayModal] = useState(false);
  const [payJumlah, setPayJumlah] = useState("");
  const [payTanggal, setPayTanggal] = useState(new Date().toISOString().split("T")[0]);
  const [payFile, setPayFile] = useState<File | null>(null);
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payError, setPayError] = useState("");

  const handleClose = () => {
    if (dirtyRef.current) onChanged?.();
    onClose();
  };

  const handleJamaahLoaded = useCallback((d: DetailPendaftaran) => {
    const sig = `${d.status}|${d.document_status}|${d.total_tagihan}|${d.total_pembayaran}|${d.total_perlengkapan}|${d.ambil_perlengkapan}`;
    const prev = syncSigRef.current[d.nomor_pendaftaran];
    if (prev !== undefined && prev !== sig) dirtyRef.current = true;
    syncSigRef.current[d.nomor_pendaftaran] = sig;
    setLiveInfo((cur) => ({ ...cur, [d.nomor_pendaftaran]: { status: d.status, document_status: d.document_status } }));
    if (d.total_tagihan !== undefined) setTotalTagihan(d.total_tagihan);
    if (d.total_pembayaran !== undefined) setTotalPembayaran(d.total_pembayaran);
    if (d.total_perlengkapan !== undefined) setTotalPerlengkapan(d.total_perlengkapan);
    if (d.payment_status) setPaymentStatus(d.payment_status);
    if (d.status) setGroupStatus(d.status);
    if (d.tanggal_berangkat) setTanggalBerangkat(d.tanggal_berangkat);
    if (d.registration_source) setRegSource(d.registration_source);
    if (d.registered_by_label) setRegByLabel(d.registered_by_label);
  }, []);

  const fetchGroupDetail = useCallback(async () => {
    if (!first) return;
    try {
      const res = await axios.get(`${API}/admin/pendaftaran/${first.nomor_pendaftaran}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const p = res.data?.pendaftaran;
      if (p?.total_tagihan !== undefined) setTotalTagihan(p.total_tagihan);
      if (p?.total_pembayaran !== undefined) setTotalPembayaran(p.total_pembayaran);
      if (p?.total_perlengkapan !== undefined) setTotalPerlengkapan(p.total_perlengkapan);
      if (p?.payment_status) setPaymentStatus(p.payment_status);
      if (p?.status) setGroupStatus(p.status);
      if (p?.catatan_verifikasi_manager) setGroupCatatan(p.catatan_verifikasi_manager);
      const tgl = p?.Paket?.TanggalBerangkat ?? p?.Paket?.tanggal_berangkat ?? p?.tanggal_berangkat ?? "";
      if (tgl) setTanggalBerangkat(tgl);
      if (p?.registration_source) setRegSource(p.registration_source);
      if (p?.registered_by_label) setRegByLabel(p.registered_by_label);
      const rawGrup = res.data?.grup_jamaah ?? [];
      if (rawGrup.length > 0) {
        setGrupJamaah(rawGrup.map((g: Record<string, unknown>) => ({
          nomor_pendaftaran: String(g.nomor_pendaftaran ?? ""),
          nama: String(g.nama ?? ""),
          nik: String(g.nik ?? ""),
        })));
      }
    } catch { /* silent */ }
  }, [first, token]);

  useEffect(() => {
    fetchGroupDetail();
  }, [fetchGroupDetail]);

  const groupDocStatus = useMemo(() => {
    const activeMembers = jamaahInGrup.filter(
      (j) => (liveInfo[j.nomor_pendaftaran]?.status ?? j.status) !== "batal"
    );
    if (activeMembers.length === 0) return "belum";
    const statuses = activeMembers.map((j) =>
      (liveInfo[j.nomor_pendaftaran]?.document_status ?? j.document_status)?.toLowerCase()
    );
    if (statuses.every((s) => s === "lengkap")) return "lengkap";
    if (statuses.some((s) => s === "revisi" || s === "ditolak")) return "revisi";
    if (statuses.some((s) => s === "pending")) return "pending";
    if (statuses.some((s) => s === "belum_lengkap")) return "belum_lengkap";
    if (statuses.every((s) => s === "belum")) return "belum";
    return statuses[0] || "belum";
  }, [jamaahInGrup, liveInfo]);

  const handleAjukanVerifikasiGrup = async () => {
    if (!first) return;
    setSubmittingAjukanGrup(true);
    try {
      const res = await axios.post(`${API}/admin/pendaftaran/${first.nomor_pendaftaran}/ajukan-verifikasi`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast("success", res.data?.message || "✓ Pendaftaran grup berhasil diajukan ulang ke Administration Manager.");
      setGroupStatus("menunggu_verifikasi_manager");
      dirtyRef.current = true;
      window.dispatchEvent(new Event("admin-badge-refresh"));
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? (err.response?.data?.error ?? "Gagal mengajukan verifikasi.") : "Gagal mengajukan verifikasi.";
      showToast("error", msg);
    } finally {
      setSubmittingAjukanGrup(false);
    }
  };

  const handleOpenInvoice = async () => {
    const targetInvoice = first?.nomor_invoice || nomorInvoice;
    if (!targetInvoice) return;
    try {
      const res = await fetch(`${API}/admin/invoice?nomor=${targetInvoice}`, {
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

  const openAddPay = () => {
    setPayJumlah("");
    setPayTanggal(new Date().toISOString().split("T")[0]);
    setPayFile(null);
    setPayError("");
    setShowPayModal(true);
  };

  const submitPay = async () => {
    if (!first) return;
    setPayError("");
    const nominal = parseFloat(payJumlah.replace(/[^\d]/g, ""));
    if (!nominal || isNaN(nominal) || nominal <= 0) {
      setPayError("Jumlah pembayaran tidak valid");
      showToast("error", "Jumlah pembayaran tidak valid.");
      return;
    }
    setPaySubmitting(true);
    try {
      const fd = new FormData();
      fd.append("jumlah", String(nominal));
      fd.append("tanggal_bayar", payTanggal);
      if (payFile) fd.append("bukti", payFile);

      await axios.post(`${API}/admin/pendaftaran/${first.nomor_pendaftaran}/pembayaran`, fd, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShowPayModal(false);
      dirtyRef.current = true;
      showToast("success", "Bukti pembayaran berhasil disimpan.");
      await fetchGroupDetail();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? (err.response?.data?.error ?? "Bukti pembayaran gagal disimpan.") : "Bukti pembayaran gagal disimpan.";
      setPayError(msg);
      showToast("error", msg);
    } finally {
      setPaySubmitting(false);
    }
  };

  const sisaPembayaran = Math.max(0, totalTagihan - totalPembayaran);
  const pct = totalTagihan > 0 ? Math.min((totalPembayaran / totalTagihan) * 100, 100) : 0;

  return (
    <>
      {showPayModal && (
        <div style={inlineModal} onClick={(e) => e.target === e.currentTarget && !paySubmitting && setShowPayModal(false)}>
          <div style={inlineBox}>
            <div style={{
              background: "linear-gradient(135deg, #1a6b43 0%, #0f5132 100%)",
              padding: "1.25rem 1.5rem",
              display: "flex", alignItems: "center", gap: "0.75rem",
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: "12px",
                background: "rgba(255,255,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.2rem",
              }}>
                💳
              </div>
              <div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}>
                  Tambah Pembayaran
                </div>
                <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.78rem", marginTop: "2px" }}>
                  {nomorInvoice} • Grup ({jamaahInGrup.length} Jamaah)
                </div>
              </div>
            </div>

            <div style={{ padding: "1.25rem 1.5rem" }}>
              {payError && (
                <div style={{
                  background: "#fef2f2", color: "#dc2626", borderRadius: "10px",
                  padding: "0.65rem 1rem", fontSize: "0.82rem", marginBottom: "0.75rem",
                  border: "1.5px solid #fecaca", display: "flex", alignItems: "center", gap: "0.5rem",
                }}>
                  <span>⚠️</span> {payError}
                </div>
              )}

              <label style={inlineLabel}>Jumlah Pembayaran *</label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)",
                  color: "#1a6b43", fontWeight: 700, fontSize: "0.9rem",
                }}>
                  Rp
                </span>
                <input
                  type="text"
                  placeholder="0"
                  value={payJumlah}
                  onChange={(e) => setPayJumlah(fmtPayInput(e.target.value))}
                  disabled={paySubmitting}
                  style={{ ...inlineInput, paddingLeft: "2.4rem", fontWeight: 700, fontSize: "1rem" }}
                  autoFocus
                />
              </div>

              <label style={inlineLabel}>Tanggal Pembayaran *</label>
              <input
                type="date"
                value={payTanggal}
                onChange={(e) => setPayTanggal(e.target.value)}
                disabled={paySubmitting}
                style={inlineInput}
              />

              <label style={inlineLabel}>Bukti Transfer (opsional)</label>
              <div style={{
                border: "2px dashed #cbd5e1", borderRadius: "10px",
                padding: "0.9rem 1rem", background: payFile ? "#f0fdf4" : "#f8fafc",
                textAlign: "center", cursor: "pointer", transition: "all 0.15s",
              }}>
                <input
                  id="pay-file-input-grup"
                  type="file"
                  accept="image/*,.pdf"
                  style={{ display: "none" }}
                  onChange={(e) => setPayFile(e.target.files?.[0] ?? null)}
                  disabled={paySubmitting}
                />
                <label htmlFor="pay-file-input-grup" style={{ cursor: "pointer", display: "block" }}>
                  {payFile ? (
                    <div style={{ color: "#059669", fontWeight: 600, fontSize: "0.84rem" }}>
                      ✅ {payFile.name}
                      <div style={{ color: "#64748b", fontWeight: 400, fontSize: "0.75rem", marginTop: "2px" }}>
                        {(payFile.size / 1024).toFixed(0)} KB — klik untuk ganti
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: "#94a3b8", fontSize: "0.83rem" }}>
                      <div style={{ fontSize: "1.3rem", marginBottom: "3px" }}>📎</div>
                      <div style={{ fontWeight: 600, color: "#1a6b43" }}>Pilih file bukti</div>
                      <div style={{ fontSize: "0.75rem", marginTop: "2px" }}>JPG, PNG, atau PDF</div>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div style={inlineActions}>
              <button style={btnCancel} onClick={() => setShowPayModal(false)} disabled={paySubmitting}>
                Batal
              </button>
              <button style={btnSubmit} onClick={submitPay} disabled={paySubmitting}>
                {paySubmitting ? "Menyimpan..." : "Simpan Pembayaran"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && handleClose()}>
        <div className="modal-panel">
          {/* Header */}
          <div className="modal-header">
            <div>
              <div className="modal-title">👥 Detail Grup{kontakUtama ? ` ${kontakUtama}` : ""}</div>
              <div className="modal-subtitle">{nomorInvoice}</div>
            </div>
            <button type="button" className="modal-close-btn" onClick={handleClose} aria-label="Tutup"><LuX size={16} /></button>
          </div>

          <div className="modal-body">
            {/* Banner Perlu Perbaikan untuk Grup */}
            {groupStatus === "perlu_perbaikan" && (
              <div style={{
                background: "linear-gradient(135deg, #fef2f2, #fff1f2)",
                border: "1.5px solid #fca5a5",
                borderRadius: 14,
                padding: "1rem 1.25rem",
                marginBottom: "1.25rem",
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
              }}>
                <span style={{ fontSize: "1.4rem" }}>⚠️</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: "0.92rem", color: "#991b1b" }}>
                    Pendaftaran Grup Perlu Perbaikan (Administration Manager)
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#b91c1c", marginTop: 4, lineHeight: 1.4 }}>
                    <strong>Catatan Manager:</strong> {groupCatatan || "-"}
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <button
                      type="button"
                      disabled={submittingAjukanGrup}
                      onClick={handleAjukanVerifikasiGrup}
                      style={{
                        background: "linear-gradient(135deg, #dc2626, #b91c1c)",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: 8,
                        padding: "0.5rem 1rem",
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        cursor: submittingAjukanGrup ? "not-allowed" : "pointer",
                        boxShadow: "0 2px 6px rgba(220, 38, 38, 0.3)",
                      }}
                    >
                      {submittingAjukanGrup ? "Mengajukan..." : "🛡️ Ajukan Verifikasi Ulang Grup ke Manager"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Bagian 1 — Ringkasan Pendaftaran & Tagihan ── */}
            <div className="modal-section">
              <div className="modal-section-title">
                <span>📋 Ringkasan Pendaftaran &amp; Tagihan</span>
                {groupStatus === "siap_berangkat" ? (
                  <span className="status-pill status-selesai">✓ Siap Berangkat</span>
                ) : groupStatus === "perlu_perbaikan" ? (
                  <span className="status-pill status-batal">⚠️ Perlu Perbaikan</span>
                ) : (
                  <StatusPill value={groupStatus || first?.status || ""} />
                )}
              </div>
              <div className="modal-grid-3">
                <div className="modal-info-item">
                  <span className="modal-info-label">Kontak Utama</span>
                  <span className="modal-info-val" style={{ fontWeight: 700, color: "#1e293b" }}>
                    {kontakUtama || "-"}
                  </span>
                </div>
                <div className="modal-info-item">
                  <span className="modal-info-label">Paket Umroh</span>
                  <span className="modal-info-val">{first?.paket || "-"}</span>
                </div>
                <div className="modal-info-item">
                  <span className="modal-info-label">Tanggal Keberangkatan</span>
                  <span className="modal-info-val">{fmtDate(tanggalBerangkat || "")}</span>
                </div>
                <div className="modal-info-item">
                  <span className="modal-info-label">Total Jamaah</span>
                  <span className="modal-info-val">{jamaahInGrup.length} Orang</span>
                </div>
                <div className="modal-info-item">
                  <span className="modal-info-label">Total Tagihan</span>
                  <span className="modal-info-val">{fmtRupiah(totalTagihan)}</span>
                </div>
                <div className="modal-info-item">
                  <span className="modal-info-label">Total Dibayar</span>
                  <span className="modal-info-val" style={{ color: "#059669" }}>
                    {fmtRupiah(totalPembayaran)}
                  </span>
                </div>
                <div className="modal-info-item">
                  <span className="modal-info-label">Status Pembayaran</span>
                  <div style={{ marginTop: 2 }}>
                    <StatusPill value={paymentStatus || first?.payment_status || ""} />
                  </div>
                </div>
                <div className="modal-info-item">
                  <span className="modal-info-label">Status Dokumen</span>
                  <div style={{ marginTop: 2 }}>
                    <StatusPill value={groupDocStatus} />
                  </div>
                </div>
                <div className="modal-info-item">
                  <span className="modal-info-label">Asal Pendaftaran</span>
                  <span className="modal-info-val" style={{ textTransform: "capitalize" }}>
                    {regSource === "admin"
                      ? "Admin"
                      : regSource === "chatbot"
                      ? "AI Chatbot"
                      : "Customer"}
                  </span>
                </div>
                <div className="modal-info-item">
                  <span className="modal-info-label">Didaftarkan Oleh</span>
                  <span
                    className="modal-info-val"
                    style={{
                      fontWeight: 700,
                      color:
                        regSource === "admin"
                          ? "#1a6b43"
                          : regSource === "chatbot"
                          ? "#0369a1"
                          : "#374151",
                    }}
                  >
                    {regByLabel || first?.registered_by_label || "👤 Customer"}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Bagian 2 — Ringkasan Invoice & Pembayaran ── */}
            <div className="modal-section">
              <div className="modal-section-title">
                <span>💳 Ringkasan Invoice</span>
                <button style={addBtn} onClick={openAddPay}>
                  + Tambah Pembayaran
                </button>
              </div>

              <div
                style={{
                  background: "linear-gradient(135deg, #0f172a 0%, #0a2e1c 100%)",
                  borderRadius: 14,
                  padding: "1.15rem 1.35rem",
                  color: "#ffffff",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.12)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.85rem",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.74rem",
                      fontWeight: 700,
                      color: "#86efac",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    Invoice Grup ({jamaahInGrup.length} Jamaah) • {nomorInvoice}
                  </div>
                  <StatusPill value={paymentStatus || first?.payment_status || ""} />
                </div>

                <div className="modal-grid-2" style={{ marginBottom: "1rem" }}>
                  <div>
                    <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginBottom: "2px" }}>
                      Paket Umroh
                    </div>
                    <div style={{ fontSize: "1rem", fontWeight: 700, color: "#f8fafc" }}>
                      {first?.paket ?? "-"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginBottom: "2px" }}>
                      Jumlah Jamaah
                    </div>
                    <div style={{ fontSize: "1rem", fontWeight: 700, color: "#f8fafc" }}>
                      {jamaahInGrup.length} Orang
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginBottom: "2px" }}>
                      Total Tagihan
                    </div>
                    <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#f8fafc" }}>
                      {fmtRupiah(totalTagihan)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginBottom: "2px" }}>
                      Total Dibayar
                    </div>
                    <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#4ade80" }}>
                      {fmtRupiah(totalPembayaran)}
                    </div>
                  </div>
                  {totalPerlengkapan > 0 && (
                    <div
                      style={{
                        gridColumn: "1 / -1",
                        fontSize: "0.78rem",
                        color: "#bbf7d0",
                        background: "rgba(255,255,255,0.06)",
                        padding: "0.4rem 0.75rem",
                        borderRadius: 8,
                      }}
                    >
                      🧳 Total Perlengkapan Tambahan: <strong>{fmtRupiah(totalPerlengkapan)}</strong>
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.75rem",
                      color: "#cbd5e1",
                      marginBottom: "0.4rem",
                    }}
                  >
                    <span>Progress Pembayaran</span>
                    <span style={{ fontWeight: 700 }}>{pct.toFixed(1)}%</span>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 999, height: 8 }}>
                    <div
                      style={{
                        background: pct >= 100 ? "#34d399" : "#22c55e",
                        height: 8,
                        borderRadius: 999,
                        width: `${pct}%`,
                        transition: "width 0.4s",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: "0.78rem",
                      color: "#94a3b8",
                      marginTop: "0.6rem",
                      flexWrap: "wrap",
                      gap: "0.5rem",
                    }}
                  >
                    <span>
                      Sisa Tagihan:{" "}
                      <strong style={{ color: sisaPembayaran > 0 ? "#f87171" : "#86efac", fontSize: "0.88rem" }}>
                        {fmtRupiah(sisaPembayaran)}
                      </strong>
                    </span>
                    {nomorInvoice && (
                      <button
                        type="button"
                        onClick={handleOpenInvoice}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          padding: "0.4rem 0.85rem",
                          background: "rgba(45, 158, 107, 0.3)",
                          border: "1px solid rgba(134, 239, 172, 0.4)",
                          borderRadius: 8,
                          color: "#86efac",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          fontFamily: "inherit",
                          transition: "all 0.15s ease",
                        }}
                      >
                        🔗 Lihat Invoice ↗
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Bagian 3 — Daftar Jamaah (accordion: hanya satu terbuka; state berdasarkan nomor_pendaftaran) ── */}
            <div className="modal-section">
              <div className="modal-section-title">
                <span>👤 Daftar Jamaah ({jamaahInGrup.length} Orang)</span>
              </div>
              <div className="grup-acc-list">
                {jamaahInGrup.map((j, i) => {
                  const isOpen = openNomor === j.nomor_pendaftaran;
                  const live = liveInfo[j.nomor_pendaftaran];
                  const nik = grupJamaah.find((g) => g.nomor_pendaftaran === j.nomor_pendaftaran)?.nik;
                  const panelId = `grup-acc-panel-${j.nomor_pendaftaran}`;
                  return (
                    <div key={j.nomor_pendaftaran} className={`grup-acc-item${isOpen ? " is-open" : ""}`}>
                      <button
                        type="button"
                        className="grup-acc-head"
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => setOpenNomor((cur) => (cur === j.nomor_pendaftaran ? null : j.nomor_pendaftaran))}
                      >
                        <span className="grup-acc-num">{i + 1}</span>
                        <span className="grup-acc-info">
                          <span className="grup-acc-name">{j.nama_customer}</span>
                          <span className="grup-acc-meta">
                            {j.nomor_pendaftaran}
                            {nik ? ` • NIK: ${nik}` : ""}
                          </span>
                        </span>
                        <span className="grup-acc-badges">
                          <StatusPill value={live?.document_status ?? j.document_status} />
                          <StatusPill value={live?.status ?? j.status} />
                        </span>
                        <LuChevronDown className="grup-acc-chevron" size={18} aria-hidden="true" />
                      </button>
                      {isOpen && (
                        <div id={panelId} className="grup-acc-body">
                          <DetailModal
                            key={j.nomor_pendaftaran}
                            embedded
                            nomor={j.nomor_pendaftaran}
                            token={token}
                            onClose={() => setOpenNomor(null)}
                            onDataLoaded={handleJamaahLoaded}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
              {nomorInvoice && (
                <button
                  type="button"
                  className="modal-btn-secondary"
                  onClick={handleOpenInvoice}
                >
                  📄 Buka Lembar Invoice
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
              <button type="button" className="modal-btn-secondary" onClick={handleClose}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ── PendaftaranGrupView ─────────────────────────────────────────────────────

const PendaftaranGrupView = ({
  list,
  loading,
  onDetailGrup,
}: {
  list: (PendaftaranItem & { nomor_invoice?: string; total_tagihan?: number; total_pembayaran?: number })[];
  loading: boolean;
  onDetailGrup: (nomorInvoice: string) => void;
}) => {
  const groups = groupByInvoice(list);
  const [grupPage, setGrupPage] = useState(1);
  const GRUP_PAGE_SIZE = 10;
  const totalGrupPages = Math.ceil(groups.length / GRUP_PAGE_SIZE) || 1;
  const pagedGroups = groups.slice((grupPage - 1) * GRUP_PAGE_SIZE, grupPage * GRUP_PAGE_SIZE);

  const countStatus = (s: string) => groups.filter(g => g.payment_status?.toLowerCase() === s).length;
  const totalInvoice = groups.length;
  const invoiceDP = countStatus("dp");
  const invoiceLunas = countStatus("lunas");

  return (
    <div className="pendaftaran-grup-view">
      {/* Stats */}
      {!loading && (
        <div className="pendaftaran-stats-row">
          {[
            { icon: "🧾", label: "Total Invoice", value: totalInvoice, cls: "" },
            { icon: "🔄", label: "Invoice DP", value: invoiceDP, cls: "s-proses" },
            { icon: "✅", label: "Invoice Lunas", value: invoiceLunas, cls: "s-selesai" },
            { icon: "👥", label: "Invoice Grup", value: groups.length, cls: "" },
          ].map(s => (
            <div className={`pendaftaran-stat-card ${s.cls}`} key={s.label}>
              <div className="pendaftaran-stat-icon">{s.icon}</div>
              <div>
                <div className="pendaftaran-stat-value">{s.value}</div>
                <div className="pendaftaran-stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabel */}
      <div className="pendaftaran-table-card">
        <table className="pendaftaran-table">
          <thead>
            <tr>
              <th>Grup</th>
              <th>Jamaah</th>
              <th>Paket</th>
              <th>Total Tagihan</th>
              <th>Total Dibayar</th>
              <th>Status Bayar</th>
              <th>Tanggal</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={8}>
                    <div className="table-skel-row">
                      {Array.from({ length: 6 }).map((__, j) => <div key={j} className="skel" style={{ width: 80 + j * 20, height: 12 }} />)}
                    </div>
                  </td>
                </tr>
              ))
            ) : groups.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="table-empty">
                    <div className="table-empty-icon">👥</div>
                    <p>Belum ada pendaftaran grup (lebih dari 1 jamaah per invoice).</p>
                  </div>
                </td>
              </tr>
            ) : (
              pagedGroups.map(g => (
                <tr key={g.nomor_invoice}>
                  <td>
                    <div className="customer-cell">
                      <div className="customer-avatar">{g.jamaah[0]?.nama_customer?.charAt(0)?.toUpperCase() ?? "G"}</div>
                      <span className="customer-name">
                        {g.jamaah[0]?.nama_customer
                          ? (g.jamaah[0].nama_customer.startsWith("Grup ") ? g.jamaah[0].nama_customer : `Grup ${g.jamaah[0].nama_customer}`)
                          : "Grup"}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span style={{ background: "#f0fdf4", color: "#1a6b43", borderRadius: 999, padding: "0.2rem 0.65rem", fontSize: "0.78rem", fontWeight: 700 }}>
                      👥 {g.jamaah.length} Orang
                    </span>
                  </td>
                  <td><span className="paket-name-small">{g.paket}</span></td>
                  <td><span style={{ fontWeight: 700, color: "#1e293b" }}>{fmtRupiah(g.total_tagihan)}</span></td>
                  <td><span style={{ color: "#059669", fontWeight: 600 }}>{fmtRupiah(g.total_pembayaran)}</span></td>
                  <td><StatusPill value={g.payment_status} /></td>
                  <td><span className="date-cell">{fmtDate(g.tanggal)}</span></td>
                  <td>
                    <button
                      className="detail-btn"
                      onClick={() => onDetailGrup(g.nomor_invoice)}
                    >
                      Detail Grup
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
        {!loading && groups.length > 0 && (
          <AdminPagination
            currentPage={grupPage}
            totalPages={totalGrupPages}
            totalItems={groups.length}
            currentCount={pagedGroups.length}
            onPageChange={setGrupPage}
            itemName="invoice grup"
          />
        )}
      </div>
    </div>
  );
};

// ── AdminPendaftaran ──────────────────────────────────────────────────────────


const AdminPendaftaran = () => {
  const { token, role } = useAuth();
  const isManager = role === "owner" || role === "manager" || role === "administration_manager";
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const filterAdminId = searchParams.get("admin_id") || "";
  const [managerAdmins, setManagerAdmins] = useState<{ id: string; nama: string; username?: string; role?: string; is_active?: boolean; total_jamaah?: number }[]>([]);

  const [list, setList] = useState<PendaftaranItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("semua");
  const [activeView, setActiveView] = useState<"semua" | "grup" | "milik-saya">("semua");
  const [grupDetailInvoice, setGrupDetailInvoice] = useState<string | null>(null);
  const [detailNomor, setDetailNomor] = useState<string | null>(null);
  const [jamaahSayaKey, setJamaahSayaKey] = useState(0);

  // Fetch list admin jika user adalah manager
  useEffect(() => {
    if (!isManager || !token) return;
    const fetchManagerAdmins = async () => {
      try {
        const res = await axios.get(`${API}/manager/admin`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setManagerAdmins(res.data?.admins ?? []);
      } catch {
        setManagerAdmins([]);
      }
    };
    fetchManagerAdmins();
  }, [token, isManager]);

  // Buka modal detail otomatis jika URL mengandung ?nomor=
  useEffect(() => {
    const nomor = searchParams.get("nomor");
    if (nomor) {
      void Promise.resolve().then(() => setDetailNomor(nomor));
    }
  }, [searchParams]);

  const authH = useCallback(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const url = filterAdminId
        ? `${API}/admin/pendaftaran?admin_id=${encodeURIComponent(filterAdminId)}`
        : `${API}/admin/pendaftaran`;
      const res = await axios.get(url, {
        headers: authH(),
      });
      setList(res.data?.data ?? []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [authH, filterAdminId]);

  useEffect(() => {
    void Promise.resolve().then(() => fetchData());
  }, [fetchData]);

  const targetAdmin = managerAdmins.find((a) => a.id === filterAdminId);
  const targetAdminNama = targetAdmin?.nama || "";

  // ── Filter ──
  const filtered = list.filter((p) => {
    const matchSearch =
      p.nama_customer?.toLowerCase().includes(search.toLowerCase()) ||
      p.nomor_pendaftaran?.toLowerCase().includes(search.toLowerCase()) ||
      p.paket?.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      filterStatus === "semua" || p.status?.toLowerCase() === filterStatus;
    const matchAdmin = !filterAdminId || p.user_id === filterAdminId || p.admin_id === filterAdminId;
    return matchSearch && matchStatus && matchAdmin;
  });

  // ── Stats ──
  const countByStatus = (s: string) =>
    list.filter((p) => p.status?.toLowerCase() === s).length;

  // ── Pagination ──
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    setPage(1);
  }, [search, filterStatus, filterAdminId]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const pagedList = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  return (
    <div className="pendaftaran-admin-page">
      {/* ── Header ── */}
      <div className="page-header">
        <div className="page-header-left">
          <h2>Pendaftaran Jamaah</h2>
          <p>Monitor, kelola, dan assign PIC untuk setiap pendaftaran jamaah umroh.</p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn-primary-sm"
            onClick={() => navigate("/admin/tambah-jamaah")}
          >
            <LuPlus size={14} />
            Tambah Jamaah
          </button>
          <button type="button" className="btn-outline-sm" onClick={fetchData}>
            <LuRefreshCw size={14} />
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
          className={`view-tab ${activeView === "grup" ? "active" : ""}`}
          onClick={() => setActiveView("grup")}
        >
          👥 Pendaftaran Grup
          <span className="view-tab-count">{groupByInvoice(list).length}</span>
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
                { icon: "📋", label: "Total", value: list.length, cls: "", filter: "semua" },
                { icon: "⏳", label: "Proses", value: countByStatus("proses"), cls: "s-proses", filter: "proses" },
                { icon: "🛡️", label: "Verifikasi Manager", value: countByStatus("menunggu_verifikasi_manager"), cls: "s-proses", filter: "menunggu_verifikasi_manager" },
                { icon: "⚠️", label: "Perlu Perbaikan", value: countByStatus("perlu_perbaikan"), cls: "s-batal", filter: "perlu_perbaikan" },
                { icon: "✈️", label: "Siap Berangkat", value: countByStatus("siap_berangkat"), cls: "s-siap", filter: "siap_berangkat" },
                { icon: "✅", label: "Selesai", value: countByStatus("selesai"), cls: "s-selesai", filter: "selesai" },
                { icon: "❌", label: "Batal", value: countByStatus("batal"), cls: "s-batal", filter: "batal" },
                { icon: "⏰", label: "Kadaluarsa", value: countByStatus("kadaluarsa"), cls: "s-kadaluarsa", filter: "kadaluarsa" },
              ].map((s) => (
                <div
                  className={`pendaftaran-stat-card ${s.cls}`}
                  key={s.label}
                  onClick={() => setFilterStatus(s.filter)}
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

          {/* ── Active Admin Filter Banner ── */}
          {filterAdminId && (
            <div className="filter-admin-banner">
              <div className="filter-admin-banner-info">
                <div className="filter-admin-avatar">
                  {(targetAdminNama || "A").trim().charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="filter-admin-banner-title">
                    Daftar Jamaah Tanggung Jawab: <strong>{targetAdminNama || "Admin Terpilih"}</strong> {targetAdmin?.username ? `(@${targetAdmin.username})` : ""}
                  </div>
                  <div className="filter-admin-banner-meta">
                    <span>Total Tanggung Jawab: <strong>{filtered.length}</strong> pendaftaran</span>
                    {targetAdmin?.is_active === false && (
                      <span className="filter-admin-inactive-pill">Nonaktif</span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="filter-admin-clear-btn"
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.delete("admin_id");
                  navigate({ search: next.toString() ? `?${next.toString()}` : "" });
                }}
              >
                ✕ Tampilkan Semua Pendaftaran
              </button>
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
            {isManager && (
              <select
                className="filter-select"
                value={filterAdminId}
                onChange={(e) => {
                  const val = e.target.value;
                  const next = new URLSearchParams(searchParams);
                  if (val) {
                    next.set("admin_id", val);
                  } else {
                    next.delete("admin_id");
                  }
                  navigate({ search: next.toString() ? `?${next.toString()}` : "" });
                }}
              >
                <option value="">Semua PIC Admin</option>
                {managerAdmins.map((adm) => (
                  <option key={adm.id} value={adm.id}>
                    PIC: {adm.nama} {adm.username ? `(@${adm.username})` : ""}
                  </option>
                ))}
              </select>
            )}
            <select
              className="filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="semua">Semua Status</option>
              <option value="proses">Proses</option>
              <option value="menunggu_verifikasi_manager">Menunggu Verifikasi Manager</option>
              <option value="perlu_perbaikan">Perlu Perbaikan</option>
              <option value="siap_berangkat">Siap Berangkat</option>
              <option value="selesai">Selesai</option>
              <option value="menunggu_pembayaran">Menunggu Bayar</option>
              <option value="menunggu_dokumen">Menunggu Dokumen</option>
              <option value="batal">Batal</option>
              <option value="kadaluarsa">Kadaluarsa</option>
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
                  <th>Didaftarkan Oleh</th>
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
                      <td colSpan={9}>
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
                    <td colSpan={9}>
                      <div className="table-empty">
                        <div className="table-empty-icon">👥</div>
                        <p style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                          {filterAdminId
                            ? "Belum ada jamaah yang ditugaskan kepada Admin ini."
                            : search || filterStatus !== "semua"
                            ? "Tidak ada data yang cocok dengan kriteria filter."
                            : "Belum ada pendaftaran."}
                        </p>
                        {filterAdminId ? (
                          <button
                            type="button"
                            className="btn-outline-sm"
                            onClick={() => {
                              const next = new URLSearchParams(searchParams);
                              next.delete("admin_id");
                              navigate({ search: next.toString() ? `?${next.toString()}` : "" });
                            }}
                            style={{ marginTop: "0.75rem" }}
                          >
                            Tampilkan Semua Pendaftaran
                          </button>
                        ) : (search || filterStatus !== "semua") ? (
                          <button
                            type="button"
                            className="btn-outline-sm"
                            onClick={() => { setSearch(""); setFilterStatus("semua"); }}
                            style={{ marginTop: "0.75rem" }}
                          >
                            Reset Filter
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ) : (
                  pagedList.map((p) => (
                    <tr key={p.nomor_pendaftaran}>
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
                        <span style={{
                          fontSize: "0.8rem", fontWeight: 600,
                          color: p.registration_source === "admin" ? "#1a6b43" : p.registration_source === "chatbot" ? "#0369a1" : "#374151",
                        }}>
                          {p.registered_by_label ?? "👤 Customer"}
                        </span>
                      </td>
                      <td>
                        <span className="paket-name-small">{p.paket}</span>
                      </td>
                      <td>
                        <StatusPill value={p.status} />
                        {p.status === "perlu_perbaikan" && p.catatan_verifikasi_manager && (
                          <div
                            style={{
                              fontSize: "0.72rem",
                              color: "#dc2626",
                              marginTop: 4,
                              maxWidth: 180,
                              whiteSpace: "normal",
                              lineHeight: 1.25,
                            }}
                            title={p.catatan_verifikasi_manager}
                          >
                            ⚠️ {p.catatan_verifikasi_manager}
                          </div>
                        )}
                      </td>
                      <td><StatusPill value={p.payment_status} /></td>
                      <td><StatusPill value={p.document_status} /></td>
                      <td>
                        <span className="date-cell">{fmtDate(p.tanggal_daftar)}</span>
                      </td>
                      <td>
                        {p.status === "batal" ? (
                          <button
                            type="button"
                            className="detail-btn"
                            style={{
                              borderColor: "#fca5a5",
                              background: "#fef2f2",
                              color: "#b91c1c",
                            }}
                            onClick={() => setDetailNomor(p.nomor_pendaftaran)}
                            title="Lihat alasan pembatalan"
                          >
                            <LuEye size={13} />
                            Lihat Alasan
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="detail-btn"
                            onClick={() => setDetailNomor(p.nomor_pendaftaran)}
                            title="Lihat detail pendaftaran"
                          >
                            <LuEye size={13} />
                            Detail
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {!loading && filtered.length > 0 && (
              <AdminPagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={filtered.length}
                currentCount={pagedList.length}
                onPageChange={setPage}
                itemName="pendaftaran"
              />
            )}
          </div>
        </>
      ) : activeView === "grup" ? (
        // ── Tab "Pendaftaran Grup" ──
        <PendaftaranGrupView
          list={list}
          loading={loading}
          onDetailGrup={(nomorInvoice) => setGrupDetailInvoice(nomorInvoice)}
        />
      ) : (
        // ── Tab "Jamaah Saya" ──
        <JamaahSayaView token={token} authH={authH} refreshKey={jamaahSayaKey} />
      )}

      {/* ── Grup Detail Modal ── */}
      {grupDetailInvoice && (
        <GrupDetailModal
          nomorInvoice={grupDetailInvoice}
          token={token ?? ""}
          allPendaftaran={list}
          onClose={() => setGrupDetailInvoice(null)}
          onChanged={() => fetchData()}
        />
      )}

      {/* ── Detail Modal ── */}
      {detailNomor && (
        <DetailModal
          nomor={detailNomor}
          token={token ?? ""}
          onClose={() => setDetailNomor(null)}
          onAssigned={() => {
            fetchData();
            setJamaahSayaKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
};

// ── Jamaah Saya View ──────────────────────────────────────────────────────────

// Toast mini
const Toast = ({ msg, type }: { msg: string; type: "success" | "error" }) => (
  <div
    style={{
      position: "fixed", bottom: "1.5rem", right: "1.5rem", zIndex: 9999,
      background: type === "success" ? "#059669" : "#dc2626",
      color: "#fff", padding: "0.875rem 1.25rem",
      borderRadius: "12px", fontSize: "0.875rem", fontWeight: 600,
      boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
      display: "flex", alignItems: "center", gap: "0.5rem",
      animation: "fadeInUp 0.3s ease",
    }}
  >
    {type === "success" ? "✅" : "❌"} {msg}
  </div>
);

// ── PIC Detail Modal (menggantikan inline expand) ─────────────────────────────

const PICDetailModal = ({
  p,
  token,
  onClose,
}: {
  p: PendaftaranItem;
  token: string | null;
  onClose: () => void;
}) => {
  const [data, setData] = useState<DetailPendaftaran | null>(null);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<{ id: string; jumlah: number; status: string; tanggal: string; bukti: string }[]>([]);
  const [docs, setDocs] = useState<{ id: string; jenis: string; status: string; file_path: string; created_at?: string }[]>([]);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await axios.get(
          `${API}/admin/pendaftaran/${p.nomor_pendaftaran}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const dp = res.data?.pendaftaran;
        setData({
          nomor_pendaftaran: dp?.NomorPendaftaran ?? dp?.nomor_pendaftaran,
          nama_customer: dp?.Customer?.Nama ?? dp?.Customer?.nama,
          nik: dp?.Customer?.NIK ?? dp?.Customer?.nik ?? "-",
          no_hp: dp?.Customer?.NoHP ?? dp?.Customer?.NoHp ?? dp?.Customer?.no_hp ?? "-",
          email: dp?.Customer?.Email ?? dp?.Customer?.email ?? "-",
          tempat_lahir: dp?.Customer?.TempatLahir ?? dp?.Customer?.tempat_lahir ?? "-",
          tanggal_lahir: dp?.Customer?.TanggalLahir ?? dp?.Customer?.tanggal_lahir ?? "",
          jenis_kelamin: dp?.Customer?.JenisKelamin ?? dp?.Customer?.jenis_kelamin ?? "-",
          paket: dp?.Paket?.NamaPaket ?? dp?.Paket?.nama_paket,
          harga: dp?.Paket?.Harga ?? dp?.Paket?.harga ?? 0,
          tanggal_berangkat: dp?.Paket?.TanggalBerangkat ?? dp?.Paket?.tanggal_berangkat,
          payment_status: dp?.PaymentStatus ?? dp?.payment_status,
          total_tagihan: dp?.TotalTagihan ?? dp?.total_tagihan ?? 0,
          total_pembayaran: dp?.TotalPembayaran ?? dp?.total_pembayaran ?? 0,
          total_perlengkapan: dp?.TotalPerlengkapan ?? dp?.total_perlengkapan ?? 0,
          ambil_perlengkapan: dp?.AmbilPerlengkapan ?? dp?.ambil_perlengkapan ?? false,
          harga_perlengkapan: dp?.HargaPerlengkapan ?? dp?.harga_perlengkapan ?? 0,
          grup_count: dp?.GrupCount ?? dp?.grup_count ?? 1,
          nomor_invoice: dp?.NomorInvoice ?? dp?.nomor_invoice ?? "",
          document_status: dp?.DocumentStatus ?? dp?.document_status,
          status: dp?.Status ?? dp?.status,
          alasan_pembatalan: dp?.alasan_pembatalan ?? dp?.AlasanPembatalan ?? null,
          dibatalkan_pada: dp?.dibatalkan_pada ?? dp?.DibatalkanPada ?? null,
          dibatalkan_oleh_nama: dp?.dibatalkan_oleh_nama ?? dp?.DibatalkanOlehNama ?? dp?.Pembatal?.Nama ?? dp?.pembatal?.nama ?? null,
          admin_pic: dp?.User?.Nama ?? dp?.User?.nama ?? null,
        });
        // Pembayaran: Go model → field PascalCase
        const rawBayar = res.data?.pembayaran ?? [];
        const mappedBayar = rawBayar.map((b: Record<string, unknown>) => ({
          id: String(b.ID ?? b.id ?? ""),
          jumlah: (b.Jumlah ?? b.jumlah ?? 0) as number,
          status: (b.Status ?? b.status ?? "") as string,
          tanggal: (b.TanggalBayar ?? b.tanggal_bayar ?? b.tanggal ?? "") as string,
          bukti: String(b.BuktiPembayaran ?? b.bukti_pembayaran ?? ""),
        }));
        mappedBayar.sort((a: { tanggal: string }, b: { tanggal: string }) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
        setPayments(mappedBayar);
        // Dokumen: Go model → field PascalCase
        const rawDok = res.data?.dokumen ?? [];
        const mappedDocs = rawDok.map((d: Record<string, unknown>) => ({
          id: String(d.ID ?? d.id ?? ""),
          jenis: String(d.JenisDokumen ?? d.jenis_dokumen ?? d.Jenis ?? d.jenis ?? "-"),
          status: (d.StatusValidasi ?? d.status_validasi ?? d.Status ?? d.status ?? "") as string,
          file_path: String(d.FilePath ?? d.file_path ?? ""),
          created_at: String(d.CreatedAt ?? d.created_at ?? ""),
        }));
        mappedDocs.sort((a: { created_at: string }, b: { created_at: string }) => {
          if (!a.created_at && !b.created_at) return 0;
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        });
        setDocs(mappedDocs);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [p.nomor_pendaftaran, token]);

  const isSelesai = p.status?.toLowerCase() === "selesai";

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel" style={{ maxWidth: 560 }}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="modal-title">👤 Detail Jamaah Saya</div>
            <div className="modal-subtitle">{p.nomor_pendaftaran}</div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Tutup"><LuX size={16} /></button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {loading ? (
            <div className="modal-loading">
              <div className="modal-spin" />
              Memuat detail...
            </div>
          ) : !data ? (
            <div className="modal-loading" style={{ color: "#ef4444" }}>Gagal memuat data.</div>
          ) : (
            <>
              {/* Status row */}
              <div className="modal-status-row">
                <div className="modal-status-item">
                  <div className="modal-status-label">Status</div>
                  {isSelesai ? (
                    <span style={{ background: "#d1fae5", color: "#065f46", padding: "0.25rem 0.75rem", borderRadius: 999, fontSize: "0.75rem", fontWeight: 700 }}>✔ Umroh Selesai</span>
                  ) : (
                    <StatusPill value={data.status} />
                  )}
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

              {/* Informasi Pembatalan jika status batal */}
              {data.status === "batal" && (
                <div
                  style={{
                    background: "#fef2f2",
                    border: "1.5px solid #fca5a5",
                    borderRadius: "12px",
                    padding: "1rem",
                    marginBottom: "1rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      color: "#991b1b",
                      fontWeight: 700,
                      fontSize: "0.95rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <span>⚠️</span>
                    <span>Pendaftaran Telah Dibatalkan</span>
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#7f1d1d", marginBottom: "0.4rem" }}>
                    <strong>Alasan Pembatalan:</strong> {data.alasan_pembatalan || "-"}
                  </div>
                  <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.78rem", color: "#991b1b", flexWrap: "wrap" }}>
                    <span>
                      <strong>Dibatalkan Pada:</strong> {data.dibatalkan_pada ? fmtDateTime(data.dibatalkan_pada) : "-"}
                    </span>
                    <span>
                      <strong>Dibatalkan Oleh:</strong> {data.dibatalkan_oleh_nama || "Admin Bonita"}
                    </span>
                  </div>
                </div>
              )}

              {/* Info Jamaah */}
              <div className="modal-section-title">👤 Informasi Jamaah</div>
              <div className="modal-info-grid">
                <div className="modal-info-item full">
                  <div className="modal-info-label">Nama</div>
                  <div className="modal-info-val">{data.nama_customer}</div>
                </div>
                <div className="modal-info-item full">
                  <div className="modal-info-label">NIK</div>
                  <div className="modal-info-val" style={{ fontFamily: "monospace" }}>{data.nik}</div>
                </div>
                <div className="modal-info-item">
                  <div className="modal-info-label">Tempat Lahir</div>
                  <div className="modal-info-val">{data.tempat_lahir}</div>
                </div>
                <div className="modal-info-item">
                  <div className="modal-info-label">Tanggal Lahir</div>
                  <div className="modal-info-val">{data.tanggal_lahir ? fmtDate(data.tanggal_lahir) : "-"}</div>
                </div>
                <div className="modal-info-item">
                  <div className="modal-info-label">Jenis Kelamin</div>
                  <div className="modal-info-val">{data.jenis_kelamin}</div>
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

              {/* Info Paket */}
              <div className="modal-section-title">🕌 Paket</div>
              <div className="modal-info-grid">
                <div className="modal-info-item full">
                  <div className="modal-info-label">Nama Paket</div>
                  <div className="modal-info-val">{data.paket}</div>
                </div>
                <div className="modal-info-item">
                  <div className="modal-info-label">Harga</div>
                  <div className="modal-info-val" style={{ color: "#1a6b43", fontWeight: 800 }}>{fmtRupiah(data.harga)}</div>
                </div>
                <div className="modal-info-item">
                  <div className="modal-info-label">Tgl Berangkat</div>
                  <div className="modal-info-val">{data.tanggal_berangkat ? fmtDate(data.tanggal_berangkat) : "-"}</div>
                </div>
              </div>

              {/* Riwayat Pembayaran */}
              {payments.length > 0 && (
                <>
                  <div className="modal-section-title">💳 Riwayat Pembayaran</div>
                  {payments.map((pay, i) => (
                    <div key={pay.id || i} style={{ background: "#f8fafc", borderRadius: "10px", marginBottom: "0.5rem", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0.875rem", fontSize: "0.85rem" }}>
                        <span style={{ color: "#374151", fontWeight: 600 }}>
                          {payments.length - i === 1 ? "DP" : `Pembayaran ${payments.length - i}`}
                          {pay.tanggal ? ` — ${fmtDate(pay.tanggal)}` : ""}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ fontWeight: 700, color: "#1e293b" }}>{fmtRupiah(pay.jumlah)}</span>
                          <StatusPill value={pay.status} />
                        </div>
                      </div>
                      {pay.bukti && (
                        <div style={{ borderTop: "1px solid #e2e8f0", padding: "0.5rem 0.875rem", display: "flex", alignItems: "center", gap: "0.5rem", background: "#fff" }}>
                          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Bukti:</span>
                          <a
                            href={pay.bukti}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: "0.78rem", color: "#1a6b43", fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: "0.3rem" }}
                          >
                            🖼️ Lihat Foto Bukti Pembayaran
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}

              {/* ── Dokumen Persyaratan ── */}
              {(() => {
                const reqDocs = docs.filter(d => !isTravelDoc(d.jenis));
                if (reqDocs.length === 0) return null;
                return (
                  <>
                    <div className="modal-section-title" style={{ marginTop: "1rem" }}>📄 Dokumen Persyaratan</div>
                    {reqDocs.map((dok, i) => (
                      <div key={dok.id || i} style={{ background: "#f8fafc", borderRadius: "10px", marginBottom: "0.5rem", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0.875rem", fontSize: "0.85rem" }}>
                          <span style={{ color: "#374151", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <span style={{ fontSize: "1.05rem" }}>{getDocIcon(dok.jenis)}</span>
                            <span style={{ textTransform: "capitalize" }}>{getDocLabel(dok.jenis)}</span>
                            {dok.created_at ? <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 400 }}>({fmtDate(dok.created_at)})</span> : null}
                          </span>
                          <StatusPill value={dok.status} />
                        </div>
                        {dok.file_path && (
                          <div style={{ borderTop: "1px solid #e2e8f0", padding: "0.5rem 0.875rem", display: "flex", alignItems: "center", gap: "0.5rem", background: "#fff" }}>
                            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>File:</span>
                            <a
                              href={dok.file_path}
                              target="_blank"
                              rel="noreferrer"
                              style={{ fontSize: "0.78rem", color: "#1a6b43", fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: "0.3rem" }}
                            >
                              📎 Lihat File Dokumen
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                );
              })()}

              {isSelesai && (
                <div style={{ marginTop: "1rem", padding: "0.75rem 1rem", background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: "10px", fontSize: "0.85rem", color: "#065f46", fontWeight: 600, textAlign: "center" }}>
                  ✔ Perjalanan umroh jamaah ini telah selesai
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button type="button" className="modal-close-full-btn" onClick={onClose}>Tutup</button>
        </div>
      </div>
    </div>
  );
};


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
  const [picTab, setPicTab] = useState<"aktif" | "siap" | "selesai">("aktif");
  const [filterPaket, setFilterPaket] = useState<string>("");
  const [selectedJamaah, setSelectedJamaah] = useState<PendaftaranItem | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };
  // suppress unused warning
  void showToast;

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/pendaftaran/saya`, {
        headers: authH(),
      });
      setList(res.data?.data ?? []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [authH]);

  useEffect(() => {
    void Promise.resolve().then(() => fetchList());
  }, [fetchList, refreshKey]);

  // Semua nama paket unik untuk dropdown filter
  const paketOptions = Array.from(new Set(list.map((p) => p.paket).filter(Boolean)));

  const baseFilter = (items: PendaftaranItem[]) =>
    filterPaket ? items.filter((p) => p.paket === filterPaket) : items;

  const aktifList = baseFilter(list.filter((p) => p.status?.toLowerCase() === "proses"));
  const siapList = baseFilter(list.filter((p) => p.status?.toLowerCase() === "siap_berangkat"));
  const selesaiList = baseFilter(list.filter((p) => p.status?.toLowerCase() === "selesai"));
  const displayList = picTab === "aktif" ? aktifList : picTab === "siap" ? siapList : selesaiList;

  const [sayaPage, setSayaPage] = useState(1);
  const SAYA_PAGE_SIZE = 10;
  useEffect(() => {
    setSayaPage(1);
  }, [picTab, filterPaket]);
  const totalSayaPages = Math.ceil(displayList.length / SAYA_PAGE_SIZE) || 1;
  const pagedSayaList = displayList.slice((sayaPage - 1) * SAYA_PAGE_SIZE, sayaPage * SAYA_PAGE_SIZE);

  return (
    <div>
      {/* Header */}
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

      {/* Filter Paket */}
      {paketOptions.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <select
            value={filterPaket}
            onChange={(e) => setFilterPaket(e.target.value)}
            style={{
              padding: "0.5rem 0.875rem",
              borderRadius: 10,
              border: "1.5px solid #e2e8f0",
              background: "#f8fafc",
              fontSize: "0.875rem",
              color: "#1e293b",
              fontFamily: "inherit",
              cursor: "pointer",
              outline: "none",
              minWidth: 200,
            }}
          >
            <option value="">Semua Paket</option>
            {paketOptions.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      )}

      {/* Tabs Aktif / Siap Berangkat / Selesai */}
      <div style={{
        display: "flex", gap: "0.5rem",
        marginBottom: "1.25rem",
        background: "#f8fafc",
        padding: "0.35rem",
        borderRadius: "12px",
        border: "1px solid #e8edf5",
        width: "fit-content",
      }}>
        {(["aktif", "siap", "selesai"] as const).map((tab) => {
          const count = tab === "aktif" ? aktifList.length : tab === "siap" ? siapList.length : selesaiList.length;
          const isActive = picTab === tab;
          const label = tab === "aktif" ? "🟢 Aktif" : tab === "siap" ? "🟡 Siap Berangkat" : "✅ Selesai";
          const activeColor = tab === "selesai" ? "#059669" : tab === "siap" ? "#d97706" : "#1e293b";
          const badgeBg = tab === "selesai" ? "#d1fae5" : tab === "siap" ? "#fef3c7" : "#eff6ff";
          const badgeColor = tab === "selesai" ? "#065f46" : tab === "siap" ? "#92400e" : "#3b82f6";
          return (
            <button
              key={tab}
              onClick={() => setPicTab(tab)}
              style={{
                padding: "0.5rem 1.25rem",
                borderRadius: "9px",
                border: "none",
                fontWeight: isActive ? 700 : 500,
                fontSize: "0.875rem",
                cursor: "pointer",
                background: isActive ? "#fff" : "transparent",
                color: isActive ? activeColor : "#94a3b8",
                boxShadow: isActive ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.2s",
                display: "flex", alignItems: "center", gap: "0.4rem",
              }}
            >
              {label}
              <span style={{
                background: isActive ? badgeBg : "#f1f5f9",
                color: isActive ? badgeColor : "#94a3b8",
                padding: "0.1rem 0.5rem", borderRadius: "999px",
                fontSize: "0.72rem", fontWeight: 700,
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* List */}
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
      ) : displayList.length === 0 ? (
        <div className="my-jamaah-empty">
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>
            {picTab === "selesai" ? "🎉" : picTab === "siap" ? "🛫" : "👥"}
          </div>
          <div style={{ fontWeight: 700, color: "#1e293b", marginBottom: "0.4rem", fontSize: "1rem" }}>
            {picTab === "selesai" ? "Belum Ada Jamaah Selesai" : picTab === "siap" ? "Belum Ada Jamaah Siap Berangkat" : "Belum Ada Jamaah Aktif"}
          </div>
          <p style={{ fontSize: "0.85rem", color: "#94a3b8", lineHeight: 1.6 }}>
            {picTab === "selesai"
              ? "Jamaah yang sudah selesai melaksanakan umroh akan muncul di sini."
              : picTab === "siap"
                ? "Jamaah yang sudah siap berangkat akan muncul di sini."
                : "Anda belum menjadi PIC untuk jamaah manapun.\nBuka tab \"Semua Pendaftaran\" dan klik \"Detail & Assign\" untuk mengambil tanggung jawab jamaah."}
          </p>
        </div>
      ) : (
        <>
          <div className="my-jamaah-grid">
          {pagedSayaList.map((p) => {
            const isSelesai = p.status?.toLowerCase() === "selesai";
            return (
              <div
                key={p.nomor_pendaftaran}
                className={`my-jamaah-card ${isSelesai ? "my-jamaah-card-selesai" : ""}`}
                style={{ cursor: "pointer" }}
                onClick={() => setSelectedJamaah(p)}
              >
                <div className="my-jamaah-card-top">
                  <div className="my-jamaah-avatar">
                    {p.nama_customer?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>
                  <div className="my-jamaah-card-info">
                    <div className="my-jamaah-name">{p.nama_customer}</div>
                    <div className="my-jamaah-nomor">{p.nomor_pendaftaran}</div>
                  </div>
                  {isSelesai ? (
                    <span style={{ background: "#d1fae5", color: "#065f46", padding: "0.25rem 0.75rem", borderRadius: 999, fontSize: "0.75rem", fontWeight: 700, whiteSpace: "nowrap" }}>
                      ✔ Selesai
                    </span>
                  ) : (
                    <StatusPill value={p.status} />
                  )}
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
                {/* Hint tap */}
                <div style={{ textAlign: "center", fontSize: "0.72rem", color: "#94a3b8", marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "1px solid #f1f5f9" }}>
                  Klik untuk detail
                </div>
              </div>
            );
          })}
        </div>
        {!loading && displayList.length > 0 && (
          <div style={{ marginTop: "1rem" }}>
            <AdminPagination
              currentPage={sayaPage}
              totalPages={totalSayaPages}
              totalItems={displayList.length}
              currentCount={pagedSayaList.length}
              onPageChange={setSayaPage}
              itemName="jamaah"
            />
          </div>
        )}
      </>
    )}

      {/* Modal Detail PIC */}
      {selectedJamaah && (
        <PICDetailModal
          p={selectedJamaah}
          token={token}
          onClose={() => setSelectedJamaah(null)}
        />
      )}

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
};


export default AdminPendaftaran;
