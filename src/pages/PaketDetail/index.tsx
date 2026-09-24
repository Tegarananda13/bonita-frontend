import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "./PaketDetail.css";

// ── Types ────────────────────────────────────────────────────────────────────
interface GambarPaket {
  id: string | null;
  url: string;
  urutan: number;
  is_utama: boolean;
}
interface FotoFasilitas {
  id: string;
  url: string;
  file_path?: string;
  urutan: number;
}
interface Fasilitas {
  id: string;
  nama_fasilitas: string;
  deskripsi: string;
  foto_fasilitas: FotoFasilitas[];
}
interface PaketDetail {
  id: string;
  nama_paket: string;
  jenis_paket: string;
  foto_paket: string;          // legacy field
  gambar_paket: GambarPaket[];
  deskripsi: string;
  harga: number;
  durasi: number;
  tanggal_berangkat: string;
  kuota_max: number;
  kuota_terpakai: number;
  sisa_kuota: number;
  is_active: boolean;
  fasilitas: Fasilitas[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const FALLBACK = "https://images.unsplash.com/photo-1564769625905-50e93615e769?w=800&q=80";

const fmt = (n: number) => "Rp " + n.toLocaleString("id-ID");
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

// ── Lightbox ─────────────────────────────────────────────────────────────────
const Lightbox = ({
  images,
  initialIndex,
  onClose,
}: {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}) => {
  const [cur, setCur] = useState(initialIndex);

  const prev = useCallback(() => setCur((c) => (c === 0 ? images.length - 1 : c - 1)), [images.length]);
  const next = useCallback(() => setCur((c) => (c === images.length - 1 ? 0 : c + 1)), [images.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, prev, next]);

  if (images.length === 0) return null;

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        <button className="lightbox-close" onClick={onClose}>✕</button>
        <button className="lightbox-prev" onClick={prev} disabled={images.length <= 1}>‹</button>
        <img
          src={images[cur] || FALLBACK}
          alt={`Foto ${cur + 1}`}
          className="lightbox-img"
          onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK; }}
        />
        <button className="lightbox-next" onClick={next} disabled={images.length <= 1}>›</button>
        {images.length > 1 && (
          <div className="lightbox-counter">{cur + 1} / {images.length}</div>
        )}
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const PaketDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [paket, setPaket] = useState<PaketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Gallery state
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxInitial, setLightboxInitial] = useState(0);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    axios
      .get(`http://localhost:8080/paket/${id}`)
      .then((res) => {
        const data = res.data as PaketDetail;
        // Normalise: if no gambar_paket but has foto_paket string, synthesise array
        if ((!data.gambar_paket || data.gambar_paket.length === 0) && data.foto_paket) {
          data.gambar_paket = [{ id: null, url: data.foto_paket, urutan: 1, is_utama: true }];
        }
        setPaket(data);
      })
      .catch(() => setError("Gagal memuat detail paket."))
      .finally(() => setLoading(false));
  }, [id]);

  const allImages = paket?.gambar_paket?.map((g) => g.url) ?? [];

  const openLightbox = (images: string[], idx: number) => {
    setLightboxImages(images);
    setLightboxInitial(idx);
  };

  if (loading) {
    return (
      <div className="pd-loading">
        <div className="pd-spinner" />
        <span>Memuat detail paket...</span>
      </div>
    );
  }

  if (error || !paket) {
    return (
      <div className="pd-error">
        <div className="pd-error-icon">⚠️</div>
        <h2>Paket tidak ditemukan</h2>
        <p>{error || "Paket yang kamu cari tidak tersedia."}</p>
        <button className="pd-back-btn" onClick={() => navigate("/paket")}>← Kembali ke Daftar Paket</button>
      </div>
    );
  }

  const sisaKuota = paket.sisa_kuota;
  const isFull = sisaKuota <= 0;
  const kuotaPct = paket.kuota_max > 0
    ? Math.min(100, ((paket.kuota_max - sisaKuota) / paket.kuota_max) * 100)
    : 100;

  return (
    <div className="pd-page">
      {/* ── Breadcrumb ── */}
      <div className="pd-breadcrumb">
        <Link to="/">Beranda</Link>
        <span>›</span>
        <Link to="/paket">Paket Umroh</Link>
        <span>›</span>
        <span className="pd-breadcrumb-cur">{paket.nama_paket}</span>
      </div>

      <div className="pd-layout">
        {/* ── LEFT: Gallery ── */}
        <div className="pd-gallery-col">
          {/* Main photo */}
          <div
            className="pd-gallery-main"
            onClick={() => allImages.length > 0 && openLightbox(allImages, activeIdx)}
          >
            <img
              src={allImages[activeIdx] || FALLBACK}
              alt={paket.nama_paket}
              onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK; }}
            />
            {allImages.length > 0 && (
              <div className="pd-gallery-zoom-hint">🔍 Klik untuk perbesar</div>
            )}
            <div className="pd-gallery-badge">{paket.durasi} Hari</div>
            {paket.jenis_paket && (
              <div className={`pd-jenis-badge pd-jenis-${paket.jenis_paket.toLowerCase().replace(/\s+/g, "-")}`}>
                {paket.jenis_paket}
              </div>
            )}
          </div>

          {/* Thumbnail strip */}
          {allImages.length > 1 && (
            <div className="pd-gallery-thumbs">
              {allImages.map((url, idx) => (
                <button
                  key={idx}
                  className={`pd-gallery-thumb ${idx === activeIdx ? "active" : ""}`}
                  onClick={() => setActiveIdx(idx)}
                >
                  <img src={url} alt={`Foto ${idx + 1}`} onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK; }} />
                </button>
              ))}
            </div>
          )}

          {/* Dot indicators */}
          {allImages.length > 1 && (
            <div className="pd-gallery-dots">
              {allImages.map((_, idx) => (
                <button
                  key={idx}
                  className={`pd-dot ${idx === activeIdx ? "active" : ""}`}
                  onClick={() => setActiveIdx(idx)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: Info ── */}
        <div className="pd-info-col">
          <h1 className="pd-title">{paket.nama_paket}</h1>

          {/* Price */}
          <div className="pd-price-block">
            <span className="pd-price-label">Mulai dari</span>
            <span className="pd-price">{fmt(paket.harga)}</span>
            <span className="pd-price-sub">per orang</span>
          </div>

          {/* Key info */}
          <div className="pd-info-grid">
            <div className="pd-info-item">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="18" height="18" x="3" y="4" rx="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" />
              </svg>
              <div>
                <div className="pd-info-label">Tanggal Berangkat</div>
                <div className="pd-info-value">{fmtDate(paket.tanggal_berangkat)}</div>
              </div>
            </div>
            <div className="pd-info-item">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              <div>
                <div className="pd-info-label">Durasi</div>
                <div className="pd-info-value">{paket.durasi} hari</div>
              </div>
            </div>
            <div className="pd-info-item">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <div>
                <div className="pd-info-label">Kuota Tersisa</div>
                <div className={`pd-info-value ${isFull ? "pd-val-full" : sisaKuota <= 5 ? "pd-val-warn" : "pd-val-ok"}`}>
                  {isFull ? "Penuh" : `${sisaKuota} tempat`}
                </div>
              </div>
            </div>
          </div>

          {/* Kuota bar */}
          <div className="pd-kuota-bar-wrap">
            <div className="pd-kuota-bar">
              <div
                className={`pd-kuota-fill ${isFull ? "full" : kuotaPct > 75 ? "warn" : "ok"}`}
                style={{ width: `${kuotaPct}%` }}
              />
            </div>
            <div className="pd-kuota-label">
              {isFull ? "Pendaftaran penuh" : `${paket.kuota_max - sisaKuota} dari ${paket.kuota_max} sudah terdaftar`}
            </div>
          </div>

          {/* CTA */}
          <button
            className={`pd-cta-btn ${isFull ? "pd-cta-disabled" : ""}`}
            disabled={isFull || !paket.is_active}
            onClick={() => !isFull && paket.is_active && navigate(`/daftar?paket=${paket.id}`)}
          >
            {isFull ? "Kuota Penuh" : !paket.is_active ? "Paket Tidak Tersedia" : (
              <>
                Daftar Sekarang
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Description ── */}
      {paket.deskripsi && (
        <section className="pd-section">
          <h2 className="pd-section-title">
            <span className="pd-section-icon">📖</span>
            Tentang Paket
          </h2>
          <p className="pd-desc">{paket.deskripsi}</p>
        </section>
      )}

      {/* ── Fasilitas ── */}
      {paket.fasilitas && paket.fasilitas.length > 0 && (
        <section className="pd-section">
          <h2 className="pd-section-title">
            <span className="pd-section-icon">✨</span>
            Fasilitas Termasuk
            <span className="pd-section-count">{paket.fasilitas.length} item</span>
          </h2>
          <div className="pd-fasilitas-grid">
            {paket.fasilitas.map((f, idx) => {
              const hasFoto = f.foto_fasilitas && f.foto_fasilitas.length > 0;
              const fotoUrls = hasFoto ? f.foto_fasilitas.map((ff) => ff.url || ff.file_path || "").filter(Boolean) : [];
              return (
                <div className="pd-fasilitas-card" key={f.id ?? idx}>
                  {hasFoto && (
                    <div className="pd-fasilitas-foto-strip">
                      {fotoUrls.slice(0, 3).map((url, fi) => (
                        <div
                          key={fi}
                          className="pd-fasilitas-foto-thumb"
                          onClick={() => openLightbox(fotoUrls, fi)}
                        >
                          <img src={url} alt={f.nama_fasilitas} onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK; }} />
                          {fi === 2 && fotoUrls.length > 3 && (
                            <div className="pd-foto-more">+{fotoUrls.length - 3}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="pd-fasilitas-body">
                    <div className="pd-fasilitas-check">✓</div>
                    <div>
                      <div className="pd-fasilitas-name">{f.nama_fasilitas}</div>
                      {f.deskripsi && <div className="pd-fasilitas-desc">{f.deskripsi}</div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Lightbox */}
      {lightboxImages.length > 0 && (
        <Lightbox
          images={lightboxImages}
          initialIndex={lightboxInitial}
          onClose={() => setLightboxImages([])}
        />
      )}
    </div>
  );
};

export default PaketDetail;
