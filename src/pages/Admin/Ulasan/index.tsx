import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  FiStar,
  FiSearch,
  FiRefreshCw,
  FiEye,
  FiTrash2,
  FiCamera,
  FiUser,
  FiPackage,
  FiCalendar,
  FiPhone,
  FiMail,
  FiAlertTriangle,
  FiX,
} from "react-icons/fi";
import { useAuth } from "../../../context/AuthContext";
import { AdminPagination } from "../../../components/Pagination";
import "./AdminUlasan.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

// ── Types ────────────────────────────────────────────────────────────────────

interface FotoUlasanItem {
  id: string;
  file_path: string;
}

interface AdminUlasanItem {
  id: string;
  pendaftaran_id: string;
  rating: number;
  komentar: string;
  status: string;
  created_at: string;
  updated_at: string;
  foto_ulasan: FotoUlasanItem[];
  nama_jamaah?: string;
  nik?: string;
  no_hp?: string;
  email?: string;
  paket_nama?: string;
  tanggal_berangkat?: string;
  pendaftaran?: {
    NomorPendaftaran?: string;
    Customer?: {
      Nama?: string;
      NIK?: string;
      NoHP?: string;
      Email?: string;
    };
    customer?: {
      nama?: string;
      nik?: string;
      no_hp?: string;
      email?: string;
    };
    Paket?: {
      NamaPaket?: string;
      TanggalBerangkat?: string;
    };
    paket?: {
      nama_paket?: string;
      tanggal_berangkat?: string;
    };
  };
}

interface StatsUlasan {
  total: number;
  bintang_5: number;
  bintang_4: number;
  bintang_3: number;
  bintang_1_2: number;
}

// ── Formatters & Helpers ─────────────────────────────────────────────────────

const fmtDate = (d: string) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const renderStars = (rating: number) => {
  return (
    <div className="cell-rating">
      {[1, 2, 3, 4, 5].map((s) => (
        <FiStar
          key={s}
          size={14}
          fill={s <= rating ? "#f59e0b" : "none"}
          color={s <= rating ? "#f59e0b" : "#cbd5e1"}
        />
      ))}
      <span className="cell-rating-score">{rating}.0</span>
    </div>
  );
};

const getNamaJamaah = (item: AdminUlasanItem): string => {
  return (
    item.nama_jamaah ||
    item.pendaftaran?.Customer?.Nama ||
    item.pendaftaran?.customer?.nama ||
    "Jamaah Bonita Umroh"
  );
};

const getNamaPaket = (item: AdminUlasanItem): string => {
  return (
    item.paket_nama ||
    item.pendaftaran?.Paket?.NamaPaket ||
    item.pendaftaran?.paket?.nama_paket ||
    "Paket Umroh"
  );
};

const getCustomerNIK = (item: AdminUlasanItem): string => {
  return (
    item.nik ||
    item.pendaftaran?.Customer?.NIK ||
    item.pendaftaran?.customer?.nik ||
    "-"
  );
};

const getCustomerNoHP = (item: AdminUlasanItem): string => {
  return (
    item.no_hp ||
    item.pendaftaran?.Customer?.NoHP ||
    item.pendaftaran?.customer?.no_hp ||
    "-"
  );
};

const getCustomerEmail = (item: AdminUlasanItem): string => {
  return (
    item.email ||
    item.pendaftaran?.Customer?.Email ||
    item.pendaftaran?.customer?.email ||
    "-"
  );
};

// ── Main Component ───────────────────────────────────────────────────────────

