import { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import { useAuth } from "../../../context/AuthContext";
import "./Laporan.css";

// ── Libs ─────────────────────────────────────────────────────────────────────
// chart.js — loaded dynamically to avoid SSR issues
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);

// jspdf for PDF, xlsx for Excel
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Ringkasan {
  total_pendaftaran: number;
  total_pembayaran:  number;
  total_tagihan:     number;
  sisa_tagihan:      number;
  pembayaran_menunggu: number;
}

interface PendaftaranPerPaket {
  paket_id:       string;
  nama_paket:     string;
  jumlah_jamaah:  number;
  kuota_max:      number;
  kuota_terpakai: number;
  is_active:      boolean;
  is_finished:    boolean;
}

interface PembayaranPerStatus {
  status:            string;
  jumlah_transaksi:  number;
  total_nominal:     number;
}

interface TrenBulan {
  periode: string;
  label:   string;
  jumlah:  number;
}

interface LaporanData {
  periode:          { start_date: string; end_date: string };
  ringkasan:        Ringkasan;
  pendaftaran:      PendaftaranPerPaket[];
  pembayaran:       PembayaranPerStatus[];
  tren_pendaftaran: TrenBulan[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtRupiah = (n: number) =>
  "Rp " + (n ?? 0).toLocaleString("id-ID", { maximumFractionDigits: 0 });

const fmtNum = (n: number) => (n ?? 0).toLocaleString("id-ID");

const today = () => {
  const d = new Date();
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const firstDayOfMonth = () => {
  const d = new Date();
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
};

const statusLabel: Record<string, string> = {
  pending: "Menunggu Verifikasi",
  diterima: "Diterima",
  ditolak: "Ditolak",
};
const statusPill: Record<string, string> = {
  pending: "lap-pill-pending",
  diterima: "lap-pill-diterima",
  ditolak: "lap-pill-ditolak",
};

// ── Component ─────────────────────────────────────────────────────────────────
const Laporan = () => {
  const { token } = useAuth();
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const [startDate, setStartDate] = useState(firstDayOfMonth());
  const [endDate,   setEndDate]   = useState(today());
  const [filterError, setFilterError] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [data,     setData]     = useState<LaporanData | null>(null);
  const [exporting, setExporting] = useState<"pdf"|"excel"|null>(null);

  const chartRef   = useRef<HTMLCanvasElement>(null);
  const chartInst  = useRef<Chart | null>(null);

  // ── Fetch data ──
  const fetchLaporan = useCallback(async (start: string, end: string) => {
    setFilterError("");
    setError("");
    if (!start || !end) { setFilterError("Tanggal mulai dan akhir wajib diisi."); return; }
    if (start > end)    { setFilterError("Tanggal mulai tidak boleh melebihi tanggal akhir."); return; }

    setLoading(true);
    setData(null);
    try {
      const res = await axios.get("http://localhost:8080/owner/laporan", {
        ...authHeader,
        params: { start_date: start, end_date: end },
      });
      setData(res.data);
    } catch (err: unknown) {
      setError(
        axios.isAxiosError(err)
          ? err.response?.data?.error ?? "Gagal memuat laporan."
          : "Gagal memuat laporan."
      );
    } finally {
      setLoading(false);
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load on mount with default periode
  useEffect(() => {
    fetchLaporan(startDate, endDate);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render chart ──
  useEffect(() => {
    if (!data || !chartRef.current) return;

    if (chartInst.current) {
      chartInst.current.destroy();
      chartInst.current = null;
    }

    const tren = data.tren_pendaftaran ?? [];
    const ctx  = chartRef.current.getContext("2d");
    if (!ctx) return;

    chartInst.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: tren.map((t) => t.label),
        datasets: [
          {
            label: "Pendaftaran",
            data:  tren.map((t) => t.jumlah),
            backgroundColor: "rgba(99,102,241,0.7)",
            borderColor:     "#4f46e5",
            borderWidth:     1.5,
            borderRadius:    6,
            hoverBackgroundColor: "rgba(79,70,229,0.85)",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.formattedValue} pendaftaran`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              precision: 0,
              font: { size: 11 },
              color: "#94a3b8",
            },
            grid: { color: "#f1f5f9" },
          },
          x: {
            ticks: { font: { size: 11 }, color: "#64748b" },
            grid: { display: false },
          },
        },
      },
    });

    return () => {
      chartInst.current?.destroy();
      chartInst.current = null;
    };
  }, [data]);

  // ── Export PDF ──
  const handleExportPDF = async () => {
    if (!data) return;
    setExporting("pdf");
    try {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const { ringkasan, pendaftaran, pembayaran } = data;
      const pw = doc.internal.pageSize.getWidth();
      let y = 20;

      // Title
      doc.setFontSize(16); doc.setFont("helvetica", "bold");
      doc.text("LAPORAN DAN REKAPITULASI", pw / 2, y, { align: "center" }); y += 7;
      doc.setFontSize(12); doc.setFont("helvetica", "normal");
      doc.text("BONITA UMROH", pw / 2, y, { align: "center" }); y += 10;

      doc.setFontSize(10);
      doc.text(`Periode: ${data.periode.start_date}  s.d.  ${data.periode.end_date}`, pw / 2, y, { align: "center" }); y += 10;

      // A. Ringkasan
      doc.setFont("helvetica", "bold"); doc.setFontSize(11);
      doc.text("A. Ringkasan", 14, y); y += 7;
      doc.setFont("helvetica", "normal"); doc.setFontSize(10);

      const rows: [string, string][] = [
        ["Total Pendaftaran", `${ringkasan.total_pendaftaran} pendaftaran`],
        ["Total Pembayaran (Diterima)", fmtRupiah(ringkasan.total_pembayaran)],
        ["Total Tagihan", fmtRupiah(ringkasan.total_tagihan)],
        ["Sisa Tagihan", fmtRupiah(ringkasan.sisa_tagihan)],
        ["Pembayaran Menunggu Verifikasi", `${ringkasan.pembayaran_menunggu} transaksi`],
      ];

      rows.forEach(([label, val]) => {
        doc.text(`• ${label}`, 18, y);
        doc.text(val, pw - 14, y, { align: "right" });
        y += 6;
      });

      y += 4;
      doc.line(14, y, pw - 14, y); y += 6;

      // B. Rekapitulasi Pendaftaran
      doc.setFont("helvetica", "bold"); doc.setFontSize(11);
      doc.text("B. Rekapitulasi Pendaftaran", 14, y); y += 7;
      doc.setFont("helvetica", "bold"); doc.setFontSize(9);
      doc.text("Paket Umroh", 14, y);
      doc.text("Jamaah", 110, y, { align: "right" });
      doc.text("Kuota Max", 140, y, { align: "right" });
      doc.text("Terpakai", 165, y, { align: "right" });
      doc.text("Status", pw - 14, y, { align: "right" });
      y += 5;
      doc.line(14, y, pw - 14, y); y += 4;
      doc.setFont("helvetica", "normal"); doc.setFontSize(9);

      pendaftaran.forEach((p) => {
        if (y > 260) { doc.addPage(); y = 20; }
        const status = p.is_finished ? "Selesai" : p.is_active ? "Aktif" : "Nonaktif";
        const nama = doc.splitTextToSize(p.nama_paket, 90)[0];
        doc.text(nama, 14, y);
        doc.text(String(p.jumlah_jamaah), 110, y, { align: "right" });
        doc.text(String(p.kuota_max), 140, y, { align: "right" });
        doc.text(String(p.kuota_terpakai), 165, y, { align: "right" });
        doc.text(status, pw - 14, y, { align: "right" });
        y += 6;
      });

      y += 4;
      doc.line(14, y, pw - 14, y); y += 6;

      // C. Rekapitulasi Pembayaran
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFont("helvetica", "bold"); doc.setFontSize(11);
      doc.text("C. Rekapitulasi Pembayaran", 14, y); y += 7;
      doc.setFont("helvetica", "bold"); doc.setFontSize(9);
      doc.text("Status", 14, y);
      doc.text("Jumlah Transaksi", 130, y, { align: "right" });
      doc.text("Total Nominal", pw - 14, y, { align: "right" });
      y += 5;
      doc.line(14, y, pw - 14, y); y += 4;
      doc.setFont("helvetica", "normal");

      pembayaran.forEach((p) => {
        if (y > 260) { doc.addPage(); y = 20; }
        doc.text(statusLabel[p.status] ?? p.status, 14, y);
        doc.text(String(p.jumlah_transaksi), 130, y, { align: "right" });
        doc.text(fmtRupiah(p.total_nominal), pw - 14, y, { align: "right" });
        y += 6;
      });

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8); doc.setTextColor(150);
        doc.text(`Dicetak: ${new Date().toLocaleDateString("id-ID")} | Halaman ${i} dari ${pageCount}`, pw / 2, 290, { align: "center" });
        doc.setTextColor(0);
      }

      doc.save(`Laporan_BonUmroh_${data.periode.start_date}_${data.periode.end_date}.pdf`);
    } catch {
      alert("Gagal menghasilkan PDF.");
    } finally {
      setExporting(null);
    }
  };

  // ── Export Excel ──
  const handleExportExcel = () => {
    if (!data) return;
    setExporting("excel");
    try {
      const wb = XLSX.utils.book_new();
      const { ringkasan, pendaftaran, pembayaran, tren_pendaftaran } = data;

      // Sheet 1 — Ringkasan
      const ringkasanSheet = XLSX.utils.aoa_to_sheet([
        ["LAPORAN DAN REKAPITULASI — BONITA UMROH"],
        [`Periode: ${data.periode.start_date} s.d. ${data.periode.end_date}`],
        [],
        ["Metrik", "Nilai"],
        ["Total Pendaftaran", ringkasan.total_pendaftaran],
        ["Total Pembayaran (Diterima)", ringkasan.total_pembayaran],
        ["Total Tagihan", ringkasan.total_tagihan],
        ["Sisa Tagihan", ringkasan.sisa_tagihan],
        ["Pembayaran Menunggu Verifikasi", ringkasan.pembayaran_menunggu],
      ]);
      XLSX.utils.book_append_sheet(wb, ringkasanSheet, "Ringkasan");

      // Sheet 2 — Pendaftaran
      const daftarRows = [
        ["Paket Umroh", "Jumlah Jamaah", "Kuota Max", "Kuota Terpakai", "Status"],
        ...pendaftaran.map((p) => [
          p.nama_paket,
          p.jumlah_jamaah,
          p.kuota_max,
          p.kuota_terpakai,
          p.is_finished ? "Selesai" : p.is_active ? "Aktif" : "Nonaktif",
        ]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(daftarRows), "Pendaftaran");

      // Sheet 3 — Pembayaran
      const bayarRows = [
        ["Status", "Jumlah Transaksi", "Total Nominal"],
        ...pembayaran.map((p) => [statusLabel[p.status] ?? p.status, p.jumlah_transaksi, p.total_nominal]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(bayarRows), "Pembayaran");

      // Sheet 4 — Tren
      const trenRows = [
        ["Periode", "Jumlah Pendaftaran"],
        ...tren_pendaftaran.map((t) => [t.label, t.jumlah]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(trenRows), "Tren Pendaftaran");

      XLSX.writeFile(wb, `Laporan_BonUmroh_${data.periode.start_date}_${data.periode.end_date}.xlsx`);
    } catch {
      alert("Gagal menghasilkan Excel.");
    } finally {
      setExporting(null);
    }
  };

  const handleApply = () => fetchLaporan(startDate, endDate);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="laporan-page">

      {/* Header */}
      <div className="laporan-header">
        <div className="laporan-header-text">
          <h2>Laporan &amp; Rekapitulasi</h2>
          <p>Lihat ringkasan data operasional Bonita Umroh berdasarkan periode tertentu.</p>
        </div>
        <div className="laporan-export-group">
          <button
            id="laporan-export-pdf"
            className="laporan-btn-export laporan-btn-pdf"
            onClick={handleExportPDF}
            disabled={!data || !!exporting}
            title="Export PDF"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/>
              <line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
            {exporting === "pdf" ? "Menghasilkan..." : "Export PDF"}
          </button>
          <button
            id="laporan-export-excel"
            className="laporan-btn-export laporan-btn-excel"
            onClick={handleExportExcel}
            disabled={!data || !!exporting}
            title="Export Excel"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
              <rect width="20" height="16" x="2" y="4" rx="2"/>
              <path d="M2 9h20M9 4v16"/>
            </svg>
            {exporting === "excel" ? "Menghasilkan..." : "Export Excel"}
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="laporan-filter-card">
        <div className="laporan-filter-title">Filter Periode</div>
        <div className="laporan-filter-row">
          <div className="laporan-filter-field">
            <label className="laporan-filter-label" htmlFor="lap-start">Tanggal Mulai</label>
            <input
              id="lap-start"
              type="date"
              className="laporan-filter-input"
              value={startDate}
              max={endDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="laporan-filter-field">
            <label className="laporan-filter-label" htmlFor="lap-end">Tanggal Akhir</label>
            <input
              id="lap-end"
              type="date"
              className="laporan-filter-input"
              value={endDate}
              min={startDate}
              max={today()}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <button
            id="laporan-apply"
            className="laporan-filter-btn"
            onClick={handleApply}
            disabled={loading}
          >
            {loading ? (
              <><div className="ma-spinner" /> Memuat...</>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                Terapkan
              </>
            )}
          </button>
        </div>
        {filterError && (
          <div className="laporan-filter-error">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {filterError}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="lap-error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <>
          <div className="lap-skeleton-grid">
            {[1,2,3,4,5].map((i) => (
              <div className="lap-skeleton-card" key={i}>
                <div className="lap-skeleton-bar" />
                <div className="lap-skeleton-inner">
                  <div className="lap-skeleton-line" style={{ width: "55%" }} />
                  <div className="lap-skeleton-value" />
                </div>
              </div>
            ))}
          </div>
          <div className="laporan-section-card" style={{ height: 200 }}>
            <div className="lap-skeleton-bar" style={{ height: 4 }} />
          </div>
        </>
      )}

      {/* ── DATA ── */}
      {!loading && data && (
        <>
          {/* Summary cards */}
          <div className="laporan-summary-grid">
            <SummaryCard
              accent="laporan-card-indigo"
              label="Total Pendaftaran"
              value={fmtNum(data.ringkasan.total_pendaftaran)}
              sub="pendaftaran dalam periode"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              }
            />
            <SummaryCard
              accent="laporan-card-emerald"
              label="Total Pembayaran"
              value={fmtRupiah(data.ringkasan.total_pembayaran)}
              sub="pembayaran diterima"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <rect width="20" height="14" x="2" y="5" rx="2"/>
                  <line x1="2" x2="22" y1="10" y2="10"/>
                </svg>
              }
            />
            <SummaryCard
              accent="laporan-card-amber"
              label="Total Tagihan"
              value={fmtRupiah(data.ringkasan.total_tagihan)}
              sub="nilai invoice periode ini"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              }
            />
            <SummaryCard
              accent="laporan-card-rose"
              label="Sisa Tagihan"
              value={fmtRupiah(data.ringkasan.sisa_tagihan)}
              sub="belum terbayarkan"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 8v4M12 16h.01"/>
                </svg>
              }
            />
            <SummaryCard
              accent="laporan-card-sky"
              label="Menunggu Verifikasi"
              value={fmtNum(data.ringkasan.pembayaran_menunggu)}
              sub="transaksi pending"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              }
            />
          </div>

          {/* Chart: Tren Pendaftaran */}
          <div className="laporan-section-card">
            <div className="laporan-section-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
              <span className="laporan-section-title">Tren Pendaftaran Jamaah</span>
            </div>
            {data.tren_pendaftaran.length === 0 ? (
              <div className="lap-empty">
                <div className="lap-empty-icon">📊</div>
                <p>Tidak ada data tren pendaftaran pada periode ini.</p>
              </div>
            ) : (
              <div className="laporan-chart-wrap">
                <canvas ref={chartRef} />
              </div>
            )}
          </div>

          {/* Rekapitulasi Pendaftaran */}
          <div className="laporan-section-card">
            <div className="laporan-section-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <span className="laporan-section-title">Rekapitulasi Pendaftaran per Paket</span>
            </div>
            {data.pendaftaran.length === 0 ? (
              <div className="lap-empty">
                <div className="lap-empty-icon">📋</div>
                <p>Belum ada data pendaftaran pada periode ini.</p>
              </div>
            ) : (
              <div className="laporan-table-wrap">
                <table className="laporan-table">
                  <thead>
                    <tr>
                      <th>Paket Umroh</th>
                      <th style={{ textAlign: "right" }}>Jumlah Jamaah</th>
                      <th style={{ textAlign: "right" }}>Kuota Maksimal</th>
                      <th style={{ textAlign: "right" }}>Kuota Terpakai</th>
                      <th>Status Paket</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.pendaftaran.map((p) => {
                      const status = p.is_finished ? "Selesai" : p.is_active ? "Aktif" : "Nonaktif";
                      const pillClass = p.is_finished ? "lap-pill-selesai" : p.is_active ? "lap-pill-aktif" : "lap-pill-nonaktif";
                      return (
                        <tr key={p.paket_id}>
                          <td style={{ fontWeight: 600 }}>{p.nama_paket}</td>
                          <td style={{ textAlign: "right" }} className="lap-number">{fmtNum(p.jumlah_jamaah)}</td>
                          <td style={{ textAlign: "right" }} className="lap-number">{fmtNum(p.kuota_max)}</td>
                          <td style={{ textAlign: "right" }} className="lap-number">{fmtNum(p.kuota_terpakai)}</td>
                          <td><span className={`lap-pill ${pillClass}`}>{status}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Rekapitulasi Pembayaran */}
          <div className="laporan-section-card">
            <div className="laporan-section-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.2">
                <rect width="20" height="14" x="2" y="5" rx="2"/>
                <line x1="2" x2="22" y1="10" y2="10"/>
              </svg>
              <span className="laporan-section-title">Rekapitulasi Pembayaran per Status</span>
            </div>
            {data.pembayaran.length === 0 ? (
              <div className="lap-empty">
                <div className="lap-empty-icon">💳</div>
                <p>Belum ada transaksi pembayaran pada periode ini.</p>
              </div>
            ) : (
              <div className="laporan-table-wrap">
                <table className="laporan-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Jumlah Transaksi</th>
                      <th style={{ textAlign: "right" }}>Total Nominal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.pembayaran.map((p) => (
                      <tr key={p.status}>
                        <td>
                          <span className={`lap-pill ${statusPill[p.status] ?? ""}`}>
                            {statusLabel[p.status] ?? p.status}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }} className="lap-number">{fmtNum(p.jumlah_transaksi)}</td>
                        <td style={{ textAlign: "right" }} className="lap-number">{fmtRupiah(p.total_nominal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

    </div>
  );
};

// ── SummaryCard ────────────────────────────────────────────────────────────────
interface SummaryCardProps {
  accent:  string;
  label:   string;
  value:   string;
  sub:     string;
  icon:    React.ReactNode;
}

const SummaryCard = ({ accent, label, value, sub, icon }: SummaryCardProps) => (
  <div className={`laporan-summary-card ${accent}`}>
    <div className="laporan-card-icon">{icon}</div>
    <div className="laporan-card-label">{label}</div>
    <div className="laporan-card-value">{value}</div>
    <div className="laporan-card-sub">{sub}</div>
  </div>
);

export default Laporan;
