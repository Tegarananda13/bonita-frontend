import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../../context/AuthContext";
import "./AdminPendaftaran.css";

// ── Types ────────────────────────────────────────────────────────────────────

interface PendaftaranItem {
  id: string;
  nomor_pendaftaran: string;
  nama_customer: string;
  paket: string;
  payment_status: string;
  document_status: string;
  status: string;
  tanggal_daftar: string;
  assigned?: boolean; // sudah di-assign ke admin lain
}

interface DetailPendaftaran {
  id: string;
  nomor_pendaftaran: string;
  nama_customer: string;
  nik: string;
  no_hp: string;
  email: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  jenis_kelamin: string;
  alamat_lengkap?: string;
  provinsi?: string;
  kabupaten_kota?: string;
  kecamatan?: string;
  kelurahan_desa?: string;
  kode_pos?: string;
  paket: string;
  harga: number;
  tanggal_berangkat: string;
  payment_status: string;
  document_status: string;
  status: string;
  admin_pic?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

const fmtRupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  proses:              { label: "Proses",          cls: "status-proses" },
  selesai:             { label: "Selesai",          cls: "status-selesai" },
  batal:               { label: "Batal",            cls: "status-batal" },
  menunggu:            { label: "Menunggu",         cls: "status-menunggu" },
  lunas:               { label: "Lunas",            cls: "status-lunas" },
  belum:               { label: "Belum",            cls: "status-belum" },
  pending:             { label: "Pending",          cls: "status-pending" },
  dp:                  { label: "DP",               cls: "status-dp" },
  terverifikasi:       { label: "Terverifikasi",    cls: "status-verified" },
  diterima:            { label: "Diterima",         cls: "status-verified" },
  ditolak:             { label: "Ditolak",          cls: "status-ditolak" },
  lengkap:             { label: "Lengkap",          cls: "status-selesai" },
  revisi:              { label: "Perlu Revisi",     cls: "status-batal" },
  siap_berangkat:      { label: "Siap Berangkat",   cls: "status-siap" },
  menunggu_pembayaran: { label: "Menunggu Bayar",   cls: "status-pending" },
  menunggu_dokumen:    { label: "Menunggu Dokumen", cls: "status-pending" },
};

const StatusPill = ({ value }: { value: string }) => {
  const s = STATUS_MAP[value?.toLowerCase()] ?? { label: value, cls: "status-proses" };
  return <span className={`status-pill ${s.cls}`}>{s.label}</span>;
};

// ── Detail Modal ───────────────────────────────────────────────────────────────

