import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Public layout
import MainLayout from './components/Layout/MainLayout';
import Home from './pages/Home';
import Paket from './pages/Paket';
import PaketDetail from './pages/PaketDetail';
import Daftar from './pages/Daftar';
import Portal from './pages/Portal';

// Admin
import AdminLogin from './pages/Admin/Login';
import AdminLayout from './pages/Admin/components/AdminLayout';
import AdminDashboard from './pages/Admin/Dashboard';
import AdminPaket from './pages/Admin/Paket';
import AdminPaketDetail from './pages/Admin/Paket/AdminPaketDetail';
import AdminPendaftaran from './pages/Admin/Pendaftaran';
import AdminPembayaran from './pages/Admin/Pembayaran';
import AdminDokumen from './pages/Admin/Dokumen';
import ManajemenAdmin from './pages/Admin/ManajemenAdmin';
import Laporan from './pages/Admin/Laporan';
import ProtectedRoute from './pages/Admin/components/ProtectedRoute';
import TambahJamaah from './pages/Admin/TambahJamaah';
import AdminPengaduan from './pages/Admin/Pengaduan';
import TambahPaket from './pages/Admin/Paket/TambahPaket';
import VerifikasiManager from './pages/Admin/Verifikasi';

// ── Guard: redirect ke dashboard jika sudah login ──────────────────────
const GuestRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/admin/dashboard" replace /> : <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public routes (dengan TopBar) ── */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="paket" element={<Paket />} />
          <Route path="paket/:id" element={<PaketDetail />} />
          <Route path="daftar" element={<Daftar />} />
          <Route path="portal/*" element={<Portal />} />
        </Route>

        {/* ── Admin Login (tanpa layout, tidak ada di navbar publik) ── */}
        <Route
          path="/admin/login"
          element={
            <GuestRoute>
              <AdminLogin />
            </GuestRoute>
          }
        />

        {/* ── Admin Portal (protected, dengan sidebar) ── */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin', 'owner', 'manager', 'administration_manager']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          {/* Redirect /admin → /admin/dashboard */}
          <Route index element={<Navigate to="/admin/dashboard" replace />} />

          {/* Admin & Administration Manager */}
          <Route
            path="dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin', 'owner', 'manager', 'administration_manager']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Administration Manager only */}
          <Route
            path="manajemen-admin"
            element={
              <ProtectedRoute allowedRoles={['owner', 'manager', 'administration_manager']}>
                <ManajemenAdmin />
              </ProtectedRoute>
            }
          />

          <Route
            path="laporan"
            element={
              <ProtectedRoute allowedRoles={['owner', 'manager', 'administration_manager']}>
                <Laporan />
              </ProtectedRoute>
            }
          />

          <Route
            path="verifikasi"
            element={
              <ProtectedRoute allowedRoles={['owner', 'manager', 'administration_manager']}>
                <VerifikasiManager />
              </ProtectedRoute>
            }
          />

          {/* Placeholder pages — bisa diisi nanti */}
          <Route path="paket" element={<AdminPaket />} />
          <Route path="paket/tambah" element={<TambahPaket />} />
          <Route path="paket/:id" element={<AdminPaketDetail />} />
          <Route path="pendaftaran" element={<AdminPendaftaran />} />
          <Route path="tambah-jamaah" element={<TambahJamaah />} />
          <Route path="pembayaran" element={<AdminPembayaran />} />
          <Route path="dokumen" element={<AdminDokumen />} />
          <Route path="pengaduan" element={<AdminPengaduan />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

// ── Simple placeholder untuk halaman yang belum dibuat ──────────────────
export const ComingSoon = ({ title }: { title: string }) => (
  <div style={{
    textAlign: 'center',
    padding: '4rem 2rem',
    color: '#64748b',
  }}>
    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚧</div>
    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
      {title}
    </h2>
    <p style={{ fontSize: '0.875rem' }}>Halaman ini sedang dalam pengembangan.</p>
  </div>
);

export default App;
