import { apiFetch } from "@/lib/api/client";
import type { EtapaFlujo } from "@/types/aval";

export type HojaRutaComentarioDefault = {
  etapa: EtapaFlujo;
  comentario: string;
};

export function getHojaRutaComentarios() {
  return apiFetch<HojaRutaComentarioDefault[]>(
    "/avales/admin/hoja-ruta-comentarios",
  );
}

export function upsertHojaRutaComentario(
  etapa: EtapaFlujo,
  comentario: string,
) {
  return apiFetch<HojaRutaComentarioDefault>(
    `/avales/admin/hoja-ruta-comentarios/${etapa}`,
    {
      method: "PATCH",
      body: JSON.stringify({ comentario }),
    },
  );
}
