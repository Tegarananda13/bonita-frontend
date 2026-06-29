import { useEffect, useState, useCallback, useRef, type FormEvent, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../../context/AuthContext";
import "./AdminPaket.css";
// ── Types ────────────────────────────────────────────────────────────────────
interface Fasilitas {
  ID: string;
  NamaFasilitas: string;
  Deskripsi: string;
}
interface PaketAdmin {
  ID: string;
  NamaPaket: string;
  FotoPaket: string;
  Harga: number;
  TanggalBerangkat: string;
  Durasi: number;
  Deskripsi: string;
  KuotaMax: number;
  KuotaTerpakai: number;
  BatasPendaftaran: number;
  Fasilitas: Fasilitas[];
}
interface PaketFormData {
  nama_paket: string;
  harga: string;
  durasi: string;
  tanggal_berangkat: string;
  deskripsi: string;
  kuota_max: string;
  batas_pendaftaran: string;
}
const EMPTY_FORM: PaketFormData = {
  nama_paket: "",
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
  const [list, setList] = useState<Fasilitas[]>(paket.Fasilitas ?? []);
  const [nama, setNama] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const auth = { headers: { Authorization: `Bearer ${token}` } };
  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) { setAddError("Nama fasilitas wajib diisi."); return; }
    setAddError("");
    try {
      setAdding(true);
      const res = await axios.post(
        `http://localhost:8080/admin/paket/${paket.ID}/fasilitas`,
        {
          nama_fasilitas: nama.trim(),
          deskripsi: deskripsi.trim(),
        },
        auth
      );
      const paketRes = await axios.get(
        `http://localhost:8080/admin/paket/${paket.ID}`,
        auth
      );

setList(paketRes.data.data.Fasilitas ?? []);
      setNama("");
      setDeskripsi("");
    } catch (err: unknown) {
      setAddError(axios.isAxiosError(err) ? (err.response?.data?.error ?? "Gagal menambah.") : "Gagal menambah.");
    } finally {
      setAdding(false);
    }
  };
  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await axios.delete(`http://localhost:8080/admin/fasilitas/${id}`, auth);
      setList((prev) => prev.filter((f) => f.ID !== id));
    } catch {
      alert("Gagal menghapus fasilitas.");
    } finally {
      setDeletingId(null);
    }
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
          {/* Add form */}
          <form className="fasilitas-add-form" onSubmit={handleAdd} noValidate>
            <div className="fasilitas-add-title">➕ Tambah Fasilitas</div>
            <div className="form-field">
              <input
                className="form-input"
                type="text"
                placeholder="Nama fasilitas (cth. Makan 3x Sehari)"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                disabled={adding}
              />
            </div>
            <div className="form-field">
              <input
                className="form-input"
                type="text"
                placeholder="Deskripsi singkat (opsional)"
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                disabled={adding}
              />
            </div>
            {addError && (
              <div className="drawer-error" style={{ fontSize: "0.8rem", padding: "0.5rem 0.75rem" }}>
                {addError}
              </div>
            )}
            <div className="fasilitas-add-row">
              <button type="submit" className="btn-save" disabled={adding} style={{ fontSize: "0.82rem", padding: "0.55rem 1rem" }}>
                {adding ? <><div className="mini-spinner" />Menyimpan...</> : <>Tambah</>}
              </button>
            </div>
          </form>
          {/* List */}
          <div className="fasilitas-list">
            <div className="fasilitas-list-title">
              Daftar Fasilitas ({list.length})
            </div>
            {list.length === 0 ? (
              <div style={{ textAlign: "center", padding: "1.5rem", color: "#94a3b8", fontSize: "0.85rem" }}>
                Belum ada fasilitas ditambahkan.
              </div>
            ) : (
              list.map((f) => (
                <div className="fasilitas-list-item" key={f.ID}>
                  <div className="fasilitas-item-info">
                    <div className="fasilitas-check-icon">✓</div>
                    <div>
                      <div className="fasilitas-item-name">{f.NamaFasilitas}</div>
                      {f.Deskripsi && (
                        <div className="fasilitas-item-desc">{f.Deskripsi}</div>
                      )}
                    </div>
                  </div>
                  <button
                    className="fasilitas-delete-btn"
                    onClick={() => handleDelete(f.ID)}
                    disabled={deletingId === f.ID}
                    title="Hapus fasilitas"
                  >
                    {deletingId === f.ID ? (
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
  const [form, setForm] = useState<PaketFormData>(() =>
    editData
      ? {
          nama_paket: editData.NamaPaket,
          harga: String(editData.Harga),
          durasi: String(editData.Durasi),
          tanggal_berangkat: toDatetimeLocal(editData.TanggalBerangkat),
          deskripsi: editData.Deskripsi,
          kuota_max: String(editData.KuotaMax),
          batas_pendaftaran: String(editData.BatasPendaftaran),
        }
      : EMPTY_FORM
  );
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string>(editData?.FotoPaket ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const handleField = (k: keyof PaketFormData) => (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const handleFoto = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  };
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.nama_paket.trim()) { setError("Nama paket wajib diisi."); return; }
    if (!form.harga || isNaN(Number(form.harga))) { setError("Harga tidak valid."); return; }
    if (!form.durasi || isNaN(Number(form.durasi))) { setError("Durasi tidak valid."); return; }
    if (!form.tanggal_berangkat) { setError("Tanggal berangkat wajib diisi."); return; }
    if (!form.kuota_max || isNaN(Number(form.kuota_max))) { setError("Kuota maks tidak valid."); return; }
    if (!isEdit && !fotoFile) { setError("Foto paket wajib diupload."); return; }
    const fd = new FormData();
    fd.append("nama_paket", form.nama_paket.trim());
    fd.append("harga", form.harga);
    fd.append("durasi", form.durasi);
    fd.append("tanggal_berangkat", new Date(form.tanggal_berangkat).toISOString());
    fd.append("deskripsi", form.deskripsi.trim());
    fd.append("kuota_max", form.kuota_max);
    fd.append("batas_pendaftaran", form.batas_pendaftaran || "0");
    if (fotoFile) fd.append("foto", fotoFile);
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    };
    try {
      setSubmitting(true);
      if (isEdit) {
        await axios.put(`http://localhost:8080/admin/paket/${editData!.ID}`, fd, { headers });
      } else {
        await axios.post("http://localhost:8080/admin/paket", fd, { headers });
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
            {/* Foto */}
            <div className="form-field">
              <label className="form-label">Foto Paket {!isEdit && <span style={{ color: "#ef4444" }}>*</span>}</label>
              <div className="foto-upload-area">
                <input type="file" accept="image/*" onChange={handleFoto} ref={fileRef} />
                {fotoPreview ? (
                  <div className="foto-preview-wrap">
                    <img src={fotoPreview} alt="Preview" className="foto-preview"
                      onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK; }} />
                    <button
                      type="button"
                      className="foto-preview-remove"
                      onClick={(e) => { e.stopPropagation(); setFotoFile(null); setFotoPreview(""); if (fileRef.current) fileRef.current.value = ""; }}
                    >✕</button>
                  </div>
                ) : (
                  <>
                    <div className="foto-upload-icon">🖼️</div>
                    <div className="foto-upload-text">Klik atau drag foto ke sini</div>
                    <div className="foto-upload-sub">JPG, PNG — maks 5MB</div>
                  </>
                )}
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
  const [paketList, setPaketList] = useState<PaketAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PaketAdmin | null>(null);
  // Fasilitas state
  const [fasilitasPaket, setFasilitasPaket] = useState<PaketAdmin | null>(null);
  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<PaketAdmin | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
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
      setPaketList(res.data?.paket ?? []);
    } catch {
      setPaketList([]);
    } finally {
      setLoading(false);
    }
  }, [authH]);
  useEffect(() => {
    fetchPaket();
  }, [fetchPaket]);
  // ── Delete ──
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      await axios.delete(`http://localhost:8080/admin/paket/${deleteTarget.ID}`, {
        headers: authH(),
      });
      setPaketList((p) => p.filter((x) => x.ID !== deleteTarget.ID));
      setDeleteTarget(null);
    } catch (err: unknown) {
      alert(axios.isAxiosError(err) ? (err.response?.data?.error ?? "Gagal menghapus.") : "Gagal menghapus.");
    } finally {
      setDeleteLoading(false);
    }
  };
  // ── Filtered ──
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
              <th>Harga</th>
              <th>Berangkat</th>
              <th>Kuota</th>
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
                <td colSpan={6}>
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
                          className="action-btn action-btn-fasilitas"
                          onClick={() => setFasilitasPaket(p)}
                          title="Kelola fasilitas"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                          </svg>
                          Fasilitas
                        </button>
                        <button
                          className="action-btn action-btn-edit"
                          onClick={() => { setEditTarget(p); setDrawerOpen(true); }}
                          title="Edit paket"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" />
                          </svg>
                          Edit
                        </button>
                        <button
                          className="action-btn action-btn-delete"
                          onClick={() => setDeleteTarget(p)}
                          title="Hapus paket"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                          Hapus
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
      {/* ── Fasilitas Panel ── */}
      {fasilitasPaket && (
        <FasilitasPanel
          paket={fasilitasPaket}
          token={token!}
          onClose={() => setFasilitasPaket(null)}
        />
      )}
      {/* ── Delete Confirm ── */}
      {deleteTarget && (
        <div
          className="confirm-overlay"
          onClick={(e) => e.target === e.currentTarget && !deleteLoading && setDeleteTarget(null)}
        >
          <div className="confirm-box">
            <div className="confirm-icon">🗑️</div>
            <h3>Hapus Paket?</h3>
            <p>
              Paket <strong>{deleteTarget.NamaPaket}</strong> akan dihapus permanen.
              {(deleteTarget.KuotaTerpakai ?? 0) > 0 && (
                <> Paket ini memiliki <strong>{deleteTarget.KuotaTerpakai} jamaah</strong> — penghapusan mungkin ditolak backend.</>
              )}
            </p>
            <div className="confirm-actions">
              <button
                className="confirm-cancel"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
              >
                Batal
              </button>
              <button
                className="confirm-delete-btn"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminPaket;