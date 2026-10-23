import React from "react";
import "./Pagination.css";

export interface PublicPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  maxVisibleButtons?: number;
}

export const PublicPagination: React.FC<PublicPaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  maxVisibleButtons = 7,
}) => {
  if (totalPages <= 1) return null;

  // Compute page numbers to display with smart ellipsis if many pages
  const getPageNumbers = () => {
    if (totalPages <= maxVisibleButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [];
    const sideCount = Math.floor((maxVisibleButtons - 3) / 2);

    let start = Math.max(2, currentPage - sideCount);
    let end = Math.min(totalPages - 1, currentPage + sideCount);

    if (currentPage <= sideCount + 2) {
      end = Math.min(totalPages - 1, maxVisibleButtons - 2);
    }
    if (currentPage >= totalPages - (sideCount + 1)) {
      start = Math.max(2, totalPages - (maxVisibleButtons - 3));
    }

    pages.push(1);
    if (start > 2) {
      pages.push("...");
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (end < totalPages - 1) {
      pages.push("...");
    }
    pages.push(totalPages);

    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="public-pagination">
      <button
        type="button"
        className="public-page-btn"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage <= 1}
        aria-label="Halaman Sebelumnya"
      >
        ←
      </button>

      {pages.map((p, idx) => {
        if (p === "...") {
          return (
            <span
              key={`dots-${idx}`}
              style={{
                padding: "0 0.35rem",
                color: "#94a3b8",
                fontWeight: 700,
                fontSize: "0.9rem",
                userSelect: "none",
              }}
            >
              …
            </span>
          );
        }

        const pageNum = Number(p);
        const isActive = currentPage === pageNum;

        return (
          <button
            key={pageNum}
            type="button"
            className={`public-page-btn ${isActive ? "active" : ""}`}
            onClick={() => onPageChange(pageNum)}
            aria-current={isActive ? "page" : undefined}
          >
            {pageNum}
          </button>
        );
      })}

      <button
        type="button"
        className="public-page-btn"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage >= totalPages}
        aria-label="Halaman Selanjutnya"
      >
        →
      </button>
    </div>
  );
};

export default PublicPagination;
