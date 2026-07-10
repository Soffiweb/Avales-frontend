import { MES_NOMBRES } from "@/lib/api/reforms-multi";
import { formatCurrency, formatGenero } from "@/lib/utils/formatters";
import type { CatalogItemPresupuestario } from "@/types/catalog";
import type { Evento } from "@/types/evento";
import {
  getFormaBudgetItems,
  type EventoCambiosResult,
} from "../_components/evento-cambios-card";

export type EventoADraft = {
  evento: Evento;
  result: EventoCambiosResult;
};

export type ReformaPreviewInfoRow = {
  label: string;
  value: string;
  changed?: boolean;
};

export type ReformaPreviewBudgetRow = {
  codigo: string;
  item: string;
  valor: string;
  changed?: boolean;
};

export type EditedEventoPreviewBlock = {
  eventoId: number;
  title: string;
  currentInfoRows: ReformaPreviewInfoRow[];
  proposedInfoRows: ReformaPreviewInfoRow[];
  currentBudgetRows: ReformaPreviewBudgetRow[];
  proposedBudgetRows: ReformaPreviewBudgetRow[];
  currentTotal: number;
  proposedTotal: number;
};

export function getMonthLabel(value?: number | null) {
  if (typeof value !== "number") return "-";
  return (MES_NOMBRES[value] ?? "-").toUpperCase();
}

export function formatPreviewValue(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized.toUpperCase() : "-";
}

export function buildEditedEventoPreviewBlock(
  draft: EventoADraft,
  itemsCatalogo: CatalogItemPresupuestario[],
): EditedEventoPreviewBlock {
  const { evento, result } = draft;
  const cambios = result.cambiosPropuestos;
  const formaEntry = cambios.formasParticipacion?.[0];
  const matchingForma = evento.formasParticipacion?.find(
    (forma) => forma.id === result.formaParticipacionId,
  );

  const currentEntrenadores =
    (matchingForma?.numEntrenadoresHombres ?? evento.numEntrenadoresHombres ?? 0) +
    (matchingForma?.numEntrenadoresMujeres ?? evento.numEntrenadoresMujeres ?? 0);
  const currentDeportistas =
    (matchingForma?.numAtletasHombres ?? evento.numAtletasHombres ?? 0) +
    (matchingForma?.numAtletasMujeres ?? evento.numAtletasMujeres ?? 0);
  const proposedEntrenadores = formaEntry
    ? formaEntry.numEntrenadoresHombres + formaEntry.numEntrenadoresMujeres
    : currentEntrenadores;
  const proposedDeportistas = formaEntry
    ? formaEntry.numAtletasHombres + formaEntry.numAtletasMujeres
    : currentDeportistas;
  const currentDamas = matchingForma?.numAtletasMujeres ?? evento.numAtletasMujeres ?? 0;
  const currentVarones = matchingForma?.numAtletasHombres ?? evento.numAtletasHombres ?? 0;
  const proposedDamas = formaEntry?.numAtletasMujeres ?? currentDamas;
  const proposedVarones = formaEntry?.numAtletasHombres ?? currentVarones;

  const currentInfoRows: ReformaPreviewInfoRow[] = [
    { label: "Nombre", value: formatPreviewValue(evento.nombre) },
    {
      label: "Provincia",
      value: formatPreviewValue([evento.ciudad, evento.provincia].filter(Boolean).join(" - ")),
    },
    { label: "Mes programado", value: getMonthLabel(evento.mesProgramado) },
    { label: "Género", value: formatPreviewValue(formatGenero(evento.genero)) },
    { label: "N° de entrenadores", value: String(currentEntrenadores) },
    { label: "N° de deportistas", value: String(currentDeportistas) },
    { label: "Damas", value: String(currentDamas) },
    { label: "Varones", value: String(currentVarones) },
  ];

  const proposedInfoRows: ReformaPreviewInfoRow[] = [
    {
      label: "Nombre",
      value: formatPreviewValue(cambios.nombre ?? evento.nombre),
      changed: cambios.nombre !== undefined,
    },
    {
      label: "Provincia",
      value: formatPreviewValue(
        [cambios.ciudad ?? evento.ciudad, cambios.provincia ?? evento.provincia]
          .filter(Boolean)
          .join(" - "),
      ),
      changed: cambios.ciudad !== undefined || cambios.provincia !== undefined,
    },
    {
      label: "Mes programado",
      value: getMonthLabel(cambios.mesProgramado ?? evento.mesProgramado),
      changed: cambios.mesProgramado !== undefined,
    },
    { label: "Género", value: formatPreviewValue(formatGenero(evento.genero)) },
    {
      label: "N° de entrenadores",
      value: String(proposedEntrenadores),
      changed: proposedEntrenadores !== currentEntrenadores,
    },
    {
      label: "N° de deportistas",
      value: String(proposedDeportistas),
      changed: proposedDeportistas !== currentDeportistas,
    },
    { label: "Damas", value: String(proposedDamas), changed: proposedDamas !== currentDamas },
    { label: "Varones", value: String(proposedVarones), changed: proposedVarones !== currentVarones },
  ];

  const originalItems = getFormaBudgetItems(evento, matchingForma);
  const currentBudgetRows: ReformaPreviewBudgetRow[] = originalItems.map((item) => ({
    codigo: String(item.item.numero ?? "-"),
    item: formatPreviewValue(item.item.nombre),
    valor: formatCurrency(Number.parseFloat(item.presupuesto) || 0),
  }));
  const currentTotal = originalItems.reduce(
    (sum, item) => sum + (Number.parseFloat(item.presupuesto) || 0),
    0,
  );

  const movimientosByKey = new Map(result.movimientos.map((m) => [`${m.itemId}-${m.mes}`, m]));
  const matchedRows: ReformaPreviewBudgetRow[] = originalItems.map((item) => {
    const movimiento = movimientosByKey.get(`${item.item.id}-${item.mes}`);
    return {
      codigo: String(item.item.numero ?? "-"),
      item: formatPreviewValue(item.item.nombre),
      valor: formatCurrency(movimiento ? movimiento.montoNuevo : Number.parseFloat(item.presupuesto) || 0),
      changed: Boolean(movimiento),
    };
  });
  const newItemRows: ReformaPreviewBudgetRow[] = result.movimientos
    .filter((m) => !originalItems.some((oi) => oi.item.id === m.itemId && oi.mes === m.mes))
    .map((m) => {
      const catalogItem = itemsCatalogo.find((option) => option.id === m.itemId);
      return {
        codigo: String(catalogItem?.numero ?? "-"),
        item: formatPreviewValue(m.itemNombre),
        valor: formatCurrency(m.montoNuevo),
        changed: true,
      };
    });
  const proposedBudgetRows = [...matchedRows, ...newItemRows];
  const proposedTotal =
    currentTotal + result.movimientos.reduce((sum, m) => sum + (m.montoNuevo - m.montoOriginal), 0);

  return {
    eventoId: evento.id,
    title: formatPreviewValue(evento.nombre),
    currentInfoRows,
    proposedInfoRows,
    currentBudgetRows,
    proposedBudgetRows,
    currentTotal,
    proposedTotal,
  };
}
