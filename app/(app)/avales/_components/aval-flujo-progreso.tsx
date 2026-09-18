"use client";

import { Check } from "lucide-react";

import type { Aval, EtapaFlujo } from "@/types/aval";
import { getApprovalStageLabel } from "@/lib/constants";
import {
  getApprovalFlowStages,
  getAvalCurrentEtapa,
  getEtapasAprobadas,
  isAvalFlowApproved,
} from "@/lib/approval-flow";

type EstadoEtapa = "cumplida" | "actual" | "pendiente" | "rechazada";

/**
 * Línea de tiempo de las etapas del aval: cuáles ya pasó y cuáles le faltan.
 *
 * La secuencia sale de `getApprovalFlowStages`, que prioriza el flujo que
 * manda el backend para ESE aval sobre la constante por tipo. Importa porque
 * el flujo es configurable: dibujar la constante mostraría etapas que a ese
 * aval no le corresponden.
 */
export default function AvalFlujoProgreso({ aval }: { aval: Aval }) {
  const etapas = getApprovalFlowStages(aval);
  const aprobadas = getEtapasAprobadas(aval.historial);
  const actual = getAvalCurrentEtapa(aval);
  const flujoCompleto = isAvalFlowApproved(aval);

  // El historial viene ordenado del más nuevo al más viejo: si lo último fue
  // un rechazo, la etapa actual está devuelta, no simplemente en curso.
  const ultimo = aval.historial?.[0];
  const rechazadaEtapa =
    ultimo?.estado === "RECHAZADO" ? actual : undefined;

  const estadoDe = (etapa: EtapaFlujo): EstadoEtapa => {
    if (flujoCompleto || aprobadas.has(etapa)) return "cumplida";
    if (etapa === rechazadaEtapa) return "rechazada";
    if (etapa === actual) return "actual";
    return "pendiente";
  };

  const cumplidas = etapas.filter((e) => estadoDe(e) === "cumplida").length;

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Avance del flujo
        </h4>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {cumplidas} de {etapas.length} etapas
        </span>
      </div>

      <ol className="flex flex-wrap items-start gap-y-3">
        {etapas.map((etapa, i) => {
          const estado = estadoDe(etapa);
          const esUltima = i === etapas.length - 1;

          // Rellenos pastel en vez de sólidos saturados: cuatro círculos
          // llenos de color compiten entre sí y con el resto de la fila
          // desplegada. El estado se lee igual por tono, sin gritar.
          //
          // `actual` es el único que además lleva halo: al pasar todos a
          // pastel, el relleno dejó de alcanzar para distinguir "en curso" de
          // "cumplida" de un vistazo.
          const circulo = {
            cumplida:
              "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300",
            actual:
              "border-indigo-200 bg-indigo-100 text-indigo-700 ring-2 ring-indigo-200 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-500/30",
            rechazada:
              "border-rose-200 bg-rose-100 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300",
            pendiente:
              "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-600 dark:bg-slate-700/40 dark:text-slate-400",
          }[estado];

          const texto = {
            cumplida: "text-slate-700 dark:text-slate-300",
            actual: "font-semibold text-indigo-700 dark:text-indigo-300",
            rechazada: "font-semibold text-rose-600 dark:text-rose-400",
            pendiente: "text-slate-500 dark:text-slate-400",
          }[estado];

          return (
            <li key={etapa} className="flex items-start">
              <div className="flex w-24 flex-col items-center gap-1.5 px-1">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold ${circulo}`}
                  aria-hidden="true"
                >
                  {estado === "cumplida" ? (
                    <Check className="h-4 w-4" strokeWidth={3} />
                  ) : (
                    i + 1
                  )}
                </span>
                <span className={`text-center text-[11px] leading-tight ${texto}`}>
                  {getApprovalStageLabel(etapa)}
                </span>
              </div>

              {!esUltima && (
                <span
                  className={`mt-3.5 h-0.5 w-6 shrink-0 rounded ${
                    estado === "cumplida"
                      ? "bg-emerald-200 dark:bg-emerald-500/30"
                      : "bg-slate-200 dark:bg-slate-700"
                  }`}
                  aria-hidden="true"
                />
              )}

              {/* Texto equivalente para lectores de pantalla: la línea de
                  tiempo visual no comunica el estado por sí sola. */}
              <span className="sr-only">
                {getApprovalStageLabel(etapa)}:{" "}
                {
                  {
                    cumplida: "cumplida",
                    actual: "en curso",
                    rechazada: "devuelta por rechazo",
                    pendiente: "pendiente",
                  }[estado]
                }
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
