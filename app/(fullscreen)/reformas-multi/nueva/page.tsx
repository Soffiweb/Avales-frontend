"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Dialog, Transition } from "@headlessui/react";
import { useMutation } from "@tanstack/react-query";

import { useAuth } from "@/app/providers/auth-provider";
import AlertBanner from "@/components/ui/alert-banner";
import { getDirigido, listUsers, type DirigidoRole } from "@/lib/api/user";
import {
  createReformaMulti,
  MES_NOMBRES,
  MES_OPCIONES,
  getErrorMessage,
} from "@/lib/api/reforms-multi";
import { canCreateReforma, getNormalizedRoles } from "@/lib/auth/access";
import { canonicalizeRoleCode, getRoleCode, normalizeRoleCode } from "@/lib/auth/roles";
import { formatCurrency, formatGenero, formatRole } from "@/lib/utils/formatters";
import EventoItemsPanel, {
  type SelectedEvento,
} from "@/app/(app)/reformas-multi/_components/multi-event-selector";
import BalanceBar, { isBalanced } from "@/app/(app)/reformas-multi/_components/balance-bar";
import type { CreateReformaMultiPayload, FuentePresupuestoReforma } from "@/types/reforma-multi";

type Step = "form" | "confirm";

const DEFAULT_REQUEST_DE = "Lic. Miguel Vallejos Lara / Director del DTM";
const DEFAULT_REQUEST_PARA = "Lcda. Dayana Granda Armijos / Responsable del PDA";
const DEFAULT_FIRMA_REVISOR_NOMBRE = "LIC. CARLOS JERVES";
const DEFAULT_FIRMA_REVISOR_CARGO = "METODOLOGO";
const DEFAULT_FIRMA_APROBADOR_NOMBRE = "LCDA. DAYANA GRANDA ARMIJOS";
const DEFAULT_FIRMA_APROBADOR_CARGO = "RESPONSABLE DEL PDA";

function buildUserFullName(
  user?: {
    nombre?: string | null;
    apellido?: string | null;
  } | null,
) {
  return [user?.nombre, user?.apellido].filter(Boolean).join(" ").trim().toUpperCase();
}

function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function buildSolicitudDirigidaLabel(
  nombre?: string | null,
  apellido?: string | null,
  cargo?: string | null,
) {
  const fullName = [nombre, apellido].filter(Boolean).join(" ").trim();
  const roleLabel = cargo?.trim() ?? "";

  if (fullName && roleLabel) return `${fullName} / ${roleLabel}`;
  return fullName || roleLabel;
}

function parseSignatureLabel(value: string) {
  const [nombre = "", ...cargoParts] = value.split("/");
  return {
    nombre: nombre.trim().toUpperCase(),
    cargo: cargoParts.join("/").trim().toUpperCase(),
  };
}

function shouldAutofillSolicitudValue(currentValue: string, fallbackValue: string) {
  const normalized = currentValue.trim();
  return normalized === "" || normalized === fallbackValue;
}

type ResumenProps = {
  origenes: SelectedEvento[];
  destinos: SelectedEvento[];
  totalCortado: number;
  totalAsignado: number;
  balanced: boolean;
};

type ReformaPreviewInfoRow = {
  label: string;
  value: string;
  changed?: boolean;
};

type ReformaPreviewBudgetRow = {
  codigo: string;
  item: string;
  valor: string;
  changed?: boolean;
};

type MultiPreviewEventBlock = {
  eventoId: number;
  title: string;
  provincia: string;
  mesLabel: string;
  genero: string;
  entrenadores: number;
  deportistas: number;
  damas: number;
  varones: number;
  budgetRows: ReformaPreviewBudgetRow[];
  total: number;
};

function formatPreviewValue(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized.toUpperCase() : "-";
}