const AdminUlasan = () => {
  const { token } = useAuth();

  const [reviews, setReviews] = useState<AdminUlasanItem[]>([]);
  const [stats, setStats] = useState<StatsUlasan>({
    total: 0,
    bintang_5: 0,
    bintang_4: 0,
    bintang_3: 0,
    bintang_1_2: 0,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters
  const [ratingFilter, setRatingFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);

  // Modals
  const [detailModalItem, setDetailModalItem] = useState<AdminUlasanItem | null>(null);
  const [deleteModalItem, setDeleteModalItem] = useState<AdminUlasanItem | null>(null);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // ── Fetch Data ─────────────────────────────────────────────────────────────
  const fetchReviews = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", String(page));
      params.append("limit", "10");
      if (ratingFilter) {
        params.append("rating", ratingFilter);
      }
      if (search.trim()) {
        params.append("search", search.trim());
      }

      const res = await axios.get(`${API_BASE_URL}/admin/ulasan?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setReviews(res.data?.data ?? []);
      setTotalPages(res.data?.meta?.total_pages ?? 1);
      setTotalItems(res.data?.meta?.total ?? 0);
      if (res.data?.stats) {
        setStats(res.data.stats);
      }
    } catch (err: unknown) {
      console.error("Gagal memuat daftar ulasan", err);
      showToast("Gagal memuat daftar ulasan.", "error");
    } finally {
      setLoading(false);
    }
  }, [token, page, ratingFilter, search]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // ── Delete Handler ──────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!token || !deleteModalItem) return;
    setActionLoading(true);
    try {
      await axios.delete(`${API_BASE_URL}/admin/ulasan/${deleteModalItem.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      showToast("Ulasan dan seluruh foto terkait berhasil dihapus permanen.");
      setDeleteModalItem(null);
      if (detailModalItem && detailModalItem.id === deleteModalItem.id) {
        setDetailModalItem(null);
      }
      fetchReviews();
    } catch (err: unknown) {
      console.error("Gagal menghapus ulasan", err);
      showToast("Gagal menghapus ulasan.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="admin-ulasan-page">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 2000,
            background: toastMessage.type === "success" ? "#065f46" : "#991b1b",
            color: "#ffffff",
            padding: "0.85rem 1.25rem",
            borderRadius: 10,
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
            fontWeight: 600,
            fontSize: "0.88rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          {toastMessage.type === "success" ? "✓" : "⚠️"} {toastMessage.text}
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="ulasan-header">
        <div className="ulasan-header-left">
          <h2 className="ulasan-title">
            ⭐ Ulasan Jamaah
          </h2>
          <p className="ulasan-subtitle">
            Daftar testimoni dan ulasan perjalanan umroh yang dikirimkan oleh jamaah. Seluruh ulasan langsung terpublikasi.
          </p>
        </div>
        <div className="ulasan-header-actions">
          <button
            className="btn-refresh"
            onClick={fetchReviews}
            disabled={loading}
            title="Muat Ulang Data"
          >
            <FiRefreshCw size={14} className={loading ? "spin" : ""} />
            Segarkan
          </button>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="ulasan-stats-grid">
        <div
          className={`ulasan-stat-card ${ratingFilter === "" ? "active" : ""}`}
          onClick={() => {
            setRatingFilter("");
            setPage(1);
          }}
          title="Klik untuk melihat semua ulasan"
        >
          <div className="stat-icon-wrap icon-all">💬</div>
          <div className="stat-info">
            <span className="stat-val">{stats.total}</span>
            <span className="stat-lbl">Total Ulasan Masuk</span>
          </div>
        </div>

        <div
          className={`ulasan-stat-card ${ratingFilter === "5" ? "active" : ""}`}
          onClick={() => {
            setRatingFilter(ratingFilter === "5" ? "" : "5");
            setPage(1);
          }}
          title="Klik untuk filter Bintang 5"
        >
          <div className="stat-icon-wrap" style={{ background: "#fef3c7", color: "#d97706" }}>
            ⭐
          </div>
          <div className="stat-info">
            <span className="stat-val">{stats.bintang_5}</span>
            <span className="stat-lbl">Rating 5 Bintang</span>
          </div>
        </div>

        <div
          className={`ulasan-stat-card ${ratingFilter === "4" ? "active" : ""}`}
          onClick={() => {
            setRatingFilter(ratingFilter === "4" ? "" : "4");
            setPage(1);
          }}
          title="Klik untuk filter Bintang 4"
        >
          <div className="stat-icon-wrap" style={{ background: "#dcfce7", color: "#16a34a" }}>
            ⭐
          </div>
          <div className="stat-info">
            <span className="stat-val">{stats.bintang_4}</span>
            <span className="stat-lbl">Rating 4 Bintang</span>
          </div>
        </div>

        <div
          className={`ulasan-stat-card ${ratingFilter === "3" ? "active" : ""}`}
          onClick={() => {
            setRatingFilter(ratingFilter === "3" ? "" : "3");
            setPage(1);
          }}
          title="Klik untuk filter Bintang 1-3"
        >
          <div className="stat-icon-wrap" style={{ background: "#fee2e2", color: "#dc2626" }}>
            ⭐
          </div>
          <div className="stat-info">
            <span className="stat-val">{(stats.bintang_3 || 0) + (stats.bintang_1_2 || 0)}</span>
            <span className="stat-lbl">Rating 1–3 Bintang</span>
          </div>
        </div>
      </div>

      {/* ── Filters & Search Bar ── */}
      <div className="ulasan-filter-bar">
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155" }}>
            Filter:
          </span>
          <select
            className="ulasan-select"
            value={ratingFilter}
            onChange={(e) => {
              setRatingFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Semua Rating Bintang</option>
            <option value="5">⭐⭐⭐⭐⭐ (5 Bintang)</option>
            <option value="4">⭐⭐⭐⭐ (4 Bintang)</option>
            <option value="3">⭐⭐⭐ (3 Bintang)</option>
            <option value="2">⭐⭐ (2 Bintang)</option>
            <option value="1">⭐ (1 Bintang)</option>
          </select>
        </div>

        <div className="ulasan-filter-inputs">
          <div className="ulasan-search-wrap">
            <FiSearch size={15} className="ulasan-search-icon" />
            <input
              type="text"
              placeholder="Cari jamaah, paket, komentar..."
              className="ulasan-search-input"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Table Card ── */}
      <div className="ulasan-table-card">
        {loading ? (
          <div className="ulasan-empty-state">
            <div className="mini-spin-dark" style={{ margin: "0 auto 1rem" }} />
            <div className="empty-title">Memuat ulasan...</div>
          </div>
        ) : reviews.length === 0 ? (
          <div className="ulasan-empty-state">
            <div className="empty-icon">📭</div>
            <div className="empty-title">Tidak ada ulasan ditemukan</div>
            <div className="empty-desc">
              {search || ratingFilter
                ? "Coba sesuaikan filter pencarian atau rating Anda."
                : "Belum ada ulasan yang dikirimkan oleh jamaah."}
            </div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="ulasan-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Jamaah</th>
                  <th>Paket Umroh</th>
                  <th>Rating</th>
                  <th>Ulasan</th>
                  <th>Foto</th>
                  <th style={{ textAlign: "right" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((item) => {
                  const namaJamaah = getNamaJamaah(item);
                  const namaPaket = getNamaPaket(item);
                  const initial = namaJamaah.charAt(0).toUpperCase();

                  return (
                    <tr key={item.id}>
                      <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem", color: "#64748b" }}>
                        {fmtDate(item.created_at)}
                      </td>
                      <td>
                        <div className="cell-user">
                          <div className="user-avatar">{initial}</div>
                          <div className="user-info-text">
                            <span className="user-name">{namaJamaah}</span>
                            <span className="user-nomor">{item.pendaftaran_id}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: "#334155" }}>
                          {namaPaket}
                        </span>
                      </td>
                      <td>{renderStars(item.rating)}</td>
                      <td>
                        <div className="cell-comment" title={item.komentar}>
                          "{item.komentar}"
                        </div>
                      </td>
                      <td>
                        {item.foto_ulasan && item.foto_ulasan.length > 0 ? (
                          <span className="photos-pill">
                            <FiCamera size={13} />
                            {item.foto_ulasan.length} foto
                          </span>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>-</span>
                        )}
                      </td>
                      <td>
                        <div className="cell-actions" style={{ justifyContent: "flex-end" }}>
                          <button
                            className="btn-act"
                            title="Lihat Detail Ulasan"
                            onClick={() => setDetailModalItem(item)}
                          >
                            <FiEye />
                          </button>

                          <button
                            className="btn-act delete"
                            title="Hapus Ulasan"
                            onClick={() => setDeleteModalItem(item)}
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ── */}
        {!loading && reviews.length > 0 && (
          <AdminPagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            currentCount={reviews.length}
            onPageChange={setPage}
            itemName="ulasan"
          />
        )}
      </div>

      {/* ── Detail Modal ── */}
      {detailModalItem && (
        <div
          className="ulasan-modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setDetailModalItem(null)}
        >
          <div className="ulasan-modal-dialog">
            <div className="modal-head">
              <h3 className="modal-head-title">
                ⭐ Detail Ulasan Jamaah
              </h3>
              <button className="btn-close-modal" onClick={() => setDetailModalItem(null)}>
                <FiX />
              </button>
            </div>

            <div className="modal-body">
              {/* Rating & Tanggal Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.85rem 1.15rem",
                  background: "#f8fafc",
                  borderRadius: 10,
                  border: "1px solid #e2e8f0",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Rating Kepuasan:</div>
                  <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#0f172a" }}>
                    {detailModalItem.rating}.0 dari 5 Bintang
                  </div>
                </div>
                {renderStars(detailModalItem.rating)}
              </div>

              {/* Data Jamaah & Booking */}
              <div className="detail-section">
                <div className="detail-section-title">Informasi Jamaah & Paket</div>
                <div className="detail-grid">
                  <div>
                    <div className="detail-item-lbl">Nama Lengkap Jamaah</div>
                    <div className="detail-item-val">
                      <FiUser size={13} style={{ marginRight: 5, verticalAlign: -1 }} />
                      {getNamaJamaah(detailModalItem)}
                    </div>
                  </div>
                  <div>
                    <div className="detail-item-lbl">Nomor Pendaftaran</div>
                    <div className="detail-item-val" style={{ fontFamily: "monospace" }}>
                      {detailModalItem.pendaftaran_id}
                    </div>
                  </div>
                  <div>
                    <div className="detail-item-lbl">NIK Customer</div>
                    <div className="detail-item-val">
                      {getCustomerNIK(detailModalItem)}
                    </div>
                  </div>
                  <div>
                    <div className="detail-item-lbl">No. HP / WhatsApp</div>
                    <div className="detail-item-val">
                      <FiPhone size={13} style={{ marginRight: 5, verticalAlign: -1 }} />
                      {getCustomerNoHP(detailModalItem)}
                    </div>
                  </div>
                  <div>
                    <div className="detail-item-lbl">Alamat Email</div>
                    <div className="detail-item-val">
                      <FiMail size={13} style={{ marginRight: 5, verticalAlign: -1 }} />
                      {getCustomerEmail(detailModalItem)}
                    </div>
                  </div>
                  <div>
                    <div className="detail-item-lbl">Paket Umroh</div>
                    <div className="detail-item-val">
                      <FiPackage size={13} style={{ marginRight: 5, verticalAlign: -1 }} />
                      {getNamaPaket(detailModalItem)}
                    </div>
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
                    <div className="detail-item-lbl">Tanggal Ulasan Dikirim</div>
                    <div className="detail-item-val">
                      <FiCalendar size={13} style={{ marginRight: 5, verticalAlign: -1 }} />
                      {fmtDate(detailModalItem.created_at)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Komentar Ulasan */}
              <div>
                <div className="detail-section-title">Isi Komentar / Ulasan</div>
                <div className="comment-box">
                  "{detailModalItem.komentar}"
                </div>
              </div>

              {/* Galeri Foto */}
              <div>
                <div className="detail-section-title">
                  Dokumentasi Foto ({detailModalItem.foto_ulasan?.length || 0})
                </div>
                {detailModalItem.foto_ulasan && detailModalItem.foto_ulasan.length > 0 ? (
                  <div className="modal-photos-grid">
                    {detailModalItem.foto_ulasan.map((f, i) => (
                      <div
                        key={f.id || i}
                        className="modal-photo-item"
                        onClick={() => setLightboxImg(f.file_path)}
                        title="Klik untuk memperbesar"
                      >
                        <img src={f.file_path} alt={`Foto ulasan ${i + 1}`} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: "0.85rem", color: "#94a3b8", fontStyle: "italic" }}>
                    Tidak ada foto yang diunggah untuk ulasan ini.
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <div className="modal-footer-left">
                <button
                  className="btn-modal delete"
                  onClick={() => setDeleteModalItem(detailModalItem)}
                >
                  <FiTrash2 /> Hapus Ulasan
                </button>
              </div>

              <div className="modal-footer-right">
                <button
                  className="btn-modal cancel"
                  onClick={() => setDetailModalItem(null)}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteModalItem && (
        <div
          className="ulasan-modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setDeleteModalItem(null)}
        >
          <div className="ulasan-modal-dialog" style={{ maxWidth: 440 }}>
            <div className="modal-head" style={{ background: "#fef2f2" }}>
              <h3 className="modal-head-title" style={{ color: "#991b1b" }}>
                <FiAlertTriangle color="#dc2626" /> Konfirmasi Hapus Ulasan
              </h3>
              <button className="btn-close-modal" onClick={() => setDeleteModalItem(null)}>
                <FiX />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ margin: 0, fontSize: "0.9rem", color: "#334155", lineHeight: 1.5 }}>
                Apakah Anda yakin ingin menghapus ulasan dari{" "}
                <strong>{getNamaJamaah(deleteModalItem)}</strong>?
              </p>
              <div
                style={{
                  background: "#fff1f2",
                  border: "1px solid #fecaca",
                  padding: "0.75rem",
                  borderRadius: 8,
                  fontSize: "0.8rem",
                  color: "#991b1b",
                }}
              >
                ⚠️ Tindakan ini permanen. Seluruh foto ulasan terkait di penyimpanan Supabase Storage
                juga akan ikut dihapus.
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-modal cancel"
                onClick={() => setDeleteModalItem(null)}
                disabled={actionLoading}
              >
                Batal
              </button>
              <button
                className="btn-modal delete"
                disabled={actionLoading}
                onClick={handleDelete}
              >
                {actionLoading ? "Menghapus..." : "Ya, Hapus Ulasan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Photo Lightbox ── */}
      {lightboxImg && (
        <div
          className="ulasan-lightbox"
          onClick={() => setLightboxImg(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.85)",
            zIndex: 3000,
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
            alt="Ulasan full view"
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
    </div>
  );
};

export default AdminUlasan;
