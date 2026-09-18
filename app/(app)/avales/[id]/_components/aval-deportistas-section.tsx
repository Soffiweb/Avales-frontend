"use client";

import { User } from "lucide-react";
import type { DeportistaAval, ModalidadParticipacion } from "@/types/aval";
import { SectionLabel } from "@/components/ui/section-card";
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

/**
 * Chips de modalidad en pastel, con el mismo acento indigo del resto de la
 * app: el azul que tenía autogestión era el único de la pantalla y se leía
 * como un color con significado propio que en realidad no tenía.
 */
const MODALIDAD_STYLES: Record<string, string> = {
  CUBIERTO_FONDOS_PUBLICOS:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  CUBIERTO_AUTOGESTION:
    "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/30",
  SOLO_RESULTADO:
    "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/30",
};

const MODALIDAD_STYLE_FALLBACK = MODALIDAD_STYLES.SOLO_RESULTADO;

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
    <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-4 dark:border-slate-700/60 dark:bg-slate-900/40">
      <SectionLabel className="mb-3">
        Deportistas seleccionados ({deportistas.length})
      </SectionLabel>

      {deportistas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 px-3 py-4 text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-400">
          No hay deportistas registrados.
        </div>
      ) : hasGroups ? (
        <div className="space-y-4">
          {orderedKeys.map((modalidad) => {
            const grupo = grouped.get(modalidad) ?? [];
            const sorted = sortDeportistas(grupo);
            const badgeStyle =
              MODALIDAD_STYLES[modalidad ?? ""] ?? MODALIDAD_STYLE_FALLBACK;

            return (
              <div key={modalidad ?? "sin-modalidad"}>
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeStyle}`}
                  >
                    {getModalidadParticipacionLabel(modalidad)}
                  </span>
                  <span className="text-xs font-bold tabular-nums text-slate-400 dark:text-slate-500">
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
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-indigo-100 bg-indigo-50 dark:border-indigo-500/30 dark:bg-indigo-500/10">
        <User className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-200">
          {formatDeportistaName(deportista)}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {deportista.rol}
          {" · "}
          {getDeportistaCedula(deportista)}
        </p>
        {showModalidad && deportista.modalidadParticipacion ? (
          <p className="mt-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-300">
            {getModalidadParticipacionLabel(deportista.modalidadParticipacion)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
