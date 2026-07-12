import type { Aval } from "@/types/aval";
import { buildCertificacionDescriptor } from "avales-shared";
import type { CertificacionInputItem } from "avales-shared";
import { formatDate, getResponsibleTrainerData } from "@/lib/utils/formatters";
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

export default function CertificacionFinancieraPreview({ aval, draft }: Props) {
  const evento = aval.evento;
  const responsable = getResponsibleTrainerData(aval);
  const cupos = getAvalCupos(aval);
  const presupuestoSourceItems = getAvalPresupuestoItems(aval);

  // Headcount REAL de la delegación (con fallback a cupos si el roster está vacío).
  const numEntrenadores =
    aval.entrenadores?.length ||
    cupos.numEntrenadoresHombres + cupos.numEntrenadoresMujeres;
  const numDeportistas =
    aval.avalTecnico?.deportistasAval?.length ||
    cupos.numAtletasHombres + cupos.numAtletasMujeres;

  // Ítems: montos aprobados del PDA (por día); el descriptor los agrupa.
  const pdaItems: CertificacionInputItem[] = (aval.pda?.items ?? []).flatMap(
    (pdaItem) => {
      const source = presupuestoSourceItems.find(
        (entry) => entry.item.id === pdaItem.itemId,
      )?.item;
      const itemNumero = String(
        source?.numero ?? source?.codigo ?? pdaItem.itemId,
      );
      const itemNombre =
        source?.nombre || pdaItem.nombrePersonalizado?.trim() || `Item ${pdaItem.itemId}`;

      if (!pdaItem.dias?.length) {
        return [{ itemNumero, itemNombre, presupuesto: pdaItem.presupuesto }];
      }
      return pdaItem.dias.map((dia) => ({
        itemNumero,
        itemNombre,
        presupuesto:
          dia.subtotal ?? (dia.noDias ?? 1) * dia.cantidad * dia.valorUnitario,
      }));
    },
  );

  const items: CertificacionInputItem[] =
    pdaItems.length > 0
      ? pdaItems
      : presupuestoSourceItems.map((entry) => ({
          itemNumero: String(entry.item?.numero ?? entry.item?.codigo ?? "-"),
          itemNombre: entry.item?.nombre || "-",
          presupuesto: Number.parseFloat(entry.presupuesto) || 0,
        }));

  const doc = buildCertificacionDescriptor({
    fechaCertificacion: draft.fechaEmision ? formatDate(draft.fechaEmision) : "",
    numeroColeccion: aval.numeroColeccion,
    descripcion: draft.descripcionCertificacion,
    disciplina: evento?.disciplina?.nombre,
    categoria: formatCategoryLabel(
      evento?.categoria?.nombre ?? evento?.categoriaCodigo,
    ),
    evento: evento?.nombre,
    numEntrenadores,
    numDeportistas,
    lugarCompetencia:
      [evento?.ciudad, evento?.provincia, evento?.pais]
        .filter((part) => part && String(part).trim())
        .join(", ") ||
      evento?.lugar ||
      "",
    fechaHoraSalida: aval.avalTecnico?.fechaHoraSalida ?? null,
    fechaHoraRetorno: aval.avalTecnico?.fechaHoraRetorno ?? null,
    periodoComision: draft.periodoComision || null,
    periodoComisionFin: draft.periodoComisionFin || null,
    responsableNombre: responsable.nombre,
    responsableCedula: responsable.cedula,
    codigoActividad: aval.pda?.codigoActividad,
    actividadNombre: presupuestoSourceItems[0]?.item?.actividad?.nombre,
    numeroAval:
      aval.avalTecnico?.numeroAval || aval.aval || aval.numeroColeccion,
    tipoAval: aval.tipoAval ?? undefined,
    firmanteNombre: draft.firmanteNombre,
    firmanteCargo: draft.firmanteCargo,
    items,
  });

  return (
    <div className="bg-white p-5 xl:p-6 border border-slate-300 text-slate-900 space-y-4">
      <div className="text-right text-[11px] leading-4">
        {doc.headerCode ? <p className="font-semibold">{doc.headerCode}</p> : null}
        <p>{doc.fechaCertificacion || "-"}</p>
      </div>

      <h2 className="text-center text-[12px] font-semibold uppercase tracking-wide">
        {doc.title}
      </h2>

      <p className="text-[11px] leading-5">{doc.descripcion}</p>

      <div className="border border-slate-400">
        <table className="w-full border-collapse text-[10px]">
          <tbody>
            {doc.infoRows.map((row) => (
              <tr key={row.label}>
                <td className="w-[38%] border border-slate-400 px-2 py-1 font-semibold">
                  {row.label}
                </td>
                <td className="border border-slate-400 px-2 py-1">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px]">{doc.valorText}</p>

      <div className="border border-slate-400">
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="bg-slate-100">
              {doc.itemsHeaders.map((header) => (
                <th key={header} className="border border-slate-400 px-2 py-1">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {doc.itemsRows.map((row, index) => (
              <tr key={`${row.itemPresupuestario}-${index}`}>
                <td className="border border-slate-400 px-2 py-1 text-center">
                  {row.nActividad}
                </td>
                <td className="border border-slate-400 px-2 py-1">
                  {row.nombreActividad}
                </td>
                <td className="border border-slate-400 px-2 py-1">
                  {row.itemPresupuestario}
                </td>
                <td className="border border-slate-400 px-2 py-1">
                  {row.nombreItem}
                </td>
                <td className="border border-slate-400 px-2 py-1 text-right">
                  {row.valor}
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
                {doc.totalFormatted}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-[11px]">{doc.closingText}</p>

      <div className="pt-6 text-[11px]">
        <p className="text-slate-400">____________________________</p>
        <p className="font-semibold uppercase">{doc.firma.nombre || "-"}</p>
        <p className="uppercase">{doc.firma.cargo || "-"}</p>
      </div>
    </div>
  );
}
