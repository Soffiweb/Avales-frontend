import type { CatalogItemPresupuestario } from "@/types/catalog";
import type {
  Aval,
  RubroPresupuestarioDto,
  TipoCoberturaAval,
} from "@/types/aval";

export type ManualRequirementDraft = {
  id: string;
  mode: "CATALOGO" | "CUSTOM";
  rubroId?: number;
  otroConcepto: string;
  cantidad: string;
  montoSolicitado: string;
  tipoCobertura: TipoCoberturaAval;
};

export function buildInitialManualRequirements(
  requerimientos?: RubroPresupuestarioDto[],
): ManualRequirementDraft[] {
  if (!requerimientos?.length) return [];

  return requerimientos.map((item, index) => ({
    id: `saved-${index}`,
    mode: item.rubroId ? "CATALOGO" : "CUSTOM" as "CATALOGO" | "CUSTOM",
    rubroId: item.rubroId,
    otroConcepto: item.otroConcepto ?? "",
    cantidad: item.cantidad ?? "",
    montoSolicitado: item.montoSolicitado ?? "",
    tipoCobertura: item.tipoCobertura ?? "DINERO",
  }));
}

export function serializeManualRequirements(
  items: ManualRequirementDraft[],
): RubroPresupuestarioDto[] {
  return items
    .map((item) => {
      const concept = item.otroConcepto.trim();
      const rawCantidad = item.cantidad.trim();
      const rawMonto = item.montoSolicitado.trim();
      const parsedCantidad = Number.parseFloat(rawCantidad || "0");
      const parsedMonto = Number.parseFloat(rawMonto || "0");
      const normalizedMonto = Number.isFinite(parsedMonto)
        ? parsedMonto.toFixed(2)
        : undefined;
      const cantidad =
        rawCantidad !== "" && parsedCantidad > 0 ? rawCantidad : undefined;
      const monto =
        rawMonto !== "" && parsedMonto >= 0 ? normalizedMonto : undefined;

      if (
        !item.rubroId &&
        !concept &&
        !cantidad &&
        (!rawMonto || !Number.isFinite(parsedMonto) || parsedMonto === 0)
      ) {
        return null;
      }

      return {
        rubroId: item.rubroId,
        otroConcepto: concept || undefined,
        cantidad,
        montoSolicitado: monto,
        tipoCobertura: item.tipoCobertura,
        origen: "MANUAL" as const,
        editable: true,
      } satisfies RubroPresupuestarioDto;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

export function sumManualRequirementAmount(
  items: RubroPresupuestarioDto[],
): number {
  return items.reduce((sum, item) => {
    const monto = Number.parseFloat(item.montoSolicitado ?? "0");
    return sum + (Number.isFinite(monto) ? monto : 0);
  }, 0);
}

export function getCatalogItemLabel(
  itemsCatalogo: CatalogItemPresupuestario[],
  rubroId?: number,
): string {
  if (!rubroId) return "";
  const item = itemsCatalogo.find((option) => option.id === rubroId);
  return item ? `${item.numero} - ${item.nombre}` : "";
}

export function getCatalogItemActivity(
  itemsCatalogo: CatalogItemPresupuestario[],
  rubroId?: number,
): string {
  if (!rubroId) return "";
  return itemsCatalogo.find((option) => option.id === rubroId)?.actividad?.nombre ?? "";
}

export function getDraftTitle(
  item: ManualRequirementDraft,
  index: number,
  itemsCatalogo: CatalogItemPresupuestario[],
): string {
  if (item.mode === "CATALOGO") {
    return item.rubroId
      ? getCatalogItemLabel(itemsCatalogo, item.rubroId) || `Rubro ${index + 1}`
      : `Rubro ${index + 1}`;
  }
  return item.otroConcepto.trim() || `Concepto ${index + 1}`;
}

export function getDraftSubtotal(item: ManualRequirementDraft): number {
  const monto = Number.parseFloat(item.montoSolicitado || "0");
  return Number.isFinite(monto) ? monto : 0;
}

export function getTotalOriginalManual(
  _aval: Aval,
  _isAutogestion: boolean,
  totalPresupuesto: number,
): number {
  return totalPresupuesto;
}
