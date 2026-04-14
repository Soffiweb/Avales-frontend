"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function AccesoDenegadoPage() {
  return (
    <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-8 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center mb-4">
          <ShieldAlert className="w-7 h-7 text-rose-600 dark:text-rose-300" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Acceso denegado
        </h1>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Tu rol no tiene permisos para acceder a esta sección.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
          >
            Ir al dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
