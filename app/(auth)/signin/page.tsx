"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import AuthImage from "../_components/aut-image";
import LogoFedeLoja from "@/public/images/LogoFedeLoja.png";
import { useAuth } from "@/app/providers/auth-provider";
import { login, selectRole } from "@/lib/api/auth";
import { loginRequiresSelection, type RoleLike } from "@/types/user";
import { getRoleCode, getRoleName } from "@/lib/auth/roles";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rolesToSelect, setRolesToSelect] = useState<RoleLike[] | null>(null);
  const [selectionToken, setSelectionToken] = useState<string | null>(null);
  const [submittingRole, setSubmittingRole] = useState<string | null>(null);
  const router = useRouter();
  const { user, loading: authLoading, refreshUser } = useAuth();

  useEffect(() => {
    const needsRole =
      user && (user.roles?.length ?? 0) > 1 && !user.rolActivo;
    if (!authLoading && user && !rolesToSelect && !needsRole) {
      router.replace("/dashboard");
      return;
    }
    if (!authLoading && user && needsRole && !rolesToSelect) {
      setRolesToSelect(user.roles ?? []);
      sessionStorage.setItem(
        "avales:rolesToSelect",
        JSON.stringify(user.roles ?? [])
      );
      return;
    }

    if (rolesToSelect) return;
    const raw = sessionStorage.getItem("avales:rolesToSelect");
    const token = sessionStorage.getItem("avales:selectionToken");
    if (token) setSelectionToken(token);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as RoleLike[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setRolesToSelect(parsed);
      }
    } catch {}
  }, [authLoading, rolesToSelect, router, user]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data } = await login(email, password);

      if (loginRequiresSelection(data)) {
        setRolesToSelect(data.roles);
        setSelectionToken(data.selectionToken ?? null);
        sessionStorage.setItem("avales:rolesToSelect", JSON.stringify(data.roles));
        if (data.selectionToken) {
          sessionStorage.setItem("avales:selectionToken", data.selectionToken);
        }
        return;
      }

      await refreshUser();
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Usuario o contraseña incorrectos."));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRole = async (rol: RoleLike) => {
    const code = getRoleCode(rol);
    setSubmittingRole(code);
    setError("");
    try {
      await selectRole(rol, selectionToken ?? undefined);
      sessionStorage.removeItem("avales:rolesToSelect");
      sessionStorage.removeItem("avales:selectionToken");
      setRolesToSelect(null);
      setSelectionToken(null);
      await refreshUser();
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(
        getErrorMessage(err, "No se pudo seleccionar el rol. Intenta de nuevo.")
      );
      setSubmittingRole(null);
    }
  };

  const handleCancelRoleSelection = () => {
    sessionStorage.removeItem("avales:rolesToSelect");
    sessionStorage.removeItem("avales:selectionToken");
    setRolesToSelect(null);
    setSelectionToken(null);
    setSubmittingRole(null);
    setError("");
  };

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

        <div className="max-w-sm w-full">
          {rolesToSelect ? (
            <>
              <h1 className="text-3xl font-bold text-center text-slate-800 dark:text-slate-100 mb-2">
                Elegí tu rol
              </h1>
              <p className="text-center text-sm text-slate-500 mb-8">
                Tu cuenta tiene varios roles asignados. Seleccioná con cuál querés operar en esta sesión.
              </p>

              <div className="space-y-3">
                {rolesToSelect.map((rol) => {
                  const code = getRoleCode(rol);
                  const isSubmitting = submittingRole === code;
                  const disabled = submittingRole !== null;
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => handleSelectRole(rol)}
                      disabled={disabled}
                      className={`w-full flex items-center justify-between px-5 py-3 rounded-md border transition
                        ${isSubmitting
                          ? "bg-indigo-500 text-white border-indigo-500"
                          : "bg-white hover:bg-indigo-50 border-slate-300 text-slate-800 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"}
                        ${disabled && !isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <span className="font-medium">{getRoleName(rol)}</span>
                      <span className="text-xs uppercase tracking-wider opacity-70">
                        {isSubmitting ? "Entrando..." : code}
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
                onClick={handleCancelRoleSelection}
                className="mt-6 w-full text-center text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                disabled={submittingRole !== null}
              >
                Cancelar e iniciar sesión con otra cuenta
              </button>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-center text-slate-800 dark:text-slate-100 mb-6">
                Federación Deportiva Provincial de Loja
              </h1>

              <form onSubmit={handleSubmit} className="space-y-10">
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="email">
                    Usuario
                  </label>
                  <input
                    id="email"
                    className="form-input w-full border-gray-300 rounded-md p-2"
                    type="text"
                    aria-label="Usuario"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    htmlFor="password"
                  >
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      className="form-input w-full border-gray-300 rounded-md p-2 pr-10"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      aria-label="Contraseña"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9.27-3.11-11-7.5a11.72 11.72 0 013.168-4.477M6.343 6.343A9.972 9.972 0 0112 5c5 0 9.27 3.11 11 7.5a11.72 11.72 0 01-4.168 4.477M6.343 6.343L3 3m3.343 3.343l2.829 2.829m4.243 4.243L17.657 17.657M17.657 17.657L21 21m-3.343-3.343l-2.829-2.829m-4.243-4.243a3 3 0 104.243 4.243" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-600 text-white text-sm p-3 rounded-md border-l-4 border-red-800 shadow-md flex items-center">
                    <svg
                      className="w-5 h-5 text-white mr-2"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 8v4m0 4h.01M5.22 5.22a9 9 0 0113.56 0m1.42 1.42a9 9 0 01-1.42 12.72m-1.42-1.42a9 9 0 01-12.72 1.42m-1.42-1.42a9 9 0 011.42-12.72"
                      />
                    </svg>
                    <span className="font-medium">{error}</span>
                  </div>
                )}

                <div className="flex justify-center mt-6">
                  <button
                    type="submit"
                    className={`w-full flex justify-center items-center bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2 rounded-md transition duration-200 ${
                      loading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    disabled={loading}
                  >
                    {loading ? "Ingresando..." : "Ingresar"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
