"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpenText, GraduationCap } from "lucide-react";

import AlertBanner from "@/components/ui/alert-banner";
import { getCategorias } from "@/lib/api/categorias";
import { getDisciplinas } from "@/lib/api/disciplinas";
import type { CatalogItem } from "@/types/catalog";

type CatalogSummary = {
  categorias: CatalogItem[];
  disciplinas: CatalogItem[];
};

export default function CatalogosPage() {
  const [summary, setSummary] = useState<CatalogSummary>({
    categorias: [],
    disciplinas: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [categoriasRes, disciplinasRes] = await Promise.allSettled([
          getCategorias(),
          getDisciplinas(),
        ]);

        if (!active) return;

        const rejected =
          categoriasRes.status === "rejected"
            ? categoriasRes.reason
            : disciplinasRes.status === "rejected"
            ? disciplinasRes.reason
            : null;

        if (rejected) {
          setError(
            rejected instanceof Error
              ? rejected.message
              : "No se pudo cargar uno o más catálogos."
          );
        }

        setSummary({
          categorias:
            categoriasRes.status === "fulfilled"
              ? categoriasRes.value.data ?? []
              : [],
          disciplinas:
            disciplinasRes.status === "fulfilled"
              ? disciplinasRes.value.data ?? []
              : [],
        });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "No se pudo cargar el catálogo.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-gray-100">
          Catálogos
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Gestiona categorías y disciplinas disponibles en el sistema.
        </p>
      </div>

      {error && (
        <div className="mb-6">
          <AlertBanner
            variant="error"
            message="No se pudo cargar el catálogo."
            description={error}
          />
        </div>
      )}

      {loading ? (
        <div className="min-h-[30vh] flex items-center justify-center rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Cargando catálogos...
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <Link
            href="/catalogos/categorias"
            className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm hover:border-violet-300 dark:hover:border-violet-700 transition"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <BookOpenText className="w-10 h-10 text-violet-600 dark:text-violet-400" />
                <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Categorías
                </h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {summary.categorias.length} categorías disponibles.
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/catalogos/disciplinas"
            className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm hover:border-violet-300 dark:hover:border-violet-700 transition"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <GraduationCap className="w-10 h-10 text-violet-600 dark:text-violet-400" />
                <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Disciplinas
                </h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {summary.disciplinas.length} disciplinas disponibles.
                </p>
              </div>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
