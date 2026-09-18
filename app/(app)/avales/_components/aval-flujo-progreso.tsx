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
        <h4 className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Avance del flujo
        </h4>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {cumplidas} de {etapas.length} etapas
        </span>
      </div>

      <ol className="flex flex-wrap items-start gap-y-3">
        {etapas.map((etapa, i) => {
          const estado = estadoDe(etapa);
          const esUltima = i === etapas.length - 1;

          const circulo = {
            cumplida:
              "border-emerald-500 bg-emerald-500 text-white",
            actual:
              "border-violet-500 bg-white text-violet-600 dark:bg-gray-800 dark:text-violet-300",
            rechazada: "border-rose-500 bg-rose-500 text-white",
            pendiente:
              "border-gray-300 bg-white text-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-500",
          }[estado];

          const texto = {
            cumplida: "text-gray-700 dark:text-gray-300",
            actual: "font-semibold text-violet-700 dark:text-violet-300",
            rechazada: "font-semibold text-rose-600 dark:text-rose-400",
            pendiente: "text-gray-400 dark:text-gray-500",
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
                      ? "bg-emerald-400"
                      : "bg-gray-200 dark:bg-gray-700"
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
