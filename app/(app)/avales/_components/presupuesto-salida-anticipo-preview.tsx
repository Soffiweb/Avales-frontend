import type { Aval } from "@/types/aval";
import {
  formatDate,
  formatDecimal,
  formatLocationWithProvince,
  getResponsibleTrainerData,
} from "@/lib/utils/formatters";
import { formatCategoryLabel } from "@/lib/utils/categories";
import {
  getAvalCupos,
  getAvalPresupuestoItems,
} from "@/lib/utils/aval-collections";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

// Espejo del `formatEventDateText` del backend para que el preview y el PDF
// muestren la fecha de salida con el mismo formato.
function formatEventDateRangeDoc(
  inicio?: string | null,
  fin?: string | null,
): string {
  if (!inicio || !fin) return "-";
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
  if (!a || !b) return "-";
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
  noDias: number;
  nombrePersonalizado?: string;
  cantidad: number;
  valorUnitario: number;
  subtotal?: number;
};

export type PresupuestoSalidaPreviewItem = {
  id: number;
  nombre: string;
  total?: number;
  itemId?: number;
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
    : "-";

  const pdaFirmanteNombre =
    draft?.pdaFirmanteNombre?.trim() ?? aval.pda?.nombreFirmante?.trim() ?? "";
  const pdaFirmanteCargo =
    draft?.pdaFirmanteCargo?.trim() ?? aval.pda?.cargoFirmante?.trim() ?? "";
  const financieroFirmanteNombre = draft?.financieroFirmanteNombre?.trim() ?? "";
  const financieroFirmanteCargo = draft?.financieroFirmanteCargo?.trim() ?? "";
  const formatCantidad = (value: number) =>
    Number.isInteger(value) ? String(value) : formatDecimal(value);
  const evento = aval.evento;
  const responsable = getResponsibleTrainerData(aval);
  const cupos = getAvalCupos(aval);
  const presupuestoSourceItems = getAvalPresupuestoItems(aval);
  const entrenadores =
    cupos.numEntrenadoresHombres + cupos.numEntrenadoresMujeres;
  const deportistas =
    cupos.numAtletasHombres + cupos.numAtletasMujeres;

  const presupuestoLookup = new Map(
    presupuestoSourceItems.flatMap((item) => [
      [item.id, item.item.nombre] as const,
      [item.item.id, item.item.nombre] as const,
    ]),
  );

  const isFondosPublicos = aval.tipoAval === "FONDOS_PUBLICOS";

  // Build formaMap for V. CERT PDA
  const formaMap = new Map<number, number>();
  for (const fi of aval.evento.formaParticipacionActual?.items ?? []) {
    formaMap.set(
      fi.item.id,
      (formaMap.get(fi.item.id) ?? 0) + Number.parseFloat(fi.presupuesto),
    );
  }

  type TableRow = {
    key: string;
    detalle: string;
    valorCertPda: number;
    showCertPda: boolean;
    certPdaClass: string;
    noDias: number;
    cantidad: number;
    valorUnitario: number;
    total: number;
  };

  function pushDias(
    id: number | string,
    itemNombre: string,
    valorCertPda: number,
    dias: Array<{ noDias?: number; cantidad: number; valorUnitario: number; nombrePersonalizado?: string | null }>,
  ) {
    const multi = dias.length > 1;
    for (const [i, dia] of dias.entries()) {
      const noDias = dia.noDias ?? 1;
      const isFirst = i === 0;
      const isLast = i === dias.length - 1;
      let certPdaClass = "";
      if (multi) {
        if (isFirst) certPdaClass = "border-b-0";
        else if (isLast) certPdaClass = "border-t-0";
        else certPdaClass = "border-t-0 border-b-0";
      }
      tableRows.push({
        key: `${id}-${i}`,
        detalle: dia.nombrePersonalizado?.trim() || itemNombre,
        valorCertPda,
        showCertPda: isFirst || !multi,
        certPdaClass,
        noDias,
        cantidad: dia.cantidad,
        valorUnitario: dia.valorUnitario,
        total: noDias * dia.cantidad * dia.valorUnitario,
      });
    }
  }

  // Build rows from items prop (draft) or aval.pda.items
  const tableRows: TableRow[] = [];

  if (items) {
    for (const item of items) {
      const valorCertPda = formaMap.get(item.itemId ?? 0) ?? 0;
      const dias = item.dias ?? [];
      if (dias.length === 0) {
        tableRows.push({
          key: String(item.id),
          detalle: item.nombre,
          valorCertPda,
          showCertPda: true,
          certPdaClass: "",
          noDias: 1,
          cantidad: 1,
          valorUnitario: item.total ?? 0,
          total: item.total ?? 0,
        });
      } else {
        pushDias(item.id, item.nombre, valorCertPda, dias);
      }
    }
  } else if (aval.pda?.items?.length) {
    for (const pdaItem of aval.pda.items) {
      const itemNombre =
        pdaItem.nombrePersonalizado?.trim() ||
        pdaItem.itemNombre ||
        presupuestoLookup.get(pdaItem.itemId) ||
        `Item ${pdaItem.itemId}`;
      const valorCertPda = formaMap.get(pdaItem.itemId) ?? 0;
      const dias = pdaItem.dias ?? [];
      if (dias.length === 0) {
        tableRows.push({
          key: String(pdaItem.id ?? pdaItem.itemId),
          detalle: itemNombre,
          valorCertPda,
          showCertPda: true,
          certPdaClass: "",
          noDias: 1,
          cantidad: 1,
          valorUnitario: pdaItem.presupuesto,
          total: pdaItem.presupuesto,
        });
      } else {
        pushDias(pdaItem.itemId, itemNombre, valorCertPda, dias);
      }
    }
  }

  const tableTotal = tableRows.reduce((sum, r) => sum + r.total, 0);
  const tableCertPdaTotal = tableRows.reduce(
    (sum, r) => (r.showCertPda ? sum + r.valorCertPda : sum),
    0,
  );

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

      {tableRows.length > 0 ? (
        <div className="border border-slate-400">
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-slate-100">
                {isFondosPublicos ? (
                  <>
                    <th className="border border-slate-400 px-2 py-1">DETALLE</th>
                    <th className="border border-slate-400 px-2 py-1">V. CERT PDA</th>
                    <th className="border border-slate-400 px-2 py-1">No. DIAS</th>
                    <th className="border border-slate-400 px-2 py-1">CANT.</th>
                    <th className="border border-slate-400 px-2 py-1">V. UNIT.</th>
                    <th className="border border-slate-400 px-2 py-1">TOTAL</th>
                  </>
                ) : (
                  <>
                    <th className="border border-slate-400 px-2 py-1">CONCEPTO</th>
                    <th className="border border-slate-400 px-2 py-1">No. DIAS</th>
                    <th className="border border-slate-400 px-2 py-1">CANT.</th>
                    <th className="border border-slate-400 px-2 py-1">V. UNIT.</th>
                    <th className="border border-slate-400 px-2 py-1">TOTAL</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => (
                <tr key={row.key}>
                  <td className="border border-slate-400 px-2 py-1">{row.detalle}</td>
                  {isFondosPublicos && (
                    <td className={`border border-slate-400 px-2 py-1 text-right ${row.certPdaClass}`}>
                      {row.showCertPda ? formatDecimal(row.valorCertPda) : ""}
                    </td>
                  )}
                  <td className="border border-slate-400 px-2 py-1 text-center">
                    {formatCantidad(row.noDias)}
                  </td>
                  <td className="border border-slate-400 px-2 py-1 text-center">
                    {formatCantidad(row.cantidad)}
                  </td>
                  <td className="border border-slate-400 px-2 py-1 text-right">
                    {formatDecimal(row.valorUnitario)}
                  </td>
                  <td className="border border-slate-400 px-2 py-1 text-right">
                    {formatDecimal(row.total)}
                  </td>
                </tr>
              ))}
              <tr>
                <td
                  className="border border-slate-400 px-2 py-1 font-semibold text-right"
                  colSpan={isFondosPublicos ? 1 : 4}
                >
                  TOTAL
                </td>
                {isFondosPublicos && (
                  <>
                    <td className="border border-slate-400 px-2 py-1 font-semibold text-right">
                      {formatDecimal(tableCertPdaTotal)}
                    </td>
                    <td className="border border-slate-400 px-2 py-1" colSpan={3} />
                  </>
                )}
                <td className="border border-slate-400 px-2 py-1 font-semibold text-right">
                  {formatDecimal(tableTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="border border-slate-400 p-4 text-center text-[10px] text-slate-500">
          Sin items presupuestarios.
        </div>
      )}

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
