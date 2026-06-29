import { useEffect, useState, useCallback, type FormEvent } from "react";
import axios from "axios";
import { useAuth } from "../../../context/AuthContext";
import "./ManajemenAdmin.css";

interface AdminUser {
  id: string;
  nama: string;
  username: string;
  role: string;
  created_at: string;
}

const ManajemenAdmin = () => {
  const { token } = useAuth();

  // ── List state ──
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // ── Form state ──
  const [nama, setNama] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // ── Delete confirm ──
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  // ── Fetch list ──
  const fetchAdmins = useCallback(async () => {
    try {
      setLoadingList(true);
      const res = await axios.get("http://localhost:8080/owner/admin", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAdmins(res.data?.admins ?? []);
    } catch {
      setAdmins([]);
    } finally {
      setLoadingList(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  // ── Create admin ──
  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!nama.trim() || !username.trim() || !password.trim()) {
      setFormError("Semua field wajib diisi.");
      return;
    }

    if (password.length < 6) {
      setFormError("Password minimal 6 karakter.");
      return;
    }

    try {
      setSubmitting(true);
      await axios.post(
        "http://localhost:8080/owner/admin",
        { nama: nama.trim(), username: username.trim(), password },
        authHeader
      );
      setFormSuccess(`Admin "${nama}" berhasil dibuat.`);
      setNama("");
      setUsername("");
      setPassword("");
      fetchAdmins();
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setFormError(err.response.data.error);
      } else {
        setFormError("Gagal membuat admin. Coba lagi.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete admin ──
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      await axios.delete(
        `http://localhost:8080/owner/admin/${deleteTarget.id}`,
        authHeader
      );
      setAdmins((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      setDeleteTarget(null);
      setDeletingId(null);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        alert(err.response.data.error);
      } else {
        alert("Gagal menghapus admin.");
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <div className="manajemen-page">
      {/* ── Header ── */}
      <div className="manajemen-header">
        <div className="manajemen-header-text">
          <h2>Manajemen Admin</h2>
          <p>Tambah, lihat, dan hapus akun admin Bonita Umroh.</p>
        </div>
      </div>

      {/* ── Form Tambah Admin ── */}
      <div className="add-admin-card">
        <div className="add-admin-card-title">
          <span>➕</span> Tambah Admin Baru
        </div>
        <form onSubmit={handleCreate} noValidate>
          <div className="add-admin-form">
            <div className="form-field">
              <label className="form-label" htmlFor="admin-nama">Nama Lengkap</label>
              <input
                id="admin-nama"
                className="form-input"
                type="text"
                placeholder="cth. Budi Santoso"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                disabled={submitting}
              />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="admin-username">Username</label>
              <input
                id="admin-username"
                className="form-input"
                type="text"
                placeholder="cth. budi.admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={submitting}
              />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="admin-password">Password</label>
              <input
                id="admin-password"
                className="form-input"
                type="password"
                placeholder="Min. 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
              />
            </div>

            <button type="submit" className="form-submit-btn" disabled={submitting}>
              {submitting ? (
                <>
                  <div className="login-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                  Menyimpan...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Tambah
                </>
              )}
            </button>
          </div>

          {/* Feedback */}
          {formError && (
            <div className="form-error-msg" key={formError}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {formError}
            </div>
          )}
          {formSuccess && (
            <div className="form-success" key={formSuccess}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              {formSuccess}
            </div>
          )}
        </form>
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
                <th>Bergabung</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id}>
                  <td>
                    <div className="admin-name-cell">
                      <div className="admin-avatar">{getInitials(admin.nama)}</div>
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
                    <span className="admin-date">{formatDate(admin.created_at)}</span>
                  </td>
                  <td>
                    <button
                      className="delete-btn"
                      disabled={deletingId === admin.id}
                      onClick={() => {
                        setDeleteTarget(admin);
                        setDeletingId(admin.id);
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Confirm Delete Dialog ── */}
      {deleteTarget && (
        <div className="confirm-overlay" onClick={(e) => e.target === e.currentTarget && !deleteLoading && setDeleteTarget(null)}>
          <div className="confirm-box">
            <div className="confirm-icon">🗑️</div>
            <h3>Hapus Admin?</h3>
            <p>
              Anda akan menghapus akun admin <strong>{deleteTarget.nama}</strong>{" "}
              (@{deleteTarget.username}). Tindakan ini tidak bisa dibatalkan.
            </p>
            <div className="confirm-actions">
              <button
                className="confirm-cancel"
                onClick={() => { setDeleteTarget(null); setDeletingId(null); }}
                disabled={deleteLoading}
              >
                Batal
              </button>
              <button
                className="confirm-delete"
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

export default ManajemenAdmin;
