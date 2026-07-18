import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import "./Daftar.css";

// ── Types ────────────────────────────────────────────────────────────────────

interface PaketPublic {
  id: string;
  nama_paket: string;
  foto_paket: string;
  harga: number;
  tanggal_berangkat: string;
  durasi: number;
  sisa_kuota: number;
}

interface FormData {
  nik: string;
  nama: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  jenis_kelamin: string;
  no_hp: string;
  email: string;
  alamat: string;
}

const EMPTY_FORM: FormData = {
  nik: "", nama: "", tempat_lahir: "", tanggal_lahir: "",
  jenis_kelamin: "", no_hp: "", email: "", alamat: "",
};

const FALLBACK = "https://images.unsplash.com/photo-1564769625905-50e93615e769?w=400&q=70";

const fmtRupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("id-ID", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });

// ── Component ────────────────────────────────────────────────────────────────

const Daftar = () => {
  const [searchParams] = useSearchParams();
  const preselectedId = searchParams.get("paket");

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [paketList, setPaketList] = useState<PaketPublic[]>([]);
  const [loadingPaket, setLoadingPaket] = useState(true);
  const [selectedPaket, setSelectedPaket] = useState<PaketPublic | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [nomorPendaftaran, setNomorPendaftaran] = useState("");

  // ── Load paket list ──
  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get("http://localhost:8080/paket");
        const list: PaketPublic[] = res.data?.paket ?? [];
        setPaketList(list.filter((p) => p.sisa_kuota > 0));
        // Pre-select if ?paket=<id> in URL
        if (preselectedId) {
          const found = list.find((p) => p.id === preselectedId);
          if (found) setSelectedPaket(found);
        }
      } catch {
        setPaketList([]);
      } finally {
        setLoadingPaket(false);
      }
    };
    load();
  }, [preselectedId]);

  // ── Step navigation ──
  const goToStep2 = () => {
    if (!selectedPaket) { setError("Pilih paket umroh terlebih dahulu."); return; }
    setError("");
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToStep3 = () => {
    if (!form.nik.trim())          { setError("NIK wajib diisi."); return; }
    if (!/^\d{16}$/.test(form.nik.trim())) { setError("NIK harus terdiri dari 16 digit angka."); return; }
    if (!form.nama.trim())         { setError("Nama lengkap wajib diisi."); return; }
    if (!form.tempat_lahir.trim()) { setError("Tempat lahir wajib diisi."); return; }
    if (!form.tanggal_lahir)       { setError("Tanggal lahir wajib diisi."); return; }
    if (new Date(form.tanggal_lahir) > new Date()) { setError("Tanggal lahir tidak boleh melebihi hari ini."); return; }
    if (!form.jenis_kelamin)       { setError("Jenis kelamin wajib dipilih."); return; }
    if (!form.no_hp.trim())        { setError("Nomor HP wajib diisi."); return; }
    if (!/^[0-9+\s-]{8,15}$/.test(form.no_hp.replace(/\s/g, ""))) {
      setError("Format nomor HP tidak valid."); return;
    }
    if (!form.email.trim())        { setError("Email wajib diisi."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError("Format email tidak valid."); return; }
    if (!form.alamat.trim())       { setError("Alamat wajib diisi."); return; }
    setError("");
    setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Submit ──
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      setSubmitting(true);
      const res = await axios.post("http://localhost:8080/pendaftaran", {
        nik:           form.nik.trim(),
        nama:          form.nama.trim(),
        tempat_lahir:  form.tempat_lahir.trim(),
        tanggal_lahir: form.tanggal_lahir,
        jenis_kelamin: form.jenis_kelamin,
        no_hp:         form.no_hp.trim(),
        email:         form.email.trim(),
        alamat:        form.alamat.trim(),
        paket_id:      selectedPaket!.id,
      });
      setNomorPendaftaran(res.data?.data?.nomor_pendaftaran ?? "");
      setStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      setError(
        axios.isAxiosError(err)
          ? (err.response?.data?.error ?? "Pendaftaran gagal.")
          : "Terjadi kesalahan."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getKuotaClass = (sisa: number) => {
    if (sisa <= 0) return "kuota-full";
    if (sisa <= 5) return "kuota-low";
    return "kuota-ok";
  };

  // ── Step indicator ──
  const StepBar = () => (
    <div className="daftar-steps">
      {[
        { n: 1, label: "Pilih Paket" },
        { n: 2, label: "Data Diri" },
        { n: 3, label: "Konfirmasi" },
      ].map((s, i) => (
        <>
          <div
            key={s.n}
            className={`daftar-step ${step === s.n ? "active" : step > s.n ? "done" : ""}`}
          >
            <div className="step-num">{step > s.n ? "✓" : s.n}</div>
            {s.label}
          </div>
          {i < 2 && (
            <div
              key={`div-${i}`}
              className={`step-divider ${step > s.n + 1 ? "done" : step === s.n + 1 ? "active" : ""}`}
            />
          )}
        </>
      ))}
    </div>
  );

  // ── Step 1: Pilih Paket ──
  if (step === 1) {
    return (
      <div className="daftar-page">
        <div className="daftar-container">
          <div className="daftar-page-header">
            <h1>Daftar Umroh</h1>
            <p>Pilih paket, isi data diri, dan konfirmasi pendaftaran Anda.</p>
          </div>

          <StepBar />

          <div className="daftar-card">
            <div className="daftar-card-header">
              <div className="daftar-card-title">🕌 Pilih Paket Umroh</div>
              <div className="daftar-card-sub">
                Pilih paket yang tersedia — hanya paket dengan kuota tersedia yang ditampilkan.
              </div>
            </div>

            <div className="daftar-card-body">
              {error && (
                <div className="daftar-error">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {error}
                </div>
              )}

              {loadingPaket ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>
                  Memuat paket...
                </div>
              ) : paketList.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📦</div>
                  <p>Tidak ada paket tersedia saat ini.</p>
                  <Link to="/paket" className="btn-ghost" style={{ marginTop: "0.75rem" }}>
                    Lihat Semua Paket →
                  </Link>
                </div>
              ) : (
                <div className="paket-selector-grid">
                  {paketList.map((p) => (
                    <div
                      key={p.id}
                      className={`paket-selector-card ${selectedPaket?.id === p.id ? "selected" : ""}`}
                      onClick={() => setSelectedPaket(p)}
                    >
                      <div className="paket-selector-radio">
                        <div className="paket-selector-check" />
                      </div>

                      {p.foto_paket ? (
                        <img
                          src={p.foto_paket}
                          alt={p.nama_paket}
                          className="paket-selector-img"
                          onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK; }}
                        />
                      ) : (
                        <div className="paket-selector-img-placeholder">🕌</div>
                      )}

                      <div className="paket-selector-nama">{p.nama_paket}</div>

                      <div className="paket-selector-info">
                        <span>📅 {fmtDate(p.tanggal_berangkat)}</span>
                        <span>⏱ {p.durasi} hari</span>
                      </div>

                      <div className="paket-selector-harga">{fmtRupiah(p.harga)}</div>

                      <span className={`paket-selector-kuota ${getKuotaClass(p.sisa_kuota)}`}>
                        {p.sisa_kuota <= 5 ? `Sisa ${p.sisa_kuota} kursi!` : `${p.sisa_kuota} kursi tersedia`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="daftar-card-footer">
              <Link to="/paket" className="btn-back">
                ← Kembali ke Paket
              </Link>
              <button className="btn-next" onClick={goToStep2} disabled={!selectedPaket}>
                Lanjut: Data Diri →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2: Data Diri ──
  if (step === 2) {
    return (
      <div className="daftar-page">
        <div className="daftar-container">
          <div className="daftar-page-header">
            <h1>Daftar Umroh</h1>
            <p>Isi data diri Anda dengan benar.</p>
          </div>

          <StepBar />

          <div className="daftar-card">
            <div className="daftar-card-header">
              <div className="daftar-card-title">👤 Data Diri</div>
              <div className="daftar-card-sub">
                Pastikan data yang diisi sesuai dengan dokumen resmi.
              </div>
            </div>

            <div className="daftar-card-body">
              {error && (
                <div className="daftar-error">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {error}
                </div>
              )}

              <div className="daftar-form-grid">
                {/* NIK */}
                <div className="daftar-form-field full">
                  <label className="daftar-label" htmlFor="nik">NIK (Nomor Induk Kependudukan) *</label>
                  <input
                    id="nik"
                    className="daftar-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={16}
                    placeholder="16 digit angka sesuai KTP"
                    value={form.nik}
                    onChange={(e) => setForm((p) => ({ ...p, nik: e.target.value.replace(/\D/g, "") }))}
                  />
                </div>

                {/* Nama */}
                <div className="daftar-form-field full">
                  <label className="daftar-label" htmlFor="nama">Nama Lengkap *</label>
                  <input
                    id="nama"
                    className="daftar-input"
                    type="text"
                    placeholder="Sesuai KTP/Paspor"
                    value={form.nama}
                    onChange={(e) => setForm((p) => ({ ...p, nama: e.target.value }))}
                  />
                </div>

                {/* Tempat Lahir */}
                <div className="daftar-form-field">
                  <label className="daftar-label" htmlFor="tempat-lahir">Tempat Lahir *</label>
                  <input
                    id="tempat-lahir"
                    className="daftar-input"
                    type="text"
                    placeholder="Contoh: Jakarta"
                    value={form.tempat_lahir}
                    onChange={(e) => setForm((p) => ({ ...p, tempat_lahir: e.target.value }))}
                  />
                </div>

                {/* Tanggal Lahir */}
                <div className="daftar-form-field">
                  <label className="daftar-label" htmlFor="tanggal-lahir">Tanggal Lahir *</label>
                  <input
                    id="tanggal-lahir"
                    className="daftar-input"
                    type="date"
                    max={new Date().toISOString().split("T")[0]}
                    value={form.tanggal_lahir}
                    onChange={(e) => setForm((p) => ({ ...p, tanggal_lahir: e.target.value }))}
                  />
                </div>

                {/* Jenis Kelamin */}
                <div className="daftar-form-field">
                  <label className="daftar-label" htmlFor="jenis-kelamin">Jenis Kelamin *</label>
                  <select
                    id="jenis-kelamin"
                    className="daftar-input"
                    value={form.jenis_kelamin}
                    onChange={(e) => setForm((p) => ({ ...p, jenis_kelamin: e.target.value }))}
                  >
                    <option value="">-- Pilih --</option>
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>

                {/* No HP */}
                <div className="daftar-form-field">
                  <label className="daftar-label" htmlFor="no-hp">Nomor HP/WhatsApp *</label>
                  <input
                    id="no-hp"
                    className="daftar-input"
                    type="tel"
                    placeholder="08xxxxxxxxxx"
                    value={form.no_hp}
                    onChange={(e) => setForm((p) => ({ ...p, no_hp: e.target.value }))}
                  />
                </div>

                {/* Email */}
                <div className="daftar-form-field">
                  <label className="daftar-label" htmlFor="email">Email *</label>
                  <input
                    id="email"
                    className="daftar-input"
                    type="email"
                    placeholder="nama@email.com"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>

                {/* Alamat */}
                <div className="daftar-form-field full">
                  <label className="daftar-label" htmlFor="alamat">Alamat *</label>
                  <textarea
                    id="alamat"
                    className="daftar-textarea"
                    placeholder="Alamat lengkap sesuai KTP..."
                    value={form.alamat}
                    onChange={(e) => setForm((p) => ({ ...p, alamat: e.target.value }))}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="daftar-card-footer">
              <button className="btn-back" onClick={() => { setStep(1); setError(""); }}>
                ← Kembali
              </button>
              <button className="btn-next" onClick={goToStep3}>
                Review Pendaftaran →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 3: Konfirmasi atau Sukses ──

  // Sukses state (setelah submit berhasil)
  if (nomorPendaftaran) {
    return (
      <div className="daftar-page">
        <div className="daftar-container">
          <StepBar />
          <div className="daftar-card">
            <div className="daftar-success">
              <div className="success-icon-wrap">🎉</div>
              <h2>Pendaftaran Berhasil!</h2>
              <p>
                Terima kasih, <strong>{form.nama}</strong>. Pendaftaran Anda untuk paket{" "}
                <strong>{selectedPaket?.nama_paket}</strong> telah kami terima.
                Tim kami akan segera menghubungi Anda melalui nomor {form.no_hp}.
              </p>

              <div className="nomor-pendaftaran-box">
                <div className="nomor-pendaftaran-label">Nomor Pendaftaran Anda</div>
                <div className="nomor-pendaftaran-value">{nomorPendaftaran}</div>
                <div className="nomor-pendaftaran-copy">
                  Simpan nomor ini untuk mengakses Portal Jamaah.
                </div>
              </div>

              <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 12, padding: "1rem", marginBottom: "1.5rem", fontSize: "0.85rem", color: "#065f46", lineHeight: 1.6 }}>
                <strong>📋 Langkah Selanjutnya:</strong><br />
                Klik tombol di bawah untuk masuk ke <strong>Portal Jamaah</strong>. Anda akan diminta OTP yang dikirim ke email yang terdaftar untuk melakukan pembayaran dan mengunggah dokumen.
              </div>

              <div className="daftar-success-actions">
                <Link
                  to={`/portal?nomor=${encodeURIComponent(nomorPendaftaran)}`}
                  className="btn-primary"
                  style={{ background: "linear-gradient(135deg, #059669, #10b981)", boxShadow: "0 4px 14px rgba(5,150,105,0.3)" }}
                >
                  💳 Lanjut ke Portal Pembayaran →
                </Link>
                <Link to="/" className="btn-ghost">
                  🏠 Kembali ke Beranda
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Review state (step 3 sebelum submit)
  return (
    <div className="daftar-page">
      <div className="daftar-container">
        <div className="daftar-page-header">
          <h1>Daftar Umroh</h1>
          <p>Periksa kembali data Anda sebelum mengirim.</p>
        </div>

        <StepBar />

        <form onSubmit={handleSubmit}>
          <div className="daftar-card">
            <div className="daftar-card-header">
              <div className="daftar-card-title">📋 Review Pendaftaran</div>
              <div className="daftar-card-sub">Pastikan semua data sudah benar sebelum konfirmasi.</div>
            </div>

            <div className="daftar-card-body">
              {error && (
                <div className="daftar-error">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {error}
                </div>
              )}

              <div className="review-section">
                {/* Paket */}
                <div>
                  <div className="daftar-label" style={{ marginBottom: "0.5rem" }}>Paket Dipilih</div>
                  <div className="review-paket-card">
                    {selectedPaket?.foto_paket ? (
                      <img
                        src={selectedPaket.foto_paket}
                        alt={selectedPaket.nama_paket}
                        className="review-paket-img"
                        onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK; }}
                      />
                    ) : (
                      <div className="review-paket-img" style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>🕌</div>
                    )}
                    <div className="review-paket-info">
                      <h4>{selectedPaket?.nama_paket}</h4>
                      <div className="review-paket-details">
                        <span className="review-paket-detail-item">📅 {selectedPaket ? fmtDate(selectedPaket.tanggal_berangkat) : ""}</span>
                        <span className="review-paket-detail-item">⏱ {selectedPaket?.durasi} hari</span>
                        <span style={{ fontWeight: 700, color: "#4f46e5" }}>
                          {selectedPaket ? fmtRupiah(selectedPaket.harga) : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Data diri */}
                <div>
                  <div className="daftar-label" style={{ marginBottom: "0.5rem" }}>Data Diri</div>
                  <div className="review-data-grid">
                    {[
                      { label: "Nama Lengkap", value: form.nama },
                      { label: "No. HP/WA",    value: form.no_hp },
                      { label: "Email",         value: form.email || "-" },
                      { label: "Alamat",        value: form.alamat || "-" },
                    ].map((d) => (
                      <div className="review-data-item" key={d.label}>
                        <div className="review-data-label">{d.label}</div>
                        <div className="review-data-value">{d.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Disclaimer */}
                <div className="review-disclaimer">
                  <span>⚠️</span>
                  <span>
                    Dengan konfirmasi ini, Anda menyetujui bahwa data yang diisi sudah benar.
                    Tim Bonita Umroh akan menghubungi Anda untuk proses selanjutnya.
                  </span>
                </div>
              </div>
            </div>

            <div className="daftar-card-footer">
              <button type="button" className="btn-back" onClick={() => { setStep(2); setError(""); }}>
                ← Edit Data
              </button>
              <button type="submit" className="btn-submit" disabled={submitting}>
                {submitting ? (
                  <><div className="mini-spinner" />Mendaftarkan...</>
                ) : (
                  <>✓ Konfirmasi Pendaftaran</>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Daftar;
