import type { Aval } from "@/types/aval";
import {
  formatCurrency,
  formatDate,
  formatLocationWithProvince,
  getResponsibleTrainerData,
} from "@/lib/utils/formatters";
import { formatCategoryLabel } from "@/lib/utils/categories";
import {
  getAvalCupos,
  getAvalPresupuestoItems,
} from "@/lib/utils/aval-collections";

type Props = {
  aval: Aval;
  draft: {
    descripcionCertificacion: string;
    periodoComision: string;
    periodoComisionFin: string;
    firmanteNombre: string;
    firmanteCargo: string;
    fechaEmision: string;
  };
};

function InfoTable({
  aval,
  year,
  fechaEmision,
  periodoComision,
  periodoComisionFin,
  codigoActividad,
}: {
  aval: Aval;
  year: number;
  fechaEmision: string;
  periodoComision: string;
  periodoComisionFin: string;
  codigoActividad: string;
}) {
  const evento = aval.evento;
  const responsable = getResponsibleTrainerData(aval);
  const cupos = getAvalCupos(aval);
  const entrenadores =
    cupos.numEntrenadoresHombres + cupos.numEntrenadoresMujeres;
  const deportistas = cupos.numAtletasHombres + cupos.numAtletasMujeres;
  const participantesText = `ENTRENADORES: ${entrenadores}   DEPORTISTAS: ${deportistas}`;

  const rows: [string, string][] = [
    ["DISCIPLINA", evento?.disciplina?.nombre?.toUpperCase() || "-"],
    [
      "CATEGORIA",
      formatCategoryLabel(
        evento?.categoria?.nombre ?? evento?.categoriaCodigo
      ).toUpperCase(),
    ],
    ["EVENTO", evento?.nombre?.toUpperCase() || "-"],
    ["# PARTICIPANTES", participantesText],
    ["LUGAR DE COMPETENCIA", (formatLocationWithProvince(evento) || "-").toUpperCase()],
    ["FECHA DE SALIDA", fechaEmision ? formatDate(fechaEmision) : "-"],
    [
      "FECHA DE COMISION",
      periodoComision
        ? periodoComisionFin
          ? `${formatDate(periodoComision)} - ${formatDate(periodoComisionFin)}`
          : formatDate(periodoComision)
        : "-",
    ],
    ["RESPONSABLE ANTICIPO", responsable.nombre],
    ["C. I. RESPON. ANTICIPO", responsable.cedula],
    [`ACTIVIDADES POA ${year}`, `${codigoActividad} EVENTOS DE PREPARACION Y COMPETENCIA`],
    ["AVAL TECNICO NUMERO", aval.avalTecnico?.numeroAval || aval.aval || aval.numeroColeccion || String(aval.id)],
    ["FONDOS", "PUBLICOS"],
  ];

  return (
    <div className="border border-slate-400">
      <table className="w-full border-collapse text-[10px]">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <td className="w-[38%] border border-slate-400 px-2 py-1 font-semibold">
                {label}
              </td>
              <td className="border border-slate-400 px-2 py-1">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CertificacionFinancieraPreview({ aval, draft }: Props) {
  const presupuestoItems = getAvalPresupuestoItems(aval);
  const total = presupuestoItems.reduce((sum, item) => {
    const value = Number.parseFloat(item.presupuesto);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);
  const year = new Date().getFullYear();
  const codigoActividad = (aval.pda?.codigoActividad?.trim() || "004").replace("005", "004");

  return (
    <div className="bg-white p-5 xl:p-6 border border-slate-300 text-slate-900 space-y-4">
      <div className="text-right text-[11px] leading-4">
        <p>{draft.fechaEmision ? formatDate(draft.fechaEmision) : "-"}</p>
      </div>

      <h2 className="text-center text-[12px] font-semibold uppercase tracking-wide">
        Certificacion Presupuestaria
      </h2>

      <p className="text-[11px] leading-5">
        {draft.descripcionCertificacion.trim() ||
          `De acuerdo a la sumilla Aval Nro. ${
            aval.avalTecnico?.numeroAval || aval.numeroColeccion || aval.aval || aval.id
          }, me permito certificar la disponibilidad presupuestaria de la cuenta de PUBLICOS.`}
      </p>

      <InfoTable aval={aval} year={year} fechaEmision={draft.fechaEmision} periodoComision={draft.periodoComision} periodoComisionFin={draft.periodoComisionFin} codigoActividad={codigoActividad} />

      <p className="text-[11px]">
        Por un valor de USD$ {formatCurrency(total, { locale: "en-US" })} - dolares de acuerdo al
        siguiente detalle
      </p>

      <div className="border border-slate-400">
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-400 px-2 py-1">N. Actividad</th>
              <th className="border border-slate-400 px-2 py-1">Nombre de la actividad</th>
              <th className="border border-slate-400 px-2 py-1">ITEM presupuestario</th>
              <th className="border border-slate-400 px-2 py-1">Nombre del ITEM presupuestario</th>
              <th className="border border-slate-400 px-2 py-1">Valor</th>
            </tr>
          </thead>
          <tbody>
            {presupuestoItems.map((item) => (
              <tr key={item.id}>
                <td className="border border-slate-400 px-2 py-1 text-center">{codigoActividad}</td>
                <td className="border border-slate-400 px-2 py-1">
                  EVENTOS DE PREPARACION Y COMPETENCIA
                </td>
                <td className="border border-slate-400 px-2 py-1">{item.item.codigo ?? item.item.numero}</td>
                <td className="border border-slate-400 px-2 py-1">
                  {item.item.nombre.toUpperCase()}
                </td>
                <td className="border border-slate-400 px-2 py-1 text-right">
                  {formatCurrency(Number.parseFloat(item.presupuesto) || 0, { locale: "en-US" })}
                </td>
              </tr>
            ))}
            <tr>
              <td
                colSpan={4}
                className="border border-slate-400 px-2 py-1 text-right font-semibold"
              >
                TOTAL
              </td>
              <td className="border border-slate-400 px-2 py-1 text-right font-semibold">
                {formatCurrency(total, { locale: "en-US" })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-[11px]">
        Particular que informo para los fines legales pertinentes
      </p>

      <div className="pt-6 text-[11px]">
        <p className="text-slate-400">____________________________</p>
        <p className="font-semibold uppercase">{draft.firmanteNombre || "-"}</p>
        <p className="uppercase">{draft.firmanteCargo || "-"}</p>
      </div>
    </div>
  );
}
