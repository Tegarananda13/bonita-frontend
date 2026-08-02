import { useCallback, useEffect, useState, type FormEvent } from "react";
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

interface JamaahForm {
  nik: string;
  nama: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  jenis_kelamin: string;
  no_hp: string;
  email: string;
  alamat_lengkap: string;
  provinsi: string;
  kabupaten_kota: string;
  kecamatan: string;
  kelurahan_desa: string;
  kode_pos: string;
}

interface PendaftaranResult {
  nomor_pendaftaran: string;
  nama_customer: string;
}

interface SubmitResult {
  nomor_invoice: string;
  jumlah_jamaah: number;
  total_tagihan: number;
  paket: string;
  pendaftaran: PendaftaranResult[];
}

const EMPTY_JAMAAH: JamaahForm = {
  nik: "", nama: "", tempat_lahir: "", tanggal_lahir: "",
  jenis_kelamin: "", no_hp: "", email: "",
  alamat_lengkap: "", provinsi: "", kabupaten_kota: "",
  kecamatan: "", kelurahan_desa: "", kode_pos: "",
};

const MIN_DP_PER_ORANG = 5_000_000;
const FALLBACK = "https://images.unsplash.com/photo-1564769625905-50e93615e769?w=400&q=70";
const fmtRupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("id-ID", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });

// ── JamaahCard — TOP-LEVEL component (bukan di dalam Daftar) ─────────────────
// Penting: didefinisikan di luar agar React tidak membuat type baru setiap render.
// Jika didefinisikan di dalam Daftar, setiap keystroke akan unmount/remount card
// dan menyebabkan hilangnya fokus pada input.

interface JamaahCardProps {
  idx: number;
  data: JamaahForm;
  onUpdate: (idx: number, field: keyof JamaahForm, value: string) => void;
  onRemove: (idx: number) => void;
  disabled?: boolean;
}

