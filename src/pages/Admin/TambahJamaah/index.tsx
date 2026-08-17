import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../../context/AuthContext";
import "./TambahJamaah.css";

// ── Types ────────────────────────────────────────────────────────────────────

interface PaketOption {
  id: string;
  nama_paket: string;
  harga: number;
  tanggal_berangkat: string;
  kuota_max: number;
  kuota_terpakai: number;
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
const fmtRupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });

// ── JamaahCard — top-level agar tidak remount setiap render ──────────────────

interface JamaahCardProps {
  idx: number;
  data: JamaahForm;
  onUpdate: (idx: number, field: keyof JamaahForm, value: string) => void;
  onRemove: (idx: number) => void;
  disabled: boolean;
}

const AdminJamaahCard = ({ idx, data, onUpdate, onRemove, disabled }: JamaahCardProps) => (
  <div className="tj-jamaah-card">
    <div className="tj-jamaah-header">
      <div className="tj-jamaah-title">
        <div className="tj-jamaah-num">{idx + 1}</div>
        <span>Data Jamaah {idx + 1}</span>
        {idx === 0 && <span className="tj-jamaah-badge">Utama</span>}
      </div>
      {idx > 0 && (
        <button type="button" className="tj-jamaah-remove" onClick={() => onRemove(idx)} disabled={disabled}>
          🗑 Hapus Jamaah
        </button>
      )}
    </div>

    <div className="tj-field-grid">
      <div className="tj-field full">
        <label className="tj-label" htmlFor={`tj-nik-${idx}`}>NIK <span className="tj-required">*</span></label>
        <input id={`tj-nik-${idx}`} type="text" inputMode="numeric" maxLength={16} className="tj-input"
          placeholder="16 digit angka sesuai KTP"
          value={data.nik} onChange={e => onUpdate(idx, "nik", e.target.value.replace(/\D/g, ""))}
          disabled={disabled} autoFocus={idx === 0} />
      </div>

      <div className="tj-field full">
        <label className="tj-label" htmlFor={`tj-nama-${idx}`}>Nama Lengkap <span className="tj-required">*</span></label>
        <input id={`tj-nama-${idx}`} type="text" className="tj-input" placeholder="Sesuai KTP/Paspor"
          value={data.nama} onChange={e => onUpdate(idx, "nama", e.target.value)} disabled={disabled} />
      </div>

      <div className="tj-field">
        <label className="tj-label" htmlFor={`tj-tempat-${idx}`}>Tempat Lahir <span className="tj-required">*</span></label>
        <input id={`tj-tempat-${idx}`} type="text" className="tj-input" placeholder="Contoh: Jakarta"
          value={data.tempat_lahir} onChange={e => onUpdate(idx, "tempat_lahir", e.target.value)} disabled={disabled} />
      </div>

      <div className="tj-field">
        <label className="tj-label" htmlFor={`tj-tgl-${idx}`}>Tanggal Lahir <span className="tj-required">*</span></label>
        <input id={`tj-tgl-${idx}`} type="date" className="tj-input"
          max={new Date().toISOString().split("T")[0]}
          value={data.tanggal_lahir} onChange={e => onUpdate(idx, "tanggal_lahir", e.target.value)} disabled={disabled} />
      </div>

      <div className="tj-field">
        <label className="tj-label" htmlFor={`tj-jk-${idx}`}>Jenis Kelamin <span className="tj-required">*</span></label>
        <select id={`tj-jk-${idx}`} className="tj-input"
          value={data.jenis_kelamin} onChange={e => onUpdate(idx, "jenis_kelamin", e.target.value)} disabled={disabled}>
          <option value="">-- Pilih --</option>
          <option value="Laki-laki">Laki-laki</option>
          <option value="Perempuan">Perempuan</option>
        </select>
      </div>

      <div className="tj-field">
        <label className="tj-label" htmlFor={`tj-hp-${idx}`}>Nomor HP <span className="tj-required">*</span></label>
        <input id={`tj-hp-${idx}`} type="tel" className="tj-input" placeholder="08xxxxxxxxxx"
          value={data.no_hp} onChange={e => onUpdate(idx, "no_hp", e.target.value)} disabled={disabled} />
      </div>

      <div className="tj-field">
        <label className="tj-label" htmlFor={`tj-email-${idx}`}>Email <span className="tj-required">*</span></label>
        <input id={`tj-email-${idx}`} type="email" className="tj-input" placeholder="email@contoh.com"
          value={data.email} onChange={e => onUpdate(idx, "email", e.target.value)} disabled={disabled} />
      </div>

      <div className="tj-field full">
        <label className="tj-label" htmlFor={`tj-alamat-${idx}`}>Alamat Lengkap <span className="tj-required">*</span></label>
        <input id={`tj-alamat-${idx}`} type="text" className="tj-input" placeholder="Contoh: Jl. Veteran No.12"
          value={data.alamat_lengkap} onChange={e => onUpdate(idx, "alamat_lengkap", e.target.value)} disabled={disabled} />
      </div>

      <div className="tj-field">
        <label className="tj-label" htmlFor={`tj-prov-${idx}`}>Provinsi <span className="tj-required">*</span></label>
        <input id={`tj-prov-${idx}`} type="text" className="tj-input" placeholder="Contoh: Sumatera Barat"
          value={data.provinsi} onChange={e => onUpdate(idx, "provinsi", e.target.value)} disabled={disabled} />
      </div>

      <div className="tj-field">
        <label className="tj-label" htmlFor={`tj-kabkota-${idx}`}>Kabupaten/Kota <span className="tj-required">*</span></label>
        <input id={`tj-kabkota-${idx}`} type="text" className="tj-input" placeholder="Contoh: Bukittinggi"
          value={data.kabupaten_kota} onChange={e => onUpdate(idx, "kabupaten_kota", e.target.value)} disabled={disabled} />
      </div>

      <div className="tj-field">
        <label className="tj-label" htmlFor={`tj-kec-${idx}`}>Kecamatan <span className="tj-required">*</span></label>
        <input id={`tj-kec-${idx}`} type="text" className="tj-input" placeholder="Contoh: Guguk Panjang"
          value={data.kecamatan} onChange={e => onUpdate(idx, "kecamatan", e.target.value)} disabled={disabled} />
      </div>

      <div className="tj-field">
        <label className="tj-label" htmlFor={`tj-kel-${idx}`}>Kelurahan/Desa <span className="tj-required">*</span></label>
        <input id={`tj-kel-${idx}`} type="text" className="tj-input" placeholder="Contoh: Tarok Dipo"
          value={data.kelurahan_desa} onChange={e => onUpdate(idx, "kelurahan_desa", e.target.value)} disabled={disabled} />
      </div>

      <div className="tj-field">
        <label className="tj-label" htmlFor={`tj-kodepos-${idx}`}>Kode Pos <span className="tj-required">*</span></label>
        <input id={`tj-kodepos-${idx}`} type="text" inputMode="numeric" maxLength={5} className="tj-input"
          placeholder="Contoh: 26136"
          value={data.kode_pos} onChange={e => onUpdate(idx, "kode_pos", e.target.value.replace(/\D/g, ""))} disabled={disabled} />
      </div>
    </div>
  </div>
);

