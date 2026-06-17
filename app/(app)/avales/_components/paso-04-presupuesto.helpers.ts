import type {
  Aval,
  RubroPresupuestarioDto,
  TipoCoberturaAval,
} from "@/types/aval";

export type ManualRequirementDraft = {
  id: string;
  otroConcepto: string;
  detalle: string;
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
    otroConcepto: item.otroConcepto ?? "",
    detalle: item.detalle ?? "",
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
        !concept &&
        !cantidad &&
        (!rawMonto || !Number.isFinite(parsedMonto) || parsedMonto === 0)
      ) {
        return null;
      }

      return {
        otroConcepto: concept || undefined,
        detalle: item.detalle.trim() || undefined,
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

export function getDraftTitle(
  item: ManualRequirementDraft,
  index: number,
): string {
  return item.otroConcepto.trim() || `Concepto ${index + 1}`;
}

export function getDraftSubtotal(item: ManualRequirementDraft): number {
  const monto = Number.parseFloat(item.montoSolicitado || "0");
  return Number.isFinite(monto) ? monto : 0;
}

export function getTotalOriginalManual(
  _aval: Aval,
  isAutogestion: boolean,
  totalPresupuesto: number,
): number {
  return isAutogestion ? totalPresupuesto : 0;
}
