import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { FiX, FiCheck, FiArrowRight, FiUploadCloud } from "react-icons/fi";
import { API_BASE_URL } from "../../config/api";
import { PublicPagination } from "../../components/Pagination";
import "./Ulasan.css";

interface FotoUlasan {
  id: string;
  file_path: string;
}

interface PublicReview {
  id: string;
  rating: number;
  komentar: string;
  created_at: string;
  nama_jamaah: string;
  paket_nama: string;
  foto_ulasan: FotoUlasan[];
}

interface MetaReview {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  average_rating: number;
  rating_breakdown: Record<string, number>;
}

const Ulasan = () => {
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [meta, setMeta] = useState<MetaReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Lightbox
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // Modal Berikan Ulasan
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState<"nomor" | "otp" | "form" | "success">("nomor");
  const [nomorPendaftaran, setNomorPendaftaran] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [customerToken, setCustomerToken] = useState("");

  // Review Form state
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [komentar, setKomentar] = useState("");
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  // Feedback states
  const [loadingAction, setLoadingAction] = useState(false);
  const [modalError, setModalError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ── Fetch Reviews ──
  const fetchReviews = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/ulasan?page=${p}&limit=9`);
      setReviews(res.data?.data ?? []);
      setMeta(res.data?.meta ?? null);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews(page);
  }, [fetchReviews, page]);

  // ── OTP Countdown ──
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // ── Modal Handlers ──
  const handleOpenModal = () => {
    setShowModal(true);
    setModalStep("nomor");
    setNomorPendaftaran("");
    setOtpCode("");
    setCustomerToken("");
    setRating(5);
    setKomentar("");
    setSelectedPhotos([]);
    setPhotoPreviews([]);
    setModalError("");
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  // Step 1: Kirim OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");
    const nom = nomorPendaftaran.trim();
    if (!nom) {
      setModalError("Masukkan nomor pendaftaran Anda.");
      return;
    }
    setLoadingAction(true);
    try {
      await axios.post(`${API_BASE_URL}/otp/request`, { nomor: nom });
      setModalStep("otp");
      setCountdown(60);
    } catch (err: unknown) {
      setModalError(
        axios.isAxiosError(err)
          ? err.response?.data?.error ?? "Gagal mengirimkan OTP. Pastikan nomor pendaftaran benar."
          : "Gagal mengirimkan OTP."
      );
    } finally {
      setLoadingAction(false);
    }
  };

  // Step 2: Verifikasi OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");
    if (!otpCode || otpCode.length !== 6) {
      setModalError("Masukkan 6 digit kode OTP.");
      return;
    }
    setLoadingAction(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/otp/verify`, {
        nomor: nomorPendaftaran.trim(),
        otp: otpCode.trim(),
      });
      const tok = res.data?.token;
      if (!tok) {
        setModalError("Token verifikasi tidak diterima.");
        return;
      }
      setCustomerToken(tok);
      setModalStep("form");
    } catch (err: unknown) {
      setModalError(
        axios.isAxiosError(err)
          ? err.response?.data?.error ?? "Kode OTP tidak valid atau sudah kedaluwarsa."
          : "Gagal memverifikasi OTP."
      );
    } finally {
      setLoadingAction(false);
    }
  };

  // Step 3: Handle Photo Selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = 5 - selectedPhotos.length;
    if (remainingSlots <= 0) {
      setModalError("Maksimal mengunggah 5 foto ulasan.");
      return;
    }

    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    Array.from(files).slice(0, remainingSlots).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        setModalError(`Foto '${file.name}' melebihi ukuran maksimal 5 MB.`);
        return;
      }
      newFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    });

    setSelectedPhotos((prev) => [...prev, ...newFiles]);
    setPhotoPreviews((prev) => [...prev, ...newPreviews]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemovePhoto = (index: number) => {
    setSelectedPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Step 3: Submit Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");
    if (!komentar.trim() || komentar.trim().length < 5) {
      setModalError("Komentar ulasan minimal 5 karakter.");
      return;
    }

    setLoadingAction(true);
    try {
      const formData = new FormData();
      formData.append("rating", String(rating));
      formData.append("komentar", komentar.trim());
      selectedPhotos.forEach((file) => {
        formData.append("foto", file);
      });

      await axios.post(`${API_BASE_URL}/customer/ulasan`, formData, {
        headers: {
          Authorization: `Bearer ${customerToken}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setModalStep("success");
      fetchReviews(1);
    } catch (err: unknown) {
      setModalError(
        axios.isAxiosError(err)
          ? err.response?.data?.error ?? "Gagal mengirimkan ulasan. Silakan coba kembali."
          : "Gagal mengirimkan ulasan."
      );
    } finally {
      setLoadingAction(false);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="ulasan-page">
      {/* ── Hero Section ── */}
      <section className="ulasan-hero">
        <div className="ulasan-hero-container">
          <div className="ulasan-hero-badge">⭐ Testimoni Jamaah</div>
          <h1 className="ulasan-hero-title">
            Pengalaman &amp; <span>Kisah Suci</span> Jamaah
          </h1>
          <p className="ulasan-hero-sub">
            Kebahagiaan dan ketenangan jamaah dalam menjalankan ibadah di Baitullah
            adalah amanah utama kami. Simak cerita nyata dari para jamaah Bonita Umroh.
          </p>
          <button className="ulasan-hero-btn" onClick={handleOpenModal}>
            ⭐ Berikan Ulasan Anda
          </button>
        </div>
      </section>

      {/* ── Content Container ── */}
      <div className="ulasan-container">
        {/* Rating Summary Card */}
        {meta && meta.total > 0 && (
          <div className="ulasan-summary-card">
            <div className="ulasan-summary-score">
              <div className="ulasan-big-rating">{meta.average_rating.toFixed(1)}</div>
              <div className="ulasan-stars-row">
                {[1, 2, 3, 4, 5].map((s) => (
                  <span key={s}>{s <= Math.round(meta.average_rating) ? "★" : "☆"}</span>
                ))}
              </div>
              <div className="ulasan-score-meta">
                Berdasarkan <strong>{meta.total}</strong> ulasan jamaah
              </div>
            </div>

            <div className="ulasan-breakdown-col">
              {[5, 4, 3, 2, 1].map((s) => {
                const count = meta.rating_breakdown[String(s)] ?? 0;
                const pct = meta.total > 0 ? (count / meta.total) * 100 : 0;
                return (
                  <div key={s} className="ulasan-breakdown-row">
                    <span className="ulasan-bar-label">{s} ★</span>
                    <div className="ulasan-bar-track">
                      <div className="ulasan-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="ulasan-bar-count">{count}</span>
                  </div>
                );
              })}
            </div>

            <div className="ulasan-summary-cta">
              <div className="ulasan-cta-text">
                Sudah pernah mendaftar atau beribadah bersama kami?
              </div>
              <button className="ulasan-btn-secondary" onClick={handleOpenModal}>
                ✍️ Tulis Ulasan
              </button>
            </div>
          </div>
        )}

        {/* ── Reviews Grid ── */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem 2rem", color: "#64748b" }}>
            <div className="mini-spin-dark" style={{ margin: "0 auto 1rem", width: 32, height: 32 }} />
            Memuat ulasan jamaah...
          </div>
        ) : reviews.length === 0 ? (
          <div className="ulasan-empty">
            <div className="ulasan-empty-icon">🕋</div>
            <div className="ulasan-empty-title">Belum Ada Ulasan</div>
            <p className="ulasan-empty-desc">
              Jadilah yang pertama membagikan pengalaman ibadah Umroh bersama Bonita Umroh!
            </p>
            <button className="ulasan-hero-btn" onClick={handleOpenModal}>
              ⭐ Berikan Ulasan Pertama
            </button>
          </div>
        ) : (
          <>
            <div className="ulasan-grid">
              {reviews.map((r) => (
                <div key={r.id} className="ulasan-card">
                  <div className="ulasan-card-header">
                    <div className="ulasan-avatar">
                      {r.nama_jamaah.charAt(0).toUpperCase()}
                    </div>
                    <div className="ulasan-user-info">
                      <div className="ulasan-user-name">{r.nama_jamaah}</div>
                      <span className="ulasan-paket-badge">{r.paket_nama}</span>
                    </div>
                  </div>

                  <div className="ulasan-meta-row">
                    <div className="ulasan-stars">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span key={s} style={{ color: s <= r.rating ? "#f59e0b" : "#cbd5e1" }}>
                          ★
                        </span>
                      ))}
                    </div>
                    <div className="ulasan-date">{formatDate(r.created_at)}</div>
                  </div>

                  <div className="ulasan-text">{r.komentar}</div>

                  {r.foto_ulasan && r.foto_ulasan.length > 0 && (
                    <div className="ulasan-photos">
                      {r.foto_ulasan.map((f) => (
                        <img
                          key={f.id}
                          src={f.file_path}
                          alt="Foto Ulasan"
                          className="ulasan-photo-thumb"
                          onClick={() => setLightboxImg(f.file_path)}
                          loading="lazy"
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {meta && meta.total_pages > 1 && (
              <PublicPagination
                currentPage={page}
                totalPages={meta.total_pages}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </div>

      {/* ── Lightbox Image Modal ── */}
      {lightboxImg && (
        <div className="ulasan-lightbox" onClick={() => setLightboxImg(null)}>
          <button className="ulasan-lightbox-close" onClick={() => setLightboxImg(null)}>
            ✕
          </button>
          <img src={lightboxImg} alt="Preview Foto Ulasan" className="ulasan-lightbox-img" />
        </div>
      )}

      {/* ── Modal Berikan Ulasan ── */}
      {showModal && (
        <div className="ulasan-modal-overlay" onClick={(e) => e.target === e.currentTarget && handleCloseModal()}>
          <div className="ulasan-modal">
            <div className="ulasan-modal-header">
              <div className="ulasan-modal-title">
                ⭐ Berikan Ulasan Jamaah
              </div>
              <button className="ulasan-modal-close" onClick={handleCloseModal}>
                <FiX size={18} />
              </button>
            </div>

            <div className="ulasan-modal-body">
              {/* Step indicator */}
              <div className="ulasan-step-indicator">
                <div className={`ulasan-step-dot ${modalStep === "nomor" ? "active" : "done"}`}>1</div>
                <div className={`ulasan-step-line ${modalStep !== "nomor" ? "done" : ""}`} />
                <div className={`ulasan-step-dot ${modalStep === "otp" ? "active" : modalStep === "form" || modalStep === "success" ? "done" : ""}`}>2</div>
                <div className={`ulasan-step-line ${modalStep === "form" || modalStep === "success" ? "done" : ""}`} />
                <div className={`ulasan-step-dot ${modalStep === "form" ? "active" : modalStep === "success" ? "done" : ""}`}>3</div>
              </div>

              {modalError && <div className="ulasan-alert-error">⚠️ {modalError}</div>}

              {/* Step 1: Input Nomor Pendaftaran */}
              {modalStep === "nomor" && (
                <form onSubmit={handleRequestOtp}>
                  <div className="ulasan-form-field">
                    <label className="ulasan-form-label">Nomor Pendaftaran Umroh *</label>
                    <input
                      type="text"
                      className="ulasan-form-input"
                      placeholder="Contoh: UMR-2026..."
                      value={nomorPendaftaran}
                      onChange={(e) => setNomorPendaftaran(e.target.value)}
                      disabled={loadingAction}
                      autoFocus
                    />
                    <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 6, lineHeight: 1.4 }}>
                      Kode verifikasi OTP akan dikirimkan ke email yang terdaftar pada nomor pendaftaran Anda.
                    </div>
                  </div>
                  <button type="submit" className="ulasan-btn-submit" disabled={loadingAction || !nomorPendaftaran.trim()}>
                    {loadingAction ? "Mengirim OTP..." : <>Kirim Kode OTP <FiArrowRight /></>}
                  </button>
                </form>
              )}

              {/* Step 2: Input OTP */}
              {modalStep === "otp" && (
                <form onSubmit={handleVerifyOtp}>
                  <div className="ulasan-form-field">
                    <label className="ulasan-form-label">Masukkan 6 Digit Kode OTP *</label>
                    <input
                      type="text"
                      maxLength={6}
                      className="ulasan-form-input"
                      placeholder="000000"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      style={{ letterSpacing: "0.3em", fontSize: "1.3rem", textAlign: "center", fontWeight: 700 }}
                      disabled={loadingAction}
                      autoFocus
                    />
                    <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 8, textAlign: "center" }}>
                      Tidak menerima email?{" "}
                      <button
                        type="button"
                        onClick={handleRequestOtp}
                        disabled={countdown > 0 || loadingAction}
                        style={{ background: "none", border: "none", color: "#1a6b43", fontWeight: 700, cursor: "pointer" }}
                      >
                        {countdown > 0 ? `Kirim ulang (${countdown}s)` : "Kirim Ulang"}
                      </button>
                    </div>
                  </div>
                  <button type="submit" className="ulasan-btn-submit" disabled={loadingAction || otpCode.length !== 6}>
                    {loadingAction ? "Memverifikasi..." : <>Verifikasi &amp; Lanjutkan <FiCheck /></>}
                  </button>
                </form>
              )}

              {/* Step 3: Form Ulasan */}
              {modalStep === "form" && (
                <form onSubmit={handleSubmitReview}>
                  {/* Rating Selector */}
                  <div className="ulasan-form-field">
                    <label className="ulasan-form-label">Penilaian Bintang *</label>
                    <div className="ulasan-star-selector">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          className={`ulasan-star-btn ${(hoverRating || rating) >= star ? "active" : ""}`}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setRating(star)}
                          aria-label={`Beri bintang ${star}`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "#64748b" }}>
                      {rating === 5
                        ? "⭐⭐⭐⭐⭐ Sangat Memuaskan"
                        : rating === 4
                        ? "⭐⭐⭐⭐ Memuaskan"
                        : rating === 3
                        ? "⭐⭐⭐ Cukup Baik"
                        : rating === 2
                        ? "⭐⭐ Kurang Memuaskan"
                        : "⭐ Sangat Kurang"}
                    </div>
                  </div>

                  {/* Komentar */}
                  <div className="ulasan-form-field">
                    <label className="ulasan-form-label">Komentar &amp; Ulasan Pengalaman *</label>
                    <textarea
                      rows={4}
                      className="ulasan-form-textarea"
                      placeholder="Bagikan pengalaman ibadah, kenyamanan hotel, pelayanan muthawwif, maupun fasilitas selama umroh..."
                      value={komentar}
                      onChange={(e) => setKomentar(e.target.value)}
                      maxLength={2000}
                      disabled={loadingAction}
                    />
                    <div style={{ textAlign: "right", fontSize: "0.75rem", color: "#94a3b8", marginTop: 4 }}>
                      {komentar.length} / 2000 karakter
                    </div>
                  </div>

                  {/* Foto Upload */}
                  <div className="ulasan-form-field">
                    <label className="ulasan-form-label">Foto Pengalaman (Opsional, Maks 5 Foto)</label>
                    <div
                      className="ulasan-file-dropzone"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FiUploadCloud size={28} style={{ color: "#1a6b43", marginBottom: 6 }} />
                      <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "#334155" }}>
                        Klik untuk memilih foto dari perangkat Anda
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 2 }}>
                        Format: JPG, PNG, atau WebP (Maks 5 MB per foto)
                      </div>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: "none" }}
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={handlePhotoSelect}
                      disabled={loadingAction || selectedPhotos.length >= 5}
                    />

                    {photoPreviews.length > 0 && (
                      <div className="ulasan-upload-previews">
                        {photoPreviews.map((src, i) => (
                          <div key={i} className="ulasan-preview-item">
                            <img src={src} alt="Preview" />
                            <button
                              type="button"
                              className="ulasan-preview-remove"
                              onClick={() => handleRemovePhoto(i)}
                              title="Hapus foto ini"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button type="submit" className="ulasan-btn-submit" disabled={loadingAction || !komentar.trim()}>
                    {loadingAction ? "Mengirimkan Ulasan..." : "Kirim Ulasan Sekarang"}
                  </button>
                </form>
              )}

              {/* Step 4: Success Message */}
              {modalStep === "success" && (
                <div className="ulasan-success-box">
                  <div className="ulasan-success-icon">🎉</div>
                  <div className="ulasan-success-title">Terima Kasih Atas Ulasan Anda!</div>
                  <div className="ulasan-success-text">
                    Alhamdulillah, ulasan dan testimoni pengalaman ibadah Anda telah berhasil disimpan dan langsung tampil di halaman ini.
                  </div>
                  <button
                    className="ulasan-btn-submit"
                    onClick={() => {
                      handleCloseModal();
                      fetchReviews(1);
                    }}
                  >
                    Tutup & Lihat Ulasan
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ulasan;
