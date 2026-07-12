import type { Aval } from "@/types/aval";
import { buildComprasPublicasDescriptor } from "avales-shared";
import type { ComprasPublicasCodigo } from "avales-shared";

export type ComprasPublicasDraft = {
  numeroCertificado: string;
  realizoProceso: boolean | null;
  codigos: Array<{
    codigo: string;
    descripcion: string;
  }>;
  descripcion: string;
  nombreFirmante: string;
  cargoFirmante: string;
  fechaEmision: string;
};

type Props = {
  aval: Aval;
  draft: ComprasPublicasDraft;
};

export default function ComprasPublicasPreview({ aval, draft }: Props) {
  const codigos: ComprasPublicasCodigo[] =
    draft.codigos?.length > 0
      ? draft.codigos
      : (aval.comprasPublicas?.codigos ?? []).map((c) => ({
          codigo: c.codigo,
          descripcion: c.descripcion,
        }));

  const doc = buildComprasPublicasDescriptor({
    numeroCertificado:
      draft.numeroCertificado || aval.comprasPublicas?.numeroCertificado,
    eventoNombre: aval.evento?.nombre,
    codigos,
    descripcion: draft.descripcion || aval.comprasPublicas?.descripcion,
    realizoProceso: draft.realizoProceso,
    nombreFirmante:
      draft.nombreFirmante || aval.comprasPublicas?.nombreFirmante,
    cargoFirmante: draft.cargoFirmante || aval.comprasPublicas?.cargoFirmante,
    fechaEmision: draft.fechaEmision || aval.comprasPublicas?.fechaEmision,
  });

  return (
    <div className="bg-white border border-slate-300 p-6 text-slate-900 space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-semibold">{doc.title}</h2>
        <p className="text-sm font-semibold">{doc.subtitle}</p>
      </div>

      <p className="text-[12px] leading-5 text-justify">{doc.mainParagraph}</p>

      {doc.codigos.length > 0 && (
        <div className="space-y-3 text-[12px] leading-5">
          {doc.codigos.map((cod) => (
            <div key={cod.numero} className="space-y-1">
              <p className="font-semibold">
                N.º {cod.numero}: {cod.codigo}
              </p>
              <p className="pl-6 text-justify">{cod.descripcion}</p>
            </div>
          ))}
        </div>
      )}

      {doc.descripcion && (
        <p className="text-[12px] leading-5 whitespace-pre-line text-justify">
          {doc.descripcion}
        </p>
      )}

      <p className="text-[12px] leading-5 text-justify">{doc.purposeParagraph}</p>

      <p className="text-[12px] leading-5 text-justify">
        {doc.extensionParagraph}
      </p>

      <div className="pt-4 text-[12px] leading-5">
        <p>Atentamente:</p>
        <div className="mt-6 text-center">
          <p className="font-semibold">____________________________</p>
          <p className="font-semibold">{doc.firma.nombre}</p>
          <p>{doc.firma.cargo}</p>
          <p>{doc.firma.fecha}</p>
        </div>
      </div>
    </div>
  );
}
