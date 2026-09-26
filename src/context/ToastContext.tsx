import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import "./Toast.css";

export type ToastType = "success" | "error" | "info";

export interface ToastOptions {
  title?: string;
  duration?: number;
}

export interface ToastData {
  id: number;
  type: ToastType;
  message: string;
  title?: string;
}

interface ToastContextValue {
  showToast: (
    typeOrMsg: ToastType | string,
    msgOrType?: string,
    options?: ToastOptions
  ) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<ToastData | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback(
    (
      typeOrMsg: ToastType | string,
      msgOrType?: string,
      options?: ToastOptions
    ) => {
      let type: ToastType = "success";
      let message = "";

      if (typeOrMsg === "success" || typeOrMsg === "error" || typeOrMsg === "info") {
        type = typeOrMsg as ToastType;
        message = msgOrType || "";
      } else if (msgOrType === "success" || msgOrType === "error" || msgOrType === "info") {
        type = msgOrType as ToastType;
        message = typeOrMsg;
      } else {
        message = typeOrMsg;
      }

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      const id = Date.now();
      const title = options?.title ?? (type === "success" ? "Berhasil!" : type === "error" ? "Gagal!" : "Informasi");
      const duration = options?.duration ?? 3500;

      setToast({ id, type, message, title });

      timerRef.current = setTimeout(() => {
        setToast(null);
        timerRef.current = null;
      }, duration);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toast && (
        <div className={`bonita-toast bonita-toast-${toast.type}`} role="alert">
          <span className="bonita-toast-icon">
            {toast.type === "success" ? "✅" : toast.type === "error" ? "❌" : "ℹ️"}
          </span>
          <div className="bonita-toast-body">
            <div className="bonita-toast-title">{toast.title}</div>
            <div className="bonita-toast-msg">{toast.message}</div>
          </div>
          <button
            type="button"
            className="bonita-toast-close"
            onClick={hideToast}
            aria-label="Tutup notifikasi"
          >
            ×
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