const JamaahCard = ({ idx, data, onUpdate, onRemove, disabled }: JamaahCardProps) => (
  <div className="jamaah-card" id={`jamaah-card-${idx}`}>
    <div className="jamaah-card-header">
      <div className="jamaah-card-title">
        <div className="jamaah-number">{idx + 1}</div>
        <span>Data Jamaah {idx + 1}</span>
        {idx === 0 && <span className="jamaah-utama-badge">Utama</span>}
      </div>
      {idx > 0 && (
        <button
          type="button"
          className="jamaah-remove-btn"
          onClick={() => onRemove(idx)}
          title="Hapus jamaah ini"
          disabled={disabled}
        >
          ✕ Hapus
        </button>
      )}
    </div>

    <div className="daftar-form-grid">
      <div className="daftar-form-field full">
        <label className="daftar-label" htmlFor={`nik-${idx}`}>NIK *</label>
        <input id={`nik-${idx}`} className="daftar-input" type="text" inputMode="numeric"
          maxLength={16} placeholder="16 digit angka sesuai KTP"
          value={data.nik} onChange={e => onUpdate(idx, "nik", e.target.value.replace(/\D/g, ""))}
          disabled={disabled} />
      </div>

      <div className="daftar-form-field full">
        <label className="daftar-label" htmlFor={`nama-${idx}`}>Nama Lengkap *</label>
        <input id={`nama-${idx}`} className="daftar-input" type="text" placeholder="Sesuai KTP/Paspor"
          value={data.nama} onChange={e => onUpdate(idx, "nama", e.target.value)}
          disabled={disabled} />
      </div>

      <div className="daftar-form-field">
        <label className="daftar-label" htmlFor={`tempat-${idx}`}>Tempat Lahir *</label>
        <input id={`tempat-${idx}`} className="daftar-input" type="text" placeholder="Contoh: Jakarta"
          value={data.tempat_lahir} onChange={e => onUpdate(idx, "tempat_lahir", e.target.value)}
          disabled={disabled} />
      </div>

      <div className="daftar-form-field">
        <label className="daftar-label" htmlFor={`tgl-${idx}`}>Tanggal Lahir *</label>
        <input id={`tgl-${idx}`} className="daftar-input" type="date"
          max={new Date().toISOString().split("T")[0]}
          value={data.tanggal_lahir} onChange={e => onUpdate(idx, "tanggal_lahir", e.target.value)}
          disabled={disabled} />
      </div>

      <div className="daftar-form-field">
        <label className="daftar-label" htmlFor={`jk-${idx}`}>Jenis Kelamin *</label>
        <select id={`jk-${idx}`} className="daftar-input"
          value={data.jenis_kelamin} onChange={e => onUpdate(idx, "jenis_kelamin", e.target.value)}
          disabled={disabled}>
          <option value="">-- Pilih --</option>
          <option value="Laki-laki">Laki-laki</option>
          <option value="Perempuan">Perempuan</option>
        </select>
      </div>

      <div className="daftar-form-field">
        <label className="daftar-label" htmlFor={`hp-${idx}`}>Nomor HP/WhatsApp *</label>
        <input id={`hp-${idx}`} className="daftar-input" type="tel" placeholder="08xxxxxxxxxx"
          value={data.no_hp} onChange={e => onUpdate(idx, "no_hp", e.target.value)}
          disabled={disabled} />
      </div>

      <div className="daftar-form-field full">
        <label className="daftar-label" htmlFor={`email-${idx}`}>Email *</label>
        <input id={`email-${idx}`} className="daftar-input" type="email" placeholder="nama@email.com"
          value={data.email} onChange={e => onUpdate(idx, "email", e.target.value)}
          disabled={disabled} />
      </div>

      <div className="daftar-form-field full">
        <label className="daftar-label" htmlFor={`alamat-${idx}`}>Alamat Lengkap *</label>
        <input id={`alamat-${idx}`} className="daftar-input" type="text" placeholder="Contoh: Jl. Veteran No.12"
          value={data.alamat_lengkap} onChange={e => onUpdate(idx, "alamat_lengkap", e.target.value)}
          disabled={disabled} />
      </div>

      <div className="daftar-form-field">
        <label className="daftar-label" htmlFor={`prov-${idx}`}>Provinsi *</label>
        <input id={`prov-${idx}`} className="daftar-input" type="text" placeholder="Contoh: Sumatera Barat"
          value={data.provinsi} onChange={e => onUpdate(idx, "provinsi", e.target.value)}
          disabled={disabled} />
      </div>

      <div className="daftar-form-field">
        <label className="daftar-label" htmlFor={`kabkota-${idx}`}>Kabupaten/Kota *</label>
        <input id={`kabkota-${idx}`} className="daftar-input" type="text" placeholder="Contoh: Bukittinggi"
          value={data.kabupaten_kota} onChange={e => onUpdate(idx, "kabupaten_kota", e.target.value)}
          disabled={disabled} />
      </div>

      <div className="daftar-form-field">
        <label className="daftar-label" htmlFor={`kec-${idx}`}>Kecamatan *</label>
        <input id={`kec-${idx}`} className="daftar-input" type="text" placeholder="Contoh: Guguk Panjang"
          value={data.kecamatan} onChange={e => onUpdate(idx, "kecamatan", e.target.value)}
          disabled={disabled} />
      </div>

      <div className="daftar-form-field">
        <label className="daftar-label" htmlFor={`kel-${idx}`}>Kelurahan/Desa *</label>
        <input id={`kel-${idx}`} className="daftar-input" type="text" placeholder="Contoh: Tarok Dipo"
          value={data.kelurahan_desa} onChange={e => onUpdate(idx, "kelurahan_desa", e.target.value)}
          disabled={disabled} />
      </div>

      <div className="daftar-form-field">
        <label className="daftar-label" htmlFor={`kodepos-${idx}`}>Kode Pos *</label>
        <input id={`kodepos-${idx}`} className="daftar-input" type="text" inputMode="numeric" maxLength={5}
          placeholder="Contoh: 26136"
          value={data.kode_pos} onChange={e => onUpdate(idx, "kode_pos", e.target.value.replace(/\D/g, ""))}
          disabled={disabled} />
      </div>
    </div>
  </div>
);

// ── Component ────────────────────────────────────────────────────────────────

