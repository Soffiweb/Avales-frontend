"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ClipboardEdit, Eye, History } from "lucide-react";

import { useAuth } from "@/app/providers/auth-provider";
import AlertBanner from "@/components/ui/alert-banner";
import Breadcrumb from "@/components/ui/breadcrumb";
import { canAccessReforms } from "@/lib/auth/access";
import { getEvento, listEventoReforms, type EventoReformaListItem } from "@/lib/api/eventos";
import { formatDateTimeShort } from "@/lib/utils/formatters";
import type { Evento } from "@/types/evento";

const STATUS_STYLES: Record<string, string> = {
  PENDIENTE:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  APROBADA:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  RECHAZADA:
    "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
};

function getStatusClasses(status?: string | null) {
  if (!status) {
    return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
  return (
    STATUS_STYLES[status.toUpperCase()] ??
    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
  );
}

function formatUserLabel(user?: EventoReformaListItem["solicitante"]) {
  if (!user) return "-";
  const fullName = [user.nombre, user.apellido].filter(Boolean).join(" ").trim();
  return fullName || user.email || `#${user.id}`;
}

export default function EventoHistorialPage() {
  const params = useParams<{ id: string }>();
  const eventoId = useMemo(() => Number(params?.id), [params?.id]);
  const { user, loading: authLoading } = useAuth();

  const [evento, setEvento] = useState<Evento | null>(null);
  const [reforms, setReforms] = useState<EventoReformaListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canView = canAccessReforms(user);

  useEffect(() => {
    if (authLoading) return;
    if (!eventoId || Number.isNaN(eventoId)) {
      setError("ID de evento inválido.");
      setLoading(false);
      return;
    }
    if (!canView) {
      setError("No tienes permisos para ver el historial de reformas.");
      setLoading(false);
      return;
    }

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [eventoRes, reformsRes] = await Promise.all([
          getEvento(eventoId),
          listEventoReforms(eventoId),
        ]);
        setEvento(eventoRes.data ?? null);
        setReforms(reformsRes.data ?? []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "No se pudo cargar el historial.");
        setEvento(null);
        setReforms([]);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [authLoading, canView, eventoId]);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-7xl mx-auto space-y-6">
      {error ? (
        <AlertBanner variant="error" message={error} onClose={() => setError(null)} />
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Breadcrumb
            items={[
              { label: "Eventos", href: "/eventos" },
              evento ? { label: evento.nombre, href: `/eventos/${evento.id}` } : { label: "Evento" },
              { label: "Historial" },
            ]}
          />
          <h1 className="mt-2 text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Historial
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            El evento siempre muestra la versión vigente; el historial se ve aquí.
          </p>
        </div>

        <Link
          href={evento ? `/eventos/${evento.id}` : "/eventos"}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>
      </div>

      {loading ? (
        <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="h-5 w-48 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="mt-4 h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="mt-2 h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      ) : reforms.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300">
            <History className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
            Sin reformas registradas
          </h2>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <ClipboardEdit className="h-5 w-5 text-gray-400" />
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                Reformas
              </h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 dark:bg-gray-900/40 dark:text-gray-300">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">Fecha</th>
                  <th className="px-5 py-3 text-left font-semibold">Estado</th>
                  <th className="px-5 py-3 text-left font-semibold">Motivo</th>
                  <th className="px-5 py-3 text-left font-semibold">Solicitante</th>
                  <th className="px-5 py-3 text-left font-semibold">Aprobador</th>
                  <th className="px-5 py-3 text-left font-semibold">Versiones</th>
                  <th className="px-5 py-3 text-right font-semibold">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {reforms.map((reform) => (
                  <tr key={reform.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-900/30">
                    <td className="px-5 py-3 text-gray-700 dark:text-gray-200">
                      {formatDateTimeShort(reform.createdAt)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                          reform.estado,
                        )}`}
                      >
                        {reform.estado}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-700 dark:text-gray-200">
                      {reform.motivo || "-"}
                    </td>
                    <td className="px-5 py-3 text-gray-700 dark:text-gray-200">
                      {formatUserLabel(reform.solicitante)}
                    </td>
                    <td className="px-5 py-3 text-gray-700 dark:text-gray-200">
                      {formatUserLabel(reform.aprobador)}
                    </td>
                    <td className="px-5 py-3 text-gray-700 dark:text-gray-200">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        base:{reform.versionBaseId ?? "-"} · aprobada:{reform.versionAprobadaId ?? "-"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/reformas/${reform.id}`}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-200 dark:hover:bg-gray-900/50"
                      >
                        <Eye className="h-4 w-4" />
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

