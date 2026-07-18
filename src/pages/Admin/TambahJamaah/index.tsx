import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../../context/AuthContext";
import "./TambahJamaah.css";

interface PaketOption {
  id: string;
  nama_paket: string;
  harga: number;
  tanggal_berangkat: string;
  kuota_max: number;
  kuota_terpakai: number;
}

const fmtRupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });

const TambahJamaah = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [nik, setNik] = useState("");
  const [nama, setNama] = useState("");
  const [tempatLahir, setTempatLahir] = useState("");
  const [tanggalLahir, setTanggalLahir] = useState("");
  const [jenisKelamin, setJenisKelamin] = useState("");
  const [noHp, setNoHp] = useState("");
  const [email, setEmail] = useState("");
  const [alamat, setAlamat] = useState("");
  const [paketId, setPaketId] = useState("");

  const [pakets, setPakets] = useState<PaketOption[]>([]);
  const [loadingPaket, setLoadingPaket] = useState(true);
  const [selectedPaket, setSelectedPaket] = useState<PaketOption | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const fetchPakets = async () => {
      try {
        const res = await axios.get("http://localhost:8080/admin/paket", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const raw = res.data?.paket ?? res.data?.pakets ?? res.data?.data ?? [];
        const list: PaketOption[] = raw.map((p: Record<string, unknown>) => ({
          id:               String(p.ID ?? p.id ?? ""),
          nama_paket:       String(p.NamaPaket ?? p.nama_paket ?? ""),
          harga:            Number(p.Harga ?? p.harga ?? 0),
          tanggal_berangkat: String(p.TanggalBerangkat ?? p.tanggal_berangkat ?? ""),
          kuota_max:        Number(p.KuotaMax ?? p.kuota_max ?? 0),
          kuota_terpakai:   Number(p.KuotaTerpakai ?? p.kuota_terpakai ?? 0),
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
    setSelectedPaket(pakets.find((p) => p.id === paketId) ?? null);
  }, [paketId, pakets]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!nik.trim())          return setError("NIK wajib diisi.");
    if (!/^\d{16}$/.test(nik.trim())) return setError("NIK harus 16 digit angka.");
    if (!nama.trim())         return setError("Nama jamaah wajib diisi.");
    if (!tempatLahir.trim())  return setError("Tempat lahir wajib diisi.");
    if (!tanggalLahir)        return setError("Tanggal lahir wajib diisi.");
    if (new Date(tanggalLahir) > new Date()) return setError("Tanggal lahir tidak boleh melebihi hari ini.");
    if (!jenisKelamin)        return setError("Jenis kelamin wajib dipilih.");
    if (!noHp.trim())         return setError("Nomor HP wajib diisi.");
    if (!email.trim())        return setError("Email wajib diisi.");
    if (!alamat.trim())       return setError("Alamat wajib diisi.");
    if (!paketId)             return setError("Pilih paket umroh terlebih dahulu.");

    setSubmitting(true);
    try {
      const res = await axios.post(
        "http://localhost:8080/admin/customer",
        {
          nik:           nik.trim(),
          nama:          nama.trim(),
          tempat_lahir:  tempatLahir.trim(),
          tanggal_lahir: tanggalLahir,
          jenis_kelamin: jenisKelamin,
          no_hp:         noHp.trim(),
          email:         email.trim(),
          alamat:        alamat.trim(),
          paket_id:      paketId,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const nomor   = res.data?.pendaftaran?.nomor_pendaftaran ?? "-";
      const invoice = res.data?.pendaftaran?.nomor_invoice ?? "-";
      setSuccess(`✅ Jamaah "${nama}" berhasil didaftarkan!\nNo. Pendaftaran: ${nomor}\nNo. Invoice: ${invoice}`);
      setNik(""); setNama(""); setTempatLahir(""); setTanggalLahir("");
      setJenisKelamin(""); setNoHp(""); setEmail(""); setAlamat(""); setPaketId("");
      setTimeout(() => navigate("/admin/pendaftaran"), 2200);
    } catch (err: unknown) {
      setError(axios.isAxiosError(err)
        ? (err.response?.data?.error ?? "Gagal mendaftarkan jamaah.")
        : "Terjadi kesalahan. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="tambah-jamaah-page">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <button type="button" className="tj-back-btn" onClick={() => navigate("/admin/pendaftaran")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            Kembali
          </button>
          <h2>Tambah Jamaah Baru</h2>
          <p>Daftarkan jamaah baru dan otomatis menjadi PIC Anda.</p>
        </div>
      </div>

      <div className="tj-layout">
        {/* Form */}
        <form className="tj-form-card" onSubmit={handleSubmit} noValidate>
          {/* Data Jamaah */}
          <div className="tj-section">
            <div className="tj-section-title"><span>👤</span> Data Jamaah</div>
            <div className="tj-field-grid">
              {/* NIK */}
              <div className="tj-field full">
                <label className="tj-label" htmlFor="tj-nik">NIK <span className="tj-required">*</span></label>
                <input id="tj-nik" type="text" inputMode="numeric" maxLength={16} className="tj-input"
                  placeholder="16 digit angka sesuai KTP"
                  value={nik} onChange={e => setNik(e.target.value.replace(/\D/g, ""))} disabled={submitting} autoFocus />
              </div>
              {/* Nama */}
              <div className="tj-field full">
                <label className="tj-label" htmlFor="tj-nama">Nama Lengkap <span className="tj-required">*</span></label>
                <input id="tj-nama" type="text" className="tj-input" placeholder="Sesuai KTP/Paspor"
                  value={nama} onChange={e => setNama(e.target.value)} disabled={submitting} />
              </div>
              {/* Tempat Lahir */}
              <div className="tj-field">
                <label className="tj-label" htmlFor="tj-tempat">Tempat Lahir <span className="tj-required">*</span></label>
                <input id="tj-tempat" type="text" className="tj-input" placeholder="Contoh: Jakarta"
                  value={tempatLahir} onChange={e => setTempatLahir(e.target.value)} disabled={submitting} />
              </div>
              {/* Tanggal Lahir */}
              <div className="tj-field">
                <label className="tj-label" htmlFor="tj-tgl-lahir">Tanggal Lahir <span className="tj-required">*</span></label>
                <input id="tj-tgl-lahir" type="date" className="tj-input"
                  max={new Date().toISOString().split("T")[0]}
                  value={tanggalLahir} onChange={e => setTanggalLahir(e.target.value)} disabled={submitting} />
              </div>
              {/* Jenis Kelamin */}
              <div className="tj-field">
                <label className="tj-label" htmlFor="tj-kelamin">Jenis Kelamin <span className="tj-required">*</span></label>
                <select id="tj-kelamin" className="tj-input"
                  value={jenisKelamin} onChange={e => setJenisKelamin(e.target.value)} disabled={submitting}>
                  <option value="">-- Pilih --</option>
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>
              {/* No HP */}
              <div className="tj-field">
                <label className="tj-label" htmlFor="tj-nohp">Nomor HP <span className="tj-required">*</span></label>
                <input id="tj-nohp" type="tel" className="tj-input" placeholder="08xxxxxxxxxx"
                  value={noHp} onChange={e => setNoHp(e.target.value)} disabled={submitting} />
              </div>
              {/* Email */}
              <div className="tj-field">
                <label className="tj-label" htmlFor="tj-email">Email <span className="tj-required">*</span></label>
                <input id="tj-email" type="email" className="tj-input" placeholder="email@contoh.com"
                  value={email} onChange={e => setEmail(e.target.value)} disabled={submitting} />
              </div>
              {/* Alamat */}
              <div className="tj-field full">
                <label className="tj-label" htmlFor="tj-alamat">Alamat <span className="tj-required">*</span></label>
                <textarea id="tj-alamat" className="tj-input tj-textarea" rows={3} placeholder="Alamat lengkap sesuai KTP"
                  value={alamat} onChange={e => setAlamat(e.target.value)} disabled={submitting} />
              </div>
            </div>
          </div>

          {/* Paket */}
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
                  { label: "Harga", val: fmtRupiah(selectedPaket.harga), cls: "tj-price" },
                  { label: "Keberangkatan", val: selectedPaket.tanggal_berangkat ? fmtDate(selectedPaket.tanggal_berangkat) : "-", cls: "" },
                  { label: "Kuota", val: `${selectedPaket.kuota_terpakai} / ${selectedPaket.kuota_max} terpakai${selectedPaket.kuota_terpakai >= selectedPaket.kuota_max ? " — PENUH" : ""}`, cls: selectedPaket.kuota_terpakai >= selectedPaket.kuota_max ? "tj-full" : "" },
                ].map(row => (
                  <div key={row.label} className="tj-paket-preview-row">
                    <span className="tj-paket-preview-label">{row.label}</span>
                    <span className={`tj-paket-preview-val ${row.cls}`}>{row.val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PIC Info */}
          <div className="tj-pic-info">
            <span className="tj-pic-icon">🔒</span>
            <div>
              <div className="tj-pic-title">PIC Otomatis</div>
              <div className="tj-pic-desc">Jamaah ini akan menjadi tanggung jawab Anda sebagai PIC secara otomatis.</div>
            </div>
          </div>

          {error   && <div className="tj-alert tj-alert-error">❌ {error}</div>}
          {success && (
            <div className="tj-alert tj-alert-success">
              {success.split("\n").map((line, i) => <div key={i}>{line}</div>)}
              <div style={{ fontSize: "0.78rem", marginTop: "0.5rem", opacity: 0.75 }}>
                Mengarahkan ke halaman pendaftaran...
              </div>
            </div>
          )}

          <div className="tj-footer">
            <button type="button" className="tj-btn-cancel" onClick={() => navigate("/admin/pendaftaran")} disabled={submitting}>
              Batal
            </button>
            <button type="submit" className="tj-btn-submit" disabled={submitting || !!success}>
              {submitting
                ? <><div className="tj-mini-spin tj-mini-spin-w" />Menyimpan...</>
                : <>✅ Daftarkan Jamaah</>}
            </button>
          </div>
        </form>

        {/* Sidebar */}
        <div className="tj-sidebar">
          <div className="tj-info-card">
            <div className="tj-info-icon">ℹ️</div>
            <div className="tj-info-title">Informasi</div>
            <ul className="tj-info-list">
              <li>Jamaah otomatis menjadi PIC admin yang login.</li>
              <li>Nomor pendaftaran format <code>UMR-YYYYMMDDHHMMSS</code>.</li>
              <li>Nomor invoice dibuat langsung saat pendaftaran.</li>
              <li>Status awal: <strong>Proses</strong>, Bayar: <strong>Belum</strong>.</li>
              <li>Flow customer mandiri tetap berjalan seperti biasa.</li>
            </ul>
          </div>
          <div className="tj-info-card tj-info-flow">
            <div className="tj-info-title">Alur Pendaftaran Admin</div>
            {["Isi data jamaah", "Pilih paket umroh", "Klik Daftarkan", "Jamaah jadi PIC Anda", "Lanjut proses bayar & dokumen"].map((step, i) => (
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
