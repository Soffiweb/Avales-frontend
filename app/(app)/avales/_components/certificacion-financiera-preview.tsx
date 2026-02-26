import type { Aval } from "@/types/aval";
import { formatDate, formatDateRange } from "@/lib/utils/formatters";

type Props = {
  aval: Aval;
  draft: {
    descripcionCertificacion: string;
    firmanteNombre: string;
    firmanteCargo: string;
    fechaEmision: string;
  };
};

function formatMoney(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function CertificacionFinancieraPreview({ aval, draft }: Props) {
  const evento = aval.evento;
  const total = (evento?.presupuesto ?? []).reduce((sum, item) => {
    const value = Number.parseFloat(item.presupuesto);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);

  const entrenadores =
    (evento?.numEntrenadoresHombres || 0) +
    (evento?.numEntrenadoresMujeres || 0);
  const deportistas =
    (evento?.numAtletasHombres || 0) + (evento?.numAtletasMujeres || 0);

  return (
    <div className="bg-white p-5 xl:p-6 border border-slate-300 text-slate-900 space-y-4">
      <div className="text-right text-[11px] leading-4">
        <p className="uppercase">FDL-AF-PUBLICOS-000-2026</p>
        <p>{draft.fechaEmision ? formatDate(draft.fechaEmision) : "-"}</p>
      </div>

      <h2 className="text-center text-[12px] font-semibold uppercase tracking-wide">
        Certificacion Presupuestaria
      </h2>

      <p className="text-[11px] leading-5">
        {draft.descripcionCertificacion.trim() ||
          `De acuerdo a la sumilla Aval Nro. ${
            aval.numeroColeccion || aval.aval || aval.id
          }, me permito certificar la disponibilidad presupuestaria de la cuenta de PUBLICOS.`}
      </p>

      <div className="border border-slate-400">
        <table className="w-full border-collapse text-[10px]">
          <tbody>
            <tr>
              <td className="border border-slate-400 px-2 py-1 font-semibold">DISCIPLINA</td>
              <td className="border border-slate-400 px-2 py-1">{evento?.disciplina?.nombre || "-"}</td>
            </tr>
            <tr>
              <td className="border border-slate-400 px-2 py-1 font-semibold">CATEGORIA</td>
              <td className="border border-slate-400 px-2 py-1">{evento?.categoria?.nombre || "-"}</td>
            </tr>
            <tr>
              <td className="border border-slate-400 px-2 py-1 font-semibold">EVENTO</td>
              <td className="border border-slate-400 px-2 py-1">{evento?.nombre || "-"}</td>
            </tr>
            <tr>
              <td className="border border-slate-400 px-2 py-1 font-semibold"># PARTICIPANTES</td>
              <td className="border border-slate-400 px-2 py-1">
                Entrenadores: {entrenadores} / Deportistas: {deportistas}
              </td>
            </tr>
            <tr>
              <td className="border border-slate-400 px-2 py-1 font-semibold">LUGAR DE COMPETENCIA</td>
              <td className="border border-slate-400 px-2 py-1">{evento?.ciudad || "-"}</td>
            </tr>
            <tr>
              <td className="border border-slate-400 px-2 py-1 font-semibold">FECHA DE SALIDA</td>
              <td className="border border-slate-400 px-2 py-1">
                {formatDateRange(evento?.fechaInicio, evento?.fechaFin)}
              </td>
            </tr>
            <tr>
              <td className="border border-slate-400 px-2 py-1 font-semibold">RESPONSABLE ANTICIPO</td>
              <td className="border border-slate-400 px-2 py-1">-</td>
            </tr>
            <tr>
              <td className="border border-slate-400 px-2 py-1 font-semibold">C.I. RESP. ANTICIPO</td>
              <td className="border border-slate-400 px-2 py-1">-</td>
            </tr>
            <tr>
              <td className="border border-slate-400 px-2 py-1 font-semibold">ACTIVIDADES POA 2024</td>
              <td className="border border-slate-400 px-2 py-1">005 EVENTOS DE PREPARACION Y COMPETENCIA</td>
            </tr>
            <tr>
              <td className="border border-slate-400 px-2 py-1 font-semibold">AVAL TECNICO NUMERO</td>
              <td className="border border-slate-400 px-2 py-1">{aval.aval || aval.numeroColeccion || aval.id}</td>
            </tr>
            <tr>
              <td className="border border-slate-400 px-2 py-1 font-semibold">FONDOS</td>
              <td className="border border-slate-400 px-2 py-1 font-semibold">PUBLICOS</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-[11px]">
        Por un valor de USD <span className="font-semibold">{formatMoney(total)}</span>
      </p>

      <div className="border border-slate-400">
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-400 px-2 py-1">N. Actividad</th>
              <th className="border border-slate-400 px-2 py-1">ITEM presupuestario</th>
              <th className="border border-slate-400 px-2 py-1">Nombre ITEM</th>
              <th className="border border-slate-400 px-2 py-1">Valor</th>
            </tr>
          </thead>
          <tbody>
            {(evento?.presupuesto ?? []).map((item) => (
              <tr key={item.id}>
                <td className="border border-slate-400 px-2 py-1 text-center">005</td>
                <td className="border border-slate-400 px-2 py-1">{item.item.numero}</td>
                <td className="border border-slate-400 px-2 py-1">{item.item.nombre}</td>
                <td className="border border-slate-400 px-2 py-1 text-right">{formatMoney(Number.parseFloat(item.presupuesto) || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pt-2 text-[11px] text-right">
        <p className="font-semibold uppercase">{draft.firmanteNombre || "-"}</p>
        <p className="uppercase">{draft.firmanteCargo || "-"}</p>
      </div>
    </div>
  );
}
