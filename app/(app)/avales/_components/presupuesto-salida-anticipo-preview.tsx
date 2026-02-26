import type { Aval } from "@/types/aval";
import { formatDateRange } from "@/lib/utils/formatters";

type Props = {
  aval: Aval;
  draft: {
    notas: string[];
  };
};

function formatMoney(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function PresupuestoSalidaAnticipoPreview({ aval, draft }: Props) {
  const evento = aval.evento;
  const entrenadores =
    (evento?.numEntrenadoresHombres || 0) +
    (evento?.numEntrenadoresMujeres || 0);
  const deportistas =
    (evento?.numAtletasHombres || 0) + (evento?.numAtletasMujeres || 0);

  const total = (evento?.presupuesto ?? []).reduce((sum, item) => {
    const value = Number.parseFloat(item.presupuesto);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);

  return (
    <div className="bg-white p-5 xl:p-6 border border-slate-300 text-slate-900 space-y-4">
      <h2 className="text-center text-[12px] font-semibold uppercase tracking-wide">
        Presupuesto Salida Deportista Anticipo
      </h2>

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

      <div className="border border-slate-400">
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-400 px-2 py-1">Concepto</th>
              <th className="border border-slate-400 px-2 py-1">Total</th>
            </tr>
          </thead>
          <tbody>
            {(evento?.presupuesto ?? []).map((item) => (
              <tr key={item.id}>
                <td className="border border-slate-400 px-2 py-1">{item.item.nombre}</td>
                <td className="border border-slate-400 px-2 py-1 text-right">{formatMoney(Number.parseFloat(item.presupuesto) || 0)}</td>
              </tr>
            ))}
            <tr>
              <td className="border border-slate-400 px-2 py-1 font-semibold text-right">TOTAL</td>
              <td className="border border-slate-400 px-2 py-1 font-semibold text-right">{formatMoney(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="space-y-1 text-[10px] leading-4">
        {draft.notas.map((nota, index) => (
          <p key={index} className="whitespace-pre-line">
            <span className="font-semibold uppercase">{`Nota ${index + 1}:`}</span>{" "}
            {nota.trim() || ""}
          </p>
        ))}
      </div>
    </div>
  );
}
