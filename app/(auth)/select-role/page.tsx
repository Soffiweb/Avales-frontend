"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import AuthImage from "../_components/aut-image";
import LogoFedeLoja from "@/public/images/LogoFedeLoja.png";
import { useAuth } from "@/app/providers/auth-provider";
import { getProfile, selectRole } from "@/lib/api/auth";
import { clearPendingRoleSelection } from "@/lib/auth/tokens";
import type { RoleLike } from "@/types/user";
import { getRoleCode, getRoleName } from "@/lib/auth/roles";

export default function SelectRolePage() {
  const router = useRouter();
  const { refreshUser } = useAuth();

  const [roles, setRoles] = useState<RoleLike[] | null>(null);
  const [selectionToken, setSelectionToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("avales:rolesToSelect");
    const token = sessionStorage.getItem("avales:selectionToken");
    if (token) setSelectionToken(token);

    if (raw) {
      try {
        const parsed = JSON.parse(raw) as RoleLike[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRoles(parsed);
          return;
        }
      } catch {
        // ignore
      }
    }

    const loadFromProfile = async () => {
      try {
        const profile = await getProfile();
        const u = profile.data;
        if (u?.rolActivo) {
          router.replace("/dashboard");
          return;
        }
        const profileRoles = (u?.roles ?? []) as RoleLike[];
        if (profileRoles.length > 0) {
          setRoles(profileRoles);
          return;
        }
        router.replace("/signin");
      } catch {
        router.replace("/signin");
      }
    };

    void loadFromProfile();
  }, [router]);

  const handleSelect = async (rol: RoleLike) => {
    setSubmitting(getRoleCode(rol));
    setError(null);
    try {
      await selectRole(rol, selectionToken ?? undefined);
      clearPendingRoleSelection();
      await refreshUser();
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message ?? "No se pudo seleccionar el rol. Intenta de nuevo.");
      setSubmitting(null);
    }
  };

  const handleCancel = () => {
    clearPendingRoleSelection();
    router.replace("/signin");
  };

  const content = useMemo(() => {
    if (!roles) {
      return (
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Cargando opciones...</p>
        </div>
      );
    }

    return (
      <div className="max-w-sm w-full">
        <h1 className="text-3xl font-bold text-center text-slate-800 dark:text-slate-100 mb-2">
          Elegí tu rol
        </h1>
        <p className="text-center text-sm text-slate-500 mb-8">
          Tu cuenta tiene varios roles asignados. Seleccioná con cuál querés operar en esta sesión.
        </p>

        <div className="space-y-3">
          {roles.map((rol) => {
            const code = getRoleCode(rol);
            const isSubmitting = submitting === code;
            const disabled = submitting !== null;
            return (
              <button
                key={code}
                type="button"
                onClick={() => handleSelect(rol)}
                disabled={disabled}
                className={`w-full flex items-center justify-between px-5 py-3 rounded-md border transition
                  ${isSubmitting
                    ? "bg-indigo-500 text-white border-indigo-500"
                    : "bg-white hover:bg-indigo-50 border-slate-300 text-slate-800 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"}
                  ${disabled && !isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span className="font-medium">{getRoleName(rol)}</span>
                <span className="text-xs uppercase tracking-wider opacity-70">
                  {isSubmitting ? "Entrando..." : "Acceder"}
                </span>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mt-6 bg-red-600 text-white text-sm p-3 rounded-md border-l-4 border-red-800 shadow-md">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleCancel}
          className="mt-6 w-full text-center text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          disabled={submitting !== null}
        >
          Cancelar e iniciar sesión con otra cuenta
        </button>
      </div>
    );
  }, [roles, submitting, error]);

  return (
    <main className="bg-white dark:bg-slate-900 flex h-screen">
      <div className="hidden md:flex w-1/2 relative">
        <AuthImage className="absolute inset-0 w-full h-full object-cover" />
      </div>

      <div className="w-full md:w-1/2 flex flex-col justify-center items-center px-6 relative">
        <div className="absolute top-4 right-4">
          <Image
            src={LogoFedeLoja}
            alt="Logo Federación Deportiva"
            width={80}
            height={80}
            style={{ width: "auto", height: "auto" }}
            className="object-contain"
          />
        </div>

        {content}
      </div>
    </main>
  );
}
