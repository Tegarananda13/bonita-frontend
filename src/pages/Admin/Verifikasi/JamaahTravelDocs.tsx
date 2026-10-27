import { useState, useRef, type ChangeEvent, type DragEvent } from "react";
import axios from "axios";
import {
  LuEye,
  LuUpload,
  LuTrash2,
  LuRefreshCw,
  LuCheck,
  LuX,
  LuFileText,
  LuSparkles,
} from "react-icons/lu";
import { useToast } from "../../../context/ToastContext";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export interface DocItem {
  id: string;
  jenis: string;
  status: string;
  file: string;
  alasan_penolakan?: string;
  created_at?: string;
}

export interface JamaahDetailProps {
  nomor_pendaftaran: string;
  nama: string;
  dokumen_perjalanan?: DocItem[];
}

interface JamaahTravelDocsProps {
  jamaah: JamaahDetailProps;
  token: string;
  onRefresh: () => Promise<void> | void;
  onPreview: (url: string) => void;
}

interface TravelTypeConfig {
  key: string;
  label: string;
  subtitle: string;
  tag: string;
  icon: string;
  cardClass: string;
}

const TRAVEL_CONFIGS: TravelTypeConfig[] = [
  {
    key: "visa",
    label: "Visa Saudi",
    subtitle: "Visa Masuk Resmi Arab Saudi (KSA)",
    tag: "Entry Visa",
    icon: "🛂",
    cardClass: "travel-card-visa",
  },
  {
    key: "tiket_pesawat",
    label: "Tiket Pesawat",
    subtitle: "E-Ticket Penerbangan PP Tanah Suci",
    tag: "Flight Ticket",
    icon: "✈️",
    cardClass: "travel-card-tiket",
  },
  {
    key: "nusuk",
    label: "Kartu Nusuk",
    subtitle: "Tasreeh Ibadah Umrah & Raudhah",
    tag: "Smart Permit",
    icon: "📱",
    cardClass: "travel-card-nusuk",
  },
];