const DetailModal = ({
  nomor,
  token,
  onClose,
  onAssigned,
}: {
  nomor: string;
  token: string;
  onClose: () => void;
  onAssigned: () => void;
}) => {
  const [data, setData] = useState<DetailPendaftaran | null>(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [assignSuccess, setAssignSuccess] = useState(false);
  const [payments, setPayments] = useState<{ id: string; jumlah: number; status: string; tanggal: string; bukti: string }[]>([]);
  const [docs, setDocs] = useState<{ id: string; jenis: string; status: string; file_path: string }[]>([]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get(`http://localhost:8080/admin/pendaftaran/${nomor}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const p = res.data?.pendaftaran;
        setData({
          id: p?.ID ?? p?.id,
          nomor_pendaftaran: p?.NomorPendaftaran ?? p?.nomor_pendaftaran,
          nama_customer: p?.Customer?.Nama ?? p?.Customer?.nama,
          nik:           p?.Customer?.NIK  ?? p?.Customer?.nik  ?? "-",
          no_hp:         p?.Customer?.NoHP ?? p?.Customer?.NoHp ?? p?.Customer?.no_hp ?? "-",
          email:         p?.Customer?.Email ?? p?.Customer?.email ?? "-",
          tempat_lahir:  p?.Customer?.TempatLahir ?? p?.Customer?.tempat_lahir ?? "-",
          tanggal_lahir: p?.Customer?.TanggalLahir ?? p?.Customer?.tanggal_lahir ?? "",
          jenis_kelamin: p?.Customer?.JenisKelamin ?? p?.Customer?.jenis_kelamin ?? "-",
          alamat_lengkap:  p?.Customer?.AlamatLengkap  ?? p?.Customer?.alamat_lengkap  ?? "",
          provinsi:        p?.Customer?.Provinsi        ?? p?.Customer?.provinsi        ?? "",
          kabupaten_kota:  p?.Customer?.KabupatenKota   ?? p?.Customer?.kabupaten_kota  ?? "",
          kecamatan:       p?.Customer?.Kecamatan       ?? p?.Customer?.kecamatan       ?? "",
          kelurahan_desa:  p?.Customer?.KelurahanDesa   ?? p?.Customer?.kelurahan_desa  ?? "",
          kode_pos:        p?.Customer?.KodePos         ?? p?.Customer?.kode_pos        ?? "",
          paket: p?.Paket?.NamaPaket ?? p?.Paket?.nama_paket,
          harga: p?.Paket?.Harga ?? p?.Paket?.harga ?? 0,
          tanggal_berangkat: p?.Paket?.TanggalBerangkat ?? p?.Paket?.tanggal_berangkat,
          payment_status: p?.PaymentStatus ?? p?.payment_status,
          document_status: p?.DocumentStatus ?? p?.document_status,
          status: p?.Status ?? p?.status,
          admin_pic: p?.User?.Nama ?? p?.User?.nama ?? null,
        });
        // Pembayaran
        const rawBayar = res.data?.pembayaran ?? [];
        setPayments(rawBayar.map((b: Record<string, unknown>) => ({
          id:      String(b.ID      ?? b.id      ?? ""),
          jumlah:  (b.Jumlah  ?? b.jumlah  ?? 0) as number,
          status:  (b.Status  ?? b.status  ?? "") as string,
          tanggal: (b.TanggalBayar ?? b.tanggal_bayar ?? b.tanggal ?? "") as string,
          bukti:   String(b.BuktiPembayaran ?? b.bukti_pembayaran ?? ""),
        })));
        // Dokumen
        const rawDok = res.data?.dokumen ?? [];
        setDocs(rawDok.map((d: Record<string, unknown>) => ({
          id:        String(d.ID ?? d.id ?? ""),
          jenis:     String(d.JenisDokumen ?? d.jenis_dokumen ?? d.Jenis ?? d.jenis ?? "-"),
          status:    (d.StatusValidasi ?? d.status_validasi ?? d.Status ?? d.status ?? "") as string,
          file_path: String(d.FilePath ?? d.file_path ?? ""),
        })));
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [nomor, token]);

  const handleAssign = async () => {
    if (!data) return;
    setAssignError("");
    try {
      setAssigning(true);
      await axios.put(`http://localhost:8080/admin/pendaftaran/${data.id}/assign`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAssignSuccess(true);
      onAssigned();
    } catch (err: unknown) {
      setAssignError(
        axios.isAxiosError(err)
          ? (err.response?.data?.error ?? "Gagal assign.")
          : "Gagal assign."
      );
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel">
        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="modal-title">📋 Detail Pendaftaran</div>
            {data && (
              <div className="modal-subtitle">{data.nomor_pendaftaran}</div>
            )}
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {loading ? (
            <div className="modal-loading">
              <div className="modal-spin" />
              Memuat detail...
            </div>
          ) : !data ? (
            <div className="modal-loading" style={{ color: "#ef4444" }}>
              Gagal memuat data pendaftaran.
            </div>
          ) : (
            <>
              {/* Status bar */}
              <div className="modal-status-row">
                <div className="modal-status-item">
                  <div className="modal-status-label">Status Keseluruhan</div>
                  <StatusPill value={data.status} />
                </div>
                <div className="modal-status-item">
                  <div className="modal-status-label">Pembayaran</div>
                  <StatusPill value={data.payment_status} />
                </div>
                <div className="modal-status-item">
                  <div className="modal-status-label">Dokumen</div>
                  <StatusPill value={data.document_status} />
                </div>
              </div>

              {/* Info jamaah */}
              <div className="modal-section-title">👤 Informasi Jamaah</div>
              <div className="modal-info-grid">
                <div className="modal-info-item full">
                  <div className="modal-info-label">Nama Lengkap</div>
                  <div className="modal-info-val">{data.nama_customer}</div>
                </div>
                <div className="modal-info-item full">
                  <div className="modal-info-label">NIK</div>
                  <div className="modal-info-val" style={{ fontFamily: "monospace" }}>{data.nik}</div>
                </div>
                <div className="modal-info-item">
                  <div className="modal-info-label">Tempat Lahir</div>
                  <div className="modal-info-val">{data.tempat_lahir}</div>
                </div>
                <div className="modal-info-item">
                  <div className="modal-info-label">Tanggal Lahir</div>
                  <div className="modal-info-val">{data.tanggal_lahir ? fmtDate(data.tanggal_lahir) : "-"}</div>
                </div>
                <div className="modal-info-item">
                  <div className="modal-info-label">Jenis Kelamin</div>
                  <div className="modal-info-val">{data.jenis_kelamin}</div>
                </div>
                <div className="modal-info-item">
                  <div className="modal-info-label">No. HP</div>
                  <div className="modal-info-val">{data.no_hp}</div>
                </div>
                <div className="modal-info-item full">
                  <div className="modal-info-label">Email</div>
                  <div className="modal-info-val">{data.email}</div>
                </div>
              </div>

              {/* Info alamat */}
              {(data.alamat_lengkap || data.provinsi || data.kabupaten_kota) && (
                <>
                  <div className="modal-section-title">📍 Alamat</div>
                  <div className="modal-info-grid">
                    {data.alamat_lengkap && (
                      <div className="modal-info-item full">
                        <div className="modal-info-label">Alamat Lengkap</div>
                        <div className="modal-info-val">{data.alamat_lengkap}</div>
                      </div>
                    )}
                    {data.kelurahan_desa && (
                      <div className="modal-info-item">
                        <div className="modal-info-label">Kelurahan/Desa</div>
                        <div className="modal-info-val">{data.kelurahan_desa}</div>
                      </div>
                    )}
                    {data.kecamatan && (
                      <div className="modal-info-item">
                        <div className="modal-info-label">Kecamatan</div>
                        <div className="modal-info-val">{data.kecamatan}</div>
                      </div>
                    )}
                    {data.kabupaten_kota && (
                      <div className="modal-info-item">
                        <div className="modal-info-label">Kabupaten/Kota</div>
                        <div className="modal-info-val">{data.kabupaten_kota}</div>
                      </div>
                    )}
                    {data.provinsi && (
                      <div className="modal-info-item">
                        <div className="modal-info-label">Provinsi</div>
                        <div className="modal-info-val">{data.provinsi}</div>
                      </div>
                    )}
                    {data.kode_pos && (
                      <div className="modal-info-item">
                        <div className="modal-info-label">Kode Pos</div>
                        <div className="modal-info-val">{data.kode_pos}</div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Info paket */}
              <div className="modal-section-title">🕌 Informasi Paket</div>
              <div className="modal-info-grid">
                <div className="modal-info-item full">
                  <div className="modal-info-label">Nama Paket</div>
                  <div className="modal-info-val">{data.paket}</div>
                </div>
                <div className="modal-info-item">
                  <div className="modal-info-label">Harga</div>
                  <div className="modal-info-val" style={{ color: "#4f46e5", fontWeight: 800 }}>
                    {fmtRupiah(data.harga)}
                  </div>
                </div>
                <div className="modal-info-item">
                  <div className="modal-info-label">Tanggal Berangkat</div>
                  <div className="modal-info-val">{data.tanggal_berangkat ? fmtDate(data.tanggal_berangkat) : "-"}</div>
                </div>
              </div>

              {/* Riwayat Pembayaran */}
              {payments.length > 0 && (
                <>
                  <div className="modal-section-title">💳 Riwayat Pembayaran</div>
                  {payments.map((pay, i) => (
                    <div key={pay.id || i} style={{ background: "#f8fafc", borderRadius: "10px", marginBottom: "0.5rem", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0.875rem", fontSize: "0.85rem" }}>
                        <span style={{ color: "#374151", fontWeight: 600 }}>
                          {i === 0 ? "DP" : `Pembayaran ${i + 1}`}
                          {pay.tanggal ? ` — ${fmtDate(pay.tanggal)}` : ""}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ fontWeight: 700, color: "#1e293b" }}>{fmtRupiah(pay.jumlah)}</span>
                          <StatusPill value={pay.status} />
                        </div>
                      </div>
                      {pay.bukti && (
                        <div style={{ borderTop: "1px solid #e2e8f0", padding: "0.5rem 0.875rem", display: "flex", alignItems: "center", gap: "0.5rem", background: "#fff" }}>
                          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Bukti:</span>
                          <a href={pay.bukti} target="_blank" rel="noreferrer"
                            style={{ fontSize: "0.78rem", color: "#1a6b43", fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: "0.3rem" }}
                          >
                            🖼️ Lihat Foto Bukti Pembayaran
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}

              {/* Dokumen */}
              {docs.length > 0 && (
                <>
                  <div className="modal-section-title" style={{ marginTop: "0.5rem" }}>📄 Dokumen</div>
                  {docs.map((dok, i) => (
                    <div key={dok.id || i} style={{ background: "#f8fafc", borderRadius: "10px", marginBottom: "0.5rem", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0.875rem", fontSize: "0.85rem" }}>
                        <span style={{ color: "#374151", textTransform: "capitalize", fontWeight: 600 }}>{dok.jenis || "-"}</span>
                        <StatusPill value={dok.status} />
                      </div>
                      {dok.file_path && (
                        <div style={{ borderTop: "1px solid #e2e8f0", padding: "0.5rem 0.875rem", display: "flex", alignItems: "center", gap: "0.5rem", background: "#fff" }}>
                          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>File:</span>
                          <a href={dok.file_path} target="_blank" rel="noreferrer"
                            style={{ fontSize: "0.78rem", color: "#1a6b43", fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: "0.3rem" }}
                          >
                            📎 Lihat File Dokumen
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}

              {/* Assign PIC */}
              <div className="modal-assign-section">
                <div className="modal-section-title">👷 PIC / Admin Penangggung Jawab</div>

                {data.admin_pic ? (
                  <div className="modal-pic-assigned">
                    <div className="modal-pic-avatar">
                      {data.admin_pic.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="modal-pic-name">{data.admin_pic}</div>
                      <div className="modal-pic-label">Admin PIC yang menangani jamaah ini</div>
                    </div>
                    <div className="modal-pic-badge">✓ Assigned</div>
                  </div>
                ) : assignSuccess ? (
                  <div className="modal-assign-success">
                    ✅ Berhasil! Anda telah menjadi PIC untuk jamaah ini.
                  </div>
                ) : (
                  <div className="modal-assign-empty">
                    <div className="modal-assign-empty-icon">👤</div>
                    <div className="modal-assign-empty-text">
                      Belum ada admin yang mengambil tanggung jawab jamaah ini.
                    </div>
                    {assignError && (
                      <div className="modal-assign-error">{assignError}</div>
                    )}
                    <button
                      className="modal-assign-btn"
                      onClick={handleAssign}
                      disabled={assigning}
                    >
                      {assigning ? (
                        <><div className="mini-spin-w" />Memproses...</>
                      ) : (
                        <>🙋 Jadikan Saya PIC Jamaah Ini</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="modal-close-full-btn" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

const AdminPendaftaran = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [list, setList] = useState<PendaftaranItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("semua");
  const [activeView, setActiveView] = useState<"semua" | "milik-saya">("semua");
  const [detailNomor, setDetailNomor] = useState<string | null>(null);
  const [jamaahSayaKey, setJamaahSayaKey] = useState(0);

  // Buka modal detail otomatis jika URL mengandung ?nomor=
  useEffect(() => {
    const nomor = searchParams.get("nomor");
    if (nomor) setDetailNomor(nomor);
  }, [searchParams]);

  const authH = useCallback(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:8080/admin/pendaftaran", {
        headers: authH(),
      });
      setList(res.data?.data ?? []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [authH]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Filter ──
  const filtered = list.filter((p) => {
    const matchSearch =
      p.nama_customer?.toLowerCase().includes(search.toLowerCase()) ||
      p.nomor_pendaftaran?.toLowerCase().includes(search.toLowerCase()) ||
      p.paket?.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      filterStatus === "semua" || p.status?.toLowerCase() === filterStatus;
    return matchSearch && matchStatus;
  });

  // ── Stats ──
  const countByStatus = (s: string) =>
    list.filter((p) => p.status?.toLowerCase() === s).length;

  return (
    <div className="pendaftaran-admin-page">
      {/* ── Header ── */}
      <div className="page-header">
        <div className="page-header-left">
          <h2>Pendaftaran Jamaah</h2>
          <p>Monitor, kelola, dan assign PIC untuk setiap pendaftaran jamaah umroh.</p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn-primary-sm"
            onClick={() => navigate("/admin/tambah-jamaah")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Tambah Jamaah
          </button>
          <button type="button" className="btn-outline-sm" onClick={fetchData}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* ── View Tabs ── */}
      <div className="view-tabs">
        <button
          className={`view-tab ${activeView === "semua" ? "active" : ""}`}
          onClick={() => setActiveView("semua")}
        >
          📋 Semua Pendaftaran
          <span className="view-tab-count">{list.length}</span>
        </button>
        <button
          className={`view-tab ${activeView === "milik-saya" ? "active" : ""}`}
          onClick={() => setActiveView("milik-saya")}
        >
          👤 Jamaah Saya (PIC)
        </button>
      </div>

      {activeView === "semua" ? (
        <>
          {/* ── Stats ── */}
          {!loading && (
            <div className="pendaftaran-stats-row">
              {[
                { icon: "📋", label: "Total",          value: list.length,                        cls: "",        filter: "semua"            },
                { icon: "⏳", label: "Proses",         value: countByStatus("proses"),             cls: "s-proses", filter: "proses"           },
                { icon: "✈️", label: "Siap Berangkat", value: countByStatus("siap_berangkat"),    cls: "s-siap",  filter: "siap_berangkat"   },
                { icon: "✅", label: "Selesai",        value: countByStatus("selesai"),            cls: "s-selesai", filter: "selesai"         },
                { icon: "❌", label: "Batal",          value: countByStatus("batal"),              cls: "s-batal", filter: "batal"            },
              ].map((s) => (
                <div
                  className={`pendaftaran-stat-card ${s.cls}`}
                  key={s.label}
                  onClick={() => setFilterStatus(s.filter)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="pendaftaran-stat-icon">{s.icon}</div>
                  <div>
                    <div className="pendaftaran-stat-value">{s.value}</div>
                    <div className="pendaftaran-stat-label">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Toolbar ── */}
          <div className="pendaftaran-toolbar">
            <div className="toolbar-search">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Cari nama, nomor pendaftaran, atau paket..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="semua">Semua Status</option>
              <option value="proses">Proses</option>
              <option value="siap_berangkat">Siap Berangkat</option>
              <option value="selesai">Selesai</option>
              <option value="menunggu_pembayaran">Menunggu Bayar</option>
              <option value="menunggu_dokumen">Menunggu Dokumen</option>
              <option value="batal">Batal</option>
            </select>
            {!loading && (
              <span className="result-count">{filtered.length} pendaftaran</span>
            )}
          </div>

          {/* ── Table ── */}
          <div className="pendaftaran-table-card">
            <table className="pendaftaran-table">
              <thead>
                <tr>
                  <th>No. Pendaftaran</th>
                  <th>Jamaah</th>
                  <th>Paket</th>
                  <th>Status</th>
                  <th>Pembayaran</th>
                  <th>Dokumen</th>
                  <th>Tanggal</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={8}>
                        <div className="table-skel-row">
                          <div className="skel" style={{ width: 120, height: 12 }} />
                          <div className="skel" style={{ width: 100, height: 12 }} />
                          <div className="skel" style={{ width: 140, height: 12 }} />
                          <div className="skel" style={{ width: 70, height: 20, borderRadius: 999 }} />
                          <div className="skel" style={{ width: 70, height: 20, borderRadius: 999 }} />
                          <div className="skel" style={{ width: 70, height: 20, borderRadius: 999 }} />
                          <div className="skel" style={{ width: 80, height: 12 }} />
                          <div className="skel" style={{ width: 80, height: 28, borderRadius: 8 }} />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="table-empty">
                        <div className="table-empty-icon">📋</div>
                        <p>{search || filterStatus !== "semua" ? "Tidak ada data yang cocok." : "Belum ada pendaftaran."}</p>
                        {(search || filterStatus !== "semua") && (
                          <button
                            className="btn-outline-sm"
                            onClick={() => { setSearch(""); setFilterStatus("semua"); }}
                            style={{ marginTop: "0.75rem" }}
                          >
                            Reset Filter
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <span className="nomor-pendaftaran">{p.nomor_pendaftaran}</span>
                      </td>
                      <td>
                        <div className="customer-cell">
                          <div className="customer-avatar">
                            {p.nama_customer?.charAt(0)?.toUpperCase() ?? "?"}
                          </div>
                          <span className="customer-name">{p.nama_customer}</span>
                        </div>
                      </td>
                      <td>
                        <span className="paket-name-small">{p.paket}</span>
                      </td>
                      <td><StatusPill value={p.status} /></td>
                      <td><StatusPill value={p.payment_status} /></td>
                      <td><StatusPill value={p.document_status} /></td>
                      <td>
                        <span className="date-cell">{fmtDate(p.tanggal_daftar)}</span>
                      </td>
                      <td>
                        <button
                          className="detail-btn"
                          onClick={() => setDetailNomor(p.nomor_pendaftaran)}
                        >
                          Detail & Assign
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        // ── Tab "Jamaah Saya" ──
        <JamaahSayaView token={token} authH={authH} refreshKey={jamaahSayaKey} />
      )}

      {/* ── Detail Modal ── */}
      {detailNomor && (
        <DetailModal
          nomor={detailNomor}
          token={token ?? ""}
          onClose={() => setDetailNomor(null)}
          onAssigned={() => {
            fetchData();
            setJamaahSayaKey((k) => k + 1); // trigger JamaahSayaView refresh
            setActiveView("milik-saya"); // pindah ke tab jamaah saya
          }}
        />
      )}
    </div>
  );
};

// ── Jamaah Saya View ──────────────────────────────────────────────────────────

// Toast mini
const Toast = ({ msg, type }: { msg: string; type: "success" | "error" }) => (
  <div
    style={{
      position: "fixed", bottom: "1.5rem", right: "1.5rem", zIndex: 9999,
      background: type === "success" ? "#059669" : "#dc2626",
      color: "#fff", padding: "0.875rem 1.25rem",
      borderRadius: "12px", fontSize: "0.875rem", fontWeight: 600,
      boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
      display: "flex", alignItems: "center", gap: "0.5rem",
      animation: "fadeInUp 0.3s ease",
    }}
  >
    {type === "success" ? "✅" : "❌"} {msg}
  </div>
);

// Modal Konfirmasi Selesai
const KonfirmasiSelesaiModal = ({
  jamaahName,
  onBatal,
  onYa,
  loading,
}: {
  jamaahName: string;
  onBatal: () => void;
  onYa: () => void;
  loading: boolean;
}) => (
  <div
    className="modal-overlay"
    onClick={(e) => e.target === e.currentTarget && onBatal()}
  >
    <div className="modal-panel" style={{ maxWidth: 480 }}>
      <div className="modal-header">
        <div>
          <div className="modal-title">✅ Tandai Perjalanan Selesai</div>
          <div className="modal-subtitle">{jamaahName}</div>
        </div>
        <button className="modal-close-btn" onClick={onBatal}>✕</button>
      </div>
      <div className="modal-body">
        <div style={{
          background: "#f0fdf4", border: "1.5px solid #86efac",
          borderRadius: "14px", padding: "1.25rem 1.5rem",
          marginBottom: "1rem",
        }}>
          <div style={{ fontSize: "2rem", textAlign: "center", marginBottom: "0.75rem" }}>🕌</div>
          <p style={{ fontSize: "0.9rem", color: "#374151", lineHeight: 1.7, textAlign: "center" }}>
            Apakah Anda yakin jamaah ini telah menyelesaikan perjalanan umrah?
          </p>
          <p style={{ fontSize: "0.78rem", color: "#6b7280", textAlign: "center", marginTop: "0.5rem" }}>
            Status akan berubah menjadi <strong>Selesai</strong> dan tidak dapat dikembalikan.
          </p>
        </div>
      </div>
      <div className="modal-footer" style={{ display: "flex", gap: "0.75rem" }}>
        <button
          className="modal-close-full-btn"
          onClick={onBatal}
          disabled={loading}
          style={{ flex: 1 }}
        >
          Batal
        </button>
        <button
          onClick={onYa}
          disabled={loading}
          style={{
            flex: 1, padding: "0.75rem", borderRadius: "10px",
            background: loading ? "#6ee7b7" : "linear-gradient(135deg, #059669, #047857)",
            color: "#fff", fontWeight: 700, fontSize: "0.875rem",
            border: "none", cursor: loading ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
          }}
        >
          {loading ? (
            <><div className="mini-spin-w" />Memproses...</>
          ) : (
            <>✅ Ya, Tandai Selesai</>
          )}
        </button>
      </div>
    </div>
  </div>
);

// ── PIC Detail Modal (menggantikan inline expand) ─────────────────────────────

const PICDetailModal = ({
  p,
  token,
  onClose,
  onSelesai,
}: {
  p: PendaftaranItem;
  token: string | null;
  onClose: () => void;
  onSelesai: (id: string, name: string) => void;
}) => {
  const [data, setData] = useState<DetailPendaftaran | null>(null);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<{ id: string; jumlah: number; status: string; tanggal: string; bukti: string }[]>([]);
  const [docs, setDocs] = useState<{ id: string; jenis: string; status: string; file_path: string }[]>([]);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await axios.get(
          `http://localhost:8080/admin/pendaftaran/${p.nomor_pendaftaran}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const dp = res.data?.pendaftaran;
        setData({
          id:               dp?.ID ?? dp?.id,
          nomor_pendaftaran: dp?.NomorPendaftaran ?? dp?.nomor_pendaftaran,
          nama_customer:    dp?.Customer?.Nama   ?? dp?.Customer?.nama,
          nik:              dp?.Customer?.NIK    ?? dp?.Customer?.nik  ?? "-",
          no_hp:            dp?.Customer?.NoHP   ?? dp?.Customer?.NoHp ?? dp?.Customer?.no_hp ?? "-",
          email:            dp?.Customer?.Email  ?? dp?.Customer?.email ?? "-",
          tempat_lahir:     dp?.Customer?.TempatLahir ?? dp?.Customer?.tempat_lahir ?? "-",
          tanggal_lahir:    dp?.Customer?.TanggalLahir ?? dp?.Customer?.tanggal_lahir ?? "",
          jenis_kelamin:    dp?.Customer?.JenisKelamin ?? dp?.Customer?.jenis_kelamin ?? "-",
          paket:            dp?.Paket?.NamaPaket ?? dp?.Paket?.nama_paket,
          harga:            dp?.Paket?.Harga     ?? dp?.Paket?.harga ?? 0,
          tanggal_berangkat: dp?.Paket?.TanggalBerangkat ?? dp?.Paket?.tanggal_berangkat,
          payment_status:   dp?.PaymentStatus   ?? dp?.payment_status,
          document_status:  dp?.DocumentStatus  ?? dp?.document_status,
          status:           dp?.Status          ?? dp?.status,
          admin_pic:        dp?.User?.Nama       ?? dp?.User?.nama ?? null,
        });
        // Pembayaran: Go model → field PascalCase
        const rawBayar = res.data?.pembayaran ?? [];
        setPayments(rawBayar.map((b: Record<string, unknown>) => ({
          id:      String(b.ID      ?? b.id      ?? ""),
          jumlah:  (b.Jumlah  ?? b.jumlah  ?? 0) as number,
          status:  (b.Status  ?? b.status  ?? "") as string,
          tanggal: (b.TanggalBayar ?? b.tanggal_bayar ?? b.tanggal ?? "") as string,
          bukti:   String(b.BuktiPembayaran ?? b.bukti_pembayaran ?? ""),
        })));
        // Dokumen: Go model → field PascalCase
        const rawDok = res.data?.dokumen ?? [];
        setDocs(rawDok.map((d: Record<string, unknown>) => ({
          id:        String(d.ID ?? d.id ?? ""),
          jenis:     String(d.JenisDokumen ?? d.jenis_dokumen ?? d.Jenis ?? d.jenis ?? "-"),
          status:    (d.StatusValidasi ?? d.status_validasi ?? d.Status ?? d.status ?? "") as string,
          file_path: String(d.FilePath ?? d.file_path ?? ""),
        })));
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [p.nomor_pendaftaran, token]);

  const isSiapBerangkat = p.status?.toLowerCase() === "siap_berangkat";
  const isSelesai       = p.status?.toLowerCase() === "selesai";

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel" style={{ maxWidth: 560 }}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="modal-title">👤 Detail Jamaah Saya</div>
            <div className="modal-subtitle">{p.nomor_pendaftaran}</div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {loading ? (
            <div className="modal-loading">
              <div className="modal-spin" />
              Memuat detail...
            </div>
          ) : !data ? (
            <div className="modal-loading" style={{ color: "#ef4444" }}>Gagal memuat data.</div>
          ) : (
            <>
              {/* Status row */}
              <div className="modal-status-row">
                <div className="modal-status-item">
                  <div className="modal-status-label">Status</div>
                  {isSelesai ? (
                    <span style={{ background: "#d1fae5", color: "#065f46", padding: "0.25rem 0.75rem", borderRadius: 999, fontSize: "0.75rem", fontWeight: 700 }}>✔ Umroh Selesai</span>
                  ) : (
                    <StatusPill value={data.status} />
                  )}
                </div>
                <div className="modal-status-item">
                  <div className="modal-status-label">Pembayaran</div>
                  <StatusPill value={data.payment_status} />
                </div>
                <div className="modal-status-item">
                  <div className="modal-status-label">Dokumen</div>
                  <StatusPill value={data.document_status} />
                </div>
              </div>

              {/* Info Jamaah */}
              <div className="modal-section-title">👤 Informasi Jamaah</div>
              <div className="modal-info-grid">
                <div className="modal-info-item full">
                  <div className="modal-info-label">Nama</div>
                  <div className="modal-info-val">{data.nama_customer}</div>
                </div>
                <div className="modal-info-item full">
                  <div className="modal-info-label">NIK</div>
                  <div className="modal-info-val" style={{ fontFamily: "monospace" }}>{data.nik}</div>
                </div>
                <div className="modal-info-item">
                  <div className="modal-info-label">Tempat Lahir</div>
                  <div className="modal-info-val">{data.tempat_lahir}</div>
                </div>
                <div className="modal-info-item">
                  <div className="modal-info-label">Tanggal Lahir</div>
                  <div className="modal-info-val">{data.tanggal_lahir ? fmtDate(data.tanggal_lahir) : "-"}</div>
                </div>
                <div className="modal-info-item">
                  <div className="modal-info-label">Jenis Kelamin</div>
                  <div className="modal-info-val">{data.jenis_kelamin}</div>
                </div>
                <div className="modal-info-item">
                  <div className="modal-info-label">No. HP</div>
                  <div className="modal-info-val">{data.no_hp}</div>
                </div>
                <div className="modal-info-item full">
                  <div className="modal-info-label">Email</div>
                  <div className="modal-info-val">{data.email}</div>
                </div>
              </div>

              {/* Info Paket */}
              <div className="modal-section-title">🕌 Paket</div>
              <div className="modal-info-grid">
                <div className="modal-info-item full">
                  <div className="modal-info-label">Nama Paket</div>
                  <div className="modal-info-val">{data.paket}</div>
                </div>
                <div className="modal-info-item">
                  <div className="modal-info-label">Harga</div>
                  <div className="modal-info-val" style={{ color: "#4f46e5", fontWeight: 800 }}>{fmtRupiah(data.harga)}</div>
                </div>
                <div className="modal-info-item">
                  <div className="modal-info-label">Tgl Berangkat</div>
                  <div className="modal-info-val">{data.tanggal_berangkat ? fmtDate(data.tanggal_berangkat) : "-"}</div>
                </div>
              </div>

              {/* Riwayat Pembayaran */}
              {payments.length > 0 && (
                <>
                  <div className="modal-section-title">💳 Riwayat Pembayaran</div>
                  {payments.map((pay, i) => (
                    <div key={pay.id || i} style={{ background: "#f8fafc", borderRadius: "10px", marginBottom: "0.5rem", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0.875rem", fontSize: "0.85rem" }}>
                        <span style={{ color: "#374151", fontWeight: 600 }}>
                          {i === 0 ? "DP" : `Pembayaran ${i + 1}`}
                          {pay.tanggal ? ` — ${fmtDate(pay.tanggal)}` : ""}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ fontWeight: 700, color: "#1e293b" }}>{fmtRupiah(pay.jumlah)}</span>
                          <StatusPill value={pay.status} />
                        </div>
                      </div>
                      {pay.bukti && (
                        <div style={{ borderTop: "1px solid #e2e8f0", padding: "0.5rem 0.875rem", display: "flex", alignItems: "center", gap: "0.5rem", background: "#fff" }}>
                          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Bukti:</span>
                          <a
                            href={pay.bukti}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: "0.78rem", color: "#1a6b43", fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: "0.3rem" }}
                          >
                            🖼️ Lihat Foto Bukti Pembayaran
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}

              {/* Dokumen */}
              {docs.length > 0 && (
                <>
                  <div className="modal-section-title" style={{ marginTop: "0.75rem" }}>📄 Dokumen</div>
                  {docs.map((dok, i) => (
                    <div key={dok.id || i} style={{ background: "#f8fafc", borderRadius: "10px", marginBottom: "0.5rem", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0.875rem", fontSize: "0.85rem" }}>
                        <span style={{ color: "#374151", textTransform: "capitalize", fontWeight: 600 }}>{dok.jenis || "-"}</span>
                        <StatusPill value={dok.status} />
                      </div>
                      {dok.file_path && (
                        <div style={{ borderTop: "1px solid #e2e8f0", padding: "0.5rem 0.875rem", display: "flex", alignItems: "center", gap: "0.5rem", background: "#fff" }}>
                          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>File:</span>
                          <a
                            href={dok.file_path}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: "0.78rem", color: "#1a6b43", fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: "0.3rem" }}
                          >
                            📎 Lihat File Dokumen
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}

              {/* Tandai Selesai */}
              {isSiapBerangkat && (
                <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid #f1f5f9" }}>
                  <button
                    type="button"
                    onClick={() => onSelesai(p.id, p.nama_customer)}
                    style={{ width: "100%", padding: "0.8rem", borderRadius: "10px", background: "linear-gradient(135deg, #059669, #047857)", color: "#fff", fontWeight: 700, fontSize: "0.9rem", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", boxShadow: "0 4px 12px rgba(5,150,105,0.3)" }}
                  >
                    ✅ Tandai Selesai
                  </button>
                  <p style={{ fontSize: "0.75rem", color: "#94a3b8", textAlign: "center", marginTop: "0.5rem" }}>
                    Klik jika jamaah telah kembali dari perjalanan umroh.
                  </p>
                </div>
              )}

              {isSelesai && (
                <div style={{ marginTop: "1rem", padding: "0.75rem 1rem", background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: "10px", fontSize: "0.85rem", color: "#065f46", fontWeight: 600, textAlign: "center" }}>
                  ✔ Perjalanan umroh jamaah ini telah selesai
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button type="button" className="modal-close-full-btn" onClick={onClose}>Tutup</button>
        </div>
      </div>
    </div>
  );
};


const JamaahSayaView = ({
  token,
  authH,
  refreshKey,
}: {
  token: string | null;
  authH: () => { Authorization: string };
  refreshKey: number;
}) => {
  const [list, setList] = useState<PendaftaranItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [picTab, setPicTab] = useState<"aktif" | "selesai">("aktif");
  const [selectedJamaah, setSelectedJamaah] = useState<PendaftaranItem | null>(null);
  const [konfirmasiTarget, setKonfirmasiTarget] = useState<{ id: string; name: string } | null>(null);
  const [tandaiLoading, setTandaiLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:8080/admin/pendaftaran/saya", {
        headers: authH(),
      });
      setList(res.data?.data ?? []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [authH]);

  useEffect(() => { fetchList(); }, [fetchList, refreshKey]);

  const aktifList = list.filter((p) => p.status?.toLowerCase() !== "selesai");
  const selesaiList = list.filter((p) => p.status?.toLowerCase() === "selesai");
  const displayList = picTab === "aktif" ? aktifList : selesaiList;

  const handleTandaiSelesai = async () => {
    if (!konfirmasiTarget) return;
    setTandaiLoading(true);
    try {
      await axios.put(
        `http://localhost:8080/admin/pendaftaran/${konfirmasiTarget.id}/selesai`,
        {},
        { headers: authH() }
      );
      showToast("Jamaah berhasil ditandai selesai.", "success");
      setKonfirmasiTarget(null);
      fetchList(); // refresh
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.error ?? "Gagal menandai selesai.")
        : "Gagal menandai selesai.";
      showToast(msg, "error");
    } finally {
      setTandaiLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="my-jamaah-header">
        <div className="my-jamaah-info">
          <div className="my-jamaah-icon">👤</div>
          <div>
            <div className="my-jamaah-title">Jamaah Saya</div>
            <div className="my-jamaah-sub">
              Daftar jamaah yang menjadi tanggung jawab Anda sebagai PIC.
            </div>
          </div>
        </div>
        <div className="my-jamaah-count">{list.length} jamaah</div>
      </div>

      {/* Tabs Aktif / Selesai */}
      <div style={{
        display: "flex", gap: "0.5rem",
        marginBottom: "1.25rem",
        background: "#f8fafc",
        padding: "0.35rem",
        borderRadius: "12px",
        border: "1px solid #e8edf5",
        width: "fit-content",
      }}>
        {(["aktif", "selesai"] as const).map((tab) => {
          const count = tab === "aktif" ? aktifList.length : selesaiList.length;
          const isActive = picTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setPicTab(tab)}
              style={{
                padding: "0.5rem 1.25rem",
                borderRadius: "9px",
                border: "none",
                fontWeight: isActive ? 700 : 500,
                fontSize: "0.875rem",
                cursor: "pointer",
                background: isActive ? "#fff" : "transparent",
                color: isActive ? (tab === "selesai" ? "#059669" : "#1e293b") : "#94a3b8",
                boxShadow: isActive ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.2s",
                display: "flex", alignItems: "center", gap: "0.4rem",
              }}
            >
              {tab === "aktif" ? "🟢 Aktif" : "✅ Selesai"}
              <span style={{
                background: isActive ? (tab === "selesai" ? "#d1fae5" : "#eff6ff") : "#f1f5f9",
                color: isActive ? (tab === "selesai" ? "#065f46" : "#3b82f6") : "#94a3b8",
                padding: "0.1rem 0.5rem", borderRadius: "999px",
                fontSize: "0.72rem", fontWeight: 700,
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="pendaftaran-table-card">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="table-skel-row" style={{ padding: "1rem 1.25rem" }}>
              <div className="skel" style={{ width: 36, height: 36, borderRadius: "50%" }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <div className="skel" style={{ width: "35%", height: 12 }} />
                <div className="skel" style={{ width: "55%", height: 10 }} />
              </div>
              <div className="skel" style={{ width: 80, height: 22, borderRadius: 999 }} />
              <div className="skel" style={{ width: 100, height: 12 }} />
            </div>
          ))}
        </div>
      ) : displayList.length === 0 ? (
        <div className="my-jamaah-empty">
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>
            {picTab === "selesai" ? "🎉" : "👥"}
          </div>
          <div style={{ fontWeight: 700, color: "#1e293b", marginBottom: "0.4rem", fontSize: "1rem" }}>
            {picTab === "selesai" ? "Belum Ada Jamaah Selesai" : "Belum Ada Jamaah Aktif"}
          </div>
          <p style={{ fontSize: "0.85rem", color: "#94a3b8", lineHeight: 1.6 }}>
            {picTab === "selesai"
              ? "Jamaah yang sudah selesai melaksanakan umroh akan muncul di sini."
              : "Anda belum menjadi PIC untuk jamaah manapun.\nBuka tab \"Semua Pendaftaran\" dan klik \"Detail & Assign\" untuk mengambil tanggung jawab jamaah."}
          </p>
        </div>
      ) : (
        <div className="my-jamaah-grid">
          {displayList.map((p) => {
            const isSelesai = p.status?.toLowerCase() === "selesai";
            return (
              <div
                key={p.id}
                className={`my-jamaah-card ${isSelesai ? "my-jamaah-card-selesai" : ""}`}
                style={{ cursor: "pointer" }}
                onClick={() => setSelectedJamaah(p)}
              >
                <div className="my-jamaah-card-top">
                  <div className="my-jamaah-avatar">
                    {p.nama_customer?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>
                  <div className="my-jamaah-card-info">
                    <div className="my-jamaah-name">{p.nama_customer}</div>
                    <div className="my-jamaah-nomor">{p.nomor_pendaftaran}</div>
                  </div>
                  {isSelesai ? (
                    <span style={{ background: "#d1fae5", color: "#065f46", padding: "0.25rem 0.75rem", borderRadius: 999, fontSize: "0.75rem", fontWeight: 700, whiteSpace: "nowrap" }}>
                      ✔ Selesai
                    </span>
                  ) : (
                    <StatusPill value={p.status} />
                  )}
                </div>
                <div className="my-jamaah-card-paket">{p.paket}</div>
                <div className="my-jamaah-card-status-row">
                  <div className="my-jamaah-status-item">
                    <span className="my-jamaah-status-label">Bayar</span>
                    <StatusPill value={p.payment_status} />
                  </div>
                  <div className="my-jamaah-status-item">
                    <span className="my-jamaah-status-label">Dokumen</span>
                    <StatusPill value={p.document_status} />
                  </div>
                </div>
                <div className="my-jamaah-card-date">
                  Daftar: {fmtDate(p.tanggal_daftar)}
                </div>
                {/* Hint tap */}
                <div style={{ textAlign: "center", fontSize: "0.72rem", color: "#94a3b8", marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "1px solid #f1f5f9" }}>
                  Klik untuk detail {p.status?.toLowerCase() === "siap_berangkat" ? "& tandai selesai" : ""}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Detail PIC */}
      {selectedJamaah && (
        <PICDetailModal
          p={selectedJamaah}
          token={token}
          onClose={() => setSelectedJamaah(null)}
          onSelesai={(id, name) => {
            setSelectedJamaah(null);
            setKonfirmasiTarget({ id, name });
          }}
        />
      )}

      {/* Modal Konfirmasi */}
      {konfirmasiTarget && (
        <KonfirmasiSelesaiModal
          jamaahName={konfirmasiTarget.name}
          onBatal={() => setKonfirmasiTarget(null)}
          onYa={handleTandaiSelesai}
          loading={tandaiLoading}
        />
      )}

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
};


export default AdminPendaftaran;
