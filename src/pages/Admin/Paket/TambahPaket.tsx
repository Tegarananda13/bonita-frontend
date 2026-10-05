import { useState, useRef, useEffect, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../../context/AuthContext";
import "./TambahPaket.css";

// ── Types ────────────────────────────────────────────────────────────────────
interface PaketFormData {
  nama_paket: string;
  jenis_paket: string;
  harga: string;
  durasi: string;
  tanggal_berangkat: string;
  deskripsi: string;
  kuota_max: string;
  batas_pendaftaran: string;
}

interface NewFoto {
  file: File;
  preview: string;
  isUtama: boolean;
}

interface DraftFasilitasFoto {
  file: File;
  preview: string;
}

interface DraftFasilitas {
  nama: string;
  deskripsi: string;
  fotos: DraftFasilitasFoto[];
}

const JENIS_PAKET_OPTIONS = [
  "Reguler",
  "Exclusive",
  "Plus Turki",
  "Plus Dubai",
  "Ramadhan",
  "Syawal",
];

const EMPTY_FORM: PaketFormData = {
  nama_paket: "",
  jenis_paket: "",
  harga: "",
  durasi: "",
  tanggal_berangkat: "",
  deskripsi: "",
  kuota_max: "",
  batas_pendaftaran: "",
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
const FALLBACK_IMG = "https://images.unsplash.com/photo-1564769625905-50e93615e769?w=600&q=80";

const fmtRupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");
const fmtDate = (d: string) => {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
};

const TambahPaket = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  // Form State
  const [form, setForm] = useState<PaketFormData>(EMPTY_FORM);
  const [newFotos, setNewFotos] = useState<NewFoto[]>([]);
  const [fasilitasInput, setFasilitasInput] = useState<DraftFasilitas[]>([]);

  // Draft Fasilitas State (untuk penambahan 1 fasilitas)
  const [fasNama, setFasNama] = useState("");
  const [fasDeskripsi, setFasDeskripsi] = useState("");
  const [fasDraftFotos, setFasDraftFotos] = useState<DraftFasilitasFoto[]>([]);
  const [fasError, setFasError] = useState("");

  // UI / Status State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fotoError, setFotoError] = useState("");
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  // Refs
  const multiFotoRef = useRef<HTMLInputElement>(null);
  const fasDraftFotoInputRef = useRef<HTMLInputElement>(null);

  // Check if form is dirty (has user input)
  const isDirty =
    Boolean(form.nama_paket.trim()) ||
    Boolean(form.jenis_paket) ||
    Boolean(form.harga) ||
    Boolean(form.durasi) ||
    Boolean(form.tanggal_berangkat) ||
    Boolean(form.deskripsi.trim()) ||
    Boolean(form.kuota_max) ||
    Boolean(form.batas_pendaftaran) ||
    newFotos.length > 0 ||
    fasilitasInput.length > 0 ||
    Boolean(fasNama.trim()) ||
    fasDraftFotos.length > 0;

  // Window beforeunload prompt if dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && !submitting) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, submitting]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      newFotos.forEach((nf) => {
        if (nf.preview) URL.revokeObjectURL(nf.preview);
      });
      fasDraftFotos.forEach((df) => {
        if (df.preview) URL.revokeObjectURL(df.preview);
      });
      fasilitasInput.forEach((fi) => {
        fi.fotos.forEach((df) => {
          if (df.preview) URL.revokeObjectURL(df.preview);
        });
      });
    };
  }, []); // eslint-disable-line

  // Handle Form Change
  const handleField = (k: keyof PaketFormData) => (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [k]: e.target.value }));
  };

  // Back / Cancel Navigation with Dirty Check
  const handleBackOrCancel = () => {
    if (isDirty) {
      setConfirmModalOpen(true);
    } else {
      navigate("/admin/paket");
    }
  };

  // ── Multi Foto Paket Handlers ───────────────────────────────────────────────
  const handleAddFotos = (e: ChangeEvent<HTMLInputElement>) => {
    setFotoError("");
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const validNewFotos: NewFoto[] = [];
    const errorNames: string[] = [];

    files.forEach((file) => {
      if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp)$/i)) {
        errorNames.push(`${file.name} (Format tidak didukung)`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        errorNames.push(`${file.name} (Ukuran melebihi 5 MB)`);
        return;
      }
      validNewFotos.push({
        file,
        preview: URL.createObjectURL(file),
        isUtama: false,
      });
    });

    if (errorNames.length > 0) {
      setFotoError(`Beberapa file gagal diunggah: ${errorNames.join(", ")}`);
    }

    if (validNewFotos.length > 0) {
      setNewFotos((prev) => {
        const wasEmpty = prev.length === 0;
        if (wasEmpty && validNewFotos.length > 0) {
          validNewFotos[0].isUtama = true;
        }
        return [...prev, ...validNewFotos];
      });
    }

    if (multiFotoRef.current) multiFotoRef.current.value = "";
  };

  const removeNewFoto = (idx: number) => {
    setNewFotos((prev) => {
      const target = prev[idx];
      if (target?.preview) {
        URL.revokeObjectURL(target.preview);
      }
      const updated = prev.filter((_, i) => i !== idx);
      if (target?.isUtama && updated.length > 0) {
        updated[0].isUtama = true;
      }
      return updated;
    });
  };

  const setNewFotoUtama = (idx: number) => {
    setNewFotos((prev) =>
      prev.map((f, i) => ({
        ...f,
        isUtama: i === idx,
      }))
    );
  };

  // ── Fasilitas Handlers ───────────────────────────────────────────────────────
  const handleAddFasDraftFotos = (e: ChangeEvent<HTMLInputElement>) => {
    setFasError("");
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const validDraft: DraftFasilitasFoto[] = [];
    files.forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        setFasError(`Foto fasilitas "${file.name}" melebihi ukuran 5 MB.`);
        return;
      }
      validDraft.push({
        file,
        preview: URL.createObjectURL(file),
      });
    });

    setFasDraftFotos((prev) => [...prev, ...validDraft]);
    if (fasDraftFotoInputRef.current) fasDraftFotoInputRef.current.value = "";
  };

  const handleRemoveFasDraftFoto = (idx: number) => {
    setFasDraftFotos((prev) => {
      const target = prev[idx];
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleConfirmAddFasilitas = () => {
    if (!fasNama.trim()) {
      setFasError("Nama fasilitas wajib diisi.");
      return;
    }
    setFasError("");

    setFasilitasInput((prev) => [
      ...prev,
      {
        nama: fasNama.trim(),
        deskripsi: fasDeskripsi.trim(),
        fotos: fasDraftFotos,
      },
    ]);

    // Reset draft fields
    setFasNama("");
    setFasDeskripsi("");
    setFasDraftFotos([]);
  };

  const handleRemoveFasilitas = (idx: number) => {
    setFasilitasInput((prev) => {
      const target = prev[idx];
      if (target?.fotos) {
        target.fotos.forEach((df) => {
          if (df.preview) URL.revokeObjectURL(df.preview);
        });
      }
      return prev.filter((_, i) => i !== idx);
    });
  };

  // ── Submit Logic ─────────────────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    // Validasi Field
    if (!form.nama_paket.trim()) {
      setError("Nama paket wajib diisi.");
      return;
    }
    if (!form.jenis_paket) {
      setError("Jenis paket wajib dipilih.");
      return;
    }
    const hargaNum = Number(form.harga);
    if (!form.harga || isNaN(hargaNum) || hargaNum <= 0) {
      setError("Harga paket harus berupa angka lebih dari 0.");
      return;
    }
    const durasiNum = Number(form.durasi);
    if (!form.durasi || isNaN(durasiNum) || durasiNum <= 0) {
      setError("Durasi paket harus berupa angka lebih dari 0.");
      return;
    }
    if (!form.tanggal_berangkat) {
      setError("Tanggal keberangkatan wajib diisi.");
      return;
    }
    const kuotaNum = Number(form.kuota_max);
    if (!form.kuota_max || isNaN(kuotaNum) || kuotaNum <= 0) {
      setError("Kuota maksimal harus berupa angka lebih dari 0.");
      return;
    }

    const fd = new FormData();
    fd.append("nama_paket", form.nama_paket.trim());
    fd.append("jenis_paket", form.jenis_paket);
    fd.append("harga", form.harga);
    fd.append("durasi", form.durasi);
    fd.append("tanggal_berangkat", new Date(form.tanggal_berangkat).toISOString());
    fd.append("deskripsi", form.deskripsi.trim());
    fd.append("kuota_max", form.kuota_max);
    fd.append("batas_pendaftaran", form.batas_pendaftaran || "0");

    const authHeaders = {
      Authorization: `Bearer ${token}`,
    };
    const multipartHeaders = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    };

    try {
      setSubmitting(true);

      // 1. Buat Paket
      const createRes = await axios.post("http://localhost:8080/admin/paket", fd, {
        headers: multipartHeaders,
      });
      const newPaketId =
        createRes.data?.data?.id ?? createRes.data?.paket?.ID ?? createRes.data?.id;

      if (!newPaketId) {
        throw new Error("Gagal mendapatkan ID paket baru.");
      }

      // 2. Upload Semua Foto Paket
      if (newFotos.length > 0) {
        for (const nf of newFotos) {
          const fotoFd = new FormData();
          fotoFd.append("foto", nf.file);
          const upRes = await axios.post(
            `http://localhost:8080/admin/paket/${newPaketId}/foto`,
            fotoFd,
            { headers: multipartHeaders }
          );
          if (nf.preview) URL.revokeObjectURL(nf.preview);

          const uploadedId = upRes.data?.data?.id;
          if (nf.isUtama && uploadedId) {
            await axios.patch(
              `http://localhost:8080/admin/foto-paket/${uploadedId}/utama`,
              {},
              { headers: authHeaders }
            );
          }
        }
      }

      // 3. Simpan Semua Fasilitas & Upload Foto Fasilitas
      if (fasilitasInput.length > 0) {
        for (const fas of fasilitasInput) {
          const fasRes = await axios.post(
            `http://localhost:8080/admin/paket/${newPaketId}/fasilitas`,
            { nama_fasilitas: fas.nama, deskripsi: fas.deskripsi },
            { headers: authHeaders }
          );
          const createdFasId = fasRes.data?.data?.id || fasRes.data?.data?.ID;

          if (createdFasId && fas.fotos?.length > 0) {
            for (const df of fas.fotos) {
              try {
                const ffd = new FormData();
                ffd.append("foto", df.file);
                await axios.post(
                  `http://localhost:8080/admin/fasilitas/${createdFasId}/foto`,
                  ffd,
                  { headers: multipartHeaders }
                );
              } catch (err) {
                console.error("Gagal upload foto fasilitas:", err);
              } finally {
                if (df.preview) URL.revokeObjectURL(df.preview);
              }
            }
          }
        }
      }

      // Selesai -> arahkan kembali ke daftar paket
      navigate("/admin/paket");
    } catch (err: unknown) {
      console.error("Error creating paket:", err);
      setError(
        axios.isAxiosError(err)
          ? err.response?.data?.error ?? "Gagal menyimpan paket umroh baru."
          : "Gagal menyimpan paket umroh baru."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Preview Cover Image
  const coverFoto = newFotos.find((f) => f.isUtama) || newFotos[0];

  return (
    <div className="tambah-paket-page">
      {/* ── Header ── */}
      <div className="page-header">
        <div className="page-header-left">
          <button type="button" className="tj-back-btn" onClick={handleBackOrCancel}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Kembali
          </button>
          <h2>Tambah Paket Baru</h2>
          <p>Lengkapi formulir di bawah ini untuk menambahkan dan menerbitkan paket umroh baru.</p>
        </div>
      </div>

      <div className="tp-layout">
        {/* ── Form Utama ── */}
        <form className="tp-form-area" onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="tp-alert tp-alert-error">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Section A: Informasi Paket */}
          <div className="tp-card">
            <div className="tp-card-header">
              <div className="tp-card-title">
                <span className="tp-card-icon">🕌</span>
                <span>Informasi Paket</span>
              </div>
            </div>
            <div className="tp-card-subtitle">
              Tentukan nama, klasifikasi jenis paket, harga, jadwal keberangkatan, dan kapasitas kuota.
            </div>

            <div className="tp-field-grid">
              {/* Nama Paket */}
              <div className="tp-field full">
                <label className="tp-label" htmlFor="tp-nama">
                  Nama Paket <span className="tp-required">*</span>
                </label>
                <input
                  id="tp-nama"
                  type="text"
                  className="tp-input"
                  placeholder="cth. Umroh Reguler Syawal 1447H"
                  value={form.nama_paket}
                  onChange={handleField("nama_paket")}
                  disabled={submitting}
                  autoFocus
                />
              </div>

              {/* Jenis Paket */}
              <div className="tp-field">
                <label className="tp-label" htmlFor="tp-jenis">
                  Jenis Paket <span className="tp-required">*</span>
                </label>
                <select
                  id="tp-jenis"
                  className="tp-select"
                  value={form.jenis_paket}
                  onChange={handleField("jenis_paket")}
                  disabled={submitting}
                >
                  <option value="">-- Pilih Jenis Paket --</option>
                  {JENIS_PAKET_OPTIONS.map((j) => (
                    <option key={j} value={j}>
                      {j}
                    </option>
                  ))}
                </select>
              </div>

              {/* Harga */}
              <div className="tp-field">
                <label className="tp-label" htmlFor="tp-harga">
                  Harga per Orang <span className="tp-required">*</span>
                </label>
                <div className="tp-input-group">
                  <span className="tp-input-prefix">Rp</span>
                  <input
                    id="tp-harga"
                    type="number"
                    min={0}
                    className="tp-input with-prefix"
                    placeholder="28000000"
                    value={form.harga}
                    onChange={handleField("harga")}
                    disabled={submitting}
                  />
                </div>
                {Boolean(form.harga) && !isNaN(Number(form.harga)) && (
                  <div className="tp-field-hint">
                    Format: <strong>{fmtRupiah(Number(form.harga))}</strong> / orang
                  </div>
                )}
              </div>

              {/* Durasi */}
              <div className="tp-field">
                <label className="tp-label" htmlFor="tp-durasi">
                  Durasi Perjalanan <span className="tp-required">*</span>
                </label>
                <div className="tp-input-group">
                  <input
                    id="tp-durasi"
                    type="number"
                    min={1}
                    className="tp-input with-suffix"
                    placeholder="12"
                    value={form.durasi}
                    onChange={handleField("durasi")}
                    disabled={submitting}
                  />
                  <span className="tp-input-suffix">Hari</span>
                </div>
              </div>

              {/* Tanggal Berangkat */}
              <div className="tp-field">
                <label className="tp-label" htmlFor="tp-tgl">
                  Tanggal & Jam Keberangkatan <span className="tp-required">*</span>
                </label>
                <input
                  id="tp-tgl"
                  type="datetime-local"
                  className="tp-input"
                  value={form.tanggal_berangkat}
                  onChange={handleField("tanggal_berangkat")}
                  disabled={submitting}
                />
              </div>

              {/* Kuota Maksimal */}
              <div className="tp-field">
                <label className="tp-label" htmlFor="tp-kuota">
                  Kuota Maksimal <span className="tp-required">*</span>
                </label>
                <div className="tp-input-group">
                  <input
                    id="tp-kuota"
                    type="number"
                    min={1}
                    className="tp-input with-suffix"
                    placeholder="45"
                    value={form.kuota_max}
                    onChange={handleField("kuota_max")}
                    disabled={submitting}
                  />
                  <span className="tp-input-suffix">Jamaah</span>
                </div>
              </div>

              {/* Batas Pendaftaran */}
              <div className="tp-field">
                <label className="tp-label" htmlFor="tp-batas">
                  Batas Pendaftaran
                </label>
                <div className="tp-input-group">
                  <input
                    id="tp-batas"
                    type="number"
                    min={0}
                    className="tp-input with-suffix"
                    placeholder="30"
                    value={form.batas_pendaftaran}
                    onChange={handleField("batas_pendaftaran")}
                    disabled={submitting}
                  />
                  <span className="tp-input-suffix">Hari sebelum</span>
                </div>
                <div className="tp-field-hint">Pendaftaran ditutup H-x sebelum keberangkatan</div>
              </div>

              {/* Deskripsi */}
              <div className="tp-field full">
                <label className="tp-label" htmlFor="tp-deskripsi">
                  Deskripsi Paket
                </label>
                <textarea
                  id="tp-deskripsi"
                  className="tp-input tp-textarea"
                  rows={4}
                  placeholder="Tuliskan gambaran ringkas, rute ziarah, atau keunggulan khusus dari paket umroh ini..."
                  value={form.deskripsi}
                  onChange={handleField("deskripsi")}
                  disabled={submitting}
                />
              </div>
            </div>
          </div>

          {/* Section B: Foto Paket */}
          <div className="tp-card">
            <div className="tp-card-header">
              <div className="tp-card-title">
                <span className="tp-card-icon">📸</span>
                <span>Foto & Dokumentasi Paket</span>
              </div>
              <span style={{ fontSize: "0.775rem", color: "#64748b", fontWeight: 600 }}>
                {newFotos.length} Foto Dipilih
              </span>
            </div>
            <div className="tp-card-subtitle">
              Unggah beberapa foto dokumentasi paket. Foto pertama otomatis menjadi cover utama, atau klik tombol bintang untuk mengubah cover utama.
            </div>

            {fotoError && (
              <div className="tp-alert tp-alert-error" style={{ fontSize: "0.8rem", padding: "0.6rem 0.85rem" }}>
                <span>{fotoError}</span>
              </div>
            )}

            {/* Dropzone Trigger */}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/jpg"
              multiple
              ref={multiFotoRef}
              onChange={handleAddFotos}
              style={{ display: "none" }}
              id="tp-file-input"
              disabled={submitting}
            />
            <label htmlFor="tp-file-input" className="tp-dropzone">
              <div className="tp-dropzone-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <div className="tp-dropzone-title">
                <span>Klik untuk mengunggah</span> atau seret foto ke area ini
              </div>
              <div className="tp-dropzone-sub">
                Mendukung format JPG, PNG, WEBP — Maksimal 5 MB per file
              </div>
            </label>

            {/* Preview Grid */}
            {newFotos.length > 0 && (
              <div className="tp-foto-grid">
                {newFotos.map((nf, idx) => (
                  <div key={idx} className={`tp-foto-card ${nf.isUtama ? "is-utama" : ""}`}>
                    <img src={nf.preview} alt={`Foto paket ${idx + 1}`} />
                    {nf.isUtama && (
                      <span className="tp-foto-badge-utama">
                        ★ Cover Utama
                      </span>
                    )}
                    <div className="tp-foto-actions">
                      {!nf.isUtama ? (
                        <button
                          type="button"
                          className="tp-foto-btn btn-star"
                          onClick={() => setNewFotoUtama(idx)}
                          title="Jadikan Foto Utama"
                          disabled={submitting}
                        >
                          ★ Jadikan Utama
                        </button>
                      ) : <span />}
                      <button
                        type="button"
                        className="tp-foto-btn btn-del"
                        onClick={() => removeNewFoto(idx)}
                        title="Hapus Foto"
                        disabled={submitting}
                      >
                        🗑 Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section C: Fasilitas Paket */}
          <div className="tp-card">
            <div className="tp-card-header">
              <div className="tp-card-title">
                <span className="tp-card-icon">✨</span>
                <span>Fasilitas Paket</span>
              </div>
              <span style={{ fontSize: "0.775rem", color: "#64748b", fontWeight: 600 }}>
                {fasilitasInput.length} Fasilitas Ditambahkan
              </span>
            </div>
            <div className="tp-card-subtitle">
              Sediakan informasi fasilitas yang didapatkan jamaah, seperti akomodasi hotel, tiket penerbangan, konsumsi, dan armada bus.
            </div>

            {/* List Added Facilities */}
            {fasilitasInput.length === 0 ? (
              <div className="tp-empty-fasilitas">
                <div className="tp-empty-icon">🧳</div>
                <div className="tp-empty-title">Belum Ada Fasilitas Ditambahkan</div>
                <div className="tp-empty-desc">
                  Tambahkan fasilitas seperti Hotel Bintang 5 di Makkah & Madinah, Tiket Pesawat Saudia PP, atau Bus AC Executive agar informasi paket lebih menarik dan lengkap bagi calon jamaah.
                </div>
              </div>
            ) : (
              <div className="tp-fasilitas-list">
                {fasilitasInput.map((f, i) => (
                  <div key={i} className="tp-fas-card">
                    <div className="tp-fas-header">
                      <div className="tp-fas-title-wrap">
                        <div className="tp-fas-num-badge">{i + 1}</div>
                        <div>
                          <div className="tp-fas-nama">{f.nama}</div>
                          {f.deskripsi && <div className="tp-fas-deskripsi">{f.deskripsi}</div>}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="tp-fas-remove-btn"
                        onClick={() => handleRemoveFasilitas(i)}
                        disabled={submitting}
                        title="Hapus fasilitas ini"
                      >
                        🗑 Hapus
                      </button>
                    </div>

                    {/* Foto Fasilitas */}
                    {f.fotos && f.fotos.length > 0 && (
                      <div className="tp-fas-foto-strip">
                        {f.fotos.map((df, pIdx) => (
                          <div key={pIdx} className="tp-fas-foto-thumb">
                            <img src={df.preview} alt={`Foto fasilitas ${pIdx + 1}`} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Box Form Tambah Fasilitas */}
            <div className="tp-add-fas-box">
              <div className="tp-add-fas-box-title">
                <span>➕</span> Tambah Fasilitas Baru
              </div>

              <div className="tp-add-fas-inputs">
                <div className="tp-field">
                  <label className="tp-label">
                    Nama Fasilitas <span className="tp-required">*</span>
                  </label>
                  <input
                    type="text"
                    className="tp-input"
                    placeholder="cth. Hotel Pullman Zamzam Makkah"
                    value={fasNama}
                    onChange={(e) => setFasNama(e.target.value)}
                    disabled={submitting}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleConfirmAddFasilitas();
                      }
                    }}
                  />
                </div>

                <div className="tp-field">
                  <label className="tp-label">Keterangan Singkat (Opsional)</label>
                  <input
                    type="text"
                    className="tp-input"
                    placeholder="cth. Bintang 5, Jarak 50 meter ke Masjidil Haram"
                    value={fasDeskripsi}
                    onChange={(e) => setFasDeskripsi(e.target.value)}
                    disabled={submitting}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleConfirmAddFasilitas();
                      }
                    }}
                  />
                </div>
              </div>

              {/* Foto Fasilitas Draft */}
              <div className="tp-draft-fas-fotos">
                {fasDraftFotos.map((df, idx) => (
                  <div key={idx} className="tp-draft-foto-thumb">
                    <img src={df.preview} alt="Draft foto" />
                    <button
                      type="button"
                      className="tp-draft-foto-del"
                      onClick={() => handleRemoveFasDraftFoto(idx)}
                      disabled={submitting}
                    >
                      ✕
                    </button>
                  </div>
                ))}

                <label className="tp-btn-add-fas-foto">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    multiple
                    style={{ display: "none" }}
                    ref={fasDraftFotoInputRef}
                    onChange={handleAddFasDraftFotos}
                    disabled={submitting}
                  />
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  {fasDraftFotos.length > 0
                    ? `+ Tambah Foto (${fasDraftFotos.length})`
                    : "+ Foto Fasilitas"}
                </label>
              </div>

              {fasError && (
                <div style={{ fontSize: "0.8rem", color: "#dc2626" }}>❌ {fasError}</div>
              )}

              <button
                type="button"
                className="tp-btn-confirm-fas"
                onClick={handleConfirmAddFasilitas}
                disabled={submitting}
              >
                + Tambahkan ke Daftar Fasilitas
              </button>
            </div>
          </div>

          {/* Sticky Action Footer */}
          <div className="tp-sticky-footer">
            <div className="tp-footer-info">
              {isDirty ? (
                <span>⚠️ Ada perubahan belum disimpan</span>
              ) : (
                <span>Formulir siap diisi</span>
              )}
            </div>
            <div className="tp-footer-actions">
              <button
                type="button"
                className="tp-btn-cancel"
                onClick={handleBackOrCancel}
                disabled={submitting}
              >
                Batal
              </button>
              <button type="submit" className="tp-btn-submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <div className="tp-spinner" />
                    <span>Menyimpan Paket...</span>
                  </>
                ) : (
                  <>
                    <span>✅ Simpan & Terbitkan Paket</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* ── Sidebar: Live Preview & Guidance ── */}
        <div className="tp-sidebar">
          {/* Live Preview Card */}
          <div className="tp-preview-card">
            <div className="tp-preview-header">
              <span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                Preview Kartu
              </span>
              <span className="tp-preview-badge-live">Live</span>
            </div>
            <div className="tp-preview-image-wrap">
              <img
                src={coverFoto ? coverFoto.preview : FALLBACK_IMG}
                alt="Preview Paket"
              />
              <span className="tp-preview-tag">
                {form.jenis_paket || "Jenis Paket"}
              </span>
            </div>
            <div className="tp-preview-body">
              <div className="tp-preview-name">
                {form.nama_paket || "Nama Paket Umroh"}
              </div>
              <div className="tp-preview-price">
                {form.harga && !isNaN(Number(form.harga))
                  ? fmtRupiah(Number(form.harga))
                  : "Rp 0"}
              </div>

              <div className="tp-preview-meta">
                <div className="tp-preview-meta-row">
                  <span>Keberangkatan</span>
                  <strong>{form.tanggal_berangkat ? fmtDate(form.tanggal_berangkat) : "-"}</strong>
                </div>
                <div className="tp-preview-meta-row">
                  <span>Durasi</span>
                  <strong>{form.durasi ? `${form.durasi} Hari` : "-"}</strong>
                </div>
                <div className="tp-preview-meta-row">
                  <span>Kuota Maksimal</span>
                  <strong>{form.kuota_max ? `${form.kuota_max} Jamaah` : "-"}</strong>
                </div>
                <div className="tp-preview-meta-row">
                  <span>Fasilitas</span>
                  <strong>{fasilitasInput.length} Fasilitas</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Guide Card */}
          <div className="tp-info-card">
            <div className="tp-info-title">
              <span>💡</span> Standar Pengisian Paket
            </div>
            <ul className="tp-info-list">
              <li><strong>Foto Utama:</strong> Foto yang ditandai bintang akan dijadikan cover di katalog publik Bonita Umroh.</li>
              <li><strong>Harga:</strong> Masukkan nominal riil per jamaah (sudah termasuk komponen biaya wajib).</li>
              <li><strong>Batas Pendaftaran:</strong> Menentukan kapan paket ditutup otomatis sebelum jadwal keberangkatan.</li>
              <li><strong>Fasilitas:</strong> Rincikan hotel, penerbangan, dan konsumsi untuk meningkatkan kepercayaan jamaah.</li>
            </ul>
          </div>

          {/* Flow Card */}
          <div className="tp-info-card">
            <div className="tp-info-title">
              <span>🚀</span> Alur Penerbitan
            </div>
            {[
              "Lengkapi rincian informasi paket",
              "Unggah foto & tentukan cover",
              "Tambahkan daftar fasilitas",
              "Simpan & paket langsung aktif",
            ].map((step, i) => (
              <div key={i} className="tp-flow-step">
                <span className="tp-flow-num">{i + 1}</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Modal Konfirmasi Unsaved Changes ── */}
      {confirmModalOpen && (
        <div className="tp-confirm-overlay" onClick={() => setConfirmModalOpen(false)}>
          <div className="tp-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tp-confirm-icon">⚠️</div>
            <div className="tp-confirm-title">Batalkan Tambah Paket?</div>
            <div className="tp-confirm-desc">
              Data formulir yang sudah Anda masukkan belum disimpan. Jika Anda meninggalkan halaman ini sekarang, semua perubahan akan hilang.
            </div>
            <div className="tp-confirm-actions">
              <button
                type="button"
                className="tp-btn-cancel"
                onClick={() => setConfirmModalOpen(false)}
              >
                Tetap di Halaman
              </button>
              <button
                type="button"
                className="tp-fas-remove-btn"
                style={{ padding: "0.65rem 1.15rem", fontSize: "0.85rem" }}
                onClick={() => {
                  setConfirmModalOpen(false);
                  navigate("/admin/paket");
                }}
              >
                Tinggalkan Halaman
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TambahPaket;