const fmtFileSize = (bytes?: number): string => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fmtDateTime = (d?: string): string => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function JamaahTravelDocs({
  jamaah,
  token,
  onRefresh,
  onPreview,
}: JamaahTravelDocsProps) {
  const { showToast } = useToast();

  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({});
  const [replacingKey, setReplacingKey] = useState<string | null>(null);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const travelDocs = jamaah.dokumen_perjalanan || [];
  const uploadedCount = TRAVEL_CONFIGS.filter((cfg) =>
    travelDocs.some((d) => d.jenis.toLowerCase() === cfg.key)
  ).length;
  const progressPercent = Math.round((uploadedCount / TRAVEL_CONFIGS.length) * 100);

  const validateAndSetFile = (key: string, file: File) => {
    const validExts = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    const isValidType =
      validExts.includes(ext) || file.type.startsWith("image/") || file.type === "application/pdf";

    if (!isValidType) {
      showToast("error", "Format file tidak didukung. Harap upload file PDF atau Gambar (JPG, PNG).");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      showToast("error", "Ukuran file terlalu besar. Maksimal 15 MB.");
      return;
    }

    setSelectedFiles((prev) => ({ ...prev, [key]: file }));
  };

  const handleFileChange = (key: string, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(key, file);
    }
  };

  const handleDragOver = (key: string, e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverKey(key);
  };

  const handleDragLeave = (key: string, e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragOverKey === key) {
      setDragOverKey(null);
    }
  };

  const handleDrop = (key: string, e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverKey(null);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndSetFile(key, file);
    }
  };

  const triggerBrowse = (key: string) => {
    const el = fileInputRefs.current[key];
    if (el) {
      el.value = "";
      el.click();
    }
  };

  const handleCancelSelect = (key: string) => {
    setSelectedFiles((prev) => ({ ...prev, [key]: null }));
    if (replacingKey === key) {
      setReplacingKey(null);
    }
  };

  const handleUpload = async (key: string, docLabel: string) => {
    const file = selectedFiles[key];
    if (!file) {
      showToast("error", `Pilih file ${docLabel} terlebih dahulu.`);
      return;
    }

    setUploadingType(key);
    try {
      const fd = new FormData();
      fd.append("jenis", key);
      fd.append("file", file);

      await axios.post(
        `${API}/manager/pendaftaran/${jamaah.nomor_pendaftaran}/dokumen-perjalanan`,
        fd,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      showToast("success", `✓ Dokumen ${docLabel} berhasil diunggah.`);
      setSelectedFiles((prev) => ({ ...prev, [key]: null }));
      setReplacingKey(null);
      await onRefresh();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.error ?? `Gagal mengunggah ${docLabel}.`)
        : `Gagal mengunggah ${docLabel}.`;
      showToast("error", msg);
    } finally {
      setUploadingType(null);
    }
  };

  const handleDelete = async (docId: string, docLabel: string) => {
    if (!window.confirm(`Hapus dokumen perjalanan ${docLabel} ini?`)) return;

    setDeletingId(docId);
    try {
      await axios.delete(`${API}/manager/dokumen-perjalanan/${docId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast("success", `Dokumen perjalanan ${docLabel} berhasil dihapus.`);
      await onRefresh();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.error ?? `Gagal menghapus ${docLabel}.`)
        : `Gagal menghapus ${docLabel}.`;
      showToast("error", msg);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="verif-travel-section">
      {/* ── Top Header ── */}
      <div className="verif-travel-header">
        <div className="verif-travel-header-left">
          <div className="verif-travel-header-icon" title="Dokumen Perjalanan">
            ✈️
          </div>
          <div>
            <div className="verif-travel-header-title">
              Dokumen Perjalanan Jamaah
              <span style={{ fontSize: "0.74rem", fontWeight: 600, color: "#1d4ed8", background: "#dbeafe", padding: "2px 8px", borderRadius: 6 }}>
                Manager Exclusive
              </span>
            </div>
            <div className="verif-travel-header-sub">
              Diterbitkan &amp; dikelola khusus oleh Administration Manager untuk kesiapan keberangkatan.
            </div>
          </div>
        </div>

        <div className="verif-travel-badge-wrap">
          {uploadedCount === TRAVEL_CONFIGS.length ? (
            <span className="verif-travel-status-pill complete">
              <LuSparkles size={13} />
              3/3 Lengkap — Siap Terbang
            </span>
          ) : uploadedCount > 0 ? (
            <span className="verif-travel-status-pill in-progress">
              ⏳ {uploadedCount}/{TRAVEL_CONFIGS.length} Dokumen Terbit
            </span>
          ) : (
            <span className="verif-travel-status-pill empty">
              0/{TRAVEL_CONFIGS.length} Dokumen Diunggah
            </span>
          )}
        </div>
      </div>

      {/* ── Progress Bar ── */}
      <div className="verif-travel-progress-container">
        <div className="verif-travel-progress-bar">
          <div
            className="verif-travel-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* ── 3 Travel Document Cards ── */}
      <div className="verif-travel-cards-grid">
        {TRAVEL_CONFIGS.map((cfg) => {
          const doc = travelDocs.find((d) => d.jenis.toLowerCase() === cfg.key);
          const isUploaded = Boolean(doc);
          const isReplacing = replacingKey === cfg.key;
          const pendingFile = selectedFiles[cfg.key];
          const isUploading = uploadingType === cfg.key;
          const isDeleting = deletingId === doc?.id;
          const isDragOver = dragOverKey === cfg.key;

          const isPdf = doc?.file?.toLowerCase().endsWith(".pdf");

          return (
            <div
              key={cfg.key}
              className={`verif-travel-card ${cfg.cardClass} ${
                isUploaded ? "uploaded" : "empty"
              } ${isDragOver ? "drag-over" : ""}`}
              onDragOver={(e) => handleDragOver(cfg.key, e)}
              onDragLeave={(e) => handleDragLeave(cfg.key, e)}
              onDrop={(e) => handleDrop(cfg.key, e)}
            >
              {/* Hidden File Input */}
              <input
                type="file"
                ref={(el) => {
                  fileInputRefs.current[cfg.key] = el;
                }}
                accept="image/*,.pdf"
                style={{ display: "none" }}
                onChange={(e) => handleFileChange(cfg.key, e)}
              />

              {/* Card Top: Icon, Label, Badge */}
              <div className="verif-travel-card-top">
                <div className="verif-travel-type-info">
                  <div className="verif-travel-icon-box">{cfg.icon}</div>
                  <div>
                    <div className="verif-travel-type-name">{cfg.label}</div>
                    <div className="verif-travel-type-desc">{cfg.subtitle}</div>
                  </div>
                </div>

                <div>
                  {isUploaded ? (
                    <span className="verif-travel-badge-pill uploaded">
                      <LuCheck size={11} /> Terbit
                    </span>
                  ) : (
                    <span className="verif-travel-badge-pill empty">
                      Belum Ada
                    </span>
                  )}
                </div>
              </div>

              {/* Card Content Area */}
              {doc && !isReplacing && !pendingFile ? (
                <div>
                  {/* Summary of Uploaded File */}
                  <div className="verif-travel-file-summary">
                    <div className="verif-travel-file-left">
                      <LuFileText className="verif-travel-file-icon" />
                      <div>
                        <div className="verif-travel-file-title" title={doc.file}>
                          Dokumen Resmi {cfg.label}
                        </div>
                        <div className="verif-travel-file-meta">
                          {doc.created_at ? `Diunggah: ${fmtDateTime(doc.created_at)}` : "Dokumen Siap Digunakan"}
                        </div>
                      </div>
                    </div>
                    <span className="verif-travel-file-tag">{isPdf ? "PDF" : "IMG"}</span>
                  </div>

                  {/* Actions for Uploaded Card */}
                  <div className="verif-travel-actions-row">
                    <button
                      type="button"
                      className="travel-btn-view"
                      onClick={() => onPreview(doc.file)}
                      title={`Buka & Lihat ${cfg.label}`}
                    >
                      <LuEye size={13} />
                      Lihat
                    </button>

                    <button
                      type="button"
                      className="travel-btn-replace"
                      onClick={() => {
                        setReplacingKey(cfg.key);
                        triggerBrowse(cfg.key);
                      }}
                      title={`Ganti file ${cfg.label}`}
                    >
                      <LuRefreshCw size={12} />
                      Ganti File
                    </button>

                    <button
                      type="button"
                      className="travel-btn-delete"
                      disabled={isDeleting}
                      onClick={() => handleDelete(doc.id, cfg.label)}
                      title={`Hapus ${cfg.label}`}
                    >
                      <LuTrash2 size={13} />
                      {isDeleting ? "..." : "Hapus"}
                    </button>
                  </div>
                </div>
              ) : pendingFile ? (
                /* Pending File Selected: Confirmation State */
                <div className="verif-travel-pending-box">
                  <div className="verif-travel-pending-info">
                    <LuFileText size={16} color="#2563eb" style={{ flexShrink: 0 }} />
                    <div className="verif-travel-pending-name" title={pendingFile.name}>
                      {pendingFile.name}
                    </div>
                    <span className="verif-travel-pending-size">
                      {fmtFileSize(pendingFile.size)}
                    </span>
                  </div>

                  <div className="verif-travel-pending-actions">
                    <button
                      type="button"
                      className="verif-travel-btn-upload-now"
                      disabled={isUploading}
                      onClick={() => handleUpload(cfg.key, cfg.label)}
                    >
                      {isUploading ? (
                        <>
                          <LuRefreshCw size={13} className="spin-icon" />
                          Mengunggah...
                        </>
                      ) : (
                        <>
                          <LuCheck size={13} />
                          {isUploaded ? "Unggah & Ganti" : "Unggah Sekarang"}
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      className="verif-travel-btn-cancel-select"
                      disabled={isUploading}
                      onClick={() => handleCancelSelect(cfg.key)}
                    >
                      <LuX size={13} />
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                /* Empty / Dropzone Trigger State */
                <div>
                  <div
                    className="verif-travel-dropzone"
                    onClick={() => triggerBrowse(cfg.key)}
                    title={`Klik untuk memilih file ${cfg.label}`}
                  >
                    <LuUpload className="verif-travel-dropzone-icon" />
                    <div className="verif-travel-dropzone-text">
                      + Unggah {cfg.label}
                    </div>
                    <div className="verif-travel-dropzone-hint">
                      Klik atau seret file PDF/Gambar (Maks 15MB)
                    </div>
                  </div>

                  {isReplacing && (
                    <div style={{ marginTop: 6, textAlign: "right" }}>
                      <button
                        type="button"
                        style={{
                          background: "none",
                          border: "none",
                          fontSize: "0.72rem",
                          color: "#64748b",
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                        onClick={() => setReplacingKey(null)}
                      >
                        Batal ganti file
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
