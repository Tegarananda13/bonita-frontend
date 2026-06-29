import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../../context/AuthContext";
import "./Login.css";

const AdminLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Username dan password wajib diisi.");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post("http://localhost:8080/login", {
        username: username.trim(),
        password,
      });

      const { token, role } = res.data;

      // Hanya izinkan admin dan owner masuk
      if (role !== "admin" && role !== "owner") {
        setError("Akses ditolak. Akun ini bukan admin atau owner.");
        return;
      }

      login(token, role);
      navigate("/admin/dashboard", { replace: true });
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError("Terjadi kesalahan. Coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* ── Left Panel ── */}
      <div className="login-left">
        <div className="login-left-bg" />
        <div className="login-left-pattern" />

        <div className="login-left-content">
          {/* Brand */}
          <div className="login-brand">
            <div className="login-brand-icon">🕌</div>
            <div>
              <div className="login-brand-name">Bonita Umroh</div>
              <div className="login-brand-sub">Admin Portal</div>
            </div>
          </div>

          {/* Tagline */}
          <div className="login-tagline">
            <h2>
              Kelola Perjalanan <br />
              <span>Ibadah dengan Mudah</span>
            </h2>
            <p>
              Platform manajemen terpadu untuk admin dan owner dalam
              mengelola paket, jamaah, dan pembayaran umroh.
            </p>
          </div>
        </div>

        {/* Feature list */}
        <div className="login-left-footer">
          <div className="login-feature-list">
            {[
              { icon: "📋", text: "Manajemen paket & fasilitas" },
              { icon: "👥", text: "Kelola data jamaah & pendaftaran" },
              { icon: "💳", text: "Verifikasi pembayaran real-time" },
              { icon: "👑", text: "Owner: manajemen akun admin" },
            ].map((f, i) => (
              <div className="login-feature-item" key={i}>
                <div className="login-feature-dot">{f.icon}</div>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Panel (Form) ── */}
      <div className="login-right">
        <div className="login-form-wrap">
          <div className="login-form-header">
            <h1 className="login-form-title">Selamat Datang</h1>
            <p className="login-form-subtitle">
              Masuk dengan akun admin atau owner Anda.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {/* Error */}
            {error && (
              <div className="login-error" key={error}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" x2="12" y1="8" y2="12" />
                  <line x1="12" x2="12.01" y1="16" y2="16" />
                </svg>
                {error}
              </div>
            )}

            {/* Username */}
            <div className="login-field">
              <label className="login-label" htmlFor="username">
                Username
              </label>
              <div className="login-input-wrap">
                <span className="login-input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <input
                  id="username"
                  type="text"
                  className="login-input"
                  placeholder="Masukkan username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div className="login-field">
              <label className="login-label" htmlFor="password">
                Password
              </label>
              <div className="login-input-wrap">
                <span className="login-input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="login-input has-toggle"
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((p) => !p)}
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" x2="23" y1="1" y2="23" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="login-btn"
              disabled={loading}
              id="login-submit"
            >
              {loading ? (
                <>
                  <div className="login-spinner" />
                  Memverifikasi...
                </>
              ) : (
                <>
                  Masuk
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <p className="login-form-note">
            Portal ini hanya untuk admin & owner Bonita Umroh.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
