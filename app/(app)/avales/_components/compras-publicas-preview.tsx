import type { Aval } from "@/types/aval";
import { formatDate } from "@/lib/utils/formatters";

export type ComprasPublicasDraft = {
  numeroCertificado: string;
  realizoProceso: boolean | null;
  codigoNecesidad: string;
  objetoContratacion: string;
  nombreFirmante: string;
  cargoFirmante: string;
  fechaEmision: string;
};

type Props = {
  aval: Aval;
  draft: ComprasPublicasDraft;
};

function formatFecha(value?: string | null) {
  if (!value) return "-";
  return formatDate(value);
}

export default function ComprasPublicasPreview({ aval, draft }: Props) {
  const numero =
    aval.comprasPublicas?.numeroCertificado || draft.numeroCertificado || "POR DEFINIR";
  const realizo =
    draft.realizoProceso == null
      ? "POR DEFINIR"
      : draft.realizoProceso
        ? "Sí"
        : "No";
  const codigoNecesidad = draft.codigoNecesidad?.trim() || "-";
  const objeto = draft.objetoContratacion?.trim() || "-";
  const nombreFirmante =
    draft.nombreFirmante?.trim() ||
    aval.comprasPublicas?.nombreFirmante ||
    "-";
  const cargoFirmante =
    draft.cargoFirmante?.trim() ||
    aval.comprasPublicas?.cargoFirmante ||
    "-";
  const fechaEmision = formatFecha(
    draft.fechaEmision || aval.comprasPublicas?.fechaEmision
  );
  const certificacionTexto =
    draft.realizoProceso === false
      ? "No se realizó el correspondiente proceso de contratación pública para el evento antes mencionado."
      : `${realizo} se realizó el correspondiente proceso de contratación pública para el evento antes mencionado, con Código de necesidad N. ${codigoNecesidad} y objeto de contratación: ${objeto}.`;

  return (
    <div className="bg-white border border-slate-300 p-6 text-slate-900 space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-semibold uppercase">
          Certificado Departamento de Compras Publicas - {numero}
        </h2>
        <p className="text-xs uppercase">Certificado N.° {numero}</p>
      </div>

      <p className="text-[12px] leading-5">
        Quien suscribe, {nombreFirmante}, encargada del area de Compras Publicas de FDPL,
        CERTIFICO que: {certificacionTexto}
      </p>

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
