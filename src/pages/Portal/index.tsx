import { useState, useEffect, useCallback, useRef, type FormEvent, type ChangeEvent } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import "./Portal.css";

// ── Types ────────────────────────────────────────────────────────────────────

interface PembayaranItem {
  id: string;
  jumlah: number;
  status: string;
  tanggal: string;
  bukti: string;
}

interface DokumenItem {
  id: string;
  jenis: string;
  status: string;
  file: string;
  uploaded_at: string;
}

interface DashboardData {
  nama: string;
  nomor: string;
  paket: string;
  harga: number;
  payment_status: string;
  document_status: string;
  status: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const API = "http://localhost:8080";
const STORAGE_KEY = "customer_session";

const DOK_TYPES = [
  { key: "paspor",         label: "Paspor",          icon: "🛂",  wajib: true  },
  { key: "ktp",            label: "KTP",             icon: "🪪",  wajib: true  },
  { key: "akte_kelahiran", label: "Akte Kelahiran",   icon: "📜",  wajib: true  },
  { key: "kartu_keluarga", label: "Kartu Keluarga",   icon: "👨‍👩‍👧", wajib: true  },
  { key: "vaksin",         label: "Vaksin",           icon: "💉",  wajib: true  },
  { key: "foto",           label: "Foto",             icon: "🖼️", wajib: false },
  { key: "lainnya",        label: "Lainnya",          icon: "📄",  wajib: false },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmtRupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

const getStatusClass = (v: string) => {
  const map: Record<string, string> = {
    proses: "sval-proses", selesai: "sval-selesai", batal: "sval-batal",
    belum: "sval-belum", pending: "sval-pending", lunas: "sval-lunas",
    dp: "sval-dp", diterima: "sval-verified", ditolak: "sval-ditolak",
    lengkap: "sval-lengkap", revisi: "sval-revisi",
  };
  return map[v?.toLowerCase()] ?? "sval-belum";
};

const getStatusLabel = (v: string) => {
  const map: Record<string, string> = {
    proses: "Proses", selesai: "Selesai", batal: "Batal",
    belum: "Belum", pending: "Menunggu", lunas: "Lunas",
    dp: "DP", diterima: "Diterima", ditolak: "Ditolak",
    lengkap: "Lengkap", revisi: "Perlu Revisi",
  };
  return map[v?.toLowerCase()] ?? v;
};

// ── Upload Bukti Modal ────────────────────────────────────────────────────────

const UploadBuktiModal = ({
  pembayaranId,
  token,
  onClose,
  onDone,
}: {
  pembayaranId: string;
  token: string;
  onClose: () => void;
  onDone: () => void;
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!file) { setError("Pilih file terlebih dahulu."); return; }
    setError("");
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append("bukti", file);
      await axios.post(`${API}/customer/pembayaran/${pembayaranId}/upload`, fd, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });
      onDone();
    } catch (err: unknown) {
      setError(axios.isAxiosError(err) ? (err.response?.data?.error ?? "Upload gagal.") : "Upload gagal.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-modal-overlay" onClick={(e) => e.target === e.currentTarget && !uploading && onClose()}>
      <div className="upload-modal">
        <div className="upload-modal-title">📎 Upload Bukti Pembayaran</div>

        {error && (
          <div className="portal-error" style={{ marginBottom: "1rem" }}>{error}</div>
        )}

        <div className="upload-drop-area">
          <input type="file" accept="image/*,.pdf" onChange={handleFile} ref={fileRef} />
          {preview ? (
            <img src={preview} alt="preview" className="upload-preview" />
          ) : (
            <>
              <div className="upload-drop-icon">📂</div>
              <div className="upload-drop-text">Klik atau drag bukti transfer ke sini</div>
              <div className="upload-drop-sub">JPG, PNG, PDF — maks 5MB</div>
            </>
          )}
        </div>

        {file && (
          <div style={{ fontSize: "0.78rem", color: "#4f46e5", fontWeight: 600, marginBottom: "1rem" }}>
            ✓ {file.name}
          </div>
        )}

        <div className="upload-modal-actions">
          <button className="modal-cancel-btn" onClick={onClose} disabled={uploading}>Batal</button>
          <button className="modal-upload-btn" onClick={handleUpload} disabled={uploading || !file}>
            {uploading ? <><div className="mini-spin" />Mengupload...</> : <>📤 Upload Bukti</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Bank Info Card ────────────────────────────────────────────────────────────

const BANK_INFO = [
  { bank: "BRI", logo: "🏦", noRek: "1234-5678-9012-3456", atasNama: "Bonita Travel Umroh" },
  { bank: "BCA", logo: "🏛️", noRek: "8901-2345-67", atasNama: "Bonita Travel Umroh" },
];

const BankInfoCard = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text.replace(/-/g, "")).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  return (
    <div className="bank-info-wrap">
      <div className="bank-info-title">🏦 Rekening Tujuan Transfer</div>
      {BANK_INFO.map((b) => (
        <div className="bank-info-card" key={b.bank}>
          <div className="bank-info-left">
            <div className="bank-logo">{b.logo}</div>
            <div>
              <div className="bank-name">{b.bank}</div>
              <div className="bank-atas-nama">{b.atasNama}</div>
            </div>
          </div>
          <div className="bank-info-right">
            <div className="bank-norek">{b.noRek}</div>
            <button
              type="button"
              className={`bank-copy-btn ${copiedKey === b.bank ? "copied" : ""}`}
              onClick={() => handleCopy(b.noRek, b.bank)}
            >
              {copiedKey === b.bank ? (
                <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg> Tersalin!</>
              ) : (
                <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg> Salin</>
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Tab Pembayaran ────────────────────────────────────────────────────────────

// ── Selamat Card ─────────────────────────────────────────────────────────────

const SelamatCard = ({
  token,
  nomorInvoice,
}: {
  token: string;
  nomorInvoice: string;
}) => {
  const [downloading, setDownloading] = useState(false);

  const handleDownloadInvoice = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`${API}/customer/invoice`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Gagal mengambil invoice");
      const html = await res.text();
      // Buka di tab baru
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const w = window.open(url, "_blank");
      if (!w) {
        // Jika popup diblokir, download langsung
        const a = document.createElement("a");
        a.href = url;
        a.download = `invoice-${nomorInvoice}.html`;
        a.click();
      }
    } catch {
      alert("Gagal mengunduh invoice. Coba lagi.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="selamat-card">
      {/* Confetti dots */}
      <div className="selamat-confetti" aria-hidden>
        {["🎉","✨","🌟","🎊","⭐","🎉"].map((e, i) => (
          <span key={i} className={`confetti-dot confetti-dot-${i+1}`}>{e}</span>
        ))}
      </div>

      <div className="selamat-icon">🎉</div>
      <div className="selamat-title">Selamat!</div>
      <div className="selamat-sub">Seluruh proses administrasi telah selesai.</div>

      <div className="selamat-status-list">
        <div className="selamat-status-item">
          <span className="selamat-check">✅</span>
          <span>Pembayaran Lunas</span>
        </div>
        <div className="selamat-status-item">
          <span className="selamat-check">✅</span>
          <span>Dokumen Lengkap</span>
        </div>
        <div className="selamat-status-item">
          <span className="selamat-check">✅</span>
          <span>Siap Berangkat</span>
        </div>
      </div>

      {nomorInvoice && (
        <div className="selamat-invoice-nomor">
          🧾 {nomorInvoice}
        </div>
      )}

      <button
        className="selamat-download-btn"
        onClick={handleDownloadInvoice}
        disabled={downloading || !nomorInvoice}
      >
        {downloading ? (
          <><div className="mini-spin" />Memuat...</>
        ) : (
          <>⬇️ Download Invoice</>
        )}
      </button>

      <div className="selamat-note">
        Tim Bonita akan menghubungi Anda untuk informasi keberangkatan selanjutnya.
      </div>
    </div>
  );
};

// ── Tab Pembayaran ────────────────────────────────────────────────────────────

const TabPembayaran = ({
  token,
  harga,
  paymentStatus,
  documentStatus,
}: {
  token: string;
  harga: number;
  paymentStatus: string;
  documentStatus: string;
}) => {
  const [riwayat, setRiwayat] = useState<PembayaranItem[]>([]);
  const [totalDibayar, setTotalDibayar] = useState(0);
  const [hargaPaket, setHargaPaket] = useState(0);
  const [statusBayar, setStatusBayar] = useState("belum");
  const [nomorInvoice, setNomorInvoice] = useState("");
  const [loading, setLoading] = useState(true);

  // Form state — all-in-one: nominal + bukti
  const [jumlah, setJumlah] = useState("");
  const [buktiFile, setBuktiFile] = useState<File | null>(null);
  const [buktiPreview, setBuktiPreview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const buktiRef = useRef<HTMLInputElement>(null);

  // Upload bukti untuk riwayat yg belum ada buktinya
  const [uploadModalId, setUploadModalId] = useState<string | null>(null);

  const fetchPembayaran = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/customer/pembayaran`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRiwayat(res.data?.riwayat ?? []);
      setTotalDibayar(res.data?.total_dibayar ?? 0);
      if (res.data?.harga_paket) setHargaPaket(res.data.harga_paket);
      if (res.data?.payment_status) setStatusBayar(res.data.payment_status);
      if (res.data?.nomor_invoice) setNomorInvoice(res.data.nomor_invoice);
    } catch {
      setRiwayat([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchPembayaran(); }, [fetchPembayaran]);

  const hargaEfektif = hargaPaket > 0 ? hargaPaket : harga;
  const statusEfektif = statusBayar !== "belum" ? statusBayar : paymentStatus;
  const sisaBayar = hargaEfektif - totalDibayar;
  const pct = hargaEfektif > 0 ? Math.min((totalDibayar / hargaEfektif) * 100, 100) : 0;
  const isLunas =
    statusEfektif?.toLowerCase() === "lunas" ||
    (hargaEfektif > 0 && totalDibayar > 0 && totalDibayar >= hargaEfektif);
  const isSelesai = isLunas && documentStatus?.toLowerCase() === "lengkap";

  const handleBuktiChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBuktiFile(f);
    if (f.type.startsWith("image/")) {
      setBuktiPreview(URL.createObjectURL(f));
    } else {
      setBuktiPreview("");
    }
    setFormError("");
  };

  // All-in-one: buat pembayaran + langsung upload bukti
  const handleBayar = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    const nominal = parseFloat(jumlah.replace(/\./g, ""));
    if (!nominal || isNaN(nominal)) { setFormError("Masukkan nominal pembayaran."); return; }
    if (totalDibayar === 0 && nominal < 5000000) {setFormError("Pembayaran pertama minimal Rp 5.000.000.");return;}
    if (nominal > sisaBayar) { setFormError(`Melebihi sisa tagihan ${fmtRupiah(sisaBayar)}.`); return; }
    if (!buktiFile) { setFormError("Upload foto bukti transfer terlebih dahulu."); return; }

    try {
      setSubmitting(true);

      // Step 1: Buat record pembayaran
      const createRes = await axios.post(
        `${API}/customer/pembayaran`,
        { jumlah: nominal },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      // Step 2: Upload bukti ke record baru
      const pembayaranId = createRes.data?.id ?? createRes.data?.data?.id;
      if (pembayaranId && buktiFile) {
        const fd = new FormData();
        fd.append("bukti", buktiFile);
        await axios.post(
          `${API}/customer/pembayaran/${pembayaranId}/upload`,
          fd,
          { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } },
        );
      }

      setFormSuccess("Pembayaran berhasil dikirim! Menunggu verifikasi dari admin.");
      setJumlah("");
      setBuktiFile(null);
      setBuktiPreview("");
      if (buktiRef.current) buktiRef.current.value = "";
      fetchPembayaran();
    } catch (err: unknown) {
      setFormError(axios.isAxiosError(err) ? (err.response?.data?.error ?? "Gagal membuat pembayaran.") : "Gagal membuat pembayaran.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>
      <div className="mini-spin-dark" style={{ margin: "0 auto 0.75rem" }} />
      Memuat data pembayaran...
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {/* 🎉 Selamat Card — muncul jika lunas + dokumen lengkap */}
      {isSelesai && (
        <SelamatCard token={token} nomorInvoice={nomorInvoice} />
      )}

      {/* Progress bar */}
      <div className="bayar-progress-wrap">
        <div className="bayar-progress-nums">
          <div>
            <div className="bayar-terbayar">{fmtRupiah(totalDibayar)}</div>
            <div className="bayar-total-label">dari {fmtRupiah(hargaEfektif)}</div>
          </div>
          {!isLunas && (
            <div className="bayar-sisa-label">
              <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Sisa</div>
              <div className="bayar-sisa-val">{fmtRupiah(sisaBayar)}</div>
            </div>
          )}
        </div>
        <div className="bayar-bar-bg">
          <div className={`bayar-bar-fill ${isLunas ? "bayar-bar-full" : ""}`} style={{ width: `${pct}%` }} />
        </div>
        {isLunas && (
          <div style={{ marginTop: "0.6rem", fontSize: "0.8rem", color: "#059669", fontWeight: 700, textAlign: "center" }}>
            ✓ Pembayaran Lunas
          </div>
        )}
      </div>


      {/* ─── Form All-in-One ─── */}
      {!isLunas && (
        <form className="bayar-new-form" onSubmit={handleBayar} noValidate>
          <div className="bayar-new-title">💳 Buat Pembayaran</div>
          <div className="bayar-new-sub">Transfer ke rekening berikut, lalu isi form dan upload bukti transfer.</div>

          {formError && <div className="portal-error">{formError}</div>}
          {formSuccess && <div className="portal-success-msg">✓ {formSuccess}</div>}

          {/* Info Rekening Bank */}
          <BankInfoCard />

          {/* Nominal */}
          <div className="bayar-field-label">Jumlah yang Ditransfer <span style={{ color: '#ef4444' }}>*</span></div>
          <div className="bayar-jumlah-wrap">
            <span className="bayar-prefix">Rp</span>
            <input
              className="bayar-input"
              type="text"
              placeholder="5.000.000"
              value={jumlah}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "");
                setJumlah(raw ? Number(raw).toLocaleString("id-ID") : "");
              }}
              disabled={submitting}
            />
          </div>
          <div className="bayar-hint">{totalDibayar === 0 ? "DP minimal Rp 5.000.000" : `Sisa tagihan: ${fmtRupiah(sisaBayar)}`} </div>

          {/* Upload bukti */}
          <div className="bayar-field-label" style={{ marginTop: "1rem" }}>Foto Bukti Transfer <span style={{ color: '#ef4444' }}>*</span></div>
          <div
            className="bayar-bukti-drop"
            onClick={() => !submitting && buktiRef.current?.click()}
            style={{ cursor: submitting ? "not-allowed" : "pointer" }}
          >
            <input
              ref={buktiRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleBuktiChange}
              disabled={submitting}
              style={{ display: "none" }}
            />
            {buktiPreview ? (
              <img src={buktiPreview} alt="preview" className="bayar-bukti-preview" />
            ) : buktiFile ? (
              <div className="bayar-bukti-file-info">
                <span style={{ fontSize: "1.5rem" }}>📄</span>
                <span>{buktiFile.name}</span>
              </div>
            ) : (
              <>
                <div className="bayar-bukti-icon">📷</div>
                <div className="bayar-bukti-text">Klik untuk upload foto bukti transfer</div>
                <div className="bayar-bukti-sub">JPG, PNG, PDF — maks 5MB</div>
              </>
            )}
          </div>
          {buktiFile && (
            <div className="bayar-bukti-fname">
              ✓ {buktiFile.name}
              <button
                type="button"
                className="bayar-bukti-clear"
                onClick={() => { setBuktiFile(null); setBuktiPreview(""); if (buktiRef.current) buktiRef.current.value = ""; }}
                disabled={submitting}
              >✕</button>
            </div>
          )}

          <div className="bayar-btn-row" style={{ marginTop: "1.25rem" }}>
            <button
              type="submit"
              className="bayar-submit-btn"
              disabled={submitting || !jumlah || !buktiFile}
            >
              {submitting
                ? <><div className="mini-spin" />Memproses...</>
                : <>✅ Kirim Pembayaran &amp; Bukti</>}
            </button>
          </div>
        </form>
      )}


      {/* Riwayat */}
      <div>
        <div className="section-title">
          <span>🧾</span> Riwayat Pembayaran
        </div>
        {riwayat.length === 0 ? (
          <div className="portal-empty">
            <div className="portal-empty-icon">💰</div>
            <p>Belum ada pembayaran.</p>
          </div>
        ) : (
          <div className="riwayat-list">
            {riwayat.map((p) => (
              <div className="riwayat-item" key={p.id}>
                <div className="riwayat-left">
                  <div className="riwayat-jumlah">{fmtRupiah(p.jumlah)}</div>
                  <div className="riwayat-tanggal">{fmtDate(p.tanggal)}</div>
                </div>
                <div className="riwayat-right">
                  <span className={`riwayat-status rs-${p.status?.toLowerCase()}`}>
                    {p.status === "pending" ? "Menunggu Verifikasi" :
                      p.status === "diterima" ? "✓ Diterima" : "✕ Ditolak"}
                  </span>
                  {p.bukti ? (
                    <a href={p.bukti} target="_blank" rel="noreferrer" className="bukti-link">
                      📎 Lihat Bukti
                    </a>
                  ) : p.status === "pending" ? (
                    <button className="upload-bukti-btn" onClick={() => setUploadModalId(p.id)}>
                      📤 Upload Bukti
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal (untuk riwayat yg belum ada buktinya) */}
      {uploadModalId && (
        <UploadBuktiModal
          pembayaranId={uploadModalId}
          token={token}
          onClose={() => setUploadModalId(null)}
          onDone={() => { setUploadModalId(null); fetchPembayaran(); }}
        />
      )}
    </div>
  );
};

// ── Tab Dokumen ───────────────────────────────────────────────────────────────

const TabDokumen = ({ token }: { token: string }) => {
  const [dokumenList, setDokumenList] = useState<DokumenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dpDiterima, setDpDiterima] = useState(false);
  const [selectedType, setSelectedType] = useState("paspor");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchDokumen = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/customer/dokumen`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDokumenList(res.data?.dokumen ?? []);
    } catch {
      setDokumenList([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const checkDpStatus = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/customer/pembayaran`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const riwayat: PembayaranItem[] = res.data?.riwayat ?? [];
      setDpDiterima(riwayat.some((p) => p.status === "diterima" && p.jumlah >= 5_000_000));
    } catch {
      setDpDiterima(false);
    }
  }, [token]);

  useEffect(() => {
    checkDpStatus();
    fetchDokumen();
  }, [checkDpStatus, fetchDokumen]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
    setUploadError("");
    setUploadSuccess("");
  };

  const handleUpload = async () => {
    if (!file) { setUploadError("Pilih file terlebih dahulu."); return; }
    if (!selectedType) { setUploadError("Pilih jenis dokumen."); return; }
    setUploadError("");
    setUploadSuccess("");
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("jenis", selectedType);
      await axios.post(`${API}/customer/dokumen/upload`, fd, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });
      setUploadSuccess(`${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} berhasil diupload!`);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      fetchDokumen();
    } catch (err: unknown) {
      setUploadError(axios.isAxiosError(err) ? (err.response?.data?.error ?? "Upload gagal.") : "Upload gagal.");
    } finally {
      setUploading(false);
    }
  };

  // Map uploaded docs
  const uploadedMap = new Map(dokumenList.map((d) => [d.jenis, d]));
  const wajibDone = DOK_TYPES.filter((t) => t.wajib).every((t) => {
    const d = uploadedMap.get(t.key);
    return d && d.status !== "ditolak";
  });

  const getDokIcon = (jenis: string) => {
    const t = DOK_TYPES.find((d) => d.key === jenis);
    return t?.icon ?? "📄";
  };

  if (loading) return (
    <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>
      <div className="mini-spin-dark" style={{ margin: "0 auto 0.75rem" }} />
      Memuat dokumen...
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {/* ── Banner Syarat Upload DP ── */}
      {!dpDiterima ? (
        <div style={{
          background: "linear-gradient(135deg, #fffbeb, #fef3c7)",
          border: "1.5px solid #f59e0b",
          borderRadius: "14px",
          padding: "1.125rem 1.375rem",
          display: "flex",
          gap: "0.875rem",
          alignItems: "flex-start",
        }}>
          <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>🔒</span>
          <div>
            <div style={{ fontWeight: 700, color: "#92400e", fontSize: "0.9rem", marginBottom: "0.3rem" }}>
              Syarat Upload Dokumen
            </div>
            <div style={{ fontSize: "0.82rem", color: "#78350f", lineHeight: 1.6 }}>
              Dokumen persyaratan umroh baru dapat diunggah setelah{" "}
              <strong>pembayaran DP pertama sebesar minimal Rp5.000.000</strong>{" "}
              telah diverifikasi oleh admin Bonita.
            </div>
            <div style={{ marginTop: "0.6rem", fontSize: "0.78rem", color: "#b45309", fontWeight: 600 }}>
              ⏳ Menunggu verifikasi pembayaran DP oleh admin...
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          background: "linear-gradient(135deg, #ecfdf5, #d1fae5)",
          border: "1.5px solid #6ee7b7",
          borderRadius: "14px",
          padding: "0.875rem 1.25rem",
          display: "flex",
          gap: "0.75rem",
          alignItems: "center",
          fontSize: "0.85rem",
          color: "#065f46",
          fontWeight: 600,
        }}>
          <span style={{ fontSize: "1.2rem" }}>✅</span>
          Pembayaran DP telah diverifikasi. Anda dapat mengunggah dokumen.
        </div>
      )}

      {/* Info dokumen wajib */}
      <div className="dokumen-wajib-info">
        <strong>📋 Dokumen Wajib</strong>
        Upload 5 dokumen berikut untuk melengkapi berkas Anda.
        <div className="dokumen-wajib-list">
          {DOK_TYPES.filter((t) => t.wajib).map((t) => {
            const uploaded = uploadedMap.get(t.key);
            const cls = !uploaded ? "missing" : uploaded.status === "ditolak" ? "missing" : "done";
            return (
              <span key={t.key} className={`dokumen-wajib-tag ${cls}`}>
                {t.icon} {t.label}
                {cls === "done" ? " ✓" : " ✗"}
              </span>
            );
          })}
        </div>
        {wajibDone && (
          <div style={{ marginTop: "0.5rem", fontWeight: 700, color: "#059669" }}>
            ✓ Semua dokumen wajib telah diupload!
          </div>
        )}
      </div>

      {/* Upload dokumen baru */}
      <div className="dokumen-upload-card" style={!dpDiterima ? { opacity: 0.85 } : {}}>
        <div className="dokumen-upload-title">📤 Upload Dokumen</div>

        {!dpDiterima && (
          <div style={{
            background: "#fef9c3", border: "1px solid #fbbf24", borderRadius: "10px",
            padding: "0.7rem 1rem", fontSize: "0.82rem", color: "#92400e",
            marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem",
          }}>
            🔒 Dokumen baru dapat diunggah setelah pembayaran DP pertama diverifikasi oleh admin.
          </div>
        )}

        <div className="section-title" style={{ marginBottom: "0.5rem" }}>Jenis Dokumen</div>
        <div className="dokumen-type-selector">
          {DOK_TYPES.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`dok-type-btn ${selectedType === t.key ? "selected" : ""}`}
              onClick={() => setSelectedType(t.key)}
              disabled={!dpDiterima}
            >
              {t.icon} {t.label}
              {t.wajib && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
            </button>
          ))}
        </div>

        <div className="dokumen-drop-area" style={!dpDiterima ? { pointerEvents: "none", opacity: 0.5 } : {}}>
          <input type="file" accept="image/*,.pdf" onChange={handleFileChange} ref={fileRef} disabled={!dpDiterima} />
          {file ? (
            <div className="dokumen-file-selected">📎 {file.name}</div>
          ) : (
            <>
              <div className="dokumen-drop-icon">📁</div>
              <div className="dokumen-drop-text">Klik untuk pilih file (JPG, PNG, PDF)</div>
            </>
          )}
        </div>

        {uploadError && <div className="portal-error" style={{ marginBottom: "0.875rem" }}>{uploadError}</div>}
        {uploadSuccess && <div className="portal-success-msg" style={{ marginBottom: "0.875rem" }}>✓ {uploadSuccess}</div>}

        <button
          className="dokumen-submit-btn"
          onClick={handleUpload}
          disabled={uploading || !file || !dpDiterima}
          style={!dpDiterima ? { opacity: 0.6, cursor: "not-allowed" } : {}}
        >
          {uploading ? <><div className="mini-spin" />Mengupload...</> : <>📤 Upload Dokumen</>}
        </button>
      </div>

      {/* Daftar dokumen */}
      <div>
        <div className="section-title">
          <span>📂</span> Dokumen Diupload ({dokumenList.length})
        </div>
        {dokumenList.length === 0 ? (
          <div className="portal-empty">
            <div className="portal-empty-icon">📁</div>
            <p>Belum ada dokumen diupload.</p>
          </div>
        ) : (
          <div className="dokumen-riwayat">
            {dokumenList.map((d) => (
              <div className="dokumen-item" key={d.id}>
                <div className="dokumen-item-left">
                  <div className="dokumen-icon">{getDokIcon(d.jenis)}</div>
                  <div>
                    <div className="dokumen-jenis">{d.jenis}</div>
                    <div className="dokumen-tanggal">{fmtDate(d.uploaded_at)}</div>
                  </div>
                </div>
                <span className={`dokumen-status ds-${d.status?.toLowerCase()}`}>
                  {d.status === "pending" ? "Menunggu" :
                    d.status === "diterima" ? "✓ Diterima" : "✕ Ditolak"}
                </span>
                {d.file && (
                  <a href={d.file} target="_blank" rel="noreferrer" className="dokumen-view-link">
                    👁 Lihat
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main Portal Component ─────────────────────────────────────────────────────

type Step = "input-nomor" | "input-otp" | "dashboard";
type TabType = "pembayaran" | "dokumen";

const Portal = () => {
  const [searchParams] = useSearchParams();
  const urlNomor = searchParams.get("nomor") ?? "";

  // ── Auth State ──
  const [step, setStep] = useState<Step>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { token, nomor } = JSON.parse(saved);
        // Jika nomor dari URL berbeda, paksa ulang login
        if (token && nomor && (!urlNomor || urlNomor === nomor)) return "dashboard";
      } catch { /* ignore */ }
    }
    return "input-nomor";
  });

  const [nomor, setNomor] = useState(() => {
    // Pre-fill dari URL params atau dari localStorage
    if (urlNomor) return urlNomor;
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}").nomor ?? ""; } catch { return ""; }
  });
  const [token, setToken] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}").token ?? ""; } catch { return ""; }
  });
  const [dashData, setDashData] = useState<DashboardData | null>(null);

  const [otpInput, setOtpInput] = useState("");
  const [loadingOtp, setLoadingOtp] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>("pembayaran");
  const [loadingDash, setLoadingDash] = useState(false);

  // ── Countdown for resend ──
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // ── Fetch dashboard info ──
  const fetchDashboard = useCallback(async (t: string) => {
    setLoadingDash(true);
    try {
      // GET /customer/pembayaran untuk ambil info paket via pendaftaran
      const [dashRes, bayarRes, dokRes] = await Promise.all([
  axios.get(`${API}/customer/dashboard`, {
    headers: { Authorization: `Bearer ${t}` },
  }),

  axios.get(`${API}/customer/pembayaran`, {
    headers: { Authorization: `Bearer ${t}` },
  }),

  axios.get(`${API}/customer/dokumen`, {
    headers: { Authorization: `Bearer ${t}` },
  }),
]);
      // Ambil info pendaftaran dari response pembayaran (paket harga)
      // Karena tidak ada endpoint GET /customer/profile, kita cek dari localStorage nomor
      const savedStr = localStorage.getItem(STORAGE_KEY);
      const saved = savedStr ? JSON.parse(savedStr) : {};

      setDashData(dashRes.data);
    } catch {
      // jika error 401, session expired
    } finally {
      setLoadingDash(false);
    }
  }, []);

  useEffect(() => {
    if (step === "dashboard" && token) {
      fetchDashboard(token);
    }
  }, [step, token, fetchDashboard]);

  // ── Step 1: Request OTP ──
  const handleRequestOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!nomor.trim()) { setError("Nomor pendaftaran wajib diisi."); return; }
    try {
      setLoadingOtp(true);
      await axios.post(`${API}/otp/request`, { nomor: nomor.trim() });
      setOtpSent(true);
      setStep("input-otp");
      setCountdown(60);
    } catch (err: unknown) {
      setError(axios.isAxiosError(err) ? (err.response?.data?.error ?? "Gagal mengirim OTP.") : "Gagal mengirim OTP.");
    } finally {
      setLoadingOtp(false);
    }
  };

  // ── Resend OTP ──
  const handleResend = async () => {
    if (countdown > 0) return;
    setError("");
    try {
      setLoadingOtp(true);
      await axios.post(`${API}/otp/request`, { nomor: nomor.trim() });
      setCountdown(60);
      setOtpInput("");
    } catch (err: unknown) {
      setError(axios.isAxiosError(err) ? (err.response?.data?.error ?? "Gagal mengirim ulang.") : "Gagal mengirim ulang.");
    } finally {
      setLoadingOtp(false);
    }
  };

    // ── Step 2: Verify OTP ──
    const handleVerifyOtp = async (e: FormEvent) => {
      e.preventDefault();
      setError("");
      if (otpInput.length !== 6) { setError("Masukkan 6 digit OTP."); return; }
      try {
        setLoadingVerify(true);
        const res = await axios.post(`${API}/otp/verify`, { nomor: nomor.trim(), otp: otpInput });
        const newToken = res.data.token;

        // Simpan ke localStorage
        const session = {
          token: newToken,
          nomor: nomor.trim(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        setToken(newToken);
        setStep("dashboard");
      } catch (err: unknown) {
        setError(axios.isAxiosError(err) ? (err.response?.data?.error ?? "OTP salah atau expired.") : "Verifikasi gagal.");
      } finally {
        setLoadingVerify(false);
      }
    };

    const handleLogout = () => {
      localStorage.removeItem(STORAGE_KEY);
      setToken("");
      setNomor("");
      setOtpInput("");
      setStep("input-nomor");
      setDashData(null);
      setError("");
      setOtpSent(false);
    };

  // ── Render: Input Nomor ──────────────────────────────────────────────────────

  if (step === "input-nomor") {
    return (
      <div className="portal-page">
        <div className="portal-container">
          <div className="portal-hero">
            <div className="portal-hero-icon">🕌</div>
            <h1>Portal Jamaah</h1>
            <p>Masukkan nomor pendaftaran Anda untuk melakukan pembayaran dan mengunggah dokumen.</p>
          </div>

          <div className="portal-card">
            <div className="portal-login">
              <div className="portal-login-title">Masuk ke Portal</div>
              <div className="portal-login-sub">
                Nomor pendaftaran dikirimkan ke WhatsApp/email Anda setelah mendaftar.
                Format: <strong>UMR-20260101XXXXXX</strong>
              </div>

              {error && <div className="portal-error">{error}</div>}

              <form onSubmit={handleRequestOtp} noValidate>
                <div className="portal-form-field">
                  <label className="portal-label" htmlFor="nomor-daftar">Nomor Pendaftaran</label>
                  <input
                    id="nomor-daftar"
                    className="portal-input"
                    type="text"
                    placeholder="UMR-20260101000000"
                    value={nomor}
                    onChange={(e) => setNomor(e.target.value.toUpperCase())}
                    disabled={loadingOtp}
                    style={{ textTransform: "uppercase" }}
                  />
                </div>
                <button type="submit" className="portal-btn-primary" disabled={loadingOtp || !nomor.trim()}>
                  {loadingOtp ? <><div className="mini-spin" />Mengirim OTP...</> : <>Kirim OTP ke Email →</>}
                </button>
              </form>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.82rem", color: "#94a3b8" }}>
            Belum punya nomor pendaftaran?{" "}
            <a href="/daftar" style={{ color: "#4f46e5", fontWeight: 600, textDecoration: "none" }}>
              Daftar sekarang →
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Input OTP ───────────────────────────────────────────────────────

  if (step === "input-otp") {
    return (
      <div className="portal-page">
        <div className="portal-container">
          <div className="portal-hero">
            <div className="portal-hero-icon">📨</div>
            <h1>Verifikasi OTP</h1>
            <p>OTP 6 digit telah dikirimkan ke email yang Anda daftarkan.</p>
          </div>

          <div className="portal-card">
            <div className="portal-login">
              <div className="portal-login-title">Masukkan Kode OTP</div>
              <div className="portal-login-sub">
                {otpSent && (
                  <>OTP dikirim ke email yang terdaftar pada nomor <strong>{nomor}</strong>. Berlaku 5 menit.</>
                )}
              </div>

              {error && <div className="portal-error">{error}</div>}

              <form onSubmit={handleVerifyOtp} noValidate>
                <div className="portal-form-field">
                  <label className="portal-label">Kode OTP (6 digit)</label>
                  <div className="otp-input-wrap">
                    <input
                      className="portal-input"
                      type="text"
                      maxLength={6}
                      placeholder="000000"
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      disabled={loadingVerify}
                      inputMode="numeric"
                      autoFocus
                    />
                  </div>
                  <div className="otp-resend">
                    Tidak menerima email?{" "}
                    <button type="button" onClick={handleResend} disabled={countdown > 0 || loadingOtp}>
                      {countdown > 0 ? `Kirim ulang (${countdown}s)` : "Kirim ulang"}
                    </button>
                  </div>
                </div>
                <button type="submit" className="portal-btn-primary" disabled={loadingVerify || otpInput.length !== 6}>
                  {loadingVerify ? <><div className="mini-spin" />Memverifikasi...</> : <>✓ Verifikasi & Masuk</>}
                </button>
              </form>

              <button className="portal-btn-outline" onClick={() => { setStep("input-nomor"); setError(""); setOtpInput(""); }}>
                ← Ganti Nomor Pendaftaran
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Dashboard ───────────────────────────────────────────────────────

  const savedStr = localStorage.getItem(STORAGE_KEY);
  const saved = savedStr ? JSON.parse(savedStr) : {};
  const harga = dashData?.harga ?? 0;
  const paymentStatus = dashData?.payment_status ?? "belum";
  const documentStatus = dashData?.document_status ?? "belum";
  const displayNama = dashData?.nama ?? "Jamaah";

  // Hitung jumlah pending pembayaran (untuk badge tab)
  const pendingPaymentCount = 0; // fetched di child component

  console.log("saved =", saved);
  console.log("dashData =", dashData);
  console.log("harga =", harga);

  return (
    <div className="portal-page">
      <div className="portal-container">
        <div className="portal-hero" style={{ marginBottom: "1.5rem" }}>
          <div className="portal-hero-icon">🕌</div>
          <h1>Portal Jamaah</h1>
        </div>

        <div className="portal-card">
          {/* Dashboard Header */}
          <div className="portal-dash-header portal-header-relative">
            <button className="portal-dash-logout" onClick={handleLogout}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Keluar
            </button>
            <div className="portal-dash-greeting">Selamat datang,</div>
            <div className="portal-dash-name">{displayNama}</div>
            <div className="portal-dash-nomor">📋 {nomor}</div>
          </div>

          {/* Status bar */}
          {!loadingDash && (
            <div style={{ padding: "1rem 1.75rem", borderBottom: "1px solid #f1f5f9" }}>
              <div className="portal-status-bar">
                <div className="portal-status-item">
                  <div className="portal-status-label">Status Pembayaran</div>
                  <div className={`portal-status-val ${getStatusClass(paymentStatus)}`}>
                    {getStatusLabel(paymentStatus)}
                  </div>
                </div>
                <div className="portal-status-item">
                  <div className="portal-status-label">Status Dokumen</div>
                  <div className={`portal-status-val ${getStatusClass(documentStatus)}`}>
                    {getStatusLabel(documentStatus)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="portal-tabs">
            <button
              className={`portal-tab ${activeTab === "pembayaran" ? "active" : ""}`}
              onClick={() => setActiveTab("pembayaran")}
            >
              💳 Pembayaran
            </button>
            <button
              className={`portal-tab ${activeTab === "dokumen" ? "active" : ""}`}
              onClick={() => setActiveTab("dokumen")}
            >
              📂 Dokumen
            </button>
          </div>

          {/* Tab Content */}
          <div className="portal-tab-content">
            {loadingDash ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>
                <div className="mini-spin-dark" style={{ margin: "0 auto 0.75rem" }} />
                Memuat data...
              </div>
            ) : activeTab === "pembayaran" ? (
              <TabPembayaran
                token={token}
                harga={harga}
                paymentStatus={paymentStatus}
                documentStatus={documentStatus}
              />
            ) : (
              <TabDokumen token={token} />
            )}
          </div>
        </div>

        {/* Info waiting */}
        {!loadingDash && paymentStatus === "lunas" && documentStatus === "lengkap" && (
          <div className="portal-waiting-card" style={{ marginTop: "1.5rem" }}>
            <div className="portal-waiting-icon">⏳</div>
            <div className="portal-waiting-title">Sedang dalam Proses Verifikasi</div>
            <div className="portal-waiting-sub">
              Pembayaran dan dokumen Anda sudah lengkap. Tim kami sedang memverifikasi berkas Anda.
              Kami akan menghubungi Anda jika ada informasi lebih lanjut.
            </div>
          </div>
        )}
      </div>

      {/* Unused variable suppressor */}
      {pendingPaymentCount > 0 && null}
    </div>
  );
};

export default Portal;
