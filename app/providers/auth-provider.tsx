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
import { getUserFromLoginResult } from "@/types/user";
import { getProfile, switchRole as apiSwitchRole } from "@/lib/api/auth";
import { ApiError, ensureFreshAccessToken } from "@/lib/api/client";
import {
  AUTH_TOKENS_CLEARED_EVENT,
  clearPendingRoleSelection,
  getAccessToken,
} from "@/lib/auth/tokens";
import { authDebugLog, describeToken } from "@/lib/auth/debug";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      authDebugLog("AuthProvider.fetchUser: inicio", {
        currentToken: describeToken(getAccessToken()),
      });

      const accessToken = await ensureFreshAccessToken();
      if (typeof window !== "undefined" && !accessToken) {
        authDebugLog("AuthProvider.fetchUser: sin access token tras refresh");
        setUser(null);
        return;
      }

      const json = await getProfile();
      authDebugLog("AuthProvider.fetchUser: profile exitoso", {
        userId: json.data?.id ?? null,
        rolActivo: json.data?.rolActivo ?? null,
        roles: json.data?.roles ?? null,
      });
      setUser(json.data);
    } catch (err) {
      if (
        err instanceof ApiError &&
        (err.status === 401 || err.status === 403)
      ) {
        authDebugLog("AuthProvider.fetchUser: auth error", {
          status: err.status,
          message: err.message,
        });
        setUser(null);
        setError(null);
      } else {
        console.error("Error cargando perfil:", err);
        authDebugLog("AuthProvider.fetchUser: error inesperado", {
          message: err instanceof Error ? err.message : "unknown",
        });
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
    clearPendingRoleSelection();
    const nextUser = getUserFromLoginResult(data);
    if (nextUser) {
      setUser(nextUser);
      return;
    }

    const profile = await getProfile();
    setUser(profile.data);
  }, []);

  useEffect(() => {
    void fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    const refresh = () => {
      if (!getAccessToken()) {
        authDebugLog("AuthProvider.interval: sin token, no refresca");
        return;
      }
      authDebugLog("AuthProvider.interval: chequeando refresh");
      void ensureFreshAccessToken();
    };

    refresh();
    const interval = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleAuthCleared = () => {
      authDebugLog("AuthProvider: evento AUTH_TOKENS_CLEARED_EVENT");
      setUser(null);
    };

    window.addEventListener(AUTH_TOKENS_CLEARED_EVENT, handleAuthCleared);
    return () => {
      window.removeEventListener(AUTH_TOKENS_CLEARED_EVENT, handleAuthCleared);
    };
  }, []);

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
