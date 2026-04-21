// app/auth-context.tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { AuthContextType, RoleLike, User } from "../../types/user";
import { getProfile, switchRole as apiSwitchRole } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const json = await getProfile(); // ApiEnvelope<User>
      setUser(json.data);
    } catch (err) {
      console.error("DEBUG: Error detallado en fetchUser:", err);
      if (err instanceof ApiError) {
        console.error("DEBUG: ApiError status:", err.status);
        console.error("DEBUG: ApiError problem:", err.problem);
      }

      if (
        err instanceof ApiError &&
        (err.status === 401 || err.status === 403)
      ) {
        // estado normal: no autenticado
        console.log("DEBUG: Usuario no autenticado (401/403) -> Limpiando usuario.");
        setUser(null);
        setError(null);
      } else {
        console.error("Error cargando perfil:", err);
        setUser(null);
        setError(
          err instanceof Error ? err.message : "No se pudo cargar el usuario."
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const switchRole = useCallback(async (rol: RoleLike) => {
    const { data } = await apiSwitchRole(rol);
    setUser(data);
  }, []);

  useEffect(() => {
    void fetchUser();
  }, [fetchUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        refreshUser: fetchUser,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return ctx;
}
