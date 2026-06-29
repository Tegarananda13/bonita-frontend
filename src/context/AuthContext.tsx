import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

type Role = "admin" | "owner" | null;

interface AuthContextValue {
  token: string | null;
  role: Role;
  login: (token: string, role: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

// ── Context ────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue>({
  token: null,
  role: null,
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

  const login = (newToken: string, newRole: string) => {
    localStorage.setItem("bonita_token", newToken);
    localStorage.setItem("bonita_role", newRole);
    setToken(newToken);
    setRole(newRole as Role);
  };

  const logout = () => {
    localStorage.removeItem("bonita_token");
    localStorage.removeItem("bonita_role");
    setToken(null);
    setRole(null);
  };

  // Sync across tabs
  useEffect(() => {
    const handler = () => {
      setToken(localStorage.getItem("bonita_token"));
      setRole((localStorage.getItem("bonita_role") as Role) ?? null);
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        role,
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