// ── Component ─────────────────────────────────────────────────────────────────

const TambahJamaah = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [pakets, setPakets] = useState<PaketOption[]>([]);
  const [loadingPaket, setLoadingPaket] = useState(true);
  const [paketId, setPaketId] = useState("");
  const [selectedPaket, setSelectedPaket] = useState<PaketOption | null>(null);

  const [jamaahList, setJamaahList] = useState<JamaahForm[]>([{ ...EMPTY_JAMAAH }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SubmitResult | null>(null);

  useEffect(() => {
    const fetchPakets = async () => {
      try {
        const res = await axios.get("http://localhost:8080/admin/paket", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const raw = res.data?.paket ?? res.data?.pakets ?? res.data?.data ?? [];
        const list: PaketOption[] = raw.map((p: Record<string, unknown>) => ({
          id: String(p.ID ?? p.id ?? ""),
          nama_paket: String(p.NamaPaket ?? p.nama_paket ?? ""),
          harga: Number(p.Harga ?? p.harga ?? 0),
          tanggal_berangkat: String(p.TanggalBerangkat ?? p.tanggal_berangkat ?? ""),
          kuota_max: Number(p.KuotaMax ?? p.kuota_max ?? 0),
          kuota_terpakai: Number(p.KuotaTerpakai ?? p.kuota_terpakai ?? 0),
        }));
        setPakets(list);
      } catch {
        setPakets([]);
      } finally {
        setLoadingPaket(false);
      }
    };
    fetchPakets();
  }, [token]);

  useEffect(() => {
    setSelectedPaket(pakets.find(p => p.id === paketId) ?? null);
  }, [paketId, pakets]);

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
    const sisaKuota = selectedPaket ? selectedPaket.kuota_max - selectedPaket.kuota_terpakai : 0;
    if (jamaahList.length >= sisaKuota) {
      setError(`Tidak dapat menambah jamaah — sisa kuota hanya ${sisaKuota} kursi.`);
      return;
    }
    setJamaahList(prev => [...prev, { ...EMPTY_JAMAAH }]);
    setError("");
  };

  const totalTagihan = selectedPaket ? selectedPaket.harga * jamaahList.length : 0;
  const dpMinimum = MIN_DP_PER_ORANG * jamaahList.length;

  const validateAll = (): string => {
    if (!paketId) return "Pilih paket umroh terlebih dahulu.";
    const niks = jamaahList.map(j => j.nik.trim()).filter(Boolean);
    if (new Set(niks).size !== niks.length) return "Terdapat NIK yang sama pada lebih dari satu jamaah.";
    for (let i = 0; i < jamaahList.length; i++) {
      const j = jamaahList[i];
      const n = i + 1;
      if (!j.nik.trim() || !/^\d{16}$/.test(j.nik.trim())) return `Jamaah ${n}: NIK harus 16 digit angka.`;
      if (!j.nama.trim())          return `Jamaah ${n}: Nama wajib diisi.`;
      if (!j.tempat_lahir.trim())  return `Jamaah ${n}: Tempat lahir wajib diisi.`;
      if (!j.tanggal_lahir)        return `Jamaah ${n}: Tanggal lahir wajib diisi.`;
      if (new Date(j.tanggal_lahir) > new Date()) return `Jamaah ${n}: Tanggal lahir tidak valid.`;
      if (!j.jenis_kelamin)        return `Jamaah ${n}: Jenis kelamin wajib dipilih.`;
      if (!j.no_hp.trim())         return `Jamaah ${n}: Nomor HP wajib diisi.`;
      if (!j.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(j.email)) return `Jamaah ${n}: Email tidak valid.`;
      if (!j.alamat_lengkap.trim()) return `Jamaah ${n}: Alamat lengkap wajib diisi.`;
      if (!j.provinsi.trim())       return `Jamaah ${n}: Provinsi wajib diisi.`;
      if (!j.kabupaten_kota.trim()) return `Jamaah ${n}: Kabupaten/Kota wajib diisi.`;
      if (!j.kecamatan.trim())      return `Jamaah ${n}: Kecamatan wajib diisi.`;
      if (!j.kelurahan_desa.trim()) return `Jamaah ${n}: Kelurahan/Desa wajib diisi.`;
      if (!j.kode_pos.trim())       return `Jamaah ${n}: Kode Pos wajib diisi.`;
    }
    return "";
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const validErr = validateAll();
    if (validErr) { setError(validErr); return; }
    setSubmitting(true);
    try {
      const res = await axios.post(
        "http://localhost:8080/pendaftaran",
        {
          paket_id: paketId,
          registration_source: "admin",
          jamaah: jamaahList.map(j => ({
            nik: j.nik.trim(), nama: j.nama.trim(),
            tempat_lahir: j.tempat_lahir.trim(), tanggal_lahir: j.tanggal_lahir,
            jenis_kelamin: j.jenis_kelamin, no_hp: j.no_hp.trim(), email: j.email.trim(),
            alamat_lengkap: j.alamat_lengkap.trim(), provinsi: j.provinsi.trim(),
            kabupaten_kota: j.kabupaten_kota.trim(), kecamatan: j.kecamatan.trim(),
            kelurahan_desa: j.kelurahan_desa.trim(), kode_pos: j.kode_pos.trim(),
          })),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResult(res.data as SubmitResult);
    } catch (err: unknown) {
      setError(axios.isAxiosError(err)
        ? (err.response?.data?.error ?? "Gagal mendaftarkan jamaah.")
        : "Terjadi kesalahan. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Halaman sukses ──
  if (result) return (
    <div className="tambah-jamaah-page">
      <div className="page-header">
        <div className="page-header-left">
          <button type="button" className="tj-back-btn" onClick={() => navigate("/admin/pendaftaran")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Kembali ke Pendaftaran
          </button>
          <h2>Pendaftaran Berhasil 🎉</h2>
          <p>Seluruh jamaah berhasil didaftarkan dan masuk ke Invoice yang sama.</p>
        </div>
      </div>

      <div className="tj-layout">
        <div className="tj-success-card">
          {/* Invoice info */}
          <div className="tj-success-invoice">
            <div className="tj-success-invoice-label">Nomor Invoice</div>
            <div className="tj-success-invoice-num">{result.nomor_invoice}</div>
            <div className="tj-success-meta">
              <span>Paket: <strong>{result.paket}</strong></span>
              <span>Total Tagihan: <strong>{fmtRupiah(result.total_tagihan)}</strong></span>
              <span>Jamaah: <strong>{result.jumlah_jamaah} Orang</strong></span>
            </div>
          </div>

          {/* Daftar nomor pendaftaran */}
          <div className="tj-success-list-title">📋 Daftar Nomor Pendaftaran</div>
          {result.pendaftaran.map((p, i) => (
            <div key={i} className="tj-success-item">
              <div className="tj-success-nama">{p.nama_customer}</div>
              <div className="tj-success-nomor">{p.nomor_pendaftaran}</div>
            </div>
          ))}

          <div className="tj-success-actions">
            <button type="button" className="tj-btn-submit" onClick={() => navigate("/admin/pendaftaran")}>
              ← Lihat Daftar Pendaftaran
            </button>
            <button type="button" className="tj-btn-cancel"
              onClick={() => { setResult(null); setJamaahList([{ ...EMPTY_JAMAAH }]); setPaketId(""); }}>
              ➕ Daftarkan Jamaah Lagi
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Form utama ──
  return (
    <div className="tambah-jamaah-page">
      <div className="page-header">
        <div className="page-header-left">
          <button type="button" className="tj-back-btn" onClick={() => navigate("/admin/pendaftaran")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Kembali
          </button>
          <h2>Tambah Pendaftaran Jamaah</h2>
          <p>Daftarkan satu atau beberapa jamaah sekaligus dalam satu Invoice.</p>
        </div>
      </div>

      <div className="tj-layout">
        <form className="tj-form-area" onSubmit={handleSubmit} noValidate>
          {/* Pilih Paket */}
          <div className="tj-form-card">
            <div className="tj-section">
              <div className="tj-section-title"><span>🕌</span> Paket Umroh</div>
              <div className="tj-field full">
                <label className="tj-label" htmlFor="tj-paket">Pilih Paket <span className="tj-required">*</span></label>
                {loadingPaket ? (
                  <div className="tj-paket-loading"><div className="tj-mini-spin" />Memuat paket...</div>
                ) : (
                  <select id="tj-paket" className="tj-select" value={paketId}
                    onChange={e => setPaketId(e.target.value)} disabled={submitting}>
                    <option value="">-- Pilih Paket Umroh --</option>
                    {pakets.map(p => {
                      const habis = p.kuota_terpakai >= p.kuota_max;
                      return (
                        <option key={p.id} value={p.id} disabled={habis}>
                          {p.nama_paket} — {fmtRupiah(p.harga)}{habis ? " (Penuh)" : ""}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>
              {selectedPaket && (
                <div className="tj-paket-preview">
                  {[
                    { label: "Paket", val: selectedPaket.nama_paket, cls: "" },
                    { label: "Harga/Orang", val: fmtRupiah(selectedPaket.harga), cls: "tj-price" },
                    { label: "Keberangkatan", val: selectedPaket.tanggal_berangkat ? fmtDate(selectedPaket.tanggal_berangkat) : "-", cls: "" },
                    {
                      label: "Kuota",
                      val: `${selectedPaket.kuota_terpakai} / ${selectedPaket.kuota_max} terpakai${selectedPaket.kuota_terpakai >= selectedPaket.kuota_max ? " — PENUH" : ""}`,
                      cls: selectedPaket.kuota_terpakai >= selectedPaket.kuota_max ? "tj-full" : "",
                    },
                  ].map(row => (
                    <div key={row.label} className="tj-paket-preview-row">
                      <span className="tj-paket-preview-label">{row.label}</span>
                      <span className={`tj-paket-preview-val ${row.cls}`}>{row.val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Card jamaah */}
          {jamaahList.map((data, idx) => (
            <AdminJamaahCard
              key={idx}
              idx={idx}
              data={data}
              onUpdate={updateJamaah}
              onRemove={removeJamaah}
              disabled={submitting}
            />
          ))}

          {/* Tombol tambah jamaah */}
          <button type="button" className="tj-btn-tambah" onClick={addJamaah} disabled={submitting || !paketId}>
            <span className="tj-tambah-icon">+</span> ➕ Tambah Jamaah
          </button>

          {/* Ringkasan tagihan */}
          {selectedPaket && (
            <div className="tj-ringkasan">
              <div className="tj-ringkasan-title">💳 Ringkasan Pendaftaran</div>
              <div className="tj-ringkasan-row"><span>Harga / Orang</span><span>{fmtRupiah(selectedPaket.harga)}</span></div>
              <div className="tj-ringkasan-row">
                <span>Jumlah Jamaah</span>
                <span className="tj-ringkasan-count">{jamaahList.length} Orang</span>
              </div>
              <div className="tj-ringkasan-divider" />
              <div className="tj-ringkasan-row tj-ringkasan-total">
                <span>Total Tagihan</span>
                <span>{fmtRupiah(totalTagihan)}</span>
              </div>
              <div className="tj-ringkasan-row">
                <span>DP Minimum</span>
                <span>{fmtRupiah(dpMinimum)}</span>
              </div>
            </div>
          )}

          {/* PIC Info */}
          <div className="tj-pic-info">
            <span className="tj-pic-icon">🔒</span>
            <div>
              <div className="tj-pic-title">PIC Otomatis</div>
              <div className="tj-pic-desc">
                {jamaahList.length > 1
                  ? `Seluruh ${jamaahList.length} jamaah akan tercatat dalam Invoice yang sama.`
                  : "Jamaah ini akan menjadi tanggung jawab Anda sebagai PIC secara otomatis."}
              </div>
            </div>
          </div>

          {error && <div className="tj-alert tj-alert-error">❌ {error}</div>}

          <div className="tj-footer">
            <button type="button" className="tj-btn-cancel" onClick={() => navigate("/admin/pendaftaran")} disabled={submitting}>
              Batal
            </button>
            <button type="submit" className="tj-btn-submit" disabled={submitting}>
              {submitting
                ? <><div className="tj-mini-spin tj-mini-spin-w" />Menyimpan...</>
                : <>✅ Daftarkan {jamaahList.length > 1 ? `${jamaahList.length} Jamaah` : "Jamaah"}</>}
            </button>
          </div>
        </form>

        {/* Sidebar */}
        <div className="tj-sidebar">
          <div className="tj-info-card">
            <div className="tj-info-icon">ℹ️</div>
            <div className="tj-info-title">Informasi</div>
            <ul className="tj-info-list">
              <li>Satu invoice untuk semua jamaah yang didaftarkan sekaligus.</li>
              <li>Setiap jamaah mendapat Nomor UMR masing-masing.</li>
              <li>Setiap jamaah punya Portal Jamaah & OTP sendiri.</li>
              <li>Pembayaran dilakukan per-invoice (bukan per-jamaah).</li>
              <li>Status awal: <strong>Proses</strong>, Bayar: <strong>Belum</strong>.</li>
            </ul>
          </div>
          <div className="tj-info-card tj-info-flow">
            <div className="tj-info-title">Alur Pendaftaran Grup</div>
            {["Pilih paket umroh", "Isi data jamaah (tambah bila perlu)", "Klik Daftarkan", "1 Invoice dibuat", "Lanjut proses pembayaran"].map((step, i) => (
              <div key={i} className="tj-flow-step">
                <span className="tj-flow-num">{i + 1}</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TambahJamaah;
