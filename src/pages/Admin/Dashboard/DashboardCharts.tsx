import { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

/** Grafik batang sederhana (gaya sama dengan grafik tren di halaman Laporan). */
export const DashboardBarChart = ({
  labels,
  values,
  tooltipSuffix,
}: {
  labels: string[];
  values: number[];
  tooltipSuffix: string;
}) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: "rgba(26,107,67,0.7)",
            borderColor: "#1a6b43",
            borderWidth: 1.5,
            borderRadius: 6,
            hoverBackgroundColor: "rgba(26,107,67,0.85)",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => ` ${c.formattedValue} ${tooltipSuffix}` } },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, precision: 0, font: { size: 11 }, color: "#94a3b8" },
            grid: { color: "#f1f5f9" },
          },
          x: { ticks: { font: { size: 11 }, color: "#64748b" }, grid: { display: false } },
        },
      },
    });
    return () => chart.destroy();
  }, [labels, values, tooltipSuffix]);

  return (
    <div className="dash-chart-box">
      <canvas ref={ref} role="img" aria-label="Grafik batang" />
    </div>
  );
};

/** Grafik donat distribusi (mis. status pendaftaran). */
export const DashboardDoughnutChart = ({
  labels,
  values,
  colors,
}: {
  labels: string[];
  values: number[];
  colors: string[];
}) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const chart = new Chart(ctx, {
      type: "doughnut",
      data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 2, borderColor: "#ffffff" }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "62%",
        plugins: { legend: { display: false } },
      },
    });
    return () => chart.destroy();
  }, [labels, values, colors]);

  return (
    <div className="dash-chart-box dash-chart-box-donut">
      <canvas ref={ref} role="img" aria-label="Grafik distribusi" />
    </div>
  );
};
