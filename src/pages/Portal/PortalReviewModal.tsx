import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { FiStar, FiCheck, FiUploadCloud } from "react-icons/fi";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

// ── Types ────────────────────────────────────────────────────────────────────

interface FotoUlasanItem {
  id: string;
  file_path: string;
}

export interface MyReviewItem {
  id: string;
  pendaftaran_id: string;
  rating: number;
  komentar: string;
  status: "menunggu" | "disetujui" | "ditolak";
  created_at: string;
  foto_ulasan: FotoUlasanItem[];
}

interface PortalReviewModalProps {
  token: string;
  namaPaket: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface PortalMyReviewsModalProps {
  token: string;
  onClose: () => void;
  onWriteNewReview: () => void;
}

// ── 1. Create Review Modal ───────────────────────────────────────────────────

export const PortalReviewModal = ({
  token,
  namaPaket,
  onClose,
  onSuccess,
}: PortalReviewModalProps) => {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [komentar, setKomentar] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = 5 - photos.length;
    if (remainingSlots <= 0) {
      setError("Maksimal mengunggah 5 foto dokumentasi.");
      return;
    }

    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    Array.from(files).slice(0, remainingSlots).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        setError(`Foto '${file.name}' melebihi batas ukuran maksimal 5 MB.`);
        return;
      }
      newFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    });

    setPhotos((prev) => [...prev, ...newFiles]);
    setPreviews((prev) => [...prev, ...newPreviews]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!komentar.trim() || komentar.trim().length < 5) {
      setError("Mohon berikan ulasan minimal 5 karakter.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("rating", String(rating));
      formData.append("komentar", komentar.trim());
      photos.forEach((file) => {
        formData.append("foto", file);
      });

      await axios.post(`${API}/customer/ulasan`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setIsSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: unknown) {
      console.error("Gagal mengirim ulasan", err);
      setError(
        axios.isAxiosError(err)
          ? err.response?.data?.error ?? "Gagal mengirimkan ulasan. Silakan coba kembali."
          : "Gagal mengirimkan ulasan."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="invoice-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="invoice-modal-card" style={{ maxWidth: 580 }}>
        {/* Header */}
        <div
          className="invoice-modal-header"
          style={{ background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)" }}
        >
          <div className="invoice-modal-header-left">
            <div className="invoice-modal-badge-icon">⭐</div>
            <div>
              <div className="invoice-modal-title">Berikan Ulasan Perjalanan Umroh</div>
              <div className="invoice-modal-subtitle">{namaPaket}</div>
            </div>
          </div>
          <button className="invoice-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="invoice-modal-body" style={{ padding: "1.5rem" }}>
          {isSuccess ? (
            <div style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "#dcfce7",
                  color: "#16a34a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1rem",
                  fontSize: "1.75rem",
                }}
              >
                ✓
              </div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#065f46", marginBottom: "0.5rem" }}>
                Alhamdulillah! Ulasan Berhasil Dikirim
              </h3>
              <p style={{ fontSize: "0.85rem", color: "#64748b", maxWidth: 420, margin: "0 auto" }}>
                Terima kasih atas ulasan dan masukan yang Anda berikan. Ulasan Anda telah langsung dipublikasikan ke halaman ulasan publik.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div
                  style={{
                    padding: "0.75rem 1rem",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: 8,
                    color: "#991b1b",
                    fontSize: "0.82rem",
                    marginBottom: "1rem",
                  }}
                >
                  ⚠️ {error}
                </div>
              )}

              {/* Rating Star Selection */}
              <div style={{ marginBottom: "1.25rem", textAlign: "center" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.5rem" }}>
                  Berapa bintang kepuasan ibadah Anda?
                </label>
                <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem" }}>
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = (hoverRating || rating) >= star;
                    return (
                      <button
                        type="button"
                        key={star}
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          padding: "0.25rem",
                          color: active ? "#f59e0b" : "#cbd5e1",
                          transition: "transform 0.1s ease",
                        }}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(star)}
                      >
                        <FiStar size={32} fill={active ? "#f59e0b" : "none"} />
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.35rem", fontWeight: 600 }}>
                  {rating === 5 && "🌟 Sangat Memuaskan (5/5)"}
                  {rating === 4 && "👍 Memuaskan (4/5)"}
                  {rating === 3 && "👌 Cukup Baik (3/5)"}
                  {rating === 2 && "👎 Kurang Memuaskan (2/5)"}
                  {rating === 1 && "⚠️ Sangat Kurang (1/5)"}
                </div>
              </div>

              {/* Komentar */}
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.35rem" }}>
                  Tuliskan Pengalaman & Ulasan Anda <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <textarea
                  style={{
                    width: "100%",
                    minHeight: "110px",
                    padding: "0.75rem",
                    border: "1.5px solid #e2e8f0",
                    borderRadius: 10,
                    fontSize: "0.85rem",
                    color: "#1e293b",
                    fontFamily: "inherit",
                    resize: "vertical",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  placeholder="Ceritakan pengalaman Anda selama ibadah, pelayanan muthowif, akomodasi hotel, transportasi, maupun konsumsi..."
                  value={komentar}
                  onChange={(e) => setKomentar(e.target.value)}
                  maxLength={2000}
                  required
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.74rem", color: "#94a3b8", marginTop: "0.25rem" }}>
                  <span>Minimal 5 karakter</span>
                  <span>{komentar.length}/2000 karakter</span>
                </div>
              </div>

              {/* Foto Dokumentasi */}
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.35rem" }}>
                  Foto Dokumentasi (Opsional, Maksimal 5 foto)
                </label>

                {photos.length < 5 && (
                  <div
                    style={{
                      border: "2px dashed #cbd5e1",
                      borderRadius: 10,
                      padding: "1rem",
                      textAlign: "center",
                      cursor: "pointer",
                      background: "#f8fafc",
                      transition: "all 0.15s ease",
                      marginBottom: "0.75rem",
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FiUploadCloud size={24} color="#0d9488" style={{ margin: "0 auto 0.25rem", display: "block" }} />
                    <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#334155" }}>
                      Pilih foto untuk diunggah
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                      Format JPG, PNG, atau WebP (Maks. 5 MB per foto)
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      style={{ display: "none" }}
                      onChange={handlePhotoSelect}
                    />
                  </div>
                )}

                {previews.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: "0.5rem" }}>
                    {previews.map((src, idx) => (
                      <div
                        key={idx}
                        style={{
                          aspectRatio: "1",
                          borderRadius: 8,
                          overflow: "hidden",
                          position: "relative",
                          border: "1px solid #cbd5e1",
                        }}
                      >
                        <img src={src} alt={`Preview ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <button
                          type="button"
                          style={{
                            position: "absolute",
                            top: 4,
                            right: 4,
                            background: "rgba(239, 68, 68, 0.9)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "50%",
                            width: 20,
                            height: 20,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            fontSize: "0.7rem",
                          }}
                          onClick={() => handleRemovePhoto(idx)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1rem" }}>
                <button
                  type="button"
                  style={{
                    padding: "0.6rem 1.1rem",
                    borderRadius: 8,
                    background: "#ffffff",
                    border: "1.5px solid #cbd5e1",
                    color: "#475569",
                    fontWeight: 600,
                    fontSize: "0.84rem",
                    cursor: "pointer",
                  }}
                  onClick={onClose}
                  disabled={loading}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "0.6rem 1.25rem",
                    borderRadius: 8,
                    background: "#0d9488",
                    border: "none",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "0.84rem",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                  disabled={loading || komentar.trim().length < 5}
                >
                  {loading ? (
                    <>
                      <div className="mini-spin" /> Mengirimkan...
                    </>
                  ) : (
                    <>
                      <FiCheck size={14} /> Kirimkan Ulasan
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

// ── 2. My Reviews Modal ──────────────────────────────────────────────────────

export const PortalMyReviewsModal = ({
  token,
  onClose,
  onWriteNewReview,
}: PortalMyReviewsModalProps) => {
  const [reviews, setReviews] = useState<MyReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  useEffect(() => {
    const fetchMyReviews = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API}/customer/ulasan`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setReviews(res.data?.data ?? []);
      } catch (err) {
        console.error("Gagal memuat riwayat ulasan saya", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMyReviews();
  }, [token]);

  return (
    <>
      <div className="invoice-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="invoice-modal-card" style={{ maxWidth: 620 }}>
          {/* Header */}
          <div
            className="invoice-modal-header"
            style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)" }}
          >
            <div className="invoice-modal-header-left">
              <div className="invoice-modal-badge-icon">📋</div>
              <div>
                <div className="invoice-modal-title">Ulasan Saya</div>
                <div className="invoice-modal-subtitle">
                  Riwayat ulasan dan testimoni yang pernah Anda kirimkan
                </div>
              </div>
            </div>
            <button className="invoice-modal-close" onClick={onClose}>
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="invoice-modal-body" style={{ padding: "1.25rem 1.5rem" }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "#94a3b8" }}>
                <div className="mini-spin-dark" style={{ margin: "0 auto 0.75rem" }} />
                Memuat riwayat ulasan Anda...
              </div>
            ) : reviews.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem 1.5rem", color: "#64748b" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>⭐</div>
                <div style={{ fontWeight: 700, fontSize: "1rem", color: "#1e293b", marginBottom: "0.35rem" }}>
                  Belum Ada Ulasan
                </div>
                <p style={{ fontSize: "0.84rem", margin: "0 auto 1.25rem", maxWidth: 360 }}>
                  Anda belum pernah mengirimkan ulasan untuk pendaftaran ini. Bagikan pengalaman ibadah Anda sekarang!
                </p>
                <button
                  type="button"
                  style={{
                    background: "#0d9488",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 8,
                    padding: "0.6rem 1.25rem",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                  }}
                  onClick={onWriteNewReview}
                >
                  ⭐ Tulis Ulasan Pertama
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {reviews.map((rev) => {
                  const dateStr = new Date(rev.created_at).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  });

                  return (
                    <div
                      key={rev.id}
                      style={{
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: 12,
                        padding: "1.1rem 1.25rem",
                      }}
                    >
                      {/* Top Bar: Date & Status Badge */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "0.6rem",
                        }}
                      >
                        <span style={{ fontSize: "0.78rem", color: "#64748b" }}>{dateStr}</span>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            padding: "0.25rem 0.6rem",
                            borderRadius: 999,
                            background: "#dcfce7",
                            color: "#15803d",
                            border: "1px solid #bbf7d0",
                          }}
                        >
                          ✅ Terpublikasi
                        </span>
                      </div>

                      {/* Stars */}
                      <div style={{ display: "flex", alignItems: "center", gap: "0.2rem", marginBottom: "0.6rem" }}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <FiStar
                            key={s}
                            size={14}
                            fill={s <= rev.rating ? "#f59e0b" : "none"}
                            color={s <= rev.rating ? "#f59e0b" : "#cbd5e1"}
                          />
                        ))}
                        <span style={{ fontWeight: 700, fontSize: "0.8rem", color: "#0f172a", marginLeft: "0.35rem" }}>
                          {rev.rating}.0
                        </span>
                      </div>

                      {/* Comment */}
                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: "#334155",
                          lineHeight: 1.5,
                          whiteSpace: "pre-wrap",
                          marginBottom: rev.foto_ulasan && rev.foto_ulasan.length > 0 ? "0.75rem" : 0,
                        }}
                      >
                        "{rev.komentar}"
                      </div>

                      {/* Photos */}
                      {rev.foto_ulasan && rev.foto_ulasan.length > 0 && (
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                          {rev.foto_ulasan.map((f, i) => (
                            <div
                              key={f.id || i}
                              style={{
                                width: 56,
                                height: 56,
                                borderRadius: 8,
                                overflow: "hidden",
                                cursor: "pointer",
                                border: "1px solid #cbd5e1",
                              }}
                              onClick={() => setLightboxImg(f.file_path)}
                              title="Klik untuk melihat foto"
                            >
                              <img src={f.file_path} alt={`Foto ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "1rem 1.5rem",
              background: "#f8fafc",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <button
              type="button"
              style={{
                background: "#0d9488",
                color: "#ffffff",
                border: "none",
                borderRadius: 8,
                padding: "0.5rem 1rem",
                fontWeight: 700,
                fontSize: "0.82rem",
                cursor: "pointer",
              }}
              onClick={onWriteNewReview}
            >
              + Tulis Ulasan Lainnya
            </button>
            <button
              type="button"
              style={{
                background: "#ffffff",
                color: "#475569",
                border: "1px solid #cbd5e1",
                borderRadius: 8,
                padding: "0.5rem 1rem",
                fontWeight: 600,
                fontSize: "0.82rem",
                cursor: "pointer",
              }}
              onClick={onClose}
            >
              Tutup
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxImg && (
        <div
          onClick={() => setLightboxImg(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.85)",
            zIndex: 10001,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
          }}
        >
          <button
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              background: "rgba(255, 255, 255, 0.2)",
              border: "none",
              color: "#fff",
              width: 44,
              height: 44,
              borderRadius: "50%",
              cursor: "pointer",
              fontSize: "1.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => setLightboxImg(null)}
          >
            ✕
          </button>
          <img
            src={lightboxImg}
            alt="Ulasan full"
            style={{
              maxWidth: "90vw",
              maxHeight: "90vh",
              borderRadius: 12,
              objectFit: "contain",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            }}
          />
        </div>
      )}
    </>
  );
};
