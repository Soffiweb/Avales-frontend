import type { Aval } from "@/types/aval";
import {
  formatCurrencyFromString,
  formatCurrentLongDate,
  formatDate,
  formatLocationWithProvince,
  getResponsibleTrainerData,
} from "@/lib/utils/formatters";
import { formatCategoryLabel } from "@/lib/utils/categories";

export type PdaDraft = {
  descripcion: string;
  numeroPda: string;
  numeroAval: string;
  codigoActividad: string;
  nombreFirmante: string;
  cargoFirmante: string;
  periodoComision?: string;
  periodoComisionFin?: string;
};

type Props = {
  aval: Aval;
  draft: PdaDraft;
};

export default function PdaPreview({ aval, draft }: Props) {
  const evento = aval.evento;
  const responsable = getResponsibleTrainerData(aval);
  const fondosLabel =
    aval.tipoAval === "AUTOGESTION" ? "AUTOGESTION" : "PUBLICOS";
  const participantesEntrenadores =
    (evento?.numEntrenadoresHombres ?? 0) + (evento?.numEntrenadoresMujeres ?? 0);
  const participantesDeportistas =
    (evento?.numAtletasHombres ?? 0) + (evento?.numAtletasMujeres ?? 0);
  const presupuestoItems = evento?.presupuesto ?? [];
  const total = presupuestoItems.reduce((acc, item) => {
    const value = Number.parseFloat(item.presupuesto);
    return acc + (Number.isNaN(value) ? 0 : value);
  }, 0);

  const participantesLabel = `ENTRENADOR ${participantesEntrenadores} - DEPORTISTAS ${participantesDeportistas}`;

  return (
    <div className="bg-white border border-slate-300 p-6 text-slate-900">
      <div className="text-right text-sm leading-5">
        <p>FDPL-METODOLOGO PDA - 2026</p>
        <p>{formatCurrentLongDate()}</p>
      </div>

      <h2 className="text-center text-xl font-bold mt-4 mb-6">
        CERTIFICACION EVENTOS PDA 2026
      </h2>

      <div className="mb-4 text-[13px] leading-5">
        {draft.descripcion?.trim() ? (
          <p>{draft.descripcion}</p>
        ) : (
          <p className="text-slate-500">
            Agrega la descripcion del certificado.
          </p>
        )}
      </div>

      <table className="w-full border-collapse text-[13px]">
        <tbody>
          <tr>
            <td className="w-[40%] border border-slate-400 px-2 py-1 font-semibold">DISCIPLINA</td>
            <td className="border border-slate-400 px-2 py-1">
              {evento?.disciplina?.nombre?.toUpperCase() || "-"}
            </td>
          </tr>
          <tr>
            <td className="border border-slate-400 px-2 py-1 font-semibold">EVENTO</td>
            <td className="border border-slate-400 px-2 py-1">
              {evento?.nombre?.toUpperCase() || "-"}
            </td>
          </tr>
          <tr>
            <td className="border border-slate-400 px-2 py-1 font-semibold">NRO. PARTICIPANTES</td>
            <td className="border border-slate-400 px-2 py-1">{participantesLabel}</td>
          </tr>
          <tr>
            <td className="border border-slate-400 px-2 py-1 font-semibold">CATEGORIA</td>
            <td className="border border-slate-400 px-2 py-1">
              {formatCategoryLabel(
                evento?.categoria?.nombre ?? evento?.categoriaCodigo
              ).toUpperCase()}
            </td>
          </tr>
          <tr>
            <td className="border border-slate-400 px-2 py-1 font-semibold">LUGAR DE COMPETENCIA</td>
            <td className="border border-slate-400 px-2 py-1">
              {(formatLocationWithProvince(evento) || "-").toUpperCase()}
            </td>
          </tr>
          <tr>
            <td className="border border-slate-400 px-2 py-1 font-semibold">FECHA DE SALIDA</td>
            <td className="border border-slate-400 px-2 py-1">
              {formatDate(aval.avalTecnico?.fechaHoraSalida) || "-"}
            </td>
          </tr>
          <tr>
            <td className="border border-slate-400 px-2 py-1 font-semibold">PERÍODO DE COMISIÓN</td>
            <td className="border border-slate-400 px-2 py-1">
              {draft.periodoComision
                ? draft.periodoComisionFin
                  ? `${formatDate(draft.periodoComision)} - ${formatDate(draft.periodoComisionFin)}`
                  : formatDate(draft.periodoComision)
                : "-"}
            </td>
          </tr>
          <tr>
            <td className="border border-slate-400 px-2 py-1 font-semibold">RESPONSABLE ANTICIPO</td>
            <td className="border border-slate-400 px-2 py-1">{responsable.nombre}</td>
          </tr>
          <tr>
            <td className="border border-slate-400 px-2 py-1 font-semibold">C. I. RESPON. ANTICIPO</td>
            <td className="border border-slate-400 px-2 py-1">{responsable.cedula}</td>
          </tr>
          <tr>
            <td className="border border-slate-400 px-2 py-1 font-semibold">ACTIVIDADES POA 2026</td>
            <td className="border border-slate-400 px-2 py-1">{draft.codigoActividad || "-"}</td>
          </tr>
          <tr>
            <td className="border border-slate-400 px-2 py-1 font-semibold">
              AVAL TECNICO DE PARTICIPACION COMPETITIVA
            </td>
            <td className="border border-slate-400 px-2 py-1">{draft.numeroAval || "-"}</td>
          </tr>
          <tr>
            <td className="border border-slate-400 px-2 py-1 font-semibold">FONDOS</td>
            <td className="border border-slate-400 px-2 py-1 font-semibold">{fondosLabel}</td>
          </tr>
        </tbody>
      </table>

      <p className="mt-3 text-sm">
        Por un valor de <span className="font-semibold">{formatCurrencyFromString(String(total), { fallback: "$ 0,00" })}</span> dolares.
      </p>

      <table className="w-full border-collapse text-[12px] mt-2">
        <thead>
          <tr>
            <th className="border border-slate-400 px-2 py-1">N° Actividad</th>
            <th className="border border-slate-400 px-2 py-1">Nombre de la actividad</th>
            <th className="border border-slate-400 px-2 py-1">ITEM</th>
            <th className="border border-slate-400 px-2 py-1">Nombre del ITEM presupuestario</th>
            <th className="border border-slate-400 px-2 py-1">Valor</th>
          </tr>
        </thead>
        <tbody>
          {presupuestoItems.length === 0 ? (
            <tr>
              <td colSpan={5} className="border border-slate-400 px-2 py-2 text-center">
                Sin items presupuestarios.
              </td>
            </tr>
          ) : (
            presupuestoItems.map((item) => (
              <tr key={item.id}>
                <td className="border border-slate-400 px-2 py-1 text-center">
                  {draft.codigoActividad || "-"}
                </td>
                <td className="border border-slate-400 px-2 py-1">EVENTOS DE PREPARACION Y COMPETENCIA</td>
                <td className="border border-slate-400 px-2 py-1">{item.item?.numero ?? "-"}</td>
                <td className="border border-slate-400 px-2 py-1">{item.item?.nombre || "-"}</td>
                <td className="border border-slate-400 px-2 py-1 text-right">
                  {formatCurrencyFromString(item.presupuesto, { fallback: "$ 0,00" })}
                </td>
              </tr>
            ))
          )}
          <tr>
            <td colSpan={4} className="border border-slate-400 px-2 py-1 text-right font-semibold">
              TOTAL
            </td>
            <td className="border border-slate-400 px-2 py-1 text-right font-semibold">
              {formatCurrencyFromString(String(total), { fallback: "$ 0,00" })}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="mt-8 text-sm">
        <p className="text-slate-400">____________________________</p>
        <p className="font-semibold">{draft.nombreFirmante || "NOMBRE FIRMANTE"}</p>
        <p>{draft.cargoFirmante || "CARGO FIRMANTE"}</p>
      </div>
    </div>
  );
}
