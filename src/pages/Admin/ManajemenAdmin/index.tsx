import { useEffect, useState, useCallback, type FormEvent } from "react";
import axios from "axios";
import { useAuth } from "../../../context/AuthContext";
import "./ManajemenAdmin.css";

// ── Types ─────────────────────────────────────────────────────────────────────
interface AdminUser {
  id: string;
  nama: string;
  username: string;
  role: string;
  no_hp: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatDate = (iso: string) =>
  iso
    ? new Date(iso).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";

const getInitials = (nama: string) =>
  (nama || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

// ── ManajemenAdmin ─────────────────────────────────────────────────────────────
const ManajemenAdmin = () => {
  const { token } = useAuth();

  // ── List state ──
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // ── Modal state: "add" | "detail" | "edit" | null ──
  const [modal, setModal] = useState<"add" | "detail" | "edit" | null>(null);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);

  // ── Add form state ──
  const [addForm, setAddForm] = useState({
    nama: "",
    username: "",
    password: "",
    no_hp: "",
    email: "",
  });
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState("");

  // ── Edit form state ──
  const [editForm, setEditForm] = useState({
    nama: "",
    username: "",
    no_hp: "",
    email: "",
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

  // ── Deactivate / Reactivate state ──
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionTarget, setActionTarget] = useState<AdminUser | null>(null);

  // ── Toast notification ──
  const [toast, setToast] = useState("");
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  // ── Fetch list ──
  const fetchAdmins = useCallback(async () => {
    try {
      setLoadingList(true);
      const res = await axios.get("http://localhost:8080/owner/admin", authHeader);
      setAdmins(res.data?.admins ?? []);
    } catch {
      setAdmins([]);
    } finally {
      setLoadingList(false);
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  // ── Helpers modal ──
  const openAdd = () => {
    setAddForm({ nama: "", username: "", password: "", no_hp: "", email: "" });
    setAddError("");
    setModal("add");
  };

  const openDetail = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setModal("detail");
  };

  const openEdit = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setEditForm({
      nama: admin.nama,
      username: admin.username,
      no_hp: admin.no_hp ?? "",
      email: admin.email ?? "",
    });
    setEditError("");
    setModal("edit");
  };

  const closeModal = () => {
    if (addSubmitting || editSubmitting) return;
    setModal(null);
    setSelectedAdmin(null);
  };

  // ── Submit Tambah Admin ──
  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setAddError("");

    const { nama, username, password, no_hp, email } = addForm;

    if (!nama.trim()) { setAddError("Nama lengkap wajib diisi."); return; }
    if (!username.trim()) { setAddError("Username wajib diisi."); return; }
    if (password.length < 6) { setAddError("Password minimal 6 karakter."); return; }

    setAddSubmitting(true);
    try {
      await axios.post(
        "http://localhost:8080/owner/admin",
        { nama: nama.trim(), username: username.trim(), password, no_hp: no_hp.trim(), email: email.trim() },
        authHeader
      );
      setModal(null);
      showToast("✅ Admin berhasil ditambahkan.");
      fetchAdmins();
    } catch (err: unknown) {
      setAddError(
        axios.isAxiosError(err)
          ? err.response?.data?.error ?? "Gagal menambahkan admin."
          : "Gagal menambahkan admin."
      );
    } finally {
      setAddSubmitting(false);
    }
  };

  // ── Submit Edit Admin ──
  const handleEdit = async (e: FormEvent) => {
    e.preventDefault();
    setEditError("");
    if (!selectedAdmin) return;

    const { nama, username, no_hp, email } = editForm;
    if (!nama.trim()) { setEditError("Nama lengkap wajib diisi."); return; }
    if (!username.trim()) { setEditError("Username wajib diisi."); return; }

    setEditSubmitting(true);
    try {
      await axios.put(
        `http://localhost:8080/owner/admin/${selectedAdmin.id}`,
        { nama: nama.trim(), username: username.trim(), no_hp: no_hp.trim(), email: email.trim() },
        authHeader
      );
      setModal(null);
      showToast("✅ Data admin berhasil diperbarui.");
      fetchAdmins();
    } catch (err: unknown) {
      setEditError(
        axios.isAxiosError(err)
          ? err.response?.data?.error ?? "Gagal memperbarui data admin."
          : "Gagal memperbarui data admin."
      );
    } finally {
      setEditSubmitting(false);
    }
  };

  // ── Deactivate / Reactivate ──
  const handleToggleActive = async (admin: AdminUser) => {
    setActionTarget(admin);
    setActionLoading(admin.id);
    const endpoint = admin.is_active ? "deactivate" : "reactivate";
    try {
      await axios.patch(
        `http://localhost:8080/owner/admin/${admin.id}/${endpoint}`,
        {},
        authHeader
      );
      showToast(admin.is_active
        ? `⚠️ Akun ${admin.nama} telah dinonaktifkan.`
        : `✅ Akun ${admin.nama} telah diaktifkan kembali.`
      );
      fetchAdmins();
    } catch (err: unknown) {
      showToast(
        axios.isAxiosError(err)
          ? `❌ ${err.response?.data?.error ?? "Terjadi kesalahan."}`
          : "❌ Terjadi kesalahan."
      );
    } finally {
      setActionLoading(null);
      setActionTarget(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="manajemen-page">

      {/* ── Toast ── */}
      {toast && (
        <div className="ma-toast">
          {toast}
        </div>
      )}

      {/* ── Header ── */}
      <div className="manajemen-header">
        <div className="manajemen-header-text">
          <h2>Manajemen Admin</h2>
          <p>Tambah, lihat, dan kelola akun admin Bonita Umroh.</p>
        </div>
        <button className="ma-add-btn" onClick={openAdd}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Tambah Admin
        </button>
      </div>

      {/* ── List Admin ── */}
      <div className="admin-list-card">
        <div className="admin-list-header">
          <div className="admin-list-title">
            Daftar Admin
            {!loadingList && (
              <span className="admin-count-badge">{admins.length}</span>
            )}
          </div>
        </div>

        {loadingList ? (
          <>
            {[1, 2, 3].map((i) => (
              <div className="table-skeleton-row" key={i}>
                <div className="table-skel-avatar" />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div className="table-skel-line" style={{ width: "40%" }} />
                  <div className="table-skel-line" style={{ width: "25%" }} />
                </div>
                <div className="table-skel-line" style={{ width: 60 }} />
              </div>
            ))}
          </>
        ) : admins.length === 0 ? (
          <div className="table-empty">
            <div className="table-empty-icon">👤</div>
            <p>Belum ada admin terdaftar.</p>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Admin</th>
                <th>Role</th>
                <th>Status</th>
                <th>Bergabung</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id} className={!admin.is_active ? "ma-row-inactive" : ""}>
                  <td>
                    <div className="admin-name-cell">
                      <div className={`admin-avatar${!admin.is_active ? " avatar-inactive" : ""}`}>
                        {getInitials(admin.nama)}
                      </div>
                      <div>
                        <div className="admin-name">{admin.nama}</div>
                        <div className="admin-username">@{admin.username}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="admin-role-pill pill-admin">{admin.role}</span>
                  </td>
                  <td>
                    <span className={`ma-status-pill ${admin.is_active ? "pill-active" : "pill-inactive"}`}>
                      {admin.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td>
                    <span className="admin-date">{formatDate(admin.created_at)}</span>
                  </td>
                  <td>
                    <div className="ma-action-group">
                      <button
                        className="ma-btn-detail"
                        onClick={() => openDetail(admin)}
                        title="Lihat detail"
                      >
                        Detail
                      </button>
                      <button
                        className="ma-btn-edit"
                        onClick={() => openEdit(admin)}
                        title="Edit admin"
                      >
                        Edit
                      </button>
                      <button
                        className={`ma-btn-toggle ${admin.is_active ? "btn-deactivate" : "btn-reactivate"}`}
                        onClick={() => handleToggleActive(admin)}
                        disabled={actionLoading === admin.id}
                        title={admin.is_active ? "Nonaktifkan" : "Aktifkan kembali"}
                      >
                        {actionLoading === admin.id
                          ? "..."
                          : admin.is_active ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          MODAL: TAMBAH ADMIN
      ══════════════════════════════════════════════════ */}
      {modal === "add" && (
        <div
          className="ma-overlay"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="ma-modal">
            <div className="ma-modal-header">
              <div className="ma-modal-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 1 0-16 0" />
                  <path d="M19 8v6M22 11h-6" />
                </svg>
                Tambah Admin Baru
              </div>
              <button className="ma-modal-close" onClick={closeModal} disabled={addSubmitting}>✕</button>
            </div>

            <form onSubmit={handleAdd} noValidate>
              <div className="ma-form-body">

                <div className="ma-field">
                  <label className="ma-label" htmlFor="add-nama">Nama Lengkap <span className="ma-required">*</span></label>
                  <input
                    id="add-nama"
                    className="ma-input"
                    type="text"
                    placeholder="cth. Budi Santoso"
                    value={addForm.nama}
                    onChange={(e) => setAddForm((f) => ({ ...f, nama: e.target.value }))}
                    disabled={addSubmitting}
                    autoFocus
                  />
                </div>

                <div className="ma-field">
                  <label className="ma-label" htmlFor="add-username">Username <span className="ma-required">*</span></label>
                  <input
                    id="add-username"
                    className="ma-input"
                    type="text"
                    placeholder="cth. budi.admin"
                    value={addForm.username}
                    onChange={(e) => setAddForm((f) => ({ ...f, username: e.target.value }))}
                    disabled={addSubmitting}
                  />
                </div>

                <div className="ma-field">
                  <label className="ma-label" htmlFor="add-password">Password <span className="ma-required">*</span></label>
                  <input
                    id="add-password"
                    className="ma-input"
                    type="password"
                    placeholder="Min. 6 karakter"
                    value={addForm.password}
                    onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))}
                    disabled={addSubmitting}
                  />
                </div>

                <div className="ma-field">
                  <label className="ma-label" htmlFor="add-nohp">Nomor HP</label>
                  <input
                    id="add-nohp"
                    className="ma-input"
                    type="tel"
                    placeholder="cth. 081234567890"
                    value={addForm.no_hp}
                    onChange={(e) => setAddForm((f) => ({ ...f, no_hp: e.target.value }))}
                    disabled={addSubmitting}
                  />
                </div>

                <div className="ma-field">
                  <label className="ma-label" htmlFor="add-email">Email</label>
                  <input
                    id="add-email"
                    className="ma-input"
                    type="email"
                    placeholder="cth. budi@bonita.com"
                    value={addForm.email}
                    onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                    disabled={addSubmitting}
                  />
                </div>

              </div>

              {addError && (
                <div className="ma-form-error">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {addError}
                </div>
              )}

              <div className="ma-modal-footer">
                <button type="button" className="ma-btn-cancel" onClick={closeModal} disabled={addSubmitting}>
                  Batal
                </button>
                <button type="submit" className="ma-btn-submit" disabled={addSubmitting}>
                  {addSubmitting ? (
                    <><div className="ma-spinner" /> Menyimpan...</>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      Tambah Admin
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          MODAL: DETAIL ADMIN
      ══════════════════════════════════════════════════ */}
      {modal === "detail" && selectedAdmin && (
        <div
          className="ma-overlay"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="ma-modal">
            <div className="ma-modal-header">
              <div className="ma-modal-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 1 0-16 0" />
                </svg>
                Detail Admin
              </div>
              <button className="ma-modal-close" onClick={closeModal}>✕</button>
            </div>

            <div className="ma-detail-body">
              <div className="ma-detail-avatar">
                {getInitials(selectedAdmin.nama)}
              </div>
              <div className="ma-detail-name">{selectedAdmin.nama}</div>
              <div className="ma-detail-username">@{selectedAdmin.username}</div>
              <div className="ma-detail-status">
                <span className={`ma-status-pill ${selectedAdmin.is_active ? "pill-active" : "pill-inactive"}`}>
                  {selectedAdmin.is_active ? "Aktif" : "Nonaktif"}
                </span>
              </div>

              <div className="ma-detail-grid">
                <div className="ma-detail-item">
                  <div className="ma-detail-label">Role</div>
                  <div className="ma-detail-value">
                    <span className="admin-role-pill pill-admin">{selectedAdmin.role}</span>
                  </div>
                </div>
                <div className="ma-detail-item">
                  <div className="ma-detail-label">Nomor HP</div>
                  <div className="ma-detail-value">{selectedAdmin.no_hp || "-"}</div>
                </div>
                <div className="ma-detail-item">
                  <div className="ma-detail-label">Email</div>
                  <div className="ma-detail-value">{selectedAdmin.email || "-"}</div>
                </div>
                <div className="ma-detail-item">
                  <div className="ma-detail-label">Bergabung</div>
                  <div className="ma-detail-value">{formatDate(selectedAdmin.created_at)}</div>
                </div>
              </div>
            </div>

            <div className="ma-modal-footer">
              <button type="button" className="ma-btn-cancel" onClick={closeModal}>
                Tutup
              </button>
              <button type="button" className="ma-btn-submit" onClick={() => openEdit(selectedAdmin)}>
                Edit Admin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          MODAL: EDIT ADMIN
      ══════════════════════════════════════════════════ */}
      {modal === "edit" && selectedAdmin && (
        <div
          className="ma-overlay"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="ma-modal">
            <div className="ma-modal-header">
              <div className="ma-modal-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit Admin — {selectedAdmin.nama}
              </div>
              <button className="ma-modal-close" onClick={closeModal} disabled={editSubmitting}>✕</button>
            </div>

            <form onSubmit={handleEdit} noValidate>
              <div className="ma-form-body">

                <div className="ma-field">
                  <label className="ma-label" htmlFor="edit-nama">Nama Lengkap <span className="ma-required">*</span></label>
                  <input
                    id="edit-nama"
                    className="ma-input"
                    type="text"
                    value={editForm.nama}
                    onChange={(e) => setEditForm((f) => ({ ...f, nama: e.target.value }))}
                    disabled={editSubmitting}
                    autoFocus
                  />
                </div>

                <div className="ma-field">
                  <label className="ma-label" htmlFor="edit-username">Username <span className="ma-required">*</span></label>
                  <input
                    id="edit-username"
                    className="ma-input"
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))}
                    disabled={editSubmitting}
                  />
                </div>

                <div className="ma-field">
                  <label className="ma-label" htmlFor="edit-nohp">Nomor HP</label>
                  <input
                    id="edit-nohp"
                    className="ma-input"
                    type="tel"
                    value={editForm.no_hp}
                    onChange={(e) => setEditForm((f) => ({ ...f, no_hp: e.target.value }))}
                    disabled={editSubmitting}
                  />
                </div>

                <div className="ma-field">
                  <label className="ma-label" htmlFor="edit-email">Email</label>
                  <input
                    id="edit-email"
                    className="ma-input"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                    disabled={editSubmitting}
                  />
                </div>

                <div className="ma-note">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  Untuk mengubah password, gunakan fitur Reset Password yang terpisah.
                </div>

              </div>

              {editError && (
                <div className="ma-form-error">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {editError}
                </div>
              )}

              <div className="ma-modal-footer">
                <button type="button" className="ma-btn-cancel" onClick={closeModal} disabled={editSubmitting}>
                  Batal
                </button>
                <button type="submit" className="ma-btn-submit" disabled={editSubmitting}>
                  {editSubmitting ? (
                    <><div className="ma-spinner" /> Menyimpan...</>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                        <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
                      </svg>
                      Simpan Perubahan
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Suppress unused var warning */}
      {actionTarget && <></>}

    </div>
  );
};

export default ManajemenAdmin;