const Daftar = () => {
  const [searchParams] = useSearchParams();
  const preselectedId = searchParams.get("paket");

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [paketList, setPaketList] = useState<PaketPublic[]>([]);
  const [loadingPaket, setLoadingPaket] = useState(true);
  const [selectedPaket, setSelectedPaket] = useState<PaketPublic | null>(null);
  const [jamaahList, setJamaahList] = useState<JamaahForm[]>([{ ...EMPTY_JAMAAH }]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get("http://localhost:8080/paket");
        const list: PaketPublic[] = res.data?.paket ?? [];
        setPaketList(list.filter((p) => p.sisa_kuota > 0));
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

  // useCallback agar referensi fungsi stabil → tidak trigger remount JamaahCard
  const updateJamaah = useCallback((idx: number, field: keyof JamaahForm, value: string) => {
    setJamaahList(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }, []);

  const removeJamaah = useCallback((idx: number) => {
    if (idx === 0) return;
    setJamaahList(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const addJamaah = () => {
    if (selectedPaket && jamaahList.length >= selectedPaket.sisa_kuota) {
      setError(`Tidak dapat menambah jamaah — sisa kuota hanya ${selectedPaket.sisa_kuota} kursi.`);
      return;
    }
    setJamaahList(prev => [...prev, { ...EMPTY_JAMAAH }]);
    setError("");
  };

  const totalTagihan = selectedPaket ? selectedPaket.harga * jamaahList.length : 0;
  const dpMinimum = MIN_DP_PER_ORANG * jamaahList.length;

  const validateJamaah = (j: JamaahForm, idx: number): string => {
    const n = idx + 1;
    if (!j.nik.trim() || !/^\d{16}$/.test(j.nik.trim())) return `Jamaah ${n}: NIK harus 16 digit angka.`;
    if (!j.nama.trim())         return `Jamaah ${n}: Nama wajib diisi.`;
    if (!j.tempat_lahir.trim()) return `Jamaah ${n}: Tempat lahir wajib diisi.`;
    if (!j.tanggal_lahir)       return `Jamaah ${n}: Tanggal lahir wajib diisi.`;
    if (new Date(j.tanggal_lahir) > new Date()) return `Jamaah ${n}: Tanggal lahir tidak valid.`;
    if (!j.jenis_kelamin)       return `Jamaah ${n}: Jenis kelamin wajib dipilih.`;
    if (!j.no_hp.trim())        return `Jamaah ${n}: Nomor HP wajib diisi.`;
    if (!j.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(j.email)) return `Jamaah ${n}: Email tidak valid.`;
    if (!j.alamat_lengkap.trim()) return `Jamaah ${n}: Alamat lengkap wajib diisi.`;
    if (!j.provinsi.trim())       return `Jamaah ${n}: Provinsi wajib diisi.`;
    if (!j.kabupaten_kota.trim()) return `Jamaah ${n}: Kabupaten/Kota wajib diisi.`;
    if (!j.kecamatan.trim())      return `Jamaah ${n}: Kecamatan wajib diisi.`;
    if (!j.kelurahan_desa.trim()) return `Jamaah ${n}: Kelurahan/Desa wajib diisi.`;
    if (!j.kode_pos.trim())       return `Jamaah ${n}: Kode Pos wajib diisi.`;
    return "";
  };

  const goToStep2 = () => {
    if (!selectedPaket) { setError("Pilih paket umroh terlebih dahulu."); return; }
    setError(""); setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToStep3 = () => {
    const niks = jamaahList.map(j => j.nik.trim()).filter(Boolean);
    if (new Set(niks).size !== niks.length) {
      setError("Terdapat NIK yang sama pada lebih dari satu jamaah."); return;
    }
    for (let i = 0; i < jamaahList.length; i++) {
      const err = validateJamaah(jamaahList[i], i);
      if (err) { setError(err); return; }
    }
    setError(""); setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      setSubmitting(true);
      const res = await axios.post("http://localhost:8080/pendaftaran", {
        paket_id: selectedPaket!.id,
        jamaah: jamaahList.map(j => ({
          nik: j.nik.trim(), nama: j.nama.trim(),
          tempat_lahir: j.tempat_lahir.trim(), tanggal_lahir: j.tanggal_lahir,
          jenis_kelamin: j.jenis_kelamin, no_hp: j.no_hp.trim(), email: j.email.trim(),
          alamat_lengkap: j.alamat_lengkap.trim(), provinsi: j.provinsi.trim(),
          kabupaten_kota: j.kabupaten_kota.trim(), kecamatan: j.kecamatan.trim(),
          kelurahan_desa: j.kelurahan_desa.trim(), kode_pos: j.kode_pos.trim(),
        })),
      });
      setResult(res.data as SubmitResult);
      setStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      setError(axios.isAxiosError(err) ? (err.response?.data?.error ?? "Pendaftaran gagal.") : "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  };

  const getKuotaClass = (sisa: number) =>
    sisa <= 0 ? "kuota-full" : sisa <= 5 ? "kuota-low" : "kuota-ok";

  const ErrorBox = ({ msg }: { msg: string }) => (
    <div className="daftar-error">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {msg}
    </div>
  );

  const StepBar = () => (
    <div className="daftar-steps">
      {[{ n: 1, label: "Pilih Paket" }, { n: 2, label: "Data Jamaah" }, { n: 3, label: "Konfirmasi" }].map((s, i) => (
        <>
          <div key={s.n} className={`daftar-step ${step === s.n ? "active" : step > s.n ? "done" : ""}`}>
            <div className="step-num">{step > s.n ? "✓" : s.n}</div>
            {s.label}
          </div>
          {i < 2 && (
            <div key={`div-${i}`}
              className={`step-divider ${step > s.n + 1 ? "done" : step === s.n + 1 ? "active" : ""}`} />
          )}
        </>
      ))}
    </div>
  );

  const RingkasanTagihan = () => (
    <div className="ringkasan-tagihan">
      <div className="ringkasan-title">💳 Ringkasan Pendaftaran</div>
      <div className="ringkasan-row"><span>Paket</span><span className="ringkasan-val">{selectedPaket?.nama_paket}</span></div>
      <div className="ringkasan-row"><span>Harga / Orang</span><span className="ringkasan-val">{selectedPaket ? fmtRupiah(selectedPaket.harga) : "-"}</span></div>
      <div className="ringkasan-row">
        <span>Jumlah Jamaah</span>
        <span className="ringkasan-val ringkasan-count">{jamaahList.length} Orang</span>
      </div>
      <div className="ringkasan-divider" />
      <div className="ringkasan-row ringkasan-total">
        <span>Total Tagihan</span>
        <span className="ringkasan-val ringkasan-total-val">{fmtRupiah(totalTagihan)}</span>
      </div>
      <div className="ringkasan-row ringkasan-dp">
        <span>DP Minimum</span>
        <span className="ringkasan-val">{fmtRupiah(dpMinimum)}</span>
      </div>
    </div>
  );

  // ── Step 1 ──────────────────────────────────────────────────────────────────
  if (step === 1) return (
    <div className="daftar-page">
      <div className="daftar-container">
        <div className="daftar-page-header">
          <h1>Daftar Umroh</h1>
          <p>Pilih paket, isi data jamaah, dan konfirmasi pendaftaran Anda.</p>
        </div>
        <StepBar />
        <div className="daftar-card">
          <div className="daftar-card-header">
            <div className="daftar-card-title">🕌 Pilih Paket Umroh</div>
            <div className="daftar-card-sub">Hanya paket dengan kuota tersedia yang ditampilkan.</div>
          </div>
          <div className="daftar-card-body">
            {error && <ErrorBox msg={error} />}
            {loadingPaket ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>Memuat paket...</div>
            ) : paketList.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📦</div>
                <p>Tidak ada paket tersedia saat ini.</p>
                <Link to="/paket" className="btn-ghost" style={{ marginTop: "0.75rem" }}>Lihat Semua Paket →</Link>
              </div>
            ) : (
              <div className="paket-selector-grid">
                {paketList.map(p => (
                  <div key={p.id} className={`paket-selector-card ${selectedPaket?.id === p.id ? "selected" : ""}`}
                    onClick={() => setSelectedPaket(p)}>
                    <div className="paket-selector-radio"><div className="paket-selector-check" /></div>
                    {p.foto_paket ? (
                      <img src={p.foto_paket} alt={p.nama_paket} className="paket-selector-img"
                        onError={e => { (e.target as HTMLImageElement).src = FALLBACK; }} />
                    ) : (
                      <div className="paket-selector-img-placeholder">🕌</div>
                    )}
                    <div className="paket-selector-nama">{p.nama_paket}</div>
                    <div className="paket-selector-info">
                      <span>📅 {fmtDate(p.tanggal_berangkat)}</span>
                      <span>⏱ {p.durasi} hari</span>
                    </div>
                    <div className="paket-selector-harga">{fmtRupiah(p.harga)}/orang</div>
                    <span className={`paket-selector-kuota ${getKuotaClass(p.sisa_kuota)}`}>
                      {p.sisa_kuota <= 5 ? `Sisa ${p.sisa_kuota} kursi!` : `${p.sisa_kuota} kursi tersedia`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="daftar-card-footer">
            <Link to="/paket" className="btn-back">← Kembali ke Paket</Link>
            <button className="btn-next" onClick={goToStep2} disabled={!selectedPaket}>Lanjut: Data Jamaah →</button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Step 2 ──────────────────────────────────────────────────────────────────
  if (step === 2) return (
    <div className="daftar-page">
      <div className="daftar-container">
        <div className="daftar-page-header">
          <h1>Daftar Umroh</h1>
          <p>Isi data seluruh jamaah yang akan didaftarkan.</p>
        </div>
        <StepBar />
        {error && <ErrorBox msg={error} />}

        {jamaahList.map((data, idx) => (
          <JamaahCard
            key={idx}
            idx={idx}
            data={data}
            onUpdate={updateJamaah}
            onRemove={removeJamaah}
          />
        ))}

        <button type="button" className="btn-tambah-jamaah" onClick={addJamaah}>
          <span className="btn-tambah-icon">+</span> Tambah Jamaah
        </button>

        <RingkasanTagihan />

        <div className="daftar-nav-row">
          <button className="btn-back" onClick={() => { setStep(1); setError(""); }}>← Kembali</button>
          <button className="btn-next" onClick={goToStep3}>Review Pendaftaran →</button>
        </div>
      </div>
    </div>
  );

  // ── Step 3 Sukses ────────────────────────────────────────────────────────────
  if (result) return (
    <div className="daftar-page">
      <div className="daftar-container">
        <StepBar />
        <div className="daftar-card">
          <div className="daftar-success">
            <div className="success-icon-wrap">🎉</div>
            <h2>Pendaftaran Berhasil!</h2>
            <p>
              Terima kasih! Pendaftaran untuk paket <strong>{result.paket}</strong> telah kami terima.
              {result.jumlah_jamaah > 1 && ` Sebanyak ${result.jumlah_jamaah} jamaah berhasil didaftarkan.`}
            </p>
            <div className="nomor-pendaftaran-box" style={{ marginBottom: "1rem" }}>
              <div className="nomor-pendaftaran-label">Nomor Invoice</div>
              <div className="nomor-pendaftaran-value" style={{ fontSize: "1.1rem" }}>{result.nomor_invoice}</div>
              <div className="nomor-pendaftaran-copy">Total Tagihan: <strong>{fmtRupiah(result.total_tagihan)}</strong></div>
            </div>
            <div className="jamaah-hasil-list">
              <div className="jamaah-hasil-title">📋 Nomor Pendaftaran Jamaah</div>
              {result.pendaftaran.map((p, i) => (
                <div key={i} className="jamaah-hasil-item">
                  <div className="jamaah-hasil-nama">{p.nama_customer}</div>
                  <div className="jamaah-hasil-nomor">{p.nomor_pendaftaran}</div>
                </div>
              ))}
            </div>
            <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 12, padding: "1rem", marginBottom: "1.5rem", fontSize: "0.85rem", color: "#065f46", lineHeight: 1.6 }}>
              <strong>📋 Langkah Selanjutnya:</strong><br />
              Setiap jamaah memiliki portal masing-masing. Gunakan nomor pendaftaran di atas untuk masuk ke <strong>Portal Jamaah</strong>. OTP dikirim ke email yang terdaftar.
            </div>
            <div className="daftar-success-actions">
              <Link to={`/portal?nomor=${encodeURIComponent(result.pendaftaran[0].nomor_pendaftaran)}`}
                className="btn-primary"
                style={{ background: "linear-gradient(135deg, #059669, #10b981)", boxShadow: "0 4px 14px rgba(5,150,105,0.3)" }}>
                💳 Masuk Portal Jamaah Pertama →
              </Link>
              <Link to="/" className="btn-ghost">🏠 Kembali ke Beranda</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Step 3 Review ─────────────────────────────────────────────────────────
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
              {error && <ErrorBox msg={error} />}
              <div className="review-section">
                <div>
                  <div className="daftar-label" style={{ marginBottom: "0.5rem" }}>Paket Dipilih</div>
                  <div className="review-paket-card">
                    {selectedPaket?.foto_paket ? (
                      <img src={selectedPaket.foto_paket} alt={selectedPaket.nama_paket} className="review-paket-img"
                        onError={e => { (e.target as HTMLImageElement).src = FALLBACK; }} />
                    ) : (
                      <div className="review-paket-img" style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>🕌</div>
                    )}
                    <div className="review-paket-info">
                      <h4>{selectedPaket?.nama_paket}</h4>
                      <div className="review-paket-details">
                        <span className="review-paket-detail-item">📅 {selectedPaket ? fmtDate(selectedPaket.tanggal_berangkat) : ""}</span>
                        <span className="review-paket-detail-item">⏱ {selectedPaket?.durasi} hari</span>
                        <span style={{ fontWeight: 700, color: "#4f46e5" }}>{selectedPaket ? fmtRupiah(selectedPaket.harga) : ""}/orang</span>
                      </div>
                    </div>
                  </div>
                </div>
                <RingkasanTagihan />
                {jamaahList.map((j, i) => (
                  <div key={i}>
                    <div className="daftar-label" style={{ marginBottom: "0.5rem" }}>
                      Data Jamaah {i + 1}{i === 0 ? " (Utama)" : ""}
                    </div>
                    <div className="review-data-grid">
                      {[
                        { label: "Nama Lengkap", value: j.nama },
                        { label: "NIK", value: j.nik },
                        { label: "Tempat / Tgl Lahir", value: `${j.tempat_lahir}, ${j.tanggal_lahir}` },
                        { label: "Jenis Kelamin", value: j.jenis_kelamin },
                        { label: "No. HP/WA", value: j.no_hp },
                        { label: "Email", value: j.email },
                        { label: "Alamat Lengkap", value: j.alamat_lengkap },
                        { label: "Kelurahan/Desa", value: j.kelurahan_desa },
                        { label: "Kecamatan", value: j.kecamatan },
                        { label: "Kabupaten/Kota", value: j.kabupaten_kota },
                        { label: "Provinsi", value: j.provinsi },
                        { label: "Kode Pos", value: j.kode_pos },
                      ].map(d => (
                        <div className="review-data-item" key={d.label}>
                          <div className="review-data-label">{d.label}</div>
                          <div className="review-data-value">{d.value || "-"}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="review-disclaimer">
                  <span>⚠️</span>
                  <span>Dengan konfirmasi ini, Anda menyetujui bahwa data yang diisi sudah benar. Tim Bonita Umroh akan menghubungi Anda untuk proses selanjutnya.</span>
                </div>
              </div>
            </div>
            <div className="daftar-card-footer">
              <button type="button" className="btn-back" onClick={() => { setStep(2); setError(""); }}>← Edit Data</button>
              <button type="submit" className="btn-submit" disabled={submitting}>
                {submitting ? <><div className="mini-spinner" />Mendaftarkan...</> : <>✓ Konfirmasi Pendaftaran</>}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Daftar;
