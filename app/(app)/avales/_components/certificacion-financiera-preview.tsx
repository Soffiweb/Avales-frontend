import type { Aval } from "@/types/aval";
import {
  formatCurrency,
  formatDate,
  formatEventScheduleLabel,
  formatLocationWithProvince,
} from "@/lib/utils/formatters";
import { formatCategoryLabel } from "@/lib/utils/categories";

type Props = {
  aval: Aval;
  draft: {
    descripcionCertificacion: string;
    firmanteNombre: string;
    firmanteCargo: string;
    fechaEmision: string;
  };
};

function InfoTable({ aval, year }: { aval: Aval; year: number }) {
  const evento = aval.evento;
  const entrenadores =
    (evento?.numEntrenadoresHombres || 0) +
    (evento?.numEntrenadoresMujeres || 0);
  const deportistas =
    (evento?.numAtletasHombres || 0) + (evento?.numAtletasMujeres || 0);
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
    ["FECHA DE SALIDA", formatEventScheduleLabel(evento)],
    ["RESPONSABLE ANTICIPO", "-"],
    ["C. I. RESPON. ANTICIPO", "-"],
    [`ACTIVIDADES POA ${year}`, "005 EVENTOS DE PREPARACION Y COMPETENCIA"],
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
  const evento = aval.evento;
  const presupuestoItems = evento?.presupuesto ?? [];
  const total = presupuestoItems.reduce((sum, item) => {
    const value = Number.parseFloat(item.presupuesto);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);
  const year = new Date().getFullYear();

  return (
    <div className="space-y-6">
      {/* ================================================================
          PAGE 1: PRESUPUESTO SALIDA DEPORTISTA ANTICIPO
          ================================================================ */}
      <div className="bg-white p-5 xl:p-6 border border-slate-300 text-slate-900 space-y-4">
        <h2 className="text-center text-[12px] font-semibold uppercase tracking-wide">
          Presupuesto Salida Deportista Anticipo
        </h2>

        <InfoTable aval={aval} year={year} />

        <div className="border border-slate-400">
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-400 px-2 py-1 text-left">CONCEPTO</th>
                <th className="border border-slate-400 px-2 py-1">CANT.</th>
                <th className="border border-slate-400 px-2 py-1">V. UNIT.</th>
                <th className="border border-slate-400 px-2 py-1">No. DIAS</th>
                <th className="border border-slate-400 px-2 py-1">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {presupuestoItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="border border-slate-400 px-2 py-2 text-center text-slate-500"
                  >
                    Sin items presupuestarios.
                  </td>
                </tr>
              ) : (
                presupuestoItems.map((item) => {
                  const valor = Number.parseFloat(item.presupuesto) || 0;
                  return (
                    <tr key={item.id}>
                      <td className="border border-slate-400 px-2 py-1">
                        {item.item.nombre.toUpperCase()}
                      </td>
                      <td className="border border-slate-400 px-2 py-1 text-center">1</td>
                      <td className="border border-slate-400 px-2 py-1 text-right">
                        {valor.toFixed(2)}
                      </td>
                      <td className="border border-slate-400 px-2 py-1 text-center">1</td>
                      <td className="border border-slate-400 px-2 py-1 text-right">
                        {valor.toFixed(2)}
                      </td>
                    </tr>
                  );
                })
              )}
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

        <div className="pt-4 text-[11px]">
          <p>Atentamente,</p>
          <div className="mt-6">
            <p className="text-slate-400">____________________________</p>
            <p className="font-semibold uppercase">{draft.firmanteNombre || "-"}</p>
            <p className="uppercase">{draft.firmanteCargo || "-"}</p>
          </div>
        </div>
      </div>

      {/* ================================================================
          PAGE 2: CERTIFICACION PRESUPUESTARIA
          ================================================================ */}
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

        <InfoTable aval={aval} year={year} />

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
                  <td className="border border-slate-400 px-2 py-1 text-center">005</td>
                  <td className="border border-slate-400 px-2 py-1">
                    EVENTOS DE PREPARACION Y COMPETENCIA
                  </td>
                  <td className="border border-slate-400 px-2 py-1">{item.item.numero}</td>
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
    </div>
  );
}
