"use client";

import type { Aval } from "@/types/aval";
import { formatDecimal } from "@/lib/utils/formatters";
import {
  getAvalPresupuestoItems,
  parseNotasFromBd,
} from "@/lib/utils/aval-collections";

type AvalPresupuestoPdaSectionProps = {
  aval: Aval;
};

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

function formatCantidad(value: number) {
  return Number.isInteger(value) ? String(value) : formatDecimal(value);
}

function toAmount(value: unknown): number {
  const parsed = Number.parseFloat(String(value ?? 0));
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function AvalPresupuestoPdaSection({
  aval,
}: AvalPresupuestoPdaSectionProps) {
  const historialPdaAprobado = aval.historial?.find(
    (entry) => entry.etapa === "PDA" && entry.estado === "ACEPTADO",
  );
  const usuarioAprobador = historialPdaAprobado?.usuario
    ? `${historialPdaAprobado.usuario.nombre} ${historialPdaAprobado.usuario.apellido}`.trim()
    : "";
  const aprobadoPor = aval.pda?.nombreFirmante?.trim() || usuarioAprobador;
  const cargoAprobador = aval.pda?.cargoFirmante?.trim();
  const presupuestoLookup = new Map(
    getAvalPresupuestoItems(aval).flatMap((item) => [
      [item.id, item.item.nombre] as const,
      [item.item.id, item.item.nombre] as const,
    ]),
  );

  const formaMap = new Map<number, number>();
  for (const item of aval.evento.formaParticipacionActual?.items ?? []) {
    formaMap.set(
      item.item.id,
      (formaMap.get(item.item.id) ?? 0) + toAmount(item.presupuesto),
    );
  }

  const rows: TableRow[] = [];
  for (const pdaItem of aval.pda?.items ?? []) {
    const itemNombre =
      pdaItem.nombrePersonalizado?.trim() ||
      pdaItem.itemNombre ||
      presupuestoLookup.get(pdaItem.itemId) ||
      `Item ${pdaItem.itemId}`;
    const valorCertPda =
      pdaItem.presupuestoCertificado != null
        ? toAmount(pdaItem.presupuestoCertificado)
        : (formaMap.get(pdaItem.itemId) ?? 0);
    const dias = pdaItem.dias ?? [];

    if (dias.length === 0) {
      rows.push({
        key: String(pdaItem.id ?? pdaItem.itemId),
        detalle: itemNombre,
        valorCertPda,
        showCertPda: true,
        certPdaClass: "",
        noDias: 1,
        cantidad: 1,
        valorUnitario: toAmount(pdaItem.presupuesto),
        total: toAmount(pdaItem.presupuesto),
      });
      continue;
    }

    const multi = dias.length > 1;
    for (const [index, dia] of dias.entries()) {
      const isFirst = index === 0;
      const isLast = index === dias.length - 1;
      const noDias = toAmount(dia.noDias ?? 1);
      const cantidad = toAmount(dia.cantidad);
      const valorUnitario = toAmount(dia.valorUnitario);
      rows.push({
        key: `${pdaItem.id ?? pdaItem.itemId}-${index}`,
        detalle: dia.nombrePersonalizado?.trim() || itemNombre,
        valorCertPda,
        showCertPda: isFirst || !multi,
        certPdaClass: multi
          ? isFirst
            ? "border-b-0"
            : isLast
              ? "border-t-0"
              : "border-y-0"
          : "",
        noDias,
        cantidad,
        valorUnitario,
        total: noDias * cantidad * valorUnitario,
      });
    }
  }

  const notas = (parseNotasFromBd(aval.pda?.notas) ?? [])
    .map((nota) => nota.texto.trim())
    .filter(Boolean);
  const isFondosPublicos = aval.tipoAval === "FONDOS_PUBLICOS";
  const totalCertPda = rows.reduce(
    (sum, row) => (row.showCertPda ? sum + row.valorCertPda : sum),
    0,
  );
  const total = rows.reduce((sum, row) => sum + row.total, 0);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="space-y-7 bg-white px-5 py-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] overflow-hidden rounded-xl text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-700">
                <th className="px-5 py-3.5 text-left">
                  {isFondosPublicos ? "Detalle" : "Concepto"}
                </th>
                {isFondosPublicos ? (
                  <th className="px-5 py-3.5 text-right">Valor certificado PDA</th>
                ) : null}
                <th className="px-5 py-3.5 text-center">Días</th>
                <th className="px-5 py-3.5 text-center">Cant.</th>
                <th className="px-5 py-3.5 text-right">Valor unitario</th>
                <th className="px-5 py-3.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((row) => (
                  <tr
                    key={row.key}
                    className="border-b border-gray-100 bg-white text-gray-900 last:border-0"
                  >
                    <td className="px-5 py-3.5 font-medium">{row.detalle}</td>
                    {isFondosPublicos ? (
                      <td
                        className={`px-5 py-3.5 text-right tabular-nums text-gray-600 ${row.certPdaClass}`}
                      >
                        {row.showCertPda ? formatDecimal(row.valorCertPda) : ""}
                      </td>
                    ) : null}
                    <td className="px-5 py-3.5 text-center tabular-nums text-gray-600">
                      {formatCantidad(row.noDias)}
                    </td>
                    <td className="px-5 py-3.5 text-center tabular-nums text-gray-600">
                      {formatCantidad(row.cantidad)}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-gray-600">
                      {formatDecimal(row.valorUnitario)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-gray-900">
                      {formatDecimal(row.total)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    className="px-4 py-8 text-center text-sm text-gray-500"
                    colSpan={isFondosPublicos ? 6 : 5}
                  >
                    Sin detalle certificado por PDA.
                  </td>
                </tr>
              )}
              <tr className="border-t border-gray-200 bg-gray-50 font-semibold text-gray-900">
                <td className="px-5 py-4 text-right">Total</td>
                {isFondosPublicos ? (
                  <td className="px-5 py-4 text-right tabular-nums">
                    {formatDecimal(totalCertPda)}
                  </td>
                ) : null}
                <td className="px-5 py-4" colSpan={3} />
                <td className="px-5 py-4 text-right text-base tabular-nums">
                  {formatDecimal(total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {notas.length > 0 ? (
          <div className="space-y-3 text-sm text-gray-800">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-gray-500">
              Notas del presupuesto
            </p>
            {notas.map((nota, index) => (
              <p
                key={`${index}-${nota}`}
                className="whitespace-pre-line rounded-lg border border-gray-200 border-l-4 border-l-gray-400 bg-white px-4 py-3 shadow-sm"
              >
                <span className="font-semibold">{`Nota ${index + 1}:`}</span>{" "}
                {nota}
              </p>
            ))}
          </div>
        ) : null}

        <div className="flex justify-center border-t border-gray-200 px-5 pt-8 pb-2">
          <div className="w-full max-w-sm text-center">
            <div className="mx-auto mb-3 w-72 max-w-full border-t border-gray-300" />
            <p className="text-sm font-semibold text-gray-900">
              {aprobadoPor || "Pendiente de firmante"}
            </p>
            <p className="mt-1 text-[0.7rem] uppercase tracking-wide text-gray-500">
              {cargoAprobador || "Responsable PDA"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
