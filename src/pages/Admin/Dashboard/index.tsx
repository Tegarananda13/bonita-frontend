import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { LuEye } from "react-icons/lu";
import { useAuth } from "../../../context/AuthContext";
import { DashboardBarChart, DashboardDoughnutChart } from "./DashboardCharts";
// Modal detail yang sama dengan halaman Pendaftaran & Verifikasi (juga memuat CSS tombol standar .detail-btn / .verifikasi-btn-periksa)
import { DetailModal } from "../Pendaftaran";
import { DetailVerifikasiModal } from "../Verifikasi";
import "./Dashboard.css";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

interface DashboardData {
  total_paket?: number;
  total_pendaftaran?: number;
  total_pembayaran_pending?: number;
  total_dokumen_pending?: number;
}

interface ManagerBadgeData {
  menunggu_verifikasi: number;
  perlu_perbaikan: number;
  siap_berangkat: number;
}

interface PendaftaranRow {
  nomor_pendaftaran: string;
  nomor_invoice?: string;
  nama_customer: string;
  paket: string;
  status: string;
  document_status?: string;
  payment_status?: string;
  tanggal_daftar: string;
}

interface QueueRow extends PendaftaranRow {
  total_jamaah?: number;
  approved_at?: string | null;
  approver_nama?: string;
  catatan_verifikasi_manager?: string;
}

// Field paket dikirim backend dalam PascalCase (model tanpa json tag), kecuali status_perjalanan.
interface PaketRow {
  ID: string;
  NamaPaket: string;
  TanggalBerangkat: string;
  KuotaMax: number;
  KuotaTerpakai: number;
  IsActive: boolean;
  IsFinished: boolean;
}