function ReformaPreviewInfoTable({
  title,
  rows,
}: {
  title: string;
  rows: ReformaPreviewInfoRow[];
}) {
  return (
    <div className="border border-slate-400">
      <div className="border-b border-slate-400 bg-slate-100 px-2 py-1 text-center text-[10px] font-bold uppercase tracking-wide text-slate-900">
        {title}
      </div>
      <div className="border-b border-slate-400 px-2 py-1 text-center text-[10px] font-bold uppercase text-slate-900">
        Datos informativos
      </div>
      <table className="w-full border-collapse text-[10px] text-slate-900">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="w-[34%] border-r border-t border-slate-400 px-2 py-1 font-bold uppercase">
                {row.label}
              </td>
              <td
                className={`border-t border-slate-400 px-2 py-1 uppercase ${
                  row.changed ? "bg-amber-50 font-semibold text-amber-900" : ""
                }`}
              >
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReformaPreviewBudgetTable({
  rows,
  total,
}: {
  rows: ReformaPreviewBudgetRow[];
  total: string;
}) {
  return (
    <div className="border border-slate-400 border-t-0">
      <div className="border-b border-slate-400 px-2 py-1 text-center text-[10px] font-bold uppercase text-slate-900">
        Presupuesto
      </div>
      <table className="w-full border-collapse text-[10px] text-slate-900">
        <thead>
          <tr className="bg-slate-100">
            <th className="w-[22%] border-r border-slate-400 px-1 py-1 text-left font-bold uppercase">
              Codigo
            </th>
            <th className="border-r border-slate-400 px-1 py-1 text-left font-bold uppercase">
              Item
            </th>
            <th className="w-[24%] px-1 py-1 text-right font-bold uppercase">
              Valor
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((row, index) => (
              <tr key={`${row.codigo}-${index}`}>
                <td className="border-r border-t border-slate-400 px-1 py-1 align-top">
                  {row.codigo}
                </td>
                <td
                  className={`border-r border-t border-slate-400 px-1 py-1 align-top ${
                    row.changed ? "bg-amber-50 font-semibold text-amber-900" : ""
                  }`}
                >
                  {row.item}
                </td>
                <td
                  className={`border-t border-slate-400 px-1 py-1 text-right align-top ${
                    row.changed ? "bg-amber-50 font-semibold text-amber-900" : ""
                  }`}
                >
                  {row.valor}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} className="border-t border-slate-400 px-2 py-3 text-center text-slate-500">
                Sin items presupuestarios
              </td>
            </tr>
          )}
          <tr className="bg-slate-50 font-bold">
            <td colSpan={2} className="border-r border-t border-slate-400 px-1 py-1 text-right uppercase">
              Valor total del evento
            </td>
            <td className="border-t border-slate-400 px-1 py-1 text-right">
              {total}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function ReformaPreviewSignature({
  nombre,
  cargo,
}: {
  nombre: string;
  cargo: string;
}) {
  return (
    <div className="pt-8 text-center text-[10px] uppercase text-slate-900">
      <div className="border-t border-slate-500 pt-1 font-semibold">
        {formatPreviewValue(nombre)}
      </div>
      <div className="font-bold">{formatPreviewValue(cargo)}</div>
    </div>
  );
}

function MultiEventoPreviewBlock({
  block,
  eventLabel,
  monthLabel,
}: {
  block: MultiPreviewEventBlock;
  eventLabel: string;
  monthLabel: string;
}) {
  return (
    <div className="border-b border-slate-400 last:border-b-0">
      <div className="border-b border-slate-400 px-2 py-1 text-center text-[10px] font-bold uppercase text-slate-900">
        Datos informativos
      </div>
      <table className="w-full border-collapse text-[10px] text-slate-900">
        <tbody>
          <tr>
            <td className="w-[34%] border-r border-t border-slate-400 px-2 py-1 font-bold uppercase">
              {eventLabel}
            </td>
            <td className="border-t border-slate-400 px-2 py-1 uppercase">{block.title}</td>
          </tr>
          <tr>
            <td className="border-r border-t border-slate-400 px-2 py-1 font-bold uppercase">
              Provincia
            </td>
            <td className="border-t border-slate-400 px-2 py-1 uppercase">{block.provincia}</td>
          </tr>
          <tr>
            <td className="border-r border-t border-slate-400 px-2 py-1 font-bold uppercase">
              {monthLabel}
            </td>
            <td className="border-t border-slate-400 px-2 py-1 uppercase">{block.mesLabel}</td>
          </tr>
          <tr>
            <td className="border-r border-t border-slate-400 px-2 py-1 font-bold uppercase">
              Género
            </td>
            <td className="border-t border-slate-400 px-2 py-1 uppercase">{block.genero}</td>
          </tr>
          <tr>
            <td className="border-r border-t border-slate-400 px-2 py-1 font-bold uppercase">
              N° de entrenadores
            </td>
            <td className="border-t border-slate-400 px-2 py-1 uppercase">{block.entrenadores}</td>
          </tr>
          <tr>
            <td className="border-r border-t border-slate-400 px-2 py-1 font-bold uppercase">
              N° de deportistas
            </td>
            <td className="border-t border-slate-400 px-2 py-1 uppercase">{block.deportistas}</td>
          </tr>
          <tr>
            <td className="border-r border-t border-slate-400 px-2 py-1 font-bold uppercase">
              Damas
            </td>
            <td className="border-t border-slate-400 px-2 py-1 uppercase">{block.damas}</td>
          </tr>
          <tr>
            <td className="border-r border-t border-slate-400 px-2 py-1 font-bold uppercase">
              Varones
            </td>
            <td className="border-t border-slate-400 px-2 py-1 uppercase">{block.varones}</td>
          </tr>
        </tbody>
      </table>

      <div className="border-t border-slate-400">
        <ReformaPreviewBudgetTable
          rows={block.budgetRows}
          total={formatCurrency(block.total)}
        />
      </div>
    </div>
  );
}

function MultiEventoPreviewColumn({
  title,
  blocks,
  monthLabel,
  totalLabel,
}: {
  title: string;
  blocks: MultiPreviewEventBlock[];
  monthLabel: string;
  totalLabel: string;
}) {
  return (
    <div className="border border-slate-400">
      <div className="border-b border-slate-400 bg-slate-100 px-2 py-1 text-center text-[10px] font-bold uppercase tracking-wide text-slate-900">
        {title}
      </div>
      {blocks.length > 0 ? (
        <>
          {blocks.map((block, index) => (
            <MultiEventoPreviewBlock
              key={block.eventoId}
              block={block}
              eventLabel={`Nombre evento ${index + 1}`}
              monthLabel={monthLabel}
            />
          ))}
          <div className="bg-slate-50 px-2 py-1 text-right text-[10px] font-bold uppercase text-slate-900">
            {totalLabel}: {formatCurrency(blocks.reduce((sum, block) => sum + block.total, 0))}
          </div>
        </>
      ) : (
        <div className="px-2 py-6 text-center text-[10px] text-slate-500">
          Sin eventos seleccionados
        </div>
      )}
    </div>
  );
}

function ResumenCambios({ origenes, destinos, totalCortado, totalAsignado, balanced }: ResumenProps) {
  const origenResumen = origenes
    .map((e) => ({
      ...e,
      delta: e.items.reduce((s, it) => s + Math.max(0, it.presupuesto - it.monto), 0),
    }))
    .filter((e) => e.delta > 0);

  const destinoResumen = destinos
    .map((e) => ({
      ...e,
      delta: e.items.reduce((s, it) => s + Math.max(0, it.monto - it.presupuesto), 0),
    }))
    .filter((e) => e.delta > 0);

  if (origenResumen.length === 0 && destinoResumen.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
        Resumen de cambios
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {origenResumen.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400">
              Recortes
            </p>
            <div className="space-y-1">
              {origenResumen.map((e) => (
                <div key={e.eventoId} className="flex justify-between text-sm">
                  <span
                    className="mr-3 overflow-hidden text-xs text-gray-700 dark:text-gray-300"
                    title={e.nombre}
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {e.nombre}
                  </span>
                  <span className="shrink-0 tabular-nums font-medium text-rose-600 dark:text-rose-400">
                    −{formatCurrency(e.delta)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between border-t border-gray-200 pt-1 text-xs font-semibold dark:border-gray-700">
                <span className="text-gray-500 dark:text-gray-400">Total recortado</span>
                <span className="tabular-nums text-rose-600 dark:text-rose-400">
                  −{formatCurrency(totalCortado)}
                </span>
              </div>
            </div>
          </div>
        )}

        {destinoResumen.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              Adiciones
            </p>
            <div className="space-y-1">
              {destinoResumen.map((e) => (
                <div key={e.eventoId} className="flex justify-between text-sm">
                  <span
                    className="mr-3 overflow-hidden text-xs text-gray-700 dark:text-gray-300"
                    title={e.nombre}
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {e.nombre}
                  </span>
                  <span className="shrink-0 tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                    +{formatCurrency(e.delta)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between border-t border-gray-200 pt-1 text-xs font-semibold dark:border-gray-700">
                <span className="text-gray-500 dark:text-gray-400">Total agregado</span>
                <span className="tabular-nums text-emerald-600 dark:text-emerald-400">
                  +{formatCurrency(totalAsignado)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {totalCortado > 0 && totalAsignado > 0 && (
        <div
          className={`mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 text-center text-sm font-semibold ${
            balanced
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          }`}
        >
          {balanced
            ? `✓ Bien distribuido — ${formatCurrency(totalCortado)} redistribuidos correctamente`
            : `✗ Diferencia de ${formatCurrency(Math.abs(totalCortado - totalAsignado))} — ajusta los montos`}
        </div>
      )}
    </div>
  );
}

export default function NuevaReformaMultiPage() {
  const { user } = useAuth();
  const router = useRouter();

  const roles = getNormalizedRoles(user);
  const isPda = roles.includes("PDA");
  const canCreate = canCreateReforma(user) || isPda;

  const [step, setStep] = useState<Step>("form");

  const [motivo, setMotivo] = useState("");
  const [de, setDe] = useState(DEFAULT_REQUEST_DE);
  const [para, setPara] = useState(DEFAULT_REQUEST_PARA);
  const [firmaCreadorNombre, setFirmaCreadorNombre] = useState(() => buildUserFullName(user));
  const [firmaCreadorCargo, setFirmaCreadorCargo] = useState("");
  const [firmaRevisorNombre, setFirmaRevisorNombre] = useState(DEFAULT_FIRMA_REVISOR_NOMBRE);
  const [firmaRevisorCargo, setFirmaRevisorCargo] = useState(DEFAULT_FIRMA_REVISOR_CARGO);
  const [firmaAprobadorNombre, setFirmaAprobadorNombre] = useState(
    DEFAULT_FIRMA_APROBADOR_NOMBRE,
  );
  const [firmaAprobadorCargo, setFirmaAprobadorCargo] = useState(
    DEFAULT_FIRMA_APROBADOR_CARGO,
  );
  const [mesEjecucion, setMesEjecucion] = useState<number | "">("");
  const [fuente, setFuente] = useState<FuentePresupuestoReforma | "">("");
  const [origenes, setOrigenes] = useState<SelectedEvento[]>([]);
  const [destinos, setDestinos] = useState<SelectedEvento[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [previewVisible, setPreviewVisible] = useState(true);

  useEffect(() => {
    function resolveUserRoleLabel(targetUser: NonNullable<typeof user>, targetRole: DirigidoRole) {
      const normalizedTarget = canonicalizeRoleCode(targetRole);

      const roleDetail = targetUser.rolesDetalle?.find(
        (role) => normalizeRoleCode(role.codigo) === normalizedTarget,
      );
      if (roleDetail?.nombre?.trim()) return roleDetail.nombre.trim();

      const matchingRole = targetUser.roles?.find((role) => {
        const code = normalizeRoleCode(getRoleCode(role));
        return canonicalizeRoleCode(code) === normalizedTarget;
      });
      if (matchingRole) {
        return formatRole(getRoleCode(matchingRole));
      }

      return formatRole(targetRole);
    }

    async function resolveSolicitudDirigidaLabel(role: DirigidoRole) {
      const dirigidoResponse = await getDirigido(role).catch(() => null);
      if (dirigidoResponse) {
        const label = buildSolicitudDirigidaLabel(
          dirigidoResponse.data?.nombre,
          dirigidoResponse.data?.apellido,
          dirigidoResponse.data?.cargo || formatRole(role),
        );
        if (label) return label;
      }

      try {
        const response = await listUsers({ role, page: 1, limit: 1 });
        const first = response.data?.[0];
        if (!first) return "";

        return buildSolicitudDirigidaLabel(
          first.nombre,
          first.apellido,
          resolveUserRoleLabel(first, role),
        );
      } catch {
        return "";
      }
    }

    let active = true;

    async function loadSolicitudDefaults() {
      const [dtmValue, metodologoValue, pdaValue] = await Promise.all([
        resolveSolicitudDirigidaLabel("DTM"),
        resolveSolicitudDirigidaLabel("METODOLOGO"),
        resolveSolicitudDirigidaLabel("PDA"),
      ]);

      if (!active) return;

      if (dtmValue) {
        setDe((current) =>
          shouldAutofillSolicitudValue(current, DEFAULT_REQUEST_DE) ? dtmValue : current,
        );
      }
      if (pdaValue) {
        setPara((current) =>
          shouldAutofillSolicitudValue(current, DEFAULT_REQUEST_PARA) ? pdaValue : current,
        );
      }

      const revisor = parseSignatureLabel(metodologoValue || dtmValue);
      setFirmaRevisorNombre(
        (current) => current || revisor.nombre || DEFAULT_FIRMA_REVISOR_NOMBRE,
      );
      setFirmaRevisorCargo(
        (current) => current || revisor.cargo || DEFAULT_FIRMA_REVISOR_CARGO,
      );

      const aprobador = parseSignatureLabel(pdaValue);
      setFirmaAprobadorNombre(
        (current) => current || aprobador.nombre || DEFAULT_FIRMA_APROBADOR_NOMBRE,
      );
      setFirmaAprobadorCargo(
        (current) => current || aprobador.cargo || DEFAULT_FIRMA_APROBADOR_CARGO,
      );
    }

    void loadSolicitudDefaults();

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    const creatorName = buildUserFullName(user);
    if (creatorName) {
      setFirmaCreadorNombre((current) => current || creatorName);
    }
  }, [user]);

  function handleOrigenesChange(updated: SelectedEvento[]) {
    setOrigenes(updated);
    setDestinos((current) =>
      current.filter(
        (destino) => !updated.some((origen) => origen.eventoId === destino.eventoId),
      ),
    );
  }

  function handleDestinosChange(updated: SelectedEvento[]) {
    setDestinos(updated);
    setOrigenes((current) =>
      current.filter(
        (origen) => !updated.some((destino) => destino.eventoId === origen.eventoId),
      ),
    );
  }

  const totalCortado = useMemo(
    () =>
      origenes
        .flatMap((e) => e.items)
        .reduce((s, it) => s + Math.max(0, it.presupuesto - it.monto), 0),
    [origenes],
  );

  const totalAsignado = useMemo(
    () =>
      destinos
        .flatMap((e) => e.items)
        .reduce((s, it) => s + Math.max(0, it.monto - it.presupuesto), 0),
    [destinos],
  );

  const balanced = isBalanced(totalCortado, totalAsignado);
  const hasBudgetChanges = totalCortado > 0 || totalAsignado > 0;
  const hasInformativeChanges =
    Boolean(de.trim()) ||
    Boolean(para.trim()) ||
    Boolean(motivo.trim()) ||
    typeof mesEjecucion === "number";

  const previewYear = useMemo(() => String(new Date().getFullYear()), []);

  const buildPreviewBlock = (
    evento: SelectedEvento,
    mode: "origen" | "destino",
  ): MultiPreviewEventBlock => {
    const budgetRows = evento.items.map((item) => ({
      codigo: String(item.itemId),
      item: formatPreviewValue(item.itemNombre),
      valor: formatCurrency(mode === "origen" ? item.presupuesto : item.monto),
      changed: item.presupuesto !== item.monto,
    }));

    const total = evento.items.reduce(
      (sum, item) => sum + (mode === "origen" ? item.presupuesto : item.monto),
      0,
    );

    return {
      eventoId: evento.eventoId,
      title: formatPreviewValue(evento.nombre),
      provincia: formatPreviewValue(
        [evento.ciudad, evento.provincia].filter(Boolean).join(" - "),
      ),
      mesLabel: formatPreviewValue(
        MES_NOMBRES[mesEjecucion || evento.mesProgramado || 0] ?? "-",
      ),
      genero: formatPreviewValue(formatGenero(evento.genero)),
      entrenadores:
        (evento.numEntrenadoresHombres ?? 0) + (evento.numEntrenadoresMujeres ?? 0),
      deportistas: (evento.numAtletasHombres ?? 0) + (evento.numAtletasMujeres ?? 0),
      damas: evento.numAtletasMujeres ?? 0,
      varones: evento.numAtletasHombres ?? 0,
      budgetRows,
      total,
    };
  };

  const originPreviewBlocks = useMemo(
    () => origenes.map((evento) => buildPreviewBlock(evento, "origen")),
    [origenes, mesEjecucion],
  );

  const destinationPreviewBlocks = useMemo(
    () => destinos.map((evento) => buildPreviewBlock(evento, "destino")),
    [destinos, mesEjecucion],
  );

  const hasMontoErrors = useMemo(
    () =>
      origenes.some((e) =>
        e.items.some(
          (it) => it.monto < 0 || (it.disponible > 0 && it.presupuesto - it.monto > it.disponible),
        ),
      ) ||
      destinos.some((e) => e.items.some((it) => it.monto < 0)),
    [origenes, destinos],
  );

  const mutation = useMutation({
    mutationFn: () => {
      const payload: CreateReformaMultiPayload = {
        motivo: motivo.trim(),
        de: optionalText(de),
        para: optionalText(para),
        firmaCreadorNombre: optionalText(firmaCreadorNombre),
        firmaCreadorCargo: optionalText(firmaCreadorCargo),
        firmaRevisorNombre: optionalText(firmaRevisorNombre),
        firmaRevisorCargo: optionalText(firmaRevisorCargo),
        firmaAprobadorNombre: optionalText(firmaAprobadorNombre),
        firmaAprobadorCargo: optionalText(firmaAprobadorCargo),
        mesEjecucion: Number(mesEjecucion),
        fuente: fuente as FuentePresupuestoReforma,
        eventosOrigen: origenes
          .map((e) => ({
            eventoId: e.eventoId,
            items: e.items
              .filter((it) => it.presupuesto - it.monto > 0)
              .map((it) => ({ itemId: it.itemId, mes: it.mes, monto: it.presupuesto - it.monto })),
          }))
          .filter((e) => e.items.length > 0),
        eventosDestino: destinos
          .map((e) => ({
            eventoId: e.eventoId,
            items: e.items
              .filter((it) => it.monto - it.presupuesto > 0)
              .map((it) => ({ itemId: it.itemId, mes: it.mes, monto: it.monto - it.presupuesto })),
          }))
          .filter((e) => e.items.length > 0),
      };
      return createReformaMulti(payload);
    },
    onSuccess: (res) => {
      const id = res.data?.id;
      router.push(id ? `/reformas-multi/${id}` : "/reformas-multi");
    },
    onError: (err) => {
      setFormError(getErrorMessage(err));
      setStep("form");
    },
  });

  if (!canCreate) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <AlertBanner
            variant="error"
            message="No tienes permiso para crear reformas multi-evento."
          />
          <Link
            href="/reformas-multi"
            className="mt-4 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a reformas
          </Link>
        </div>
      </div>
    );
  }

  function validateForm(): string | null {
    if (!de.trim()) return "El campo De es obligatorio.";
    if (!para.trim()) return "El campo Para es obligatorio.";
    if (!mesEjecucion) return "Selecciona el mes de ejecución.";
    if (!motivo.trim()) return "El motivo es obligatorio.";
    if (motivo.trim().length > 600) return "El motivo no puede superar los 600 caracteres.";
    if (!firmaCreadorNombre.trim()) return "La firma solicitante - nombre es obligatoria.";
    if (!firmaCreadorCargo.trim()) return "La firma solicitante - cargo es obligatoria.";
    if (!firmaAprobadorNombre.trim()) return "La firma aprobador - nombre es obligatoria.";
    if (!firmaAprobadorCargo.trim()) return "La firma aprobador - cargo es obligatoria.";
    if (!fuente) return "Selecciona la fuente presupuestaria.";
    if (origenes.length === 0) return "Debes seleccionar al menos un evento de origen.";
    if (destinos.length === 0) return "Debes seleccionar al menos un evento de destino.";
    if (origenes.some((e) => e.items.length === 0))
      return "Todos los eventos de origen deben tener al menos un ítem.";
    if (destinos.some((e) => e.items.length === 0))
      return "Todos los eventos de destino deben tener al menos un ítem.";
    if (origenes.every((e) => e.items.every((it) => it.presupuesto - it.monto <= 0)))
      return "Al menos un ítem de origen debe tener un recorte.";
    if (destinos.every((e) => e.items.every((it) => it.monto - it.presupuesto <= 0)))
      return "Al menos un ítem de destino debe recibir presupuesto.";
    if (!balanced) return "El total recortado debe ser igual al total asignado.";
    return null;
  }

  function handleContinue() {
    const err = validateForm();
    if (err) { setFormError(err); return; }
    setFormError(null);
    setStep("confirm");
  }

  const origenEventoIds = origenes.map((e) => e.eventoId);
  const destinoEventoIds = destinos.map((e) => e.eventoId);

  return (
    <div className="relative h-screen flex bg-white dark:bg-gray-950">
      <div
        className={`w-full overflow-y-auto ${
          previewVisible ? "lg:w-1/2 border-r border-gray-200 dark:border-gray-800" : ""
        }`}
      >
        <div
          className={`px-6 py-8 sm:px-8 space-y-6 ${
            previewVisible ? "mx-auto max-w-3xl" : "mx-auto max-w-6xl"
          }`}
        >
        {/* Nav + title */}
        <div className="max-w-3xl">
          <Link
            href="/reformas-multi"
            className="inline-flex items-center gap-2 text-sm text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a reformas multi-evento
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">
            Nueva reforma multi-evento
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Solicita una transferencia presupuestaria entre múltiples eventos.
          </p>
        </div>

        {formError ? (
          <div className="max-w-3xl">
            <AlertBanner
              variant="error"
              message={formError}
              onClose={() => setFormError(null)}
            />
          </div>
        ) : null}

        {/* Header form */}
        <div className="max-w-3xl space-y-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                De <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={de}
                onChange={(e) => setDe(e.target.value)}
                maxLength={255}
                className="form-input w-full border border-gray-300 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Para <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={para}
                onChange={(e) => setPara(e.target.value)}
                maxLength={255}
                className="form-input w-full border border-gray-300 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Mes de ejecución <span className="text-rose-500">*</span>
              </label>
              <select
                value={mesEjecucion}
                onChange={(e) =>
                  setMesEjecucion(e.target.value ? Number(e.target.value) : "")
                }
                className="form-select w-full border border-gray-300 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="">Selecciona un mes</option>
                {MES_OPCIONES.map((mes) => (
                  <option key={mes.value} value={mes.value}>
                    {mes.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Motivo <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              maxLength={600}
              className="form-textarea w-full border border-gray-300 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              placeholder="Describe el motivo de la reforma..."
            />
            <p className="mt-1 text-right text-xs text-gray-400">{motivo.length}/600</p>
          </div>

          <section className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-900/30">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Firmas del documento
              </h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Estos datos se usarán para las tres firmas del documento.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Firma solicitante - nombre <span className="text-rose-500">*</span>
                </span>
                <input
                  type="text"
                  value={firmaCreadorNombre}
                  onChange={(e) => setFirmaCreadorNombre(e.target.value)}
                  maxLength={255}
                  className="form-input w-full border border-gray-300 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Firma solicitante - cargo <span className="text-rose-500">*</span>
                </span>
                <input
                  type="text"
                  value={firmaCreadorCargo}
                  onChange={(e) => setFirmaCreadorCargo(e.target.value)}
                  maxLength={255}
                  className="form-input w-full border border-gray-300 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Firma solicitante - nombre
                </span>
                <input
                  type="text"
                  value={firmaRevisorNombre}
                  onChange={(e) => setFirmaRevisorNombre(e.target.value)}
                  maxLength={255}
                  className="form-input w-full border border-gray-300 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Firma solicitante - cargo
                </span>
                <input
                  type="text"
                  value={firmaRevisorCargo}
                  onChange={(e) => setFirmaRevisorCargo(e.target.value)}
                  maxLength={255}
                  className="form-input w-full border border-gray-300 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Firma aprobador - nombre <span className="text-rose-500">*</span>
                </span>
                <input
                  type="text"
                  value={firmaAprobadorNombre}
                  onChange={(e) => setFirmaAprobadorNombre(e.target.value)}
                  maxLength={255}
                  className="form-input w-full border border-gray-300 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Firma aprobador - cargo <span className="text-rose-500">*</span>
                </span>
                <input
                  type="text"
                  value={firmaAprobadorCargo}
                  onChange={(e) => setFirmaAprobadorCargo(e.target.value)}
                  maxLength={255}
                  className="form-input w-full border border-gray-300 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </label>
            </div>
          </section>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Fuente presupuestaria <span className="text-rose-500">*</span>
            </label>
            <select
              value={fuente}
              onChange={(e) => {
                setFuente((e.target.value as FuentePresupuestoReforma) || "");
                setOrigenes([]);
                setDestinos([]);
              }}
              className="form-select w-full border border-gray-300 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="">Selecciona una fuente</option>
              <option value="FONDOS_PUBLICOS">Fondos Públicos</option>
              <option value="AUTOGESTION">Autogestión</option>
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              La reforma solo mueve valores dentro de la fuente elegida. Si el evento destino ya
              tiene ese ítem en otra fuente, se creará una línea separada para esta fuente.
            </p>
          </div>
        </div>

        {/* Two-column panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-rose-200 bg-white p-5 shadow-sm dark:border-rose-900/40 dark:bg-gray-800">
            <EventoItemsPanel
              label="Orígenes — se reducirá su presupuesto"
              fuente={fuente}
              selected={origenes}
              onChange={handleOrigenesChange}
              mode="origen"
              defaultMes={mesEjecucion}
              excludeEventoIds={destinoEventoIds}
            />
          </div>

          <div className="rounded-xl border border-emerald-200 bg-white p-5 shadow-sm dark:border-emerald-900/40 dark:bg-gray-800">
            <EventoItemsPanel
              label="Destinos — recibirán presupuesto"
              fuente={fuente}
              selected={destinos}
              onChange={handleDestinosChange}
              mode="destino"
              defaultMes={mesEjecucion}
              highlightEventoIds={origenEventoIds}
              excludeEventoIds={origenEventoIds}
            />
          </div>
        </div>

        {/* Resumen de cambios */}
        <ResumenCambios
          origenes={origenes}
          destinos={destinos}
          totalCortado={totalCortado}
          totalAsignado={totalAsignado}
          balanced={balanced}
        />

        {/* Balance */}
        <BalanceBar totalCortado={totalCortado} totalAsignado={totalAsignado} />

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link
            href="/reformas-multi"
            className="btn border-gray-200 text-gray-700 hover:border-gray-300 dark:border-gray-700/60 dark:text-gray-200 dark:hover:border-gray-600"
          >
            Cancelar
          </Link>
          <button
            type="button"
            disabled={!balanced || hasMontoErrors || mutation.isPending}
            onClick={handleContinue}
            className="btn bg-indigo-600 text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continuar
          </button>
        </div>
        </div>
      </div>

      <aside
        className={`${previewVisible ? "hidden lg:block lg:w-1/2" : "hidden"} overflow-y-auto bg-slate-100 dark:bg-slate-900`}
      >
        <div className="p-8">
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Preview referencial
                  </p>
                  <h3 className="mt-1 text-lg font-bold uppercase text-slate-900">
                    Solicitud Reforma Eventos {previewYear}
                  </h3>
                </div>
                <div className="text-right text-[10px] uppercase text-slate-500">
                  <div>{fuente === "FONDOS_PUBLICOS" ? "Fondos Públicos" : fuente === "AUTOGESTION" ? "Autogestión" : "Sin fuente"}</div>
                  <div>{hasInformativeChanges ? "Datos informativos: X" : "Datos informativos: -"}</div>
                  <div>{hasBudgetChanges ? "Presupuesto: X" : "Presupuesto: -"}</div>
                </div>
              </div>

              <div className="border border-slate-400">
                <div className="grid grid-cols-[88px_1fr] border-b border-slate-400 text-[10px] uppercase text-slate-900">
                  <div className="border-r border-slate-400 px-2 py-1 font-bold">De:</div>
                  <div className="px-2 py-1">{formatPreviewValue(de)}</div>
                </div>
                <div className="grid grid-cols-[88px_1fr] text-[10px] uppercase text-slate-900">
                  <div className="border-r border-slate-400 px-2 py-1 font-bold">Para:</div>
                  <div className="px-2 py-1">{formatPreviewValue(para)}</div>
                </div>
              </div>

              <div className="mt-3 border border-slate-400 text-[10px] uppercase text-slate-900">
                <div className="grid grid-cols-[1.8fr_56px_1fr_56px]">
                  <div className="border-r border-slate-400 px-2 py-1 font-bold">
                    Motivo de la reforma: (marcar con una x)
                  </div>
                  <div className="border-r border-slate-400 px-2 py-1 text-center">
                    {hasInformativeChanges ? "X" : ""}
                  </div>
                  <div className="border-r border-slate-400 px-2 py-1 font-bold">
                    Presupuesto
                  </div>
                  <div className="px-2 py-1 text-center">{hasBudgetChanges ? "X" : ""}</div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-[1fr_52px_1fr] gap-0">
                <div>
                  <MultiEventoPreviewColumn
                    title="PDA aprobado"
                    blocks={originPreviewBlocks}
                    monthLabel="Mes planificado"
                    totalLabel={`Valor total ${originPreviewBlocks.length} eventos`}
                  />
                </div>

                <div className="flex items-center justify-center border-y border-slate-400 bg-slate-50 text-center text-[11px] font-bold uppercase tracking-wide text-slate-900">
                  Por
                </div>

                <div>
                  <MultiEventoPreviewColumn
                    title="Evento a aprobar en el PDA"
                    blocks={destinationPreviewBlocks}
                    monthLabel="Mes de ejecución"
                    totalLabel={`Valor total ${destinationPreviewBlocks.length} eventos`}
                  />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-6">
                <ReformaPreviewSignature
                  nombre={firmaCreadorNombre}
                  cargo={firmaCreadorCargo}
                />
                <ReformaPreviewSignature
                  nombre={firmaRevisorNombre}
                  cargo={firmaRevisorCargo}
                />
                <ReformaPreviewSignature
                  nombre={firmaAprobadorNombre}
                  cargo={firmaAprobadorCargo}
                />
              </div>

              <div className="mt-6 text-[10px] font-bold uppercase text-slate-900">
                Loja, fecha de emisión
              </div>

              <p className="mt-4 text-[11px] text-slate-500">
                Vista referencial. El Excel final puede ajustar anchos, saltos y formato exacto.
              </p>
            </div>
          </div>
        </div>
      </aside>

      <div
        className={`hidden lg:block absolute top-8 z-20 transition-all duration-200 ${
          previewVisible ? "left-1/2 -translate-x-1/2" : "right-6"
        }`}
      >
        <button
          type="button"
          onClick={() => setPreviewVisible((current) => !current)}
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-300 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-gray-600 dark:hover:text-gray-100"
        >
          {previewVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {previewVisible ? "Ocultar preview" : "Mostrar preview"}
        </button>
      </div>

      {/* Confirm modal */}
      <Transition.Root show={step === "confirm"} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          role="dialog"
          onClose={() => { if (!mutation.isPending) setStep("form"); }}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 translate-y-2 scale-95"
                enterTo="opacity-100 translate-y-0 scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 translate-y-0 scale-100"
                leaveTo="opacity-0 translate-y-2 scale-95"
              >
                <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-xl border border-gray-200 bg-white text-left align-middle shadow-xl transition-all dark:border-gray-700/60 dark:bg-gray-800">
                  <div className="space-y-4 px-6 py-5">
                    <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Confirmar solicitud
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-gray-600 dark:text-gray-300">
                      Revisa el resumen antes de enviar la reforma.
                    </Dialog.Description>

                    <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-700 dark:bg-gray-900/40">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Motivo</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {motivo.trim()}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">De</p>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {de.trim() || "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Para</p>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {para.trim() || "-"}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Mes</p>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {mesEjecucion ? (MES_NOMBRES[mesEjecucion] ?? String(mesEjecucion)) : "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Fuente</p>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {fuente === "FONDOS_PUBLICOS"
                              ? "Fondos Públicos"
                              : fuente === "AUTOGESTION"
                                ? "Autogestión"
                                : "-"}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Firma solicitante
                          </p>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {firmaCreadorNombre.trim() || "-"}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {firmaCreadorCargo.trim() || "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Firma revisor
                          </p>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {firmaRevisorNombre.trim() || "-"}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {firmaRevisorCargo.trim() || "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Firma aprobador
                          </p>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {firmaAprobadorNombre.trim() || "-"}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {firmaAprobadorCargo.trim() || "-"}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400">
                          Orígenes
                        </p>
                        <div className="space-y-2">
                          {origenes.map((e) => {
                            const total = e.items.reduce((s, it) => s + it.monto, 0);
                            return (
                              <div key={e.eventoId}>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="truncate font-medium text-gray-700 dark:text-gray-300">
                                    {e.nombre} ({e.codigo})
                                  </span>
                                  <span className="ml-2 shrink-0 font-semibold text-rose-600 dark:text-rose-400">
                                    -{formatCurrency(total)}
                                  </span>
                                </div>
                                <div className="mt-0.5 pl-2 space-y-0.5">
                                  {e.items.map((it) => (
                                    <div
                                      key={`${it.itemId}-${it.mes}-${it.fuente}`}
                                      className="flex justify-between text-[0.65rem] text-gray-500 dark:text-gray-400"
                                    >
                                      <span>
                                        {it.itemNombre} · {MES_NOMBRES[it.mes]} ·{" "}
                                        {it.fuente === "FONDOS_PUBLICOS"
                                          ? "Fondos Públicos"
                                          : "Autogestión"}
                                      </span>
                                      <span>-{formatCurrency(it.monto)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                          <div className="flex justify-between border-t border-gray-200 pt-1 text-xs font-semibold dark:border-gray-700">
                            <span className="text-gray-500 dark:text-gray-400">Total cortado</span>
                            <span className="text-rose-600 dark:text-rose-400">
                              -{formatCurrency(totalCortado)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                          Destinos
                        </p>
                        <div className="space-y-2">
                          {destinos.map((e) => {
                            const total = e.items.reduce((s, it) => s + it.monto, 0);
                            return (
                              <div key={e.eventoId}>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="truncate font-medium text-gray-700 dark:text-gray-300">
                                    {e.nombre} ({e.codigo})
                                  </span>
                                  <span className="ml-2 shrink-0 font-semibold text-emerald-600 dark:text-emerald-400">
                                    +{formatCurrency(total)}
                                  </span>
                                </div>
                                <div className="mt-0.5 pl-2 space-y-0.5">
                                  {e.items.map((it) => (
                                    <div
                                      key={`${it.itemId}-${it.mes}-${it.fuente}`}
                                      className="flex justify-between text-[0.65rem] text-gray-500 dark:text-gray-400"
                                    >
                                      <span>
                                        {it.itemNombre} · {MES_NOMBRES[it.mes]} ·{" "}
                                        {it.fuente === "FONDOS_PUBLICOS"
                                          ? "Fondos Públicos"
                                          : "Autogestión"}
                                      </span>
                                      <span>+{formatCurrency(it.monto)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                          <div className="flex justify-between border-t border-gray-200 pt-1 text-xs font-semibold dark:border-gray-700">
                            <span className="text-gray-500 dark:text-gray-400">Total asignado</span>
                            <span className="text-emerald-600 dark:text-emerald-400">
                              +{formatCurrency(totalAsignado)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50/60 px-6 py-4 dark:border-gray-700/60 dark:bg-gray-900/30">
                    <button
                      type="button"
                      className="btn border-gray-200 text-gray-700 hover:border-gray-300 dark:border-gray-700/60 dark:text-gray-200 dark:hover:border-gray-600"
                      onClick={() => setStep("form")}
                      disabled={mutation.isPending}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn bg-indigo-600 text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => mutation.mutate()}
                      disabled={mutation.isPending}
                    >
                      {mutation.isPending ? "Enviando..." : "Confirmar y enviar"}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </div>
  );
}
