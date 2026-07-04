import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import "./Paket.css";

// ── Types ────────────────────────────────────────────────────────────────────

interface FasilitasItem {
  nama_fasilitas: string;
  deskripsi: string;
}

interface PaketItem {
  id: string;
  nama_paket: string;
  foto_paket: string;
  harga: number;
  tanggal_berangkat: string;
  durasi: number;
  sisa_kuota: number;
  kuota_max: number;
}

interface PaketDetail extends PaketItem {
  deskripsi: string;
  fasilitas: FasilitasItem[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const formatRupiah = (n?: number) =>
  n != null ? "Rp " + n.toLocaleString("id-ID") : "-";

const formatDate = (d?: string) => {
  if (!d) return "-";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

function getKuotaInfo(sisa: number, max: number = 0) {
  if (sisa <= 0) return { label: "Penuh", colorClass: "kuota-full", fillClass: "fill-red", pct: 100 };
  if (sisa <= 5) return { label: `Sisa ${sisa}`, colorClass: "kuota-limited", fillClass: "fill-yellow", pct: max > 0 ? Math.round(((max - sisa) / max) * 100) : 85 };
  // Kuota masih banyak — bar hampir kosong (tampilkan % terpakai)
  const terpakai = max > 0 ? max - sisa : 0;
  const pct = max > 0 ? Math.max(2, Math.round((terpakai / max) * 100)) : 5;
  return { label: `Sisa ${sisa}`, colorClass: "kuota-available", fillClass: "fill-green", pct };
}

const FALLBACK_IMG = "https://images.unsplash.com/photo-1564769625905-50e93615e769?w=800&q=80";

// ── Skeleton Card ─────────────────────────────────────────────────────────────

const SkeletonCard = () => (
  <div className="skeleton-card">
    <div className="skeleton-img" />
    <div className="skeleton-body">
      <div className="skeleton-line w-3-4" />
      <div className="skeleton-line w-full" />
      <div className="skeleton-line w-1-2" />
      <div className="skeleton-line w-full" />
      <div className="skeleton-line w-3-4" />
    </div>
  </div>
);

// ── Modal ────────────────────────────────────────────────────────────────────

const PaketModal = ({
  paketId,
  onClose,
}: {
  paketId: string;
  onClose: () => void;
}) => {
  const [detail, setDetail] = useState<PaketDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoadingDetail(true);
        setFetchError(false);
        const res = await axios.get(`http://localhost:8080/paket/${paketId}`);
        setDetail(res.data);
      } catch {
        setFetchError(true);
      } finally {
        setLoadingDetail(false);
      }
    };
    fetchDetail();
  }, [paketId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const kuota = detail ? getKuotaInfo(detail.sisa_kuota) : null;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-content">
        {/* ── Loading skeleton ── */}
        {loadingDetail && (
          <>
            <div className="modal-skeleton-img" />
            <div className="modal-body">
              <div className="skeleton-line w-3-4" style={{ height: 24, marginBottom: "1rem" }} />
              <div className="skeleton-line w-full" style={{ height: 80, borderRadius: 16, marginBottom: "1rem" }} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem", marginBottom: "1rem" }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton-line w-full" style={{ height: 80, borderRadius: 14 }} />
                ))}
              </div>
              <div className="skeleton-line w-full" style={{ height: 14, marginBottom: "0.5rem" }} />
              <div className="skeleton-line w-3-4" style={{ height: 14 }} />
            </div>
          </>
        )}

        {/* ── Error ── */}
        {!loadingDetail && fetchError && (
          <div className="modal-body" style={{ textAlign: "center", padding: "3rem" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>⚠️</div>
            <p style={{ color: "#64748b" }}>Gagal memuat detail paket.</p>
          </div>
        )}

        {/* ── Content ── */}
        {!loadingDetail && !fetchError && detail && (
          <>
            <img
              src={detail.foto_paket || FALLBACK_IMG}
              alt={detail.nama_paket}
              className="modal-image"
              onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
            />

            <div className="modal-body">
              {/* Header */}
              <div className="modal-header">
                <h2 className="modal-title">{detail.nama_paket}</h2>
                <button className="modal-close" onClick={onClose} aria-label="Tutup">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Price + CTA */}
              <div className="modal-price-section">
                <div>
                  <div className="modal-price-label">Harga per orang</div>
                  <div className="modal-price-value">{formatRupiah(detail.harga)}</div>
                </div>
                <Link
                  to={`/daftar?paket=${detail.id}`}
                  className="modal-register-btn"
                  onClick={onClose}
                >
                  Daftar Sekarang →
                </Link>
              </div>

              {/* Stats */}
              <div className="modal-stats">
                <div className="stat-box">
                  <div className="stat-box-icon">✈️</div>
                  <div className="stat-box-value">{formatDate(detail.tanggal_berangkat)}</div>
                  <div className="stat-box-label">Berangkat</div>
                </div>
                <div className="stat-box">
                  <div className="stat-box-icon">🌙</div>
                  <div className="stat-box-value">{detail.durasi} Hari</div>
                  <div className="stat-box-label">Durasi</div>
                </div>
                <div className="stat-box">
                  <div className="stat-box-icon">👥</div>
                  <div className="stat-box-value">
                    {detail.sisa_kuota > 0 ? detail.sisa_kuota : "Penuh"}
                  </div>
                  <div className="stat-box-label">Sisa Kuota</div>
                </div>
              </div>

              {/* Kuota Bar */}
              {kuota && (
                <div className="kuota-bar-wrap">
                  <div className="kuota-bar-header">
                    <span>Ketersediaan kuota</span>
                    <strong>
                      {detail.sisa_kuota > 0
                        ? `${detail.sisa_kuota} tempat tersisa`
                        : "Kuota penuh"}
                    </strong>
                  </div>
                  <div className="kuota-bar">
                    <div
                      className={`kuota-bar-fill ${kuota.fillClass}`}
                      style={{ width: `${kuota.pct}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Deskripsi */}
              {detail.deskripsi && (
                <>
                  <div className="modal-section-title">Tentang Paket</div>
                  <p className="modal-desc">{detail.deskripsi}</p>
                </>
              )}

              {/* Fasilitas */}
              {detail.fasilitas && detail.fasilitas.length > 0 ? (
                <>
                  <div className="modal-section-title">
                    Fasilitas Termasuk
                    <span className="fasilitas-count">{detail.fasilitas.length}</span>
                  </div>
                  <div className="modal-fasilitas-list">
                    {detail.fasilitas.map((f, i) => (
                      <div className="fasilitas-item" key={i}>
                        <div className="fasilitas-check">✓</div>
                        <div>
                          <div className="fasilitas-item-name">{f.nama_fasilitas}</div>
                          {f.deskripsi && (
                            <div className="fasilitas-item-desc">{f.deskripsi}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="fasilitas-empty">
                  <span>ℹ️</span> Informasi fasilitas belum tersedia.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

type SortKey = "berangkat" | "harga-asc" | "harga-desc" | "durasi";

const Paket = () => {
  const [paketList, setPaketList] = useState<PaketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("berangkat");
  const [filterKuota, setFilterKuota] = useState<"all" | "available">("all");
  const [selectedPaketId, setSelectedPaketId] = useState<string | null>(null);

  const getPaket = async () => {
    try {
      setLoading(true);
      setError(false);
      const res = await axios.get("http://localhost:8080/paket");
      const data = res.data?.paket;
      setPaketList(Array.isArray(data) ? data : []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getPaket();
  }, []);

  const filtered = useMemo(() => {
    let list = [...paketList];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.nama_paket.toLowerCase().includes(q));
    }

    if (filterKuota === "available") {
      list = list.filter((p) => p.sisa_kuota > 0);
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case "harga-asc": return (a.harga ?? 0) - (b.harga ?? 0);
        case "harga-desc": return (b.harga ?? 0) - (a.harga ?? 0);
        case "durasi": return (a.durasi ?? 0) - (b.durasi ?? 0);
        default: return new Date(a.tanggal_berangkat).getTime() - new Date(b.tanggal_berangkat).getTime();
      }
    });

    return list;
  }, [paketList, search, sortBy, filterKuota]);

  return (
    <div className="paket-page">
      {/* ── Hero ── */}
      <section className="paket-hero">
        <div className="paket-hero-badge">
          <span />
          Paket Umroh Terpercaya
        </div>
        <h1>
          Perjalanan Suci <br />
          <span>Menuju Baitullah</span>
        </h1>
        <p>
          Pilih paket umroh terbaik sesuai kebutuhan Anda. Kami hadir untuk
          memastikan perjalanan ibadah yang nyaman, aman, dan penuh makna.
        </p>
      </section>

      {/* ── Controls ── */}
      <div className="paket-controls">
        <div className="paket-controls-left">
          <div className="paket-search">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Cari paket umroh..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button
            className={`filter-btn ${filterKuota === "available" ? "active" : ""}`}
            onClick={() => setFilterKuota((prev) => (prev === "all" ? "available" : "all"))}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 3H2l8 9.46V19l4 2V12.46z" />
            </svg>
            {filterKuota === "available" ? "Tersedia Saja ✓" : "Semua Paket"}
          </button>

          <select
            className="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
          >
            <option value="berangkat">Tanggal Terdekat</option>
            <option value="harga-asc">Harga: Termurah</option>
            <option value="harga-desc">Harga: Termahal</option>
            <option value="durasi">Durasi: Terpendek</option>
          </select>
        </div>

        <div className="paket-controls-right result-count">
          {!loading && (
            <>Menampilkan <strong>{filtered.length}</strong>&nbsp;paket</>
          )}
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="paket-container">
        {loading ? (
          <div className="paket-grid">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : error ? (
          <div className="paket-empty">
            <div className="paket-empty-icon">⚠️</div>
            <h3>Gagal memuat paket</h3>
            <p>Terjadi kesalahan saat mengambil data. Silakan coba lagi.</p>
            <button
              className="paket-cta-btn"
              onClick={getPaket}
              style={{ margin: "1.5rem auto 0", display: "inline-flex" }}
            >
              Coba Lagi
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="paket-empty">
            <div className="paket-empty-icon">🔍</div>
            <h3>Paket tidak ditemukan</h3>
            <p>Coba ubah kata kunci pencarian atau filter Anda.</p>
          </div>
        ) : (
          <div className="paket-grid">
            {filtered.map((item) => {
              const kuota = getKuotaInfo(item.sisa_kuota, item.kuota_max);
              return (
                <div
                  className="paket-card"
                  key={item.id}
                  onClick={() => setSelectedPaketId(item.id)}
                >
                  <div className="paket-card-image-wrap">
                    <img
                      src={item.foto_paket || FALLBACK_IMG}
                      alt={item.nama_paket}
                      loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
                    />
                    <div className="paket-card-overlay" />
                    <div className="paket-card-badge">{item.durasi} Hari</div>
                    <div className={`paket-kuota-badge ${kuota.colorClass}`}>{kuota.label}</div>
                  </div>

                  <div className="paket-card-body">
                    <h2 className="paket-card-title">{item.nama_paket}</h2>

                    <div className="paket-card-meta">
                      <div className="meta-item">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <rect width="18" height="18" x="3" y="4" rx="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" />
                        </svg>
                        <span>{formatDate(item.tanggal_berangkat)}</span>
                      </div>
                      <div className="meta-item">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span>{item.durasi} hari</span>
                      </div>
                    </div>

                    <div className="kuota-bar-wrap">
                      <div className="kuota-bar-header">
                        <span>Ketersediaan</span>
                        <strong>{item.sisa_kuota > 0 ? `${item.sisa_kuota} tempat` : "Penuh"}</strong>
                      </div>
                      <div className="kuota-bar">
                        <div
                          className={`kuota-bar-fill ${kuota.fillClass}`}
                          style={{ width: `${kuota.pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="paket-card-footer">
                      <div className="paket-price">
                        <span className="price-label">Mulai dari</span>
                        <span className="price-value">{formatRupiah(item.harga)}</span>
                      </div>
                      <button className="paket-cta-btn">
                        Lihat Detail
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="m9 18 6-6-6-6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {selectedPaketId && (
        <PaketModal
          paketId={selectedPaketId}
          onClose={() => setSelectedPaketId(null)}
        />
      )}
    </div>
  );
};

export default Paket;