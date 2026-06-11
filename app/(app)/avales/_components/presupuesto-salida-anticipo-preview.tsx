import type { Aval } from "@/types/aval";
import {
  formatDate,
  formatDecimal,
  formatLocationWithProvince,
  getResponsibleTrainerData,
} from "@/lib/utils/formatters";
import { formatCategoryLabel } from "@/lib/utils/categories";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

// Espejo del `formatEventDateText` del backend para que el preview y el PDF
// muestren la fecha de salida con el mismo formato.
function formatEventDateRangeDoc(
  inicio?: string | null,
  fin?: string | null,
): string {
  if (!inicio || !fin) return "POR DEFINIR";
  const parseParts = (raw: string) => {
    const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch)
      return {
        year: Number(isoMatch[1]),
        month: Number(isoMatch[2]),
        day: Number(isoMatch[3]),
      };
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return null;
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
    };
  };
  const a = parseParts(inicio);
  const b = parseParts(fin);
  if (!a || !b) return "POR DEFINIR";
  const sameDay =
    a.year === b.year && a.month === b.month && a.day === b.day;
  if (sameDay) {
    const meses = [
      "ENERO",
      "FEBRERO",
      "MARZO",
      "ABRIL",
      "MAYO",
      "JUNIO",
      "JULIO",
      "AGOSTO",
      "SEPTIEMBRE",
      "OCTUBRE",
      "NOVIEMBRE",
      "DICIEMBRE",
    ];
    return `${pad2(a.day)} DE ${meses[a.month - 1]} DE ${a.year}`;
  }
  return `DEL ${pad2(a.day)}/${pad2(a.month)}/${a.year} AL ${pad2(b.day)}/${pad2(b.month)}/${b.year}`;
}

export type PresupuestoSalidaPreviewDia = {
  numeroDia: number;
  cantidad: number;
  valorUnitario: number;
};

export type PresupuestoSalidaPreviewItem = {
  id: number;
  nombre: string;
  total?: number;
  dias?: PresupuestoSalidaPreviewDia[];
};

type Props = {
  aval: Aval;
  draft?: {
    notas?: string[];
    codigoActividad?: string;
    numeroAval?: string;
    fechaSalida?: string;
    periodoComision?: string;
    periodoComisionFin?: string;
    pdaFirmanteNombre?: string;
    pdaFirmanteCargo?: string;
    financieroFirmanteNombre?: string;
    financieroFirmanteCargo?: string;
  };
  items?: PresupuestoSalidaPreviewItem[];
};

export default function PresupuestoSalidaAnticipoPreview({
  aval,
  draft,
  items,
}: Props) {
  const periodoComision = draft?.periodoComision?.trim() ?? aval.periodoComision?.trim() ?? "";
  const periodoComisionFin = draft?.periodoComisionFin?.trim() ?? aval.periodoComisionFin?.trim() ?? "";
  const periodoLabel = periodoComision
    ? periodoComisionFin
      ? `${formatDate(periodoComision)} - ${formatDate(periodoComisionFin)}`
      : formatDate(periodoComision)
    : "Por definir";

  const pdaFirmanteNombre =
    draft?.pdaFirmanteNombre?.trim() ?? aval.pda?.nombreFirmante?.trim() ?? "";
  const pdaFirmanteCargo =
    draft?.pdaFirmanteCargo?.trim() ?? aval.pda?.cargoFirmante?.trim() ?? "";
  const financieroFirmanteNombre = draft?.financieroFirmanteNombre?.trim() ?? "";
  const financieroFirmanteCargo = draft?.financieroFirmanteCargo?.trim() ?? "";
  const formatCantidad = (value: number) => String(Math.trunc(value));
  const evento = aval.evento;
  const responsable = getResponsibleTrainerData(aval);
  const entrenadores =
    (evento?.numEntrenadoresHombres || 0) +
    (evento?.numEntrenadoresMujeres || 0);
  const deportistas =
    (evento?.numAtletasHombres || 0) + (evento?.numAtletasMujeres || 0);

  const presupuestoLookup = new Map(
    (evento?.presupuesto ?? []).flatMap((item) => [
      [item.id, item.item.nombre] as const,
      [item.item.id, item.item.nombre] as const,
    ]),
  );

  const presupuestoItems: PresupuestoSalidaPreviewItem[] =
    items?.map((item) => ({
      id: item.id,
      nombre: item.nombre,
      total: item.total,
      dias: item.dias,
    })) ??
    (aval.pda?.items?.length
      ? aval.pda.items.map((item) => ({
          id: item.id ?? item.itemId,
          nombre: presupuestoLookup.get(item.itemId) ?? `Item ${item.itemId}`,
          total: item.presupuesto,
          dias: item.dias?.map((dia) => ({
            numeroDia: dia.numeroDia,
            cantidad: dia.cantidad,
            valorUnitario: dia.valorUnitario,
          })),
        }))
      : (evento?.presupuesto ?? []).map((item) => ({
          id: item.id,
          nombre: item.item.nombre,
          total: Number.parseFloat(item.presupuesto) || 0,
        })));

  const hasDiaBreakdown = presupuestoItems.some((item) => (item.dias?.length ?? 0) > 0);

  const total = presupuestoItems.reduce((sum, item) => {
    if (typeof item.total === "number") return sum + item.total;
    const itemTotal =
      item.dias?.reduce(
        (diasTotal, dia) => diasTotal + dia.cantidad * dia.valorUnitario,
        0,
      ) ?? 0;
    return sum + itemTotal;
  }, 0);

  const codigoActividad = (
    draft?.codigoActividad?.trim() || aval.pda?.codigoActividad?.trim() || "004"
  ).replace("005", "004");
  const numeroAval =
    draft?.numeroAval?.trim() ||
    aval.pda?.numeroAval?.trim() ||
    aval.avalTecnico?.numeroAval ||
    aval.aval ||
    aval.numeroColeccion ||
    String(aval.id);

  const anioActividad = new Date().getFullYear();
  const fondos =
    aval.tipoAval === "AUTOGESTION"
      ? "AUTOGESTION"
      : aval.tipoAval === "SOLO_RESULTADO"
        ? "SOLO RESULTADOS"
        : "PUBLICOS";

  const fechaSalida =
    draft?.fechaSalida?.trim() ||
    aval.avalTecnico?.fechaHoraSalida ||
    null;
  const fechaSalidaLabel = fechaSalida
    ? formatDate(fechaSalida)
    : formatEventDateRangeDoc(evento?.fechaInicio, evento?.fechaFin);

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
              <td className="border border-slate-400 px-2 py-1">{formatCategoryLabel(evento?.categoria?.nombre ?? evento?.categoriaCodigo)}</td>
            </tr>
            <tr>
              <td className="border border-slate-400 px-2 py-1 font-semibold">EVENTO</td>
              <td className="border border-slate-400 px-2 py-1">{evento?.nombre || "-"}</td>
            </tr>
            <tr>
              <td className="border border-slate-400 px-2 py-1 font-semibold"># PARTICIPANTES</td>
              <td className="border border-slate-400 px-2 py-1">
                ENTRENADORES: {entrenadores}     DEPORTISTAS: {deportistas}
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
              <td className="border border-slate-400 px-2 py-1">{fechaSalidaLabel}</td>
            </tr>
            <tr>
              <td className="border border-slate-400 px-2 py-1 font-semibold">PERÍODO DE COMISIÓN</td>
              <td className="border border-slate-400 px-2 py-1">{periodoLabel}</td>
            </tr>
            <tr>
              <td className="border border-slate-400 px-2 py-1 font-semibold">RESPONSABLE ANTICIPO</td>
              <td className="border border-slate-400 px-2 py-1">{responsable.nombre}</td>
            </tr>
            <tr>
              <td className="border border-slate-400 px-2 py-1 font-semibold">C.I. RESP. ANTICIPO</td>
              <td className="border border-slate-400 px-2 py-1">{responsable.cedula}</td>
            </tr>
            <tr>
              <td className="border border-slate-400 px-2 py-1 font-semibold">{`ACTIVIDADES POA ${anioActividad}`}</td>
              <td className="border border-slate-400 px-2 py-1">
                {codigoActividad} EVENTOS DE PREPARACION Y COMPETENCIA
              </td>
            </tr>
            <tr>
              <td className="border border-slate-400 px-2 py-1 font-semibold">AVAL TECNICO NUMERO</td>
              <td className="border border-slate-400 px-2 py-1">{numeroAval}</td>
            </tr>
            <tr>
              <td className="border border-slate-400 px-2 py-1 font-semibold">FONDOS</td>
              <td className="border border-slate-400 px-2 py-1 font-semibold">{fondos}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="border border-slate-400">
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-400 px-2 py-1">Concepto</th>
              {hasDiaBreakdown ? (
                <>
                  <th className="border border-slate-400 px-2 py-1">Dia</th>
                  <th className="border border-slate-400 px-2 py-1">Cantidad</th>
                  <th className="border border-slate-400 px-2 py-1">Valor unitario</th>
                </>
              ) : null}
              <th className="border border-slate-400 px-2 py-1">Total</th>
            </tr>
          </thead>
          <tbody>
            {presupuestoItems.flatMap((item) => {
              if (!hasDiaBreakdown) {
                const itemTotal =
                  typeof item.total === "number"
                    ? item.total
                    : item.dias?.reduce(
                        (diasTotal, dia) => diasTotal + dia.cantidad * dia.valorUnitario,
                        0,
                      ) ?? 0;

                return (
                  <tr key={item.id}>
                    <td className="border border-slate-400 px-2 py-1">{item.nombre}</td>
                    <td className="border border-slate-400 px-2 py-1 text-right">
                      {formatDecimal(itemTotal)}
                    </td>
                  </tr>
                );
              }

              if (!item.dias?.length) {
                return (
                  <tr key={item.id}>
                    <td className="border border-slate-400 px-2 py-1">{item.nombre}</td>
                    <td className="border border-slate-400 px-2 py-1 text-center">-</td>
                    <td className="border border-slate-400 px-2 py-1 text-center">-</td>
                    <td className="border border-slate-400 px-2 py-1 text-right">-</td>
                    <td className="border border-slate-400 px-2 py-1 text-right">
                      {formatDecimal(item.total ?? 0)}
                    </td>
                  </tr>
                );
              }

              return item.dias.map((dia) => {
                const diaTotal = dia.cantidad * dia.valorUnitario;
                return (
                  <tr key={`${item.id}-${dia.numeroDia}`}>
                    <td className="border border-slate-400 px-2 py-1">
                      {item.nombre}
                    </td>
                    <td className="border border-slate-400 px-2 py-1 text-center">
                      {dia.numeroDia}
                    </td>
                    <td className="border border-slate-400 px-2 py-1 text-center">
                      {formatCantidad(dia.cantidad)}
                    </td>
                    <td className="border border-slate-400 px-2 py-1 text-right">
                      {formatDecimal(dia.valorUnitario)}
                    </td>
                    <td className="border border-slate-400 px-2 py-1 text-right">
                      {formatDecimal(diaTotal)}
                    </td>
                  </tr>
                );
              });
            })}
            <tr>
              <td
                className="border border-slate-400 px-2 py-1 font-semibold text-right"
                colSpan={hasDiaBreakdown ? 4 : 1}
              >
                TOTAL
              </td>
              <td className="border border-slate-400 px-2 py-1 font-semibold text-right">
                {formatDecimal(total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="space-y-1 text-[10px] leading-4">
        {(draft?.notas ?? []).map((nota, index) => (
          <p key={index} className="whitespace-pre-line">
            <span className="font-semibold uppercase">{`Nota ${index + 1}:`}</span>{" "}
            {nota.trim() || ""}
          </p>
        ))}
      </div>

      <div className="flex justify-between gap-4 pt-6 text-[11px]">
        <div className="flex-1">
          <p className="text-slate-400 text-[10px]">____________________________</p>
          <p className="font-semibold uppercase mt-1">
            {pdaFirmanteNombre || "NOMBRE FIRMANTE"}
          </p>
          <p className="uppercase">{pdaFirmanteCargo || "CARGO FIRMANTE"}</p>
        </div>
        <div className="flex-1 text-right">
          <p className="text-slate-400 text-[10px]">____________________________</p>
          <p className="font-semibold uppercase mt-1">
            {financieroFirmanteNombre || "NOMBRE FIRMANTE"}
          </p>
          <p className="uppercase">{financieroFirmanteCargo || "CARGO FIRMANTE"}</p>
        </div>
      </div>
    </div>
  );
}
