"use client";

import { User } from "lucide-react";
import type { DeportistaAval } from "@/types/aval";

type DeportistasList = DeportistaAval[];

function normalizeSortKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
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
  const first = item.deportista?.nombre?.trim() || item.deportista?.nombres?.trim() || "";
  if (first) return first;
  return "";
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
  return item.deportista?.cedula ?? "Cedula no disponible";
}

type AvalDeportistasSectionProps = {
  deportistas: DeportistasList;
};

export default function AvalDeportistasSection({
  deportistas,
}: AvalDeportistasSectionProps) {
  const sorted = deportistas
    .slice()
    .sort((a, b) => {
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

  return (
    <div className="bg-white dark:bg-gray-950/60 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-3">
        Deportistas seleccionados ({deportistas.length})
      </p>
      <div className="space-y-3">
        {sorted.length > 0 ? (
          sorted.map((deportista) => (
            <div
              key={deportista.id}
              className="flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 px-3 py-2"
            >
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
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-600 bg-white/60 dark:bg-gray-900/40 px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
            No hay deportistas registrados.
          </div>
        )}
      </div>
    </div>
  );
}