const quicklinks = [
  { to: "/admin/paket", icon: "✨", label: "Paket Umrah" },
  { to: "/admin/pendaftaran", icon: "👥", label: "Pendaftaran" },
  { to: "/admin/pembayaran", icon: "💳", label: "Pembayaran" },
  { to: "/admin/dokumen", icon: "📄", label: "Dokumen" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d?: string | null) => {
  if (!d) return "-";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

type Tone = "success" | "warning" | "danger" | "info" | "muted";

const STATUS_BADGE: Record<string, { label: string; tone: Tone }> = {
  proses: { label: "Proses", tone: "info" },
  sedang_diproses: { label: "Sedang Diproses", tone: "info" },
  menunggu_dokumen: { label: "Menunggu Dokumen", tone: "warning" },
  menunggu_pembayaran: { label: "Menunggu Bayar", tone: "warning" },
  menunggu_verifikasi_manager: { label: "Menunggu Verifikasi Manager", tone: "warning" },
  perlu_perbaikan: { label: "Perlu Perbaikan", tone: "danger" },
  siap_berangkat: { label: "Siap Berangkat", tone: "success" },
  selesai: { label: "Selesai", tone: "success" },
  batal: { label: "Batal", tone: "danger" },
  kadaluarsa: { label: "Kadaluarsa", tone: "muted" },
  lunas: { label: "Lunas", tone: "success" },
  dp: { label: "DP", tone: "info" },
  belum: { label: "Belum Bayar", tone: "muted" },
  lengkap: { label: "Lengkap", tone: "success" },
  belum_lengkap: { label: "Belum Lengkap", tone: "warning" },
  revisi: { label: "Revisi", tone: "danger" },
  pending: { label: "Pending", tone: "warning" },
};

const Badge = ({ value }: { value?: string }) => {
  if (!value) return <span className="dash-badge dash-badge-muted">-</span>;
  const s = STATUS_BADGE[value.toLowerCase()] ?? { label: value, tone: "muted" as Tone };
  return <span className={`dash-badge dash-badge-${s.tone}`}>{s.label}</span>;
};

// Warna & urutan status untuk grafik distribusi (hanya status yang benar-benar ada di sistem).
const DISTRIBUTION: { key: string; label: string; color: string }[] = [
  { key: "menunggu_dokumen", label: "Menunggu Dokumen", color: "#fbbf24" },
  { key: "menunggu_pembayaran", label: "Menunggu Pembayaran", color: "#fb923c" },
  { key: "proses", label: "Proses", color: "#60a5fa" },
  { key: "menunggu_verifikasi_manager", label: "Menunggu Verifikasi", color: "#a78bfa" },
  { key: "perlu_perbaikan", label: "Perlu Perbaikan", color: "#f87171" },
  { key: "siap_berangkat", label: "Siap Berangkat", color: "#2d9e6b" },
  { key: "selesai", label: "Selesai", color: "#0f766e" },
  { key: "batal", label: "Batal", color: "#94a3b8" },
  { key: "kadaluarsa", label: "Kadaluarsa", color: "#cbd5e1" },
];

const SectionCard = ({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section className="dash-card">
    <div className="dash-card-head">
      <div>
        <h3 className="dash-card-title">{title}</h3>
        {subtitle && <p className="dash-card-sub">{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </section>
);

const EmptyState = ({ text }: { text: string }) => <div className="dash-empty">{text}</div>;
const ErrorState = ({ text }: { text: string }) => <div className="dash-error">⚠️ {text}</div>;
const LoadingBlock = () => <div className="dash-loading-block" aria-busy="true" />;

// ── Page ─────────────────────────────────────────────────────────────────────

const AdminDashboard = () => {
  const { token, role } = useAuth();
  const isManager = role === "owner" || role === "manager" || role === "administration_manager";

  const [data, setData] = useState<DashboardData | null>(null);
  const [list, setList] = useState<PendaftaranRow[] | null>(null);
  const [badges, setBadges] = useState<ManagerBadgeData | null>(null);
  const [queue, setQueue] = useState<QueueRow[] | null>(null);
  const [approved, setApproved] = useState<QueueRow[] | null>(null);
  const [perbaikan, setPerbaikan] = useState<QueueRow[] | null>(null);
  const [paket, setPaket] = useState<PaketRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  // Modal detail dibuka lokal di atas dashboard (tanpa navigasi/ubah route)
  const [detailNomor, setDetailNomor] = useState<string | null>(null);
  const [periksaNomor, setPeriksaNomor] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const headers = { Authorization: `Bearer ${token}` };
    // Setiap sumber data independen: satu endpoint gagal tidak mematikan seluruh dashboard.
    const get = async <T,>(path: string): Promise<T | null> => {
      try {
        return (await axios.get<T>(`${API}${path}`, { headers })).data;
      } catch {
        return null;
      }
    };

    const load = async () => {
      const [d, l] = await Promise.all([
        get<DashboardData>("/admin/dashboard"),
        get<{ data: PendaftaranRow[] | null }>("/admin/pendaftaran"),
      ]);
      if (cancelled) return;
      setData(d);
      setList(l ? l.data ?? [] : null);

      if (isManager) {
        const [b, q, a, p, pk] = await Promise.all([
          get<ManagerBadgeData>("/manager/badges"),
          get<{ data: QueueRow[] | null }>("/manager/verifikasi?status=menunggu_verifikasi_manager"),
          get<{ data: QueueRow[] | null }>("/manager/verifikasi?status=siap_berangkat"),
          get<{ data: QueueRow[] | null }>("/manager/verifikasi?status=perlu_perbaikan"),
          get<{ data: PaketRow[] | null }>("/admin/paket"),
        ]);
        if (cancelled) return;
        setBadges(b);
        setQueue(q ? q.data ?? [] : null);
        setApproved(a ? a.data ?? [] : null);
        setPerbaikan(p ? p.data ?? [] : null);
        setPaket(pk ? pk.data ?? [] : null);
      }
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [token, isManager, reloadKey]);

  const hour = new Date().getHours();
  const greeting =
    hour < 11 ? "Selamat Pagi" : hour < 15 ? "Selamat Siang" : hour < 19 ? "Selamat Sore" : "Selamat Malam";

  // ── KPI ──
  const adminStats = [
    { icon: "✨", iconClass: "stat-icon-green", label: "Total Paket Tersedia", value: data?.total_paket ?? 0, sub: "paket umrah", to: "/admin/paket" },
    { icon: "👥", iconClass: "stat-icon-emerald", label: "Total Pendaftaran", value: data?.total_pendaftaran ?? 0, sub: "jamaah terdaftar", to: "/admin/pendaftaran" },
    { icon: "💳", iconClass: "stat-icon-amber", label: "Pembayaran Pending", value: data?.total_pembayaran_pending ?? 0, sub: "menunggu verifikasi", to: "/admin/pembayaran" },
    { icon: "📄", iconClass: "stat-icon-rose", label: "Dokumen Pending", value: data?.total_dokumen_pending ?? 0, sub: "menunggu verifikasi", to: "/admin/dokumen" },
  ];
  const managerStats = [
    { icon: "⏳", iconClass: "stat-icon-amber", label: "Menunggu Verifikasi", value: badges?.menunggu_verifikasi ?? 0, sub: "antrean verifikasi Manager", to: "/admin/verifikasi" },
    { icon: "⚠️", iconClass: "stat-icon-rose", label: "Perlu Perbaikan", value: badges?.perlu_perbaikan ?? 0, sub: "dikembalikan ke Admin", to: "/admin/pendaftaran" },
    { icon: "✅", iconClass: "stat-icon-emerald", label: "Siap Berangkat", value: badges?.siap_berangkat ?? 0, sub: "disahkan Manager", to: "/admin/pendaftaran" },
    { icon: "👥", iconClass: "stat-icon-green", label: "Total Pendaftaran", value: data?.total_pendaftaran ?? 0, sub: "seluruh jamaah", to: "/admin/pendaftaran" },
  ];
  const stats = isManager ? managerStats : adminStats;

  // ── Admin: pendaftaran per bulan (6 bulan terakhir) dari data pendaftaran aktual ──
  const monthly = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" }),
        count: 0,
      });
    }
    for (const p of list ?? []) {
      const d = new Date(p.tanggal_daftar);
      if (isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const m = months.find((x) => x.key === key);
      if (m) m.count++;
    }
    return months;
  }, [list]);
  const monthlyLabels = useMemo(() => monthly.map((m) => m.label), [monthly]);
  const monthlyValues = useMemo(() => monthly.map((m) => m.count), [monthly]);
  const monthlyTotal = monthlyValues.reduce((a, b) => a + b, 0);

  const recent = useMemo(
    () =>
      [...(list ?? [])]
        .sort((a, b) => new Date(b.tanggal_daftar).getTime() - new Date(a.tanggal_daftar).getTime())
        .slice(0, 8),
    [list]
  );

  // ── Manager: distribusi status, dihitung per pendaftaran/invoice grup (tanpa hitung ganda anggota grup) ──
  const distribution = useMemo(() => {
    const seen = new Set<string>();
    const counts: Record<string, number> = {};
    for (const p of list ?? []) {
      const key = p.nomor_invoice || p.nomor_pendaftaran;
      if (seen.has(key)) continue;
      seen.add(key);
      const s = (p.status || "").toLowerCase();
      counts[s] = (counts[s] ?? 0) + 1;
    }
    return DISTRIBUTION.filter((d) => (counts[d.key] ?? 0) > 0).map((d) => ({ ...d, count: counts[d.key] }));
  }, [list]);
  const distLabels = useMemo(() => distribution.map((d) => d.label), [distribution]);
  const distValues = useMemo(() => distribution.map((d) => d.count), [distribution]);
  const distColors = useMemo(() => distribution.map((d) => d.color), [distribution]);
  const distTotal = distValues.reduce((a, b) => a + b, 0);

  // ── Manager: jadwal keberangkatan terdekat ──
  const upcoming = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (paket ?? [])
      .filter((p) => !p.IsFinished && p.IsActive && new Date(p.TanggalBerangkat).getTime() >= today.getTime())
      .sort((a, b) => new Date(a.TanggalBerangkat).getTime() - new Date(b.TanggalBerangkat).getTime())
      .slice(0, 5);
  }, [paket]);

  const recentApproved = useMemo(
    () =>
      [...(approved ?? [])]
        .sort((a, b) => new Date(b.approved_at ?? 0).getTime() - new Date(a.approved_at ?? 0).getTime())
        .slice(0, 5),
    [approved]
  );

  const pembayaranPending = data?.total_pembayaran_pending ?? 0;
  const dokumenPending = data?.total_dokumen_pending ?? 0;

  return (
    <div className="dashboard-page">
      {/* Welcome */}
      <div className="dashboard-welcome">
        <div className="welcome-text">
          <h2>
            {greeting}, {isManager ? "Administration Manager 🛡️" : "Admin"}!
          </h2>
          <p>
            {isManager
              ? "Berikut ringkasan verifikasi akhir dan aktivitas pendaftaran Bonita Umrah."
              : "Berikut ringkasan aktivitas hari ini di Bonita Umrah."}
          </p>
        </div>
        <div className="welcome-icon">🕌</div>
      </div>

      {!loading && !data && <ErrorState text="Gagal memuat data dashboard. Pastikan backend berjalan." />}

      {/* KPI */}
      <div>
        <div className="dashboard-section-title">{isManager ? "Ringkasan Verifikasi & Status" : "Ringkasan"}</div>
        {loading ? (
          <div className="dashboard-skeleton-stats">
            {[1, 2, 3, 4].map((i) => (
              <div className="dash-skel-card" key={i}>
                <div className="dash-skel-icon" />
                <div className="dash-skel-body">
                  <div className="dash-skel-line" style={{ width: "50%" }} />
                  <div className="dash-skel-line" style={{ width: "30%", height: 24 }} />
                  <div className="dash-skel-line" style={{ width: "70%" }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="dashboard-stats">
            {stats.map((s) => (
              <Link to={s.to} className="stat-card" key={s.label} style={{ textDecoration: "none" }}>
                <div className={`stat-card-icon ${s.iconClass}`}>{s.icon}</div>
                <div className="stat-card-body">
                  <div className="stat-card-label">{s.label}</div>
                  <div className="stat-card-value">{s.value}</div>
                  <div className="stat-card-sub">{s.sub}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {!isManager ? (
        <>
          {/* Admin: pekerjaan pending + grafik */}
          <div className="dash-grid-2">
            <SectionCard
              title="Pendaftaran per Bulan"
              subtitle={`6 bulan terakhir • ${monthlyTotal} pendaftaran`}
            >
              {loading ? (
                <LoadingBlock />
              ) : list === null ? (
                <ErrorState text="Gagal memuat data pendaftaran." />
              ) : (
                <DashboardBarChart labels={monthlyLabels} values={monthlyValues} tooltipSuffix="pendaftaran" />
              )}
            </SectionCard>

            <SectionCard title="Perlu Tindakan Anda" subtitle="Menunggu pemeriksaan Admin">
              {loading ? (
                <LoadingBlock />
              ) : (
                <div className="dash-todo-list">
                  <div className={`dash-todo ${pembayaranPending > 0 ? "has-items" : ""}`}>
                    <div className="dash-todo-icon">💳</div>
                    <div className="dash-todo-body">
                      <div className="dash-todo-count">{pembayaranPending}</div>
                      <div className="dash-todo-label">Bukti pembayaran menunggu verifikasi</div>
                    </div>
                    <Link to="/admin/pembayaran" className="dash-btn">
                      {pembayaranPending > 0 ? "Periksa" : "Buka"}
                    </Link>
                  </div>
                  <div className={`dash-todo ${dokumenPending > 0 ? "has-items" : ""}`}>
                    <div className="dash-todo-icon">📄</div>
                    <div className="dash-todo-body">
                      <div className="dash-todo-count">{dokumenPending}</div>
                      <div className="dash-todo-label">Dokumen jamaah menunggu verifikasi</div>
                    </div>
                    <Link to="/admin/dokumen" className="dash-btn">
                      {dokumenPending > 0 ? "Periksa" : "Buka"}
                    </Link>
                  </div>
                  {pembayaranPending === 0 && dokumenPending === 0 && (
                    <div className="dash-allclear">✅ Semua pemeriksaan sudah selesai.</div>
                  )}
                </div>
              )}
            </SectionCard>
          </div>

          <SectionCard
            title="Pendaftaran Terbaru"
            subtitle="8 pendaftaran terakhir"
            action={<Link to="/admin/pendaftaran" className="dash-link">Lihat semua →</Link>}
          >
            {loading ? (
              <LoadingBlock />
            ) : list === null ? (
              <ErrorState text="Gagal memuat data pendaftaran." />
            ) : recent.length === 0 ? (
              <EmptyState text="Belum ada pendaftaran." />
            ) : (
              <div className="dash-table-wrap">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>No. Pendaftaran</th>
                      <th>Nama</th>
                      <th>Paket</th>
                      <th>Tanggal</th>
                      <th>Status</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((p) => (
                      <tr key={p.nomor_pendaftaran}>
                        <td className="dash-mono">{p.nomor_pendaftaran}</td>
                        <td className="dash-strong">{p.nama_customer}</td>
                        <td>{p.paket}</td>
                        <td>{fmtDate(p.tanggal_daftar)}</td>
                        <td><Badge value={p.status} /></td>
                        <td>
                          <button
                            type="button"
                            className="detail-btn"
                            onClick={() => setDetailNomor(p.nomor_pendaftaran)}
                            title="Lihat detail pendaftaran"
                          >
                            <LuEye size={13} />
                            Detail
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </>
      ) : (
        <>
          {/* Manager: antrean verifikasi (fokus utama) */}
          <SectionCard
            title="Menunggu Verifikasi Manager"
            subtitle="Pendaftaran yang sudah diajukan Admin dan menunggu pemeriksaan Anda"
            action={<Link to="/admin/verifikasi" className="dash-link">Buka antrean →</Link>}
          >
            {loading ? (
              <LoadingBlock />
            ) : queue === null ? (
              <ErrorState text="Gagal memuat antrean verifikasi." />
            ) : queue.length === 0 ? (
              <EmptyState text="Tidak ada pendaftaran yang menunggu verifikasi. 🎉" />
            ) : (
              <>
                <div className="dash-table-wrap">
                  <table className="dash-table">
                    <thead>
                      <tr>
                        <th>No. Pendaftaran</th>
                        <th>Nama</th>
                        <th>Paket</th>
                        <th>Tanggal</th>
                        <th>Verifikasi Admin</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {queue.slice(0, 8).map((p) => (
                        <tr key={p.nomor_pendaftaran}>
                          <td className="dash-mono">
                            {p.nomor_pendaftaran}
                            {(p.total_jamaah ?? 1) > 1 && (
                              <span className="dash-chip">Grup • {p.total_jamaah} jamaah</span>
                            )}
                          </td>
                          <td className="dash-strong">{p.nama_customer}</td>
                          <td>{p.paket}</td>
                          <td>{fmtDate(p.tanggal_daftar)}</td>
                          <td>
                            <div className="dash-badge-stack">
                              <span className="dash-badge-row">Dokumen <Badge value={p.document_status} /></span>
                              <span className="dash-badge-row">Pembayaran <Badge value={p.payment_status} /></span>
                            </div>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="verifikasi-btn-periksa"
                              onClick={() => setPeriksaNomor(p.nomor_pendaftaran)}
                              title="Periksa pendaftaran"
                            >
                              <LuEye size={13} />
                              Periksa
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {queue.length > 8 && (
                  <div className="dash-more">
                    Menampilkan 8 dari {queue.length} antrean.{" "}
                    <Link to="/admin/verifikasi" className="dash-link">Lihat semua</Link>
                  </div>
                )}
              </>
            )}
          </SectionCard>

          <div className="dash-grid-2">
            <SectionCard
              title="Distribusi Status Pendaftaran"
              subtitle="Dihitung per pendaftaran/invoice grup"
            >
              {loading ? (
                <LoadingBlock />
              ) : list === null ? (
                <ErrorState text="Gagal memuat data pendaftaran." />
              ) : distribution.length === 0 ? (
                <EmptyState text="Belum ada data pendaftaran." />
              ) : (
                <div className="dash-donut-layout">
                  <DashboardDoughnutChart labels={distLabels} values={distValues} colors={distColors} />
                  <ul className="dash-legend">
                    {distribution.map((d) => (
                      <li key={d.key}>
                        <span className="dash-dot" style={{ background: d.color }} />
                        <span className="dash-legend-label">{d.label}</span>
                        <strong>{d.count}</strong>
                        <span className="dash-legend-pct">{Math.round((d.count / distTotal) * 100)}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Keberangkatan Terdekat"
              subtitle="Paket aktif yang belum berangkat"
              action={<Link to="/admin/paket" className="dash-link">Kelola paket →</Link>}
            >
              {loading ? (
                <LoadingBlock />
              ) : paket === null ? (
                <ErrorState text="Gagal memuat data paket." />
              ) : upcoming.length === 0 ? (
                <EmptyState text="Belum ada jadwal keberangkatan mendatang." />
              ) : (
                <ul className="dash-schedule">
                  {upcoming.map((p) => {
                    const pct = p.KuotaMax > 0 ? Math.min((p.KuotaTerpakai / p.KuotaMax) * 100, 100) : 0;
                    return (
                      <li key={p.ID}>
                        <div className="dash-schedule-top">
                          <span className="dash-strong">{p.NamaPaket}</span>
                          <span className="dash-schedule-date">🛫 {fmtDate(p.TanggalBerangkat)}</span>
                        </div>
                        <div className="dash-quota">
                          <div className="dash-quota-bar"><div style={{ width: `${pct}%` }} /></div>
                          <span>{p.KuotaTerpakai}/{p.KuotaMax} jamaah</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </SectionCard>
          </div>

          <SectionCard title="Aktivitas Verifikasi" subtitle="Pengesahan terbaru dan pendaftaran yang dikembalikan untuk perbaikan">
            {loading ? (
              <LoadingBlock />
            ) : approved === null && perbaikan === null ? (
              <ErrorState text="Gagal memuat aktivitas verifikasi." />
            ) : recentApproved.length === 0 && (perbaikan ?? []).length === 0 ? (
              <EmptyState text="Belum ada aktivitas verifikasi." />
            ) : (
              <div className="dash-grid-2 dash-activity">
                <div>
                  <div className="dash-subhead">✅ Disahkan terbaru</div>
                  {recentApproved.length === 0 ? (
                    <EmptyState text="Belum ada pengesahan." />
                  ) : (
                    <ul className="dash-activity-list">
                      {recentApproved.map((p) => (
                        <li key={p.nomor_pendaftaran}>
                          <div className="dash-strong">{p.nama_customer}</div>
                          <div className="dash-activity-meta">
                            {p.nomor_pendaftaran} • {p.approver_nama ? `oleh ${p.approver_nama} • ` : ""}
                            {fmtDate(p.approved_at)}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <div className="dash-subhead">⚠️ Menunggu perbaikan Admin</div>
                  {(perbaikan ?? []).length === 0 ? (
                    <EmptyState text="Tidak ada permintaan perbaikan." />
                  ) : (
                    <ul className="dash-activity-list">
                      {(perbaikan ?? []).slice(0, 5).map((p) => (
                        <li key={p.nomor_pendaftaran}>
                          <div className="dash-strong">{p.nama_customer}</div>
                          <div className="dash-activity-meta">
                            {p.nomor_pendaftaran}
                            {p.catatan_verifikasi_manager ? ` • ${p.catatan_verifikasi_manager}` : ""}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </SectionCard>
        </>
      )}

      {/* Quick links */}
      <div>
        <div className="dashboard-section-title">Akses Cepat</div>
        <div className="dashboard-quicklinks">
          {isManager && (
            <Link to="/admin/verifikasi" className="quicklink-card">
              <div className="quicklink-icon">🛡️</div>
              Verifikasi Pendaftaran
            </Link>
          )}
          {quicklinks.map((q) => (
            <Link to={q.to} className="quicklink-card" key={q.to}>
              <div className="quicklink-icon">{q.icon}</div>
              {q.label}
            </Link>
          ))}
          {isManager && (
            <Link to="/admin/manajemen-admin" className="quicklink-card">
              <div className="quicklink-icon">👤</div>
              Manajemen Admin
            </Link>
          )}
        </div>
      </div>

      {/* Modal detail: overlay di atas dashboard, tanpa navigasi */}
      {detailNomor && (
        <DetailModal
          nomor={detailNomor}
          token={token ?? ""}
          onClose={() => setDetailNomor(null)}
          onAssigned={() => setReloadKey((k) => k + 1)}
        />
      )}
      {periksaNomor && (
        <DetailVerifikasiModal
          nomor={periksaNomor}
          token={token ?? ""}
          onClose={() => setPeriksaNomor(null)}
          onSuccess={() => {
            setPeriksaNomor(null);
            setReloadKey((k) => k + 1);
            window.dispatchEvent(new Event("admin-badge-refresh"));
          }}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
