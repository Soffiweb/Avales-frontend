"use client";

import { User } from "lucide-react";
import type { DeportistaAval } from "@/types/aval";

type DeportistasList = DeportistaAval[];

type GroupedDeportistas = {
  hombres: DeportistasList;
  mujeres: DeportistasList;
  otros: DeportistasList;
};

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

function groupDeportistas(deportistas: DeportistasList): GroupedDeportistas {
  return deportistas.reduce(
    (acc, item) => {
      const genero = item.deportista?.genero?.toUpperCase();
      if (genero === "FEMENINO") {
        acc.mujeres.push(item);
      } else if (genero === "MASCULINO") {
        acc.hombres.push(item);
      } else {
        acc.otros.push(item);
      }
      return acc;
    },
    {
      hombres: [] as DeportistasList,
      mujeres: [] as DeportistasList,
      otros: [] as DeportistasList,
    },
  );
}

function DeportistasGroup({
  title,
  list,
  showEmpty = false,
  emptyMessage,
}: {
  title: string;
  list: DeportistasList;
  showEmpty?: boolean;
  emptyMessage?: string;
}) {
  if (!list.length && !showEmpty) return null;
  return (
    <section className="space-y-3 px-4 py-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </p>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {list.length} {list.length === 1 ? "registro" : "registros"}
        </span>
      </div>
      <div className="space-y-3">
        {list.length > 0 ? (
          list.map((deportista) => (
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
            {emptyMessage ?? `No hay ${title.toLowerCase()} registrados aun.`}
          </div>
        )}
      </div>
    </section>
  );
}

type AvalDeportistasSectionProps = {
  deportistas: DeportistasList;
};

export default function AvalDeportistasSection({
  deportistas,
}: AvalDeportistasSectionProps) {
  const grouped = groupDeportistas(deportistas);

  return (
    <div className="bg-white dark:bg-gray-950/60 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-3">
        Deportistas seleccionados ({deportistas.length})
      </p>
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 rounded-3xl bg-gray-50/60 dark:bg-gray-900/40 p-1 divide-y divide-gray-200 dark:divide-gray-700 lg:grid-cols-2 lg:divide-y-0 lg:divide-x">
          <DeportistasGroup title="Hombres" list={grouped.hombres} />
          <DeportistasGroup
            title="Mujeres"
            list={grouped.mujeres}
            showEmpty
            emptyMessage="No hay deportistas mujeres registradas."
          />
        </div>
        {grouped.otros.length > 0 && (
          <div className="pt-6 border-t border-dashed border-gray-200 dark:border-gray-700/60">
            <DeportistasGroup title="Otros generos" list={grouped.otros} />
          </div>
        )}
      </div>
    </div>
  );
}
