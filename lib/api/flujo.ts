import { apiFetch } from "@/lib/api/client";
import type { EtapaFlujo, TipoAval } from "@/types/aval";

export type FlujoEtapaConfig = {
  etapa: EtapaFlujo;
  orden: number;
  activo: boolean;
  /** Rol responsable de la etapa. SOLICITUD no tiene uno asignado. */
  rol?: string;
};

export type FlujoConfig = {
  tipoAval: TipoAval;
  etapas: FlujoEtapaConfig[];
};

export function getFlujoConfig() {
  return apiFetch<FlujoConfig[]>("/avales/admin/flujo");
}

/** Reemplaza la secuencia completa del tipo de aval indicado. */
export function updateFlujoConfig(
  tipoAval: TipoAval,
  etapas: Pick<FlujoEtapaConfig, "etapa" | "orden" | "activo">[],
) {
  return apiFetch<FlujoConfig>(`/avales/admin/flujo/${tipoAval}`, {
    method: "PUT",
    body: JSON.stringify({ etapas }),
  });
}
