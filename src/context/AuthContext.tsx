import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import axios from "axios";

// ── Types ──────────────────────────────────────────────────────────────────

type Role = "admin" | "owner" | "manager" | "administration_manager" | null;

interface AuthContextValue {
  token: string | null;
  role: Role;
  nama: string | null;
  login: (token: string, role: string, nama?: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function parseJwt(token: string | null): Record<string, any> | null {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

// ── Context ────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue>({
  token: null,
  role: null,
  nama: null,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
});

// ── Provider ───────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem("bonita_token")
  );
  const [role, setRole] = useState<Role>(
    () => (localStorage.getItem("bonita_role") as Role) ?? null
  );
  const [nama, setNama] = useState<string | null>(() => {
    const stored = localStorage.getItem("bonita_nama");
    if (stored) return stored;
    const jwt = parseJwt(localStorage.getItem("bonita_token"));
    return (jwt?.nama as string) || null;
  });

  const login = (newToken: string, newRole: string, newNama?: string) => {
    localStorage.setItem("bonita_token", newToken);
    localStorage.setItem("bonita_role", newRole);
    const resolvedNama = newNama || (parseJwt(newToken)?.nama as string) || "";
    if (resolvedNama) {
      localStorage.setItem("bonita_nama", resolvedNama);
    }
    setToken(newToken);
    setRole(newRole as Role);
    setNama(resolvedNama || null);
  };

  const logout = () => {
    localStorage.removeItem("bonita_token");
    localStorage.removeItem("bonita_role");
    localStorage.removeItem("bonita_nama");
    setToken(null);
    setRole(null);
    setNama(null);
  };

  // Sync / fetch nama if token exists but nama is not yet known
  useEffect(() => {
    if (!token) return;
    if (!nama) {
      axios
        .get("http://localhost:8080/admin/me", {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          const userNama = res.data?.nama || res.data?.user?.nama;
          if (userNama) {
            setNama(userNama);
            localStorage.setItem("bonita_nama", userNama);
          }
        })
        .catch(() => {});
    }
  }, [token, nama]);

  // Sync across tabs
  useEffect(() => {
    const handler = () => {
      setToken(localStorage.getItem("bonita_token"));
      setRole((localStorage.getItem("bonita_role") as Role) ?? null);
      setNama(localStorage.getItem("bonita_nama"));
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        role,
        nama,
        login,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ── Hook ───────────────────────────────────────────────────────────────────

export const useAuth = () => useContext(AuthContext);
