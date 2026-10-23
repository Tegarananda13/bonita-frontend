import React from "react";
import "./Pagination.css";

export interface AdminPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  currentCount: number;
  onPageChange: (page: number) => void;
  itemName?: string;
}

export const AdminPagination: React.FC<AdminPaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  currentCount,
  onPageChange,
  itemName = "data",
}) => {
  if (totalItems <= 0) return null;

  const validTotalPages = Math.max(1, totalPages);

  return (
    <div className="ulasan-pagination">
      <div>
        Menampilkan {currentCount} dari total {totalItems} {itemName}
      </div>
      <div className="page-controls">
        <button
          type="button"
          className="page-btn"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        >
          Sebelumnya
        </button>
        <span style={{ margin: "0 0.5rem", fontWeight: 700 }}>
          {currentPage} / {validTotalPages}
        </span>
        <button
          type="button"
          className="page-btn"
          disabled={currentPage >= validTotalPages}
          onClick={() => onPageChange(Math.min(validTotalPages, currentPage + 1))}
        >
          Selanjutnya
        </button>
      </div>
    </div>
  );
};

export default AdminPagination;
