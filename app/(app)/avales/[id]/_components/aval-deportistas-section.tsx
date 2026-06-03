"use client";

import { User } from "lucide-react";
import type { DeportistaAval, ModalidadParticipacion } from "@/types/aval";
import { getModalidadParticipacionLabel } from "@/lib/constants";

function normalizeSortKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toUpperCase();
}

function splitFullName(fullName: string) {
  const cleaned = fullName.replace(/\s+/g, " ").trim();
  if (!cleaned) return { first: "", last: "" };
  const parts = cleaned.split(" ");
  if (parts.length === 1) return { first: cleaned, last: "" };
  const last = parts[parts.length - 1] ?? "";
  const first = parts.slice(0, -1).join(" ");
  return { first, last };
}

function getLastNameForSort(item: DeportistaAval) {
  const last =
    item.deportista?.apellido?.trim() ||
    item.deportista?.apellidos?.trim() ||
    "";
  if (last) return last;

  const fullName = item.deportista?.nombre?.trim() ?? "";
  if (fullName) return splitFullName(fullName).last;

  const composed = `${item.deportista?.nombres ?? ""} ${item.deportista?.apellidos ?? ""}`.trim();
  if (composed) return splitFullName(composed).last;

  return "";
}

function getFirstNameForSort(item: DeportistaAval) {
  return item.deportista?.nombre?.trim() || item.deportista?.nombres?.trim() || "";
}

function formatDeportistaName(item: DeportistaAval) {
  const nombreCompleto = item.deportista?.nombre?.trim();
  if (nombreCompleto) return nombreCompleto;

  const nombresSeparados =
    `${item.deportista?.nombres ?? ""} ${item.deportista?.apellidos ?? ""}`.trim();
  if (nombresSeparados) return nombresSeparados;
  return "Nombre no disponible";
}

function getDeportistaCedula(item: DeportistaAval) {
  return item.deportista?.cedula ?? "Cédula no disponible";
}

function sortDeportistas(list: DeportistaAval[]) {
  return list.slice().sort((a, b) => {
    const lastA = normalizeSortKey(getLastNameForSort(a));
    const lastB = normalizeSortKey(getLastNameForSort(b));
    const lastCmp = lastA.localeCompare(lastB, "es", { sensitivity: "base" });
    if (lastCmp !== 0) return lastCmp;

    const firstA = normalizeSortKey(getFirstNameForSort(a));
    const firstB = normalizeSortKey(getFirstNameForSort(b));
    const firstCmp = firstA.localeCompare(firstB, "es", { sensitivity: "base" });
    if (firstCmp !== 0) return firstCmp;

    return String(a.id).localeCompare(String(b.id));
  });
}

const MODALIDAD_ORDER: Array<ModalidadParticipacion | null> = [
  "CUBIERTO_FONDOS_PUBLICOS",
  "CUBIERTO_AUTOGESTION",
  "SOLO_RESULTADO",
  null,
];

const MODALIDAD_STYLES: Record<string, string> = {
  CUBIERTO_FONDOS_PUBLICOS:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800",
  CUBIERTO_AUTOGESTION:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800",
  SOLO_RESULTADO:
    "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/60 dark:text-gray-400 dark:border-gray-700",
};

type AvalDeportistasSectionProps = {
  deportistas: DeportistaAval[];
};

export default function AvalDeportistasSection({
  deportistas,
}: AvalDeportistasSectionProps) {
  const grouped = new Map<ModalidadParticipacion | null, DeportistaAval[]>();

  for (const d of deportistas) {
    const key = d.modalidadParticipacion ?? null;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(d);
  }

  const hasGroups = grouped.size > 1 || (grouped.size === 1 && grouped.keys().next().value !== null);
  const orderedKeys = MODALIDAD_ORDER.filter((k) => grouped.has(k));

  return (
    <div className="bg-white dark:bg-gray-950/60 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500 mb-3">
        Deportistas seleccionados ({deportistas.length})
      </p>

      {deportistas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-600 bg-white/60 dark:bg-gray-900/40 px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
          No hay deportistas registrados.
        </div>
      ) : hasGroups ? (
        <div className="space-y-4">
          {orderedKeys.map((modalidad) => {
            const grupo = grouped.get(modalidad) ?? [];
            const sorted = sortDeportistas(grupo);
            const badgeStyle =
              MODALIDAD_STYLES[modalidad ?? ""] ??
              "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/60 dark:text-gray-400 dark:border-gray-700";

            return (
              <div key={modalidad ?? "sin-modalidad"}>
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeStyle}`}
                  >
                    {getModalidadParticipacionLabel(modalidad)}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {sorted.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {sorted.map((deportista) => (
                    <DeportistaRow key={deportista.id} deportista={deportista} showModalidad={false} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {sortDeportistas(deportistas).map((deportista) => (
            <DeportistaRow key={deportista.id} deportista={deportista} showModalidad />
          ))}
        </div>
      )}
    </div>
  );
}

function DeportistaRow({
  deportista,
  showModalidad,
}: {
  deportista: DeportistaAval;
  showModalidad: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 px-3 py-2">
      <div className="w-10 h-10 rounded-full border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800/60 flex items-center justify-center">
        <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {formatDeportistaName(deportista)}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {deportista.rol}
          {" · "}
          {getDeportistaCedula(deportista)}
        </p>
        {showModalidad && deportista.modalidadParticipacion ? (
          <p className="mt-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-300">
            {getModalidadParticipacionLabel(deportista.modalidadParticipacion)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
