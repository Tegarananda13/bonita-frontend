import { useEffect, useState, useCallback, useRef, type FormEvent, type ChangeEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../../context/AuthContext";
import "./AdminPaket.css";
// ── Types ────────────────────────────────────────────────────────────────────
interface FotoPaket {
  id: string | null;
  url: string;
  file_path?: string;
  urutan: number;
  is_utama: boolean;
  is_legacy?: boolean;
}
interface FotoFasilitas {
  id: string;
  url: string;
  urutan: number;
}
interface Fasilitas {
  id: string;
  nama_fasilitas: string;
  deskripsi: string;
  foto_fasilitas: FotoFasilitas[];
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
interface PaketAdmin {
  ID: string;
  NamaPaket: string;
  JenisPaket: string;
  FotoPaket: string;
  GambarPaket?: FotoPaket[];
  Harga: number;
  TanggalBerangkat: string;
  Durasi: number;
  Deskripsi: string;
  KuotaMax: number;
  KuotaTerpakai: number;
  BatasPendaftaran: number;
  IsActive: boolean;
  IsFinished: boolean;
  Fasilitas: Fasilitas[];
}
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
// ── Helpers ──────────────────────────────────────────────────────────────────
const FALLBACK = "https://images.unsplash.com/photo-1564769625905-50e93615e769?w=120&q=70";
const fmtRupiah = (n: number) =>
  "Rp " + n.toLocaleString("id-ID");
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
const toDatetimeLocal = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const normalizeFasilitas = (raw: any[]): Fasilitas[] => {
  if (!Array.isArray(raw)) return [];
  return raw.map((f) => ({
    id: String(f.id || f.ID || ""),
    nama_fasilitas: f.nama_fasilitas || f.NamaFasilitas || "",
    deskripsi: f.deskripsi || f.Deskripsi || "",
    foto_fasilitas: Array.isArray(f.foto_fasilitas)
      ? f.foto_fasilitas.map((ff: any) => ({
          id: String(ff.id || ff.ID || ""),
          url: ff.url || ff.file_path || "",
          urutan: Number(ff.urutan ?? 0),
        }))
      : [],
  }));
};

const normalizeFotoPaket = (raw: any[], fallbackUrl?: string): FotoPaket[] => {
  let list: FotoPaket[] = [];
  if (Array.isArray(raw)) {
    list = raw
      .map((item) => {
        const id = item?.id || item?.ID || null;
        const url = item?.url || item?.file_path || item?.FilePath || "";
        const urutan = Number(item?.urutan ?? item?.Urutan ?? 0);
        const isUtama = Boolean(item?.is_utama ?? item?.IsUtama ?? false);
        const isLegacy = Boolean(item?.is_legacy ?? (!id && Boolean(url)));
        return {
          id: id ? String(id) : null,
          url,
          file_path: item?.file_path || item?.FilePath || url,
          urutan,
          is_utama: isUtama,
          is_legacy: isLegacy,
        };
      })
      .filter((f) => Boolean(f.url));
  }

  // Fallback legacy jika belum ada record di tabel foto_paket
  if (list.length === 0 && fallbackUrl) {
    list = [
      {
        id: null,
        url: fallbackUrl,
        file_path: fallbackUrl,
        urutan: 1,
        is_utama: true,
        is_legacy: true,
      },
    ];
  }
  return list;
};

// ── Fasilitas Panel ──────────────────────────────────────────────────────────
const FasilitasPanel = ({
  paket,
  token,
  onClose,
}: {
  paket: PaketAdmin;
  token: string;
  onClose: () => void;
}) => {
  const [list, setList] = useState<Fasilitas[]>(() => normalizeFasilitas(paket.Fasilitas));
  const [nama, setNama] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadingFoto, setUploadingFoto] = useState<string | null>(null);
  const [deletingFoto, setDeletingFoto] = useState<string | null>(null);
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  const fetchFotoFasilitas = async (fasId: string): Promise<FotoFasilitas[]> => {
    try {
      const res = await axios.get(`http://localhost:8080/admin/fasilitas/${fasId}/foto`, auth);
      const raw = res.data?.data ?? [];
      return raw.map((ff: any) => ({
        id: String(ff.id || ""),
        url: ff.url || ff.file_path || "",
        urutan: Number(ff.urutan ?? 0),
      }));
    } catch { return []; }
  };

  useEffect(() => {
    (async () => {
      const updated = await Promise.all(
        list.map(async (f) => ({ ...f, foto_fasilitas: await fetchFotoFasilitas(f.id) }))
      );
      setList(updated);
    })();
  }, []); // eslint-disable-line

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) { setAddError("Nama fasilitas wajib diisi."); return; }
    setAddError("");
    try {
      setAdding(true);
      const res = await axios.post(
        `http://localhost:8080/admin/paket/${paket.ID}/fasilitas`,
        { nama_fasilitas: nama.trim(), deskripsi: deskripsi.trim() },
        auth
      );
      const newFas = res.data?.data;
      if (newFas) setList((prev) => [...prev, ...normalizeFasilitas([newFas])]);
      setNama(""); setDeskripsi("");
    } catch (err: unknown) {
      setAddError(axios.isAxiosError(err) ? (err.response?.data?.error ?? "Gagal menambah.") : "Gagal menambah.");
    } finally { setAdding(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await axios.delete(`http://localhost:8080/admin/fasilitas/${id}`, auth);
      setList((prev) => prev.filter((f) => f.id !== id));
    } catch { alert("Gagal menghapus fasilitas."); }
    finally { setDeletingId(null); }
  };

  const handleUploadFoto = async (fasId: string, file: File) => {
    try {
      setUploadingFoto(fasId);
      const fd = new FormData();
      fd.append("foto", file);
      const res = await axios.post(
        `http://localhost:8080/admin/fasilitas/${fasId}/foto`, fd,
        { headers: { ...auth.headers, "Content-Type": "multipart/form-data" } }
      );
      const raw = res.data?.data;
      if (raw) {
        const newFoto: FotoFasilitas = {
          id: String(raw.id || ""),
          url: raw.url || raw.file_path || "",
          urutan: Number(raw.urutan ?? 0),
        };
        setList((prev) => prev.map((f) =>
          f.id === fasId ? { ...f, foto_fasilitas: [...f.foto_fasilitas, newFoto] } : f
        ));
      }
    } catch { alert("Gagal upload foto fasilitas."); }
    finally { setUploadingFoto(null); }
  };

  const handleDeleteFoto = async (fasId: string, fotoId: string) => {
    try {
      setDeletingFoto(fotoId);
      await axios.delete(`http://localhost:8080/admin/foto-fasilitas/${fotoId}`, auth);
      setList((prev) => prev.map((f) =>
        f.id === fasId
          ? { ...f, foto_fasilitas: f.foto_fasilitas.filter((ff) => ff.id !== fotoId) }
          : f
      ));
    } catch { alert("Gagal menghapus foto fasilitas."); }
    finally { setDeletingFoto(null); }
  };

  return (
    <div className="fasilitas-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="fasilitas-panel">
        <div className="fasilitas-panel-header">
          <div>
            <div className="fasilitas-panel-title">Fasilitas Paket</div>
            <div className="fasilitas-panel-sub">{paket.NamaPaket}</div>
          </div>
          <button className="drawer-close" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="fasilitas-panel-body">
          <form className="fasilitas-add-form" onSubmit={handleAdd} noValidate>
            <div className="fasilitas-add-title">➕ Tambah Fasilitas</div>
            <div className="form-field">
              <input className="form-input" type="text" placeholder="Nama fasilitas (cth. Koper Besar)"
                value={nama} onChange={(e) => setNama(e.target.value)} disabled={adding} />
            </div>
            <div className="form-field">
              <input className="form-input" type="text" placeholder="Deskripsi singkat (opsional)"
                value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} disabled={adding} />
            </div>
            {addError && (
              <div className="drawer-error" style={{ fontSize: "0.8rem", padding: "0.5rem 0.75rem" }}>{addError}</div>
            )}
            <div className="fasilitas-add-row">
              <button type="submit" className="btn-save" disabled={adding} style={{ fontSize: "0.82rem", padding: "0.55rem 1rem" }}>
                {adding ? <><div className="mini-spinner" />Menyimpan...</> : <>Tambah</>}
              </button>
            </div>
          </form>
          <div className="fasilitas-list">
            <div className="fasilitas-list-title">Daftar Fasilitas ({list.length})</div>
            {list.length === 0 ? (
              <div style={{ textAlign: "center", padding: "1.5rem", color: "#94a3b8", fontSize: "0.85rem" }}>
                Belum ada fasilitas ditambahkan.
              </div>
            ) : (
              list.map((f) => (
                <div className="fasilitas-list-item fas-with-foto" key={f.id}>
                  <div className="fasilitas-item-header">
                    <div className="fasilitas-item-info">
                      <div className="fasilitas-check-icon">✓</div>
                      <div>
                        <div className="fasilitas-item-name">{f.nama_fasilitas}</div>
                        {f.deskripsi && <div className="fasilitas-item-desc">{f.deskripsi}</div>}
                      </div>
                    </div>
                    <button className="fasilitas-delete-btn" onClick={() => handleDelete(f.id)}
                      disabled={deletingId === f.id} title="Hapus fasilitas">
                      {deletingId === f.id ? (
                        <div className="mini-spinner" style={{ borderColor: "rgba(220,38,38,0.3)", borderTopColor: "#dc2626" }} />
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {/* Foto fasilitas */}
                  <div className="fas-foto-section">
                    {(f.foto_fasilitas ?? []).length > 0 && (
                      <div className="fas-foto-strip">
                        {(f.foto_fasilitas ?? []).map((ff) => (
                          <div key={ff.id} className="fas-foto-thumb">
                            <img src={ff.url} alt="Foto" onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK; }} />
                            <button type="button" className="fas-foto-del" disabled={deletingFoto === ff.id}
                              onClick={() => handleDeleteFoto(f.id, ff.id)} title="Hapus foto">✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                    <label className="fas-foto-add-btn" title="Upload foto fasilitas">
                      <input type="file" accept="image/*" style={{ display: "none" }}
                        disabled={uploadingFoto === f.id}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadFoto(f.id, file);
                          e.target.value = "";
                        }}
                      />
                      {uploadingFoto === f.id
                        ? <><div className="mini-spinner" style={{ width: 10, height: 10, marginRight: 4 }} />Uploading...</>
                        : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>{(f.foto_fasilitas ?? []).length > 0 ? ` Foto (${f.foto_fasilitas.length})` : " Tambah Foto"}</>
                      }
                    </label>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


// ── Paket Form Drawer ────────────────────────────────────────────────────────
const PaketDrawer = ({
  editData,
  token,
  onClose,
  onSaved,
}: {
  editData: PaketAdmin | null;
  token: string;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const isEdit = !!editData;
  const fileRef = useRef<HTMLInputElement>(null);
  const multiFotoRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<PaketFormData>(() =>
    editData
      ? {
          nama_paket: editData.NamaPaket,
          jenis_paket: editData.JenisPaket ?? "",
          harga: String(editData.Harga),
          durasi: String(editData.Durasi),
          tanggal_berangkat: toDatetimeLocal(editData.TanggalBerangkat),
          deskripsi: editData.Deskripsi,
          kuota_max: String(editData.KuotaMax),
          batas_pendaftaran: String(editData.BatasPendaftaran),
        }
      : EMPTY_FORM
  );
  // ── Multi Foto Paket ──────────────────────────────────────────────────────────
  // Foto dari DB (edit mode)
  const [dbFotos, setDbFotos] = useState<FotoPaket[]>(() =>
    isEdit && editData
      ? normalizeFotoPaket(editData.GambarPaket ?? [], editData.FotoPaket)
      : []
  );
  // Foto baru (belum upload, hanya preview lokal)
  const [newFotos, setNewFotos] = useState<{ file: File; preview: string; isUtama: boolean }[]>([]);
  const [uploading, setUploading] = useState(false);

  const fetchDbFotos = async () => {
    if (!isEdit || !editData?.ID) return;
    try {
      const res = await axios.get(
        `http://localhost:8080/admin/paket/${editData.ID}/foto`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const list = normalizeFotoPaket(res.data?.data ?? [], editData.FotoPaket);
      setDbFotos(list);
    } catch { /* noop */ }
  };

  // Load fotos on mount if edit mode
  useEffect(() => { if (isEdit) fetchDbFotos(); }, []); // eslint-disable-line

  const handleAddFotos = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const added = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      isUtama: false,
    }));
    setNewFotos((prev) => {
      // Jika belum ada foto sama sekali (DB + new), tandai yang pertama sebagai utama
      const allEmpty = dbFotos.length === 0 && prev.length === 0;
      if (allEmpty && added.length > 0) added[0].isUtama = true;
      return [...prev, ...added];
    });
    if (multiFotoRef.current) multiFotoRef.current.value = "";
  };

  const removeNewFoto = (idx: number) => {
    setNewFotos((prev) => {
      const target = prev[idx];
      if (target?.preview) {
        URL.revokeObjectURL(target.preview);
      }
      const updated = prev.filter((_, i) => i !== idx);
      // Jika yang dihapus adalah utama, set new[0] jadi utama
      if (prev[idx].isUtama && updated.length > 0) updated[0].isUtama = true;
      return updated;
    });
  };

  const setNewFotoUtama = (idx: number) => {
    // Reset semua DB fotos is_utama di UI
    setDbFotos((prev) => prev.map((f) => ({ ...f, is_utama: false })));
    setNewFotos((prev) => prev.map((f, i) => ({ ...f, isUtama: i === idx })));
  };

  const setDbFotoUtama = async (f: FotoPaket) => {
    if (!f.id || f.is_legacy) return;
    try {
      await axios.patch(
        `http://localhost:8080/admin/foto-paket/${f.id}/utama`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Reset newFotos is_utama
      setNewFotos((prev) => prev.map((nf) => ({ ...nf, isUtama: false })));
      await fetchDbFotos();
    } catch { alert("Gagal mengubah foto utama."); }
  };

  const deleteDbFoto = async (f: FotoPaket, idx: number) => {
    if (!f.id || f.is_legacy) {
      setDbFotos((prev) => prev.filter((_, i) => i !== idx));
      return;
    }
    try {
      await axios.delete(`http://localhost:8080/admin/foto-paket/${f.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDbFotos((prev) => prev.filter((item) => item.id !== f.id));
    } catch { alert("Gagal menghapus foto."); }
  };

  // Upload semua newFotos ke server untuk paket tertentu
  const uploadNewFotos = async (paketId: string, setUtamaId?: string) => {
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    for (const nf of newFotos) {
      const fd = new FormData();
      fd.append("foto", nf.file);
      const res = await axios.post(
        `http://localhost:8080/admin/paket/${paketId}/foto`,
        fd,
        { headers: { ...auth.headers, "Content-Type": "multipart/form-data" } }
      );
      if (nf.preview) URL.revokeObjectURL(nf.preview);
      const uploadedId = res.data?.data?.id;
      if (nf.isUtama && uploadedId && !setUtamaId) {
        await axios.patch(
          `http://localhost:8080/admin/foto-paket/${uploadedId}/utama`,
          {},
          auth
        );
      }
    }
  };

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // ── Fasilitas ──
  // Create mode: penampungan lokal sebelum submit
  const [fasilitasInput, setFasilitasInput] = useState<DraftFasilitas[]>([]);
  // Edit mode: list live dari DB, bisa tambah/hapus langsung
  const [fasilitasEdit, setFasilitasEdit] = useState<Fasilitas[]>(() =>
    isEdit ? normalizeFasilitas(editData!.Fasilitas) : []
  );
  const [fasNama, setFasNama] = useState("");
  const [fasDeskripsi, setFasDeskripsi] = useState("");
  const [fasDraftFotos, setFasDraftFotos] = useState<DraftFasilitasFoto[]>([]);
  const fasDraftFotoInputRef = useRef<HTMLInputElement>(null);
  const [fasError, setFasError] = useState("");
  const [fasLoading, setFasLoading] = useState(false);
  const [uploadingFasFoto, setUploadingFasFoto] = useState<string | null>(null);
  const [deletingFasFoto, setDeletingFasFoto] = useState<string | null>(null);

  const fetchDbFasilitas = useCallback(async () => {
    if (!isEdit || !editData?.ID) return;
    try {
      const res = await axios.get(`http://localhost:8080/admin/paket/${editData.ID}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const list = res.data?.fasilitas ?? res.data?.paket?.Fasilitas ?? [];
      setFasilitasEdit(normalizeFasilitas(list));
    } catch {
      /* noop */
    }
  }, [isEdit, editData?.ID, token]);

  useEffect(() => {
    if (isEdit) {
      fetchDbFasilitas();
    }
  }, [fetchDbFasilitas, isEdit]);

  const handleAddFasDraftFotos = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const added: DraftFasilitasFoto[] = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setFasDraftFotos((prev) => [...prev, ...added]);
    if (fasDraftFotoInputRef.current) fasDraftFotoInputRef.current.value = "";
  };

  const handleRemoveFasDraftFoto = (idx: number) => {
    setFasDraftFotos((prev) => {
      const target = prev[idx];
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleAddFasilitas = async () => {
    if (!fasNama.trim()) { setFasError("Nama fasilitas wajib diisi."); return; }
    setFasError("");
    if (isEdit) {
      // Edit mode: langsung kirim ke API lalu upload fotonya
      try {
        setFasLoading(true);
        const res = await axios.post(
          `http://localhost:8080/admin/paket/${editData!.ID}/fasilitas`,
          { nama_fasilitas: fasNama.trim(), deskripsi: fasDeskripsi.trim() },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const newFas = res.data?.data;
        const newFasId = newFas?.id || newFas?.ID;
        const uploadedFotos: FotoFasilitas[] = [];

        if (newFasId && fasDraftFotos.length > 0) {
          for (const df of fasDraftFotos) {
            try {
              const fd = new FormData();
              fd.append("foto", df.file);
              const upRes = await axios.post(
                `http://localhost:8080/admin/fasilitas/${newFasId}/foto`,
                fd,
                { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } }
              );
              const raw = upRes.data?.data;
              if (raw) {
                uploadedFotos.push({
                  id: String(raw.id || raw.ID || ""),
                  url: raw.url || raw.file_path || "",
                  urutan: Number(raw.urutan ?? 0),
                });
              }
            } catch (err) {
              console.error("Gagal upload foto fasilitas:", err);
            } finally {
              URL.revokeObjectURL(df.preview);
            }
          }
        }

        if (newFas) {
          const createdItem: Fasilitas = {
            id: String(newFasId),
            nama_fasilitas: newFas.nama_fasilitas || newFas.NamaFasilitas || fasNama.trim(),
            deskripsi: newFas.deskripsi || newFas.Deskripsi || fasDeskripsi.trim(),
            foto_fasilitas: uploadedFotos,
          };
          setFasilitasEdit((prev) => [...prev, createdItem]);
        } else {
          await fetchDbFasilitas();
        }

        setFasNama("");
        setFasDeskripsi("");
        setFasDraftFotos([]);
      } catch {
        setFasError("Gagal menambahkan fasilitas.");
      } finally {
        setFasLoading(false);
      }
    } else {
      // Create mode: simpan lokal bersama foto-fotonya
      setFasilitasInput((prev) => [
        ...prev,
        {
          nama: fasNama.trim(),
          deskripsi: fasDeskripsi.trim(),
          fotos: [...fasDraftFotos],
        },
      ]);
      setFasNama("");
      setFasDeskripsi("");
      setFasDraftFotos([]);
    }
  };

  const handleRemoveFasilitas = async (id: string | null, index: number) => {
    if (isEdit && id) {
      // Edit mode: hapus dari API
      try {
        setFasLoading(true);
        await axios.delete(`http://localhost:8080/admin/fasilitas/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFasilitasEdit((prev) => prev.filter((f) => f.id !== id));
      } catch {
        alert("Gagal menghapus fasilitas.");
      } finally {
        setFasLoading(false);
      }
    } else {
      // Create mode: hapus dari local state dan revoke object URLs
      const target = fasilitasInput[index];
      if (target?.fotos) {
        target.fotos.forEach((df) => URL.revokeObjectURL(df.preview));
      }
      setFasilitasInput((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleUploadFasFoto = async (fasId: string, files: FileList | File[]) => {
    const arr = Array.from(files);
    if (!arr.length) return;
    try {
      setUploadingFasFoto(fasId);
      for (const file of arr) {
        const fd = new FormData();
        fd.append("foto", file);
        const res = await axios.post(
          `http://localhost:8080/admin/fasilitas/${fasId}/foto`,
          fd,
          { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } }
        );
        const raw = res.data?.data;
        if (raw) {
          const newFoto: FotoFasilitas = {
            id: String(raw.id || raw.ID || ""),
            url: raw.url || raw.file_path || "",
            urutan: Number(raw.urutan ?? 0),
          };
          setFasilitasEdit((prev) =>
            prev.map((f) =>
              f.id === fasId
                ? { ...f, foto_fasilitas: [...f.foto_fasilitas, newFoto] }
                : f
            )
          );
        }
      }
    } catch {
      alert("Gagal upload foto fasilitas.");
    } finally {
      setUploadingFasFoto(null);
    }
  };

  const handleDeleteFasFoto = async (fasId: string, fotoId: string) => {
    try {
      setDeletingFasFoto(fotoId);
      await axios.delete(`http://localhost:8080/admin/foto-fasilitas/${fotoId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFasilitasEdit((prev) =>
        prev.map((f) =>
          f.id === fasId
            ? { ...f, foto_fasilitas: f.foto_fasilitas.filter((ff) => ff.id !== fotoId) }
            : f
        )
      );
    } catch {
      alert("Gagal menghapus foto fasilitas.");
    } finally {
      setDeletingFasFoto(null);
    }
  };

  // Cleanup object URLs on unmount
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

  const handleField = (k: keyof PaketFormData) => (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.nama_paket.trim()) { setError("Nama paket wajib diisi."); return; }
    if (!form.jenis_paket) { setError("Jenis paket wajib dipilih."); return; }
    if (!form.harga || isNaN(Number(form.harga))) { setError("Harga tidak valid."); return; }
    if (!form.durasi || isNaN(Number(form.durasi))) { setError("Durasi tidak valid."); return; }
    if (!form.tanggal_berangkat) { setError("Tanggal berangkat wajib diisi."); return; }
    if (!form.kuota_max || isNaN(Number(form.kuota_max))) { setError("Kuota maks tidak valid."); return; }
    // Foto tidak lagi wajib di create mode — bisa diupload terpisah
    const fd = new FormData();
    fd.append("nama_paket", form.nama_paket.trim());
    fd.append("jenis_paket", form.jenis_paket);
    fd.append("harga", form.harga);
    fd.append("durasi", form.durasi);
    fd.append("tanggal_berangkat", new Date(form.tanggal_berangkat).toISOString());
    fd.append("deskripsi", form.deskripsi.trim());
    fd.append("kuota_max", form.kuota_max);
    fd.append("batas_pendaftaran", form.batas_pendaftaran || "0");
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    };
    const authJSON = { Authorization: `Bearer ${token}` };
    try {
      setSubmitting(true);
      setUploading(true);
      if (isEdit) {
        await axios.put(`http://localhost:8080/admin/paket/${editData!.ID}`, fd, { headers });
        // Upload foto baru yang dipilih
        if (newFotos.length > 0) {
          await uploadNewFotos(editData!.ID);
        }
      } else {
        // Buat paket dulu
        const createRes = await axios.post("http://localhost:8080/admin/paket", fd, { headers });
        const newPaketId = createRes.data?.data?.id ?? createRes.data?.paket?.ID ?? createRes.data?.id;
        // Upload semua foto paket baru
        if (newPaketId && newFotos.length > 0) {
          await uploadNewFotos(newPaketId);
        }
        // Kirim semua fasilitas yang sudah ditambahkan ke form beserta fotonya
        if (newPaketId && fasilitasInput.length > 0) {
          for (const fas of fasilitasInput) {
            const fasRes = await axios.post(
              `http://localhost:8080/admin/paket/${newPaketId}/fasilitas`,
              { nama_fasilitas: fas.nama, deskripsi: fas.deskripsi },
              { headers: authJSON }
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
                    { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } }
                  );
                } catch (err) {
                  console.error("Gagal upload foto fasilitas create:", err);
                } finally {
                  URL.revokeObjectURL(df.preview);
                }
              }
            }
          }
        }
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(
        axios.isAxiosError(err) ? (err.response?.data?.error ?? "Gagal menyimpan.") : "Gagal menyimpan."
      );
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="drawer-overlay" onClick={(e) => e.target === e.currentTarget && !submitting && onClose()}>
      <div className="drawer-panel">
        <div className="drawer-header">
          <div className="drawer-title">
            {isEdit ? "✏️ Edit Paket" : "➕ Tambah Paket Baru"}
          </div>
          <button className="drawer-close" onClick={onClose} disabled={submitting}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          <div className="drawer-body">
            {error && (
              <div className="drawer-error">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}
            {/* Foto Paket — Multi Upload */}
            <div className="form-field">
              <label className="form-label">Foto Paket</label>
              {/* Foto dari DB */}
              {dbFotos.length > 0 && (
                <div className="multi-foto-grid">
                  {dbFotos.map((f, idx) => (
                    <div key={f.id || `legacy-${idx}`} className={`multi-foto-item ${f.is_utama ? 'foto-utama' : ''}`}>
                      <img
                        src={f.url || f.file_path}
                        alt="Foto"
                        onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK; }}
                      />
                      {f.is_utama && <span className="foto-utama-badge">★ Utama</span>}
                      {f.is_legacy && <span className="foto-new-badge" style={{ background: "rgba(100,116,139,0.85)" }}>Cover</span>}
                      <div className="multi-foto-actions">
                        {!f.is_utama && f.id && !f.is_legacy && (
                          <button type="button" className="foto-act-btn foto-act-utama" onClick={() => setDbFotoUtama(f)} title="Jadikan utama">★</button>
                        )}
                        <button type="button" className="foto-act-btn foto-act-del" onClick={() => deleteDbFoto(f, idx)} title="Hapus foto">🗑</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Foto baru (belum upload) */}
              {newFotos.length > 0 && (
                <div className="multi-foto-grid" style={{ marginTop: dbFotos.length > 0 ? "0.75rem" : 0 }}>
                  {newFotos.map((nf, idx) => (
                    <div key={idx} className={`multi-foto-item ${nf.isUtama ? 'foto-utama' : ''} foto-new`}>
                      <img src={nf.preview} alt="Preview" />
                      {nf.isUtama && <span className="foto-utama-badge">★ Utama</span>}
                      <span className="foto-new-badge">Baru</span>
                      <div className="multi-foto-actions">
                        {!nf.isUtama && (
                          <button type="button" className="foto-act-btn foto-act-utama" onClick={() => setNewFotoUtama(idx)} title="Jadikan utama">★</button>
                        )}
                        <button type="button" className="foto-act-btn foto-act-del" onClick={() => removeNewFoto(idx)} title="Hapus">🗑</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Tombol tambah foto */}
              <div style={{ marginTop: "0.75rem" }}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleAddFotos}
                  ref={multiFotoRef}
                  style={{ display: "none" }}
                  id="multi-foto-input"
                />
                <label htmlFor="multi-foto-input" className="btn-add-foto">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Tambah Foto
                </label>
                <span style={{ marginLeft: "0.75rem", fontSize: "0.75rem", color: "#94a3b8" }}>JPG, PNG — maks 5MB per file</span>
              </div>
            </div>
            {/* Nama */}
            <div className="form-field">
              <label className="form-label" htmlFor="nama-paket">Nama Paket *</label>
              <input
                id="nama-paket"
                className="form-input"
                type="text"
                placeholder="cth. Umroh Reguler 2026"
                value={form.nama_paket}
                onChange={handleField("nama_paket")}
                disabled={submitting}
              />
            </div>
            {/* Jenis Paket */}
            <div className="form-field">
              <label className="form-label" htmlFor="jenis-paket">Jenis Paket *</label>
              <select
                id="jenis-paket"
                className="form-input"
                value={form.jenis_paket}
                onChange={(e) => setForm((p) => ({ ...p, jenis_paket: e.target.value }))}
                disabled={submitting}
                style={{ cursor: "pointer" }}
              >
                <option value="">-- Pilih Jenis Paket --</option>
                {JENIS_PAKET_OPTIONS.map((j) => (
                  <option key={j} value={j}>{j}</option>
                ))}
              </select>
            </div>
            {/* Harga & Durasi */}
            <div className="field-group">
              <div className="form-field">
                <label className="form-label">Harga (Rp) *</label>
                <div className="form-prefix-wrap">
                  <span className="form-prefix">Rp</span>
                  <input
                    className="form-input with-prefix"
                    type="number"
                    placeholder="25000000"
                    value={form.harga}
                    onChange={handleField("harga")}
                    disabled={submitting}
                    min={0}
                  />
                </div>
              </div>
              <div className="form-field">
                <label className="form-label">Durasi (hari) *</label>
                <input
                  className="form-input"
                  type="number"
                  placeholder="12"
                  value={form.durasi}
                  onChange={handleField("durasi")}
                  disabled={submitting}
                  min={1}
                />
              </div>
            </div>
            {/* Tanggal & Batas */}
            <div className="field-group">
              <div className="form-field">
                <label className="form-label">Tanggal Berangkat *</label>
                <input
                  className="form-input"
                  type="datetime-local"
                  value={form.tanggal_berangkat}
                  onChange={handleField("tanggal_berangkat")}
                  disabled={submitting}
                />
              </div>
              <div className="form-field">
                <label className="form-label">Batas Pendaftaran (hari sebelum)</label>
                <input
                  className="form-input"
                  type="number"
                  placeholder="30"
                  value={form.batas_pendaftaran}
                  onChange={handleField("batas_pendaftaran")}
                  disabled={submitting}
                  min={0}
                />
              </div>
            </div>
            {/* Kuota */}
            <div className="form-field">
              <label className="form-label">Kuota Maksimal *</label>
              <input
                className="form-input"
                type="number"
                placeholder="30"
                value={form.kuota_max}
                onChange={handleField("kuota_max")}
                disabled={submitting}
                min={1}
                style={{ maxWidth: 180 }}
              />
              {isEdit && (
                <span style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
                  Kuota terpakai saat ini: <strong>{editData!.KuotaTerpakai}</strong>
                </span>
              )}
            </div>
            {/* Deskripsi */}
            <div className="form-field">
              <label className="form-label">Deskripsi</label>
              <textarea
                className="form-textarea"
                placeholder="Deskripsi singkat tentang paket ini..."
                value={form.deskripsi}
                onChange={handleField("deskripsi")}
                disabled={submitting}
                rows={4}
              />
            </div>

            {/* Fasilitas */}
            <div className="form-field">
              <label className="form-label">
                Fasilitas Paket
                {!isEdit && (
                  <span style={{ fontWeight: 400, color: "#94a3b8", fontSize: "0.75rem", marginLeft: "0.4rem" }}>
                    (opsional, bisa ditambah setelah paket dibuat)
                  </span>
                )}
              </label>

              {/* Input tambah fasilitas */}
              <div className="fasilitas-inline-add">
                <input
                  className="form-input"
                  type="text"
                  placeholder="Nama fasilitas (cth. Makan 3x Sehari)"
                  value={fasNama}
                  onChange={(e) => setFasNama(e.target.value)}
                  disabled={submitting || fasLoading}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddFasilitas(); } }}
                />
                <input
                  className="form-input"
                  type="text"
                  placeholder="Keterangan singkat (opsional)"
                  value={fasDeskripsi}
                  onChange={(e) => setFasDeskripsi(e.target.value)}
                  disabled={submitting || fasLoading}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddFasilitas(); } }}
                />

                {/* Preview foto draft untuk fasilitas baru */}
                <div className="fas-foto-section" style={{ marginTop: "0.25rem" }}>
                  {fasDraftFotos.length > 0 && (
                    <div className="fas-foto-strip">
                      {fasDraftFotos.map((df, idx) => (
                        <div key={idx} className="fas-foto-thumb">
                          <img src={df.preview} alt={`Foto draft ${idx + 1}`} />
                          <button
                            type="button"
                            className="fas-foto-del"
                            disabled={submitting || fasLoading}
                            onClick={() => handleRemoveFasDraftFoto(idx)}
                            title="Hapus foto draft"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <label className="fas-foto-add-btn" title="Tambah foto fasilitas">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: "none" }}
                      ref={fasDraftFotoInputRef}
                      disabled={submitting || fasLoading}
                      onChange={handleAddFasDraftFotos}
                    />
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    {fasDraftFotos.length > 0 ? ` + Tambah Foto (${fasDraftFotos.length})` : " + Tambah Foto"}
                  </label>
                </div>

                {fasError && (
                  <div style={{ fontSize: "0.78rem", color: "#dc2626" }}>{fasError}</div>
                )}
                <button
                  type="button"
                  className="fasilitas-inline-btn"
                  onClick={handleAddFasilitas}
                  disabled={submitting || fasLoading}
                >
                  {fasLoading ? "Memproses..." : "+ Tambah Fasilitas"}
                </button>
              </div>

              {/* Daftar fasilitas */}
              {isEdit ? (
                fasilitasEdit.length > 0 && (
                  <div className="fasilitas-inline-list">
                    {fasilitasEdit.map((f) => {
                      const fotos = f.foto_fasilitas ?? [];
                      return (
                        <div key={f.id} className="fasilitas-inline-item fas-with-foto">
                          <div className="fasilitas-item-header">
                            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", flex: 1 }}>
                              <div className="fasilitas-check-icon">✓</div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#1e293b" }}>{f.nama_fasilitas}</div>
                                {f.deskripsi && (
                                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{f.deskripsi}</div>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              className="fasilitas-delete-btn"
                              onClick={() => handleRemoveFasilitas(f.id, 0)}
                              disabled={submitting || fasLoading}
                              title="Hapus fasilitas"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M18 6 6 18M6 6l12 12" />
                              </svg>
                            </button>
                          </div>

                          {/* Foto fasilitas */}
                          <div className="fas-foto-section">
                            {fotos.length > 0 && (
                              <div className="fas-foto-strip">
                                {fotos.map((ff) => (
                                  <div key={ff.id} className="fas-foto-thumb">
                                    <img
                                      src={ff.url}
                                      alt={f.nama_fasilitas}
                                      onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK; }}
                                    />
                                    <button
                                      type="button"
                                      className="fas-foto-del"
                                      disabled={deletingFasFoto === ff.id}
                                      onClick={() => handleDeleteFasFoto(f.id, ff.id)}
                                      title="Hapus foto"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            <label className="fas-foto-add-btn" title="Upload foto fasilitas">
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                style={{ display: "none" }}
                                disabled={uploadingFasFoto === f.id}
                                onChange={(e) => {
                                  const files = e.target.files;
                                  if (files && files.length > 0) handleUploadFasFoto(f.id, files);
                                  e.target.value = "";
                                }}
                              />
                              {uploadingFasFoto === f.id ? (
                                <>
                                  <div className="mini-spinner" style={{ width: 10, height: 10, marginRight: 4 }} />
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <line x1="12" y1="5" x2="12" y2="19" />
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                  </svg>
                                  {fotos.length > 0 ? ` Foto (${fotos.length})` : " Tambah Foto"}
                                </>
                              )}
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                fasilitasInput.length > 0 && (
                  <div className="fasilitas-inline-list">
                    {fasilitasInput.map((f, i) => (
                      <div key={i} className="fasilitas-inline-item fas-with-foto">
                        <div className="fasilitas-item-header">
                          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", flex: 1 }}>
                            <div className="fasilitas-check-icon">✓</div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#1e293b" }}>{f.nama}</div>
                              {f.deskripsi && (
                                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{f.deskripsi}</div>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="fasilitas-delete-btn"
                            onClick={() => handleRemoveFasilitas(null, i)}
                            disabled={submitting}
                            title="Hapus"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M18 6 6 18M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        {/* Foto fasilitas draft */}
                        {f.fotos && f.fotos.length > 0 && (
                          <div className="fas-foto-section">
                            <div className="fas-foto-strip">
                              {f.fotos.map((df, pIdx) => (
                                <div key={pIdx} className="fas-foto-thumb">
                                  <img src={df.preview} alt={`Foto fasilitas ${pIdx + 1}`} />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
          <div className="drawer-footer">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={submitting}>
              Batal
            </button>
            <button type="submit" className="btn-save" disabled={submitting}>
              {submitting ? (
                <><div className="mini-spinner" />{isEdit ? "Menyimpan..." : "Membuat..."}</>
              ) : (
                <>{isEdit ? "Simpan Perubahan" : "Buat Paket"}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
// ── Main Page ────────────────────────────────────────────────────────────────
const AdminPaket = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [paketList, setPaketList] = useState<PaketAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PaketAdmin | null>(null);
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);
  // Toggle status confirm
  const [toggleTarget, setToggleTarget] = useState<PaketAdmin | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);
  // Finish paket confirm
  const [finishTarget, setFinishTarget] = useState<PaketAdmin | null>(null);
  const [finishLoading, setFinishLoading] = useState(false);
  const authH = useCallback(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  );
  // ── Fetch ──
  const fetchPaket = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:8080/admin/paket", {
        headers: authH(),
      });
      const rawList = res.data?.paket ?? [];
      const normalizedList = rawList.map((p: any) => ({
        ...p,
        Fasilitas: normalizeFasilitas(p.Fasilitas),
      }));
      setPaketList(normalizedList);
    } catch {
      setPaketList([]);
    } finally {
      setLoading(false);
    }
  }, [authH]);
  useEffect(() => {
    fetchPaket();
  }, [fetchPaket]);

  const handleEditClick = async (p: PaketAdmin) => {
    try {
      setLoadingEditId(p.ID);
      const res = await axios.get(`http://localhost:8080/admin/paket/${p.ID}`, {
        headers: authH(),
      });
      const detailPaket = res.data?.paket ?? p;
      const rawFasilitas = res.data?.fasilitas ?? detailPaket.Fasilitas ?? [];
      const normalizedFasilitas = normalizeFasilitas(rawFasilitas);
      const rawGambar = res.data?.gambar_paket ?? detailPaket.GambarPaket ?? detailPaket.gambar_paket ?? [];
      const legacyCover = detailPaket.FotoPaket || detailPaket.foto_paket || p.FotoPaket;
      const normalizedGambar = normalizeFotoPaket(rawGambar, legacyCover);

      setEditTarget({
        ...p,
        ...detailPaket,
        ID: detailPaket.ID || p.ID,
        NamaPaket: detailPaket.NamaPaket || detailPaket.nama_paket || p.NamaPaket,
        FotoPaket: legacyCover,
        GambarPaket: normalizedGambar,
        Fasilitas: normalizedFasilitas,
      });
      setDrawerOpen(true);
    } catch (err) {
      console.error("Gagal mengambil detail paket:", err);
      setEditTarget({
        ...p,
        GambarPaket: normalizeFotoPaket(p.GambarPaket ?? [], p.FotoPaket),
        Fasilitas: normalizeFasilitas(p.Fasilitas),
      });
      setDrawerOpen(true);
    } finally {
      setLoadingEditId(null);
    }
  };
  // ── Toggle Status ──
  const handleToggleStatus = async () => {
    if (!toggleTarget) return;
    try {
      setToggleLoading(true);
      const newStatus = !toggleTarget.IsActive;
      await axios.patch(
        `http://localhost:8080/admin/paket/${toggleTarget.ID}/status`,
        { is_active: newStatus },
        { headers: authH() }
      );
      setPaketList((prev) =>
        prev.map((p) => p.ID === toggleTarget.ID ? { ...p, IsActive: newStatus } : p)
      );
      setToggleTarget(null);
    } catch (err: unknown) {
      alert(axios.isAxiosError(err) ? (err.response?.data?.error ?? "Gagal mengubah status.") : "Gagal mengubah status.");
    } finally {
      setToggleLoading(false);
    }
  };
  // ── Finish Paket ──
  const handleFinishPaket = async () => {
    if (!finishTarget) return;
    try {
      setFinishLoading(true);
      await axios.patch(
        `http://localhost:8080/admin/paket/${finishTarget.ID}/finish`,
        { is_finished: true },
        { headers: authH() }
      );
      setPaketList((prev) =>
        prev.map((p) => p.ID === finishTarget.ID ? { ...p, IsFinished: true } : p)
      );
      setFinishTarget(null);
    } catch (err: unknown) {
      alert(axios.isAxiosError(err) ? (err.response?.data?.error ?? "Gagal menyelesaikan paket.") : "Gagal menyelesaikan paket.");
    } finally {
      setFinishLoading(false);
    }
  };
  const filtered = paketList.filter((p) =>
    p.NamaPaket?.toLowerCase().includes(search.toLowerCase())
  );
  const totalKuota = paketList.reduce((s, p) => s + (p.KuotaMax ?? 0), 0);
  const totalTerisi = paketList.reduce((s, p) => s + (p.KuotaTerpakai ?? 0), 0);
  const getKuotaClass = (p: PaketAdmin) => {
    const sisa = p.KuotaMax - p.KuotaTerpakai;
    if (sisa <= 0) return "kuota-full";
    if (sisa <= 5) return "kuota-low";
    return "kuota-ok";
  };
  return (
    <div className="admin-paket-page">
      {/* ── Header ── */}
      <div className="page-header">
        <div className="page-header-left">
          <h2>Paket Umroh</h2>
          <p>Kelola semua paket umroh yang tersedia.</p>
        </div>
        <div className="page-header-actions">
          <Link to="/paket" target="_blank" className="btn-outline">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Lihat Halaman Publik
          </Link>
          <button
            className="btn-primary"
            onClick={() => { setEditTarget(null); setDrawerOpen(true); }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Tambah Paket
          </button>
        </div>
      </div>
      {/* ── Stats ── */}
      {!loading && (
        <div className="paket-stats-row">
          {[
            { icon: "✨", label: "Total Paket", value: paketList.length },
            { icon: "👥", label: "Total Kuota", value: totalKuota },
            { icon: "✅", label: "Terisi", value: totalTerisi },
            { icon: "🟢", label: "Tersedia", value: totalKuota - totalTerisi },
          ].map((s) => (
            <div className="paket-stat-card" key={s.label}>
              <div className="paket-stat-icon">{s.icon}</div>
              <div>
                <div className="paket-stat-value">{s.value}</div>
                <div className="paket-stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* ── Toolbar ── */}
      <div className="paket-toolbar">
        <div className="toolbar-search">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Cari nama paket..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {!loading && (
          <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
            {filtered.length} paket ditemukan
          </span>
        )}
      </div>
      {/* ── Table ── */}
      <div className="paket-table-card">
        <table className="paket-table">
          <thead>
            <tr>
              <th>Paket</th>
              <th>Jenis</th>
              <th>Harga</th>
              <th>Berangkat</th>
              <th>Kuota</th>
              <th>Status</th>
              <th>Perjalanan</th>
              <th>Fasilitas</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={6}>
                    <div className="table-skel-row">
                      <div className="skel" style={{ width: 52, height: 40, borderRadius: 8 }} />
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                        <div className="skel" style={{ width: "50%", height: 12 }} />
                        <div className="skel" style={{ width: "25%", height: 10 }} />
                      </div>
                      <div className="skel" style={{ width: 80, height: 12 }} />
                      <div className="skel" style={{ width: 70, height: 12 }} />
                      <div className="skel" style={{ width: 60, height: 12 }} />
                    </div>
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="table-empty">
                    <div className="table-empty-icon">📦</div>
                    <p>{search ? "Paket tidak ditemukan." : "Belum ada paket."}</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const sisa = (p.KuotaMax ?? 0) - (p.KuotaTerpakai ?? 0);
                return (
                  <tr key={p.ID}>
                    {/* Nama + Foto */}
                    <td>
                      <div className="paket-name-cell">
                        {p.FotoPaket ? (
                          <img
                            src={p.FotoPaket}
                            alt={p.NamaPaket}
                            className="paket-foto-thumb"
                            onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK; }}
                          />
                        ) : (
                          <div className="paket-foto-placeholder">🕌</div>
                        )}
                        <div className="paket-name-text">
                          <div className="paket-name">{p.NamaPaket}</div>
                          <div className="paket-durasi">{p.Durasi} hari</div>
                        </div>
                      </div>
                    </td>
                    {/* Jenis */}
                    <td>
                      {p.JenisPaket ? (
                        <span className={`jenis-badge jenis-${p.JenisPaket.toLowerCase().replace(/\s+/g, "-")}`}>
                          {p.JenisPaket}
                        </span>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>—</span>
                      )}
                    </td>
                    {/* Harga */}
                    <td><span className="paket-price">{fmtRupiah(p.Harga)}</span></td>
                    {/* Berangkat */}
                    <td><span className="paket-date">{fmtDate(p.TanggalBerangkat)}</span></td>
                    {/* Kuota */}
                    <td>
                      <span className={`kuota-pill ${getKuotaClass(p)}`}>
                        {sisa <= 0 ? "Penuh" : `${sisa} tersisa`}
                        <span style={{ opacity: 0.6, fontWeight: 500 }}>/{p.KuotaMax}</span>
                      </span>
                    </td>
                    {/* Status Aktif/Nonaktif */}
                    <td>
                      {p.IsActive ? (
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          background: "#dcfce7", color: "#166534",
                          borderRadius: 20, padding: "3px 10px", fontSize: "0.78rem", fontWeight: 600,
                        }}>
                          🟢 Aktif
                        </span>
                      ) : (
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          background: "#fee2e2", color: "#991b1b",
                          borderRadius: 20, padding: "3px 10px", fontSize: "0.78rem", fontWeight: 600,
                        }}>
                          🔴 Nonaktif
                        </span>
                      )}
                    </td>
                    {/* Status Perjalanan */}
                    <td>
                      {p.IsFinished ? (
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          background: "#f1f5f9", color: "#475569",
                          borderRadius: 20, padding: "3px 10px", fontSize: "0.78rem", fontWeight: 600,
                        }}>
                          ⚫ Selesai
                        </span>
                      ) : (
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          background: "#dcfce7", color: "#166534",
                          borderRadius: 20, padding: "3px 10px", fontSize: "0.78rem", fontWeight: 600,
                        }}>
                          🟢 Berjalan
                        </span>
                      )}
                    </td>
                    {/* Fasilitas count */}
                    <td>
                      <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
                        {p.Fasilitas?.length ?? 0} item
                      </span>
                    </td>
                    {/* Actions */}
                    <td>
                      <div className="action-cell">
                        <button
                          className="action-btn action-btn-detail"
                          onClick={() => navigate(`/admin/paket/${p.ID}`)}
                          title="Lihat detail paket"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                          Detail
                        </button>
                        <button
                          className="action-btn action-btn-edit"
                          onClick={() => handleEditClick(p)}
                          disabled={loadingEditId === p.ID}
                          title="Edit paket"
                        >
                          {loadingEditId === p.ID ? (
                            <div className="mini-spinner" style={{ width: 12, height: 12 }} />
                          ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" />
                            </svg>
                          )}
                          Edit
                        </button>
                        {/* Selesaikan Paket / Badge Selesai */}
                        {p.IsFinished ? (
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            background: "#f1f5f9", color: "#475569",
                            borderRadius: 20, padding: "4px 10px", fontSize: "0.75rem", fontWeight: 700,
                            border: "1px solid #e2e8f0",
                          }}>
                            ⚫ Paket Selesai
                          </span>
                        ) : (
                          <button
                            className="action-btn action-btn-finish"
                            onClick={() => setFinishTarget(p)}
                            title="Selesaikan paket ini"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                            Selesaikan
                          </button>
                        )}
                        <button
                          className={p.IsActive ? "action-btn action-btn-delete" : "action-btn action-btn-activate"}
                          onClick={() => setToggleTarget(p)}
                          title={p.IsActive ? "Nonaktifkan paket" : "Aktifkan paket"}
                        >
                          {p.IsActive ? (
                            <>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                              </svg>
                              Nonaktifkan
                            </>
                          ) : (
                            <>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                              Aktifkan
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {/* ── Drawer (Create/Edit) ── */}
      {drawerOpen && (
        <PaketDrawer
          editData={editTarget}
          token={token!}
          onClose={() => { setDrawerOpen(false); setEditTarget(null); }}
          onSaved={fetchPaket}
        />
      )}
      {/* ── Toggle Status Confirm ── */}
      {toggleTarget && (
        <div
          className="confirm-overlay"
          onClick={(e) => e.target === e.currentTarget && !toggleLoading && setToggleTarget(null)}
        >
          <div className="confirm-box">
            <div className="confirm-icon">{toggleTarget.IsActive ? "🔴" : "🟢"}</div>
            <h3>{toggleTarget.IsActive ? "Nonaktifkan Paket?" : "Aktifkan Paket?"}</h3>
            <p>
              Paket <strong>{toggleTarget.NamaPaket}</strong> akan diubah menjadi{" "}
              <strong>{toggleTarget.IsActive ? "Nonaktif" : "Aktif"}</strong>.
              {toggleTarget.IsActive && (
                <> Customer tidak akan dapat melihat atau mendaftar ke paket ini.</>)
              }
            </p>
            <div className="confirm-actions">
              <button
                className="confirm-cancel"
                onClick={() => setToggleTarget(null)}
                disabled={toggleLoading}
              >
                Batal
              </button>
              <button
                className={toggleTarget.IsActive ? "confirm-delete-btn" : "confirm-activate-btn"}
                onClick={handleToggleStatus}
                disabled={toggleLoading}
              >
                {toggleLoading
                  ? "Memproses..."
                  : toggleTarget.IsActive ? "Ya, Nonaktifkan" : "Ya, Aktifkan"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Finish Paket Confirm ── */}
      {finishTarget && (
        <div
          className="confirm-overlay"
          onClick={(e) => e.target === e.currentTarget && !finishLoading && setFinishTarget(null)}
        >
          <div className="confirm-box">
            <div className="confirm-icon">⚫</div>
            <h3>Selesaikan Paket?</h3>
            <p>
              Seluruh jamaah pada paket <strong>{finishTarget.NamaPaket}</strong> akan
              otomatis berubah menjadi status <strong>Selesai</strong>.{" "}
              Perubahan ini tidak dapat dibatalkan.
            </p>
            <div className="confirm-actions">
              <button
                className="confirm-cancel"
                onClick={() => setFinishTarget(null)}
                disabled={finishLoading}
              >
                Batal
              </button>
              <button
                className="confirm-finish-btn"
                onClick={handleFinishPaket}
                disabled={finishLoading}
              >
                {finishLoading ? "Memproses..." : "Selesaikan Paket"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminPaket;