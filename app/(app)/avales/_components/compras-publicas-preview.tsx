import type { Aval } from "@/types/aval";
import { formatDate } from "@/lib/utils/formatters";

export type ComprasPublicasDraft = {
  numeroCertificado: string;
  realizoProceso: boolean | null;
  codigos: Array<{
    codigo: string;
    descripcion: string;
  }>;
  nombreFirmante: string;
  cargoFirmante: string;
  fechaEmision: string;
};

type Props = {
  aval: Aval;
  draft: ComprasPublicasDraft;
};

type CodigoLike = {
  codigo?: string | null;
  descripcion?: string | null;
  objeto?: string | null;
  codigoNecesidad?: string | null;
  objetoContratacion?: string | null;
};

function normalizeComprasCodigos(
  items?: Array<ComprasPublicasDraft["codigos"][number] | CodigoLike | string> | null,
) {
  return (items ?? [])
    .flatMap((item) => {
      if (typeof item === "string") {
        const value = item.trim();
        return value ? [{ codigo: value, objeto: "" }] : [];
      }
      if (!item) return [];
      const codigo =
        item.codigo?.trim() || item.codigoNecesidad?.trim() || "";
      const objeto =
        item.descripcion?.trim() ||
        item.objeto?.trim() ||
        item.objetoContratacion?.trim() ||
        "";
      return codigo || objeto ? [{ codigo, objeto }] : [];
    });
}

export default function ComprasPublicasPreview({ aval, draft }: Props) {
  const realizo =
    draft.realizoProceso == null
      ? "-"
      : draft.realizoProceso
        ? "Sí"
        : "No";
  const nombreFirmante =
    draft.nombreFirmante?.trim() ||
    aval.comprasPublicas?.nombreFirmante ||
    "-";
  const cargoFirmante =
    draft.cargoFirmante?.trim() ||
    aval.comprasPublicas?.cargoFirmante ||
    "-";
  const fechaEmision = formatDate(
    draft.fechaEmision || aval.comprasPublicas?.fechaEmision
  );
  const eventoNombre = aval.evento?.nombre ?? "el evento";
  const legacyCodigos = (aval.comprasPublicas?.codigoNecesidad ?? "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
  const legacyObjetos = (aval.comprasPublicas?.objetoContratacion ?? "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
  const detallesContratacion =
    normalizeComprasCodigos(draft.codigos).length > 0
      ? normalizeComprasCodigos(draft.codigos)
      : normalizeComprasCodigos(aval.comprasPublicas?.codigos as CodigoLike[]).length > 0
        ? normalizeComprasCodigos(aval.comprasPublicas?.codigos as CodigoLike[])
        : Array.from(
            { length: Math.max(legacyCodigos.length, legacyObjetos.length) },
            (_, index) => ({
              codigo: legacyCodigos[index] || "",
              objeto: legacyObjetos[index] || "",
            }),
          ).filter((item) => item.codigo || item.objeto);
  const certificacionTexto =
    draft.realizoProceso === false
      ? `No se realizó el correspondiente proceso de contratación pública para el evento "${eventoNombre}".`
      : `${realizo} se realizó el correspondiente proceso de contratación pública para el evento "${eventoNombre}", conforme a los siguientes códigos de necesidad:`;

  return (
    <div className="bg-white border border-slate-300 p-6 text-slate-900 space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-semibold uppercase">
          Certificado Departamento de Compras Publicas
        </h2>
      </div>

      <p className="text-[12px] leading-5">
        Quien suscribe, {nombreFirmante}, encargada del area de Compras Publicas de FDPL,
        CERTIFICO que: {certificacionTexto}
      </p>

      {draft.realizoProceso !== false && detallesContratacion.length > 0 && (
        <div className="space-y-3 text-[12px] leading-5">
          {detallesContratacion.map((detalle, index) => (
            <div key={`${detalle.codigo}-${index}`} className="space-y-1">
              <p className="font-semibold">
                N.º {index + 1}: {detalle.codigo}
              </p>
              <p className="pl-6 uppercase">{detalle.objeto}</p>
            </div>
          ))}
        </div>
      )}

      {draft.realizoProceso !== false && detallesContratacion.length === 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] leading-5 text-amber-800">
          No hay codigos de necesidad visibles en la respuesta del aval para este certificado.
        </div>
      )}

      <p className="text-[12px] leading-5">
        El presente certificado se emite a fin de que sirva como respaldo para la emisión
        del aval correspondiente, así como para justificar la salida y participación en
        eventos, conforme a la normativa legal vigente y a los procedimientos internos de
        la institución.
      </p>

      <p className="text-[12px] leading-5">
        Se extiende el presente certificado a solicitud de la parte interesada, para los
        fines pertinentes.
      </p>

      <div className="pt-4 text-[12px] leading-5">
        <p>Atentamente:</p>
        <div className="mt-6">
          <p className="font-semibold">__________________</p>
          <p className="font-semibold uppercase">{nombreFirmante}</p>
          <p className="uppercase">{cargoFirmante}</p>
          <p className="text-xs">Fecha: {fechaEmision}</p>
        </div>
      </div>
    </div>
  );
}
