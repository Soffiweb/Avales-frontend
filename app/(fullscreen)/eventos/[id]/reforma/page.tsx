"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ClipboardEdit,
  DollarSign,
  FileText,
  Loader2,
  Paperclip,
  Plus,
  Save,
  Trash2,
  Users,
  X,
} from "lucide-react";

import AlertBanner from "@/components/ui/alert-banner";
import { useAuth } from "@/app/providers/auth-provider";
import { canCreateReforma } from "@/lib/auth/access";
import { canonicalizeRoleCode, getRoleCode, normalizeRoleCode } from "@/lib/auth/roles";
import { ApiError } from "@/lib/api/client";
import { getItemsPresupuestarios } from "@/lib/api/catalog";
import { getEvento } from "@/lib/api/eventos";
import { createReform, uploadReformAdjuntos } from "@/lib/api/reforms";
import { getDirigido, listUsers, type DirigidoRole } from "@/lib/api/user";
import type { User } from "@/types/user";
import type { CatalogItemPresupuestario } from "@/types/catalog";
import type { Evento, EventoItem, FormaParticipacionCupos } from "@/types/evento";
import { formatCurrency, formatDateInput, formatGenero, formatRole } from "@/lib/utils/formatters";
import {
  EVENTO_ALCANCE_OPTIONS,
  EVENTO_TAREA_OPTIONS,
  getTipoAvalLabel,
  normalizeEventoAlcance,
  normalizeEventoTipoEvento,
} from "@/lib/constants";

type WizardStep = 1 | 2;

type GeneralForm = {
  nombre: string;
  tipoEvento: string;
  alcance: string;
  lugar: string;
  ciudad: string;
  provincia: string;
  pais: string;
  mesProgramado: number | "";
  fechaInicio: string;
  fechaFin: string;
};

type ParticipantsForm = {
  numAtletasHombres: number;
  numAtletasMujeres: number;
  numEntrenadoresHombres: number;
  numEntrenadoresMujeres: number;
};

type BudgetRow = {
  localId: string;
  sourceId?: number;
  itemId?: number;
  itemNumero: number | "";
  mes: number;
  presupuesto: string;
  status: "existing" | "new" | "removed";
};

const MONTH_OPTIONS = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
] as const;

const MAX_ADJUNTOS_REFORMA = 2;
const MAX_ADJUNTO_REFORMA_BYTES = 5 * 1024 * 1024;
const ALLOWED_ADJUNTO_REFORMA_EXTENSIONS = new Set([
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "xlsx",
  "xls",
  "csv",
]);
const DEFAULT_REQUEST_DE = "Lic. Miguel Vallejos Lara / Director del DTM";
const DEFAULT_REQUEST_PARA = "Lcda. Dayana Granda Armijos / Responsable del PDA";
const DEFAULT_FIRMA_CREADOR_CARGO_PREFIX = "ENTRENADOR DE";
const DEFAULT_FIRMA_CREADOR_CARGO_SUFFIX = "DE FDPL";
const DEFAULT_FIRMA_REVISOR_NOMBRE = "LIC. CARLOS JERVES";
const DEFAULT_FIRMA_REVISOR_CARGO = "METODOLOGO";
const DEFAULT_FIRMA_APROBADOR_NOMBRE = "LCDA. DAYANA GRANDA ARMIJOS";
const DEFAULT_FIRMA_APROBADOR_CARGO = "RESPONSABLE DEL PDA";

type SignatureFields = {
  nombre: string;
  cargo: string;
};

function getInitialBudgetRows(items: EventoItem[] = []): BudgetRow[] {
  return items.map((item) => ({
    localId: `existing-${item.id}`,
    sourceId: item.id,
    itemId: item.item.id,
    itemNumero: item.item.numero ?? "",
    mes: item.mes ?? 1,
    presupuesto: item.presupuesto ?? "0",
    status: "existing",
  }));
}

function buildInitialGeneralForm(evento: Evento): GeneralForm {
  return {
    nombre: evento.nombre ?? "",
    tipoEvento:
      normalizeEventoTipoEvento(evento.tipoEvento) ?? evento.tipoEvento ?? "",
    alcance: normalizeEventoAlcance(evento.alcance) ?? evento.alcance ?? "",
    lugar: evento.lugar ?? "",
    ciudad: evento.ciudad ?? "",
    provincia: evento.provincia ?? "",
    pais: evento.pais ?? "",
    mesProgramado: evento.mesProgramado ?? "",
    fechaInicio: formatDateInput(evento.fechaInicio),
    fechaFin: formatDateInput(evento.fechaFin),
  };
}

function getBudgetReformFormas(evento: Evento): FormaParticipacionCupos[] {
  return (evento.formasParticipacion ?? []).filter(
    (forma) =>
      forma.tipoAval === "FONDOS_PUBLICOS" ||
      forma.tipoAval === "AUTOGESTION",
  );
}

function getFormaBudgetItems(
  evento: Evento,
  forma?: FormaParticipacionCupos | null,
): EventoItem[] {
  if (!forma) return [];
  if ((forma.items?.length ?? 0) > 0) return forma.items ?? [];

  if (forma.tipoAval === "FONDOS_PUBLICOS" || forma.tipoAval === "AUTOGESTION") {
    return (evento.eventoItems ?? []).filter(
      (item) => item.fuente === forma.tipoAval,
    );
  }

  return [];
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

function parseSignatureLabel(value: string): SignatureFields {
  const [nombre = "", ...cargoParts] = value.split("/");
  return {
    nombre: nombre.trim().toUpperCase(),
    cargo: cargoParts.join("/").trim().toUpperCase(),
  };
}

function buildUserFullName(user?: User | null) {
  return [user?.nombre, user?.apellido].filter(Boolean).join(" ").trim();
}

function buildCreatorSignatureCargo(evento?: Evento | null) {
  const disciplina = evento?.disciplina?.nombre?.trim();
  return disciplina
    ? `${DEFAULT_FIRMA_CREADOR_CARGO_PREFIX} ${disciplina.toUpperCase()} ${DEFAULT_FIRMA_CREADOR_CARGO_SUFFIX}`
    : "";
}

function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function resolveUserRoleLabel(user: User, targetRole: DirigidoRole) {
  const normalizedTarget = canonicalizeRoleCode(targetRole);

  const roleDetail = user.rolesDetalle?.find(
    (role) => normalizeRoleCode(role.codigo) === normalizedTarget,
  );
  if (roleDetail?.nombre?.trim()) return roleDetail.nombre.trim();

  const matchingRole = user.roles?.find((role) => {
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

function shouldAutofillSolicitudValue(
  currentValue: string,
  fallbackValue: string,
) {
  const normalized = currentValue.trim();
  return normalized === "" || normalized === fallbackValue;
}

function getReformFormas(evento: Evento): FormaParticipacionCupos[] {
  return evento.formasParticipacion ?? [];
}

function getBudgetRowsChanged(
  rows: BudgetRow[],
  originalItems: EventoItem[] = [],
) {
  const activeRows = rows.filter((row) => row.status !== "removed");

  if (activeRows.length !== originalItems.length) return true;

  return activeRows.some((row) => {
    const originalItem = originalItems.find((item) => item.id === row.sourceId);
    if (!originalItem) return true;

    return (
      originalItem.item.id !== row.itemId ||
      originalItem.mes !== row.mes ||
      (Number.parseFloat(originalItem.presupuesto) || 0) !==
        (Number.parseFloat(row.presupuesto) || 0)
    );
  });
}

function buildInitialParticipantsForm(
  evento: Evento,
  forma?: FormaParticipacionCupos | null,
): ParticipantsForm {
  if (forma) {
    return {
      numAtletasHombres: forma.numAtletasHombres ?? 0,
      numAtletasMujeres: forma.numAtletasMujeres ?? 0,
      numEntrenadoresHombres: forma.numEntrenadoresHombres ?? 0,
      numEntrenadoresMujeres: forma.numEntrenadoresMujeres ?? 0,
    };
  }

  return {
    numAtletasHombres: evento.numAtletasHombres ?? 0,
    numAtletasMujeres: evento.numAtletasMujeres ?? 0,
    numEntrenadoresHombres: evento.numEntrenadoresHombres ?? 0,
    numEntrenadoresMujeres: evento.numEntrenadoresMujeres ?? 0,
  };
}

function getBudgetTotal(rows: BudgetRow[]) {
  return rows
    .filter((row) => row.status !== "removed")
    .reduce((acc, row) => acc + (Number.parseFloat(row.presupuesto) || 0), 0);
}

function normalizeTextValue(value?: string | null) {
  return value?.trim() ?? "";
}

function hasSummaryChange(previous: string | number | null | undefined, next: string | number | null | undefined) {
  return normalizeTextValue(String(previous ?? "")) !== normalizeTextValue(String(next ?? ""));
}

function getRequiredStepOneFields(input: {
  requestReason: string;
  firmaCreadorNombre: string;
  firmaCreadorCargo: string;
  firmaRevisorNombre: string;
  firmaRevisorCargo: string;
  firmaAprobadorNombre: string;
  firmaAprobadorCargo: string;
  mesEjecucion: number | "";
}) {
  const missing: string[] = [];

  if (typeof input.mesEjecucion !== "number") missing.push("Mes de ejecución");
  if (!input.requestReason.trim()) missing.push("Motivo");
  if (!input.firmaCreadorNombre.trim()) missing.push("Firma solicitante - nombre");
  if (!input.firmaCreadorCargo.trim()) missing.push("Firma solicitante - cargo");
  if (!input.firmaAprobadorNombre.trim()) missing.push("Firma aprobador - nombre");
  if (!input.firmaAprobadorCargo.trim()) missing.push("Firma aprobador - cargo");

  return missing;
}

function StepBadge({
  step,
  label,
  active,
  completed,
  onClick,
}: {
  step: number;
  label: string;
  active: boolean;
  completed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-3 text-left"
    >
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition-colors ${
          active
            ? "border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900"
            : completed
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
            : "border-gray-200 bg-white text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
        }`}
      >
        {completed && !active ? <CheckCircle2 className="h-5 w-5" /> : step}
      </span>
      <span className="hidden text-sm font-medium text-gray-700 dark:text-gray-200 sm:block">
        {label}
      </span>
    </button>
  );
}

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

function getMonthLabel(value?: number | "" | null) {
  if (typeof value !== "number") return "-";
  return MONTH_OPTIONS.find((option) => option.value === value)?.label.toUpperCase() ?? "-";
}

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

export default function EventoReformaPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const id = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [evento, setEvento] = useState<Evento | null>(null);
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [generalForm, setGeneralForm] = useState<GeneralForm | null>(null);
  const [participantsForm, setParticipantsForm] = useState<ParticipantsForm | null>(
    null,
  );
  const [selectedFormaId, setSelectedFormaId] = useState<number | "">("");
  const [budgetRows, setBudgetRows] = useState<BudgetRow[]>([]);
  const [expandedBudgetRows, setExpandedBudgetRows] = useState<string[]>([]);
  const [requestReason, setRequestReason] = useState("");
  const [requestDe, setRequestDe] = useState(DEFAULT_REQUEST_DE);
  const [requestPara, setRequestPara] = useState(DEFAULT_REQUEST_PARA);
  const [firmaCreadorNombre, setFirmaCreadorNombre] = useState("");
  const [firmaCreadorCargo, setFirmaCreadorCargo] = useState("");
  const [firmaRevisorNombre, setFirmaRevisorNombre] = useState("");
  const [firmaRevisorCargo, setFirmaRevisorCargo] = useState("");
  const [firmaAprobadorNombre, setFirmaAprobadorNombre] = useState("");
  const [firmaAprobadorCargo, setFirmaAprobadorCargo] = useState("");
  const [requestObservation, setRequestObservation] = useState("");
  const [mesEjecucion, setMesEjecucion] = useState<number | "">("");
  const [adjuntosReforma, setAdjuntosReforma] = useState<File[]>([]);
  const [adjuntosWarning, setAdjuntosWarning] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [itemsCatalogo, setItemsCatalogo] = useState<CatalogItemPresupuestario[]>([]);

  useEffect(() => {
    if (!id || Number.isNaN(id)) {
      setError("ID de evento inválido.");
      setLoading(false);
      return;
    }

    async function loadEvento() {
      try {
        setLoading(true);
        setError(null);
        const [response, itemsResponse] = await Promise.all([
          getEvento(id),
          getItemsPresupuestarios(),
        ]);
        const eventData = response.data;
        setEvento(eventData);
        setItemsCatalogo(itemsResponse.data ?? []);
        setGeneralForm(buildInitialGeneralForm(eventData));
        setMesEjecucion(eventData.mesProgramado ?? "");
        const formas = getReformFormas(eventData);
        const budgetFormas = getBudgetReformFormas(eventData);
        const initialForma =
          formas.length === 1
            ? formas[0]
            : budgetFormas.length === 1
              ? budgetFormas[0]
              : null;
        setParticipantsForm(buildInitialParticipantsForm(eventData, initialForma));
        setSelectedFormaId(initialForma?.id ?? "");
        setBudgetRows(getInitialBudgetRows(getFormaBudgetItems(eventData, initialForma)));
        setExpandedBudgetRows([]);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "No se pudo cargar el evento.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadEvento();
  }, [id]);

  useEffect(() => {
    let active = true;

    async function loadSolicitudDefaults() {
      const [dtmValue, metodologoValue, pdaValue] = await Promise.all([
        resolveSolicitudDirigidaLabel("DTM"),
        resolveSolicitudDirigidaLabel("METODOLOGO"),
        resolveSolicitudDirigidaLabel("PDA"),
      ]);

      if (!active) return;

      if (dtmValue) {
        setRequestDe((prev) =>
          shouldAutofillSolicitudValue(prev, DEFAULT_REQUEST_DE) ? dtmValue : prev,
        );
      }
      if (pdaValue) {
        setRequestPara((prev) =>
          shouldAutofillSolicitudValue(prev, DEFAULT_REQUEST_PARA)
            ? pdaValue
            : prev,
        );
      }
      const revisor = parseSignatureLabel(metodologoValue || dtmValue);
      setFirmaRevisorNombre(
        (prev) => prev || revisor.nombre || DEFAULT_FIRMA_REVISOR_NOMBRE,
      );
      setFirmaRevisorCargo(
        (prev) => prev || revisor.cargo || DEFAULT_FIRMA_REVISOR_CARGO,
      );

      const aprobador = parseSignatureLabel(pdaValue);
      setFirmaAprobadorNombre(
        (prev) => prev || aprobador.nombre || DEFAULT_FIRMA_APROBADOR_NOMBRE,
      );
      setFirmaAprobadorCargo(
        (prev) => prev || aprobador.cargo || DEFAULT_FIRMA_APROBADOR_CARGO,
      );
    }

    void loadSolicitudDefaults();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const creatorName = buildUserFullName(user).toUpperCase();
    const creatorCargo = buildCreatorSignatureCargo(evento);

    if (creatorName) {
      setFirmaCreadorNombre((prev) => prev || creatorName);
    }
    if (creatorCargo) {
      setFirmaCreadorCargo((prev) => prev || creatorCargo);
    }
  }, [evento, user]);

  const reformFormas = useMemo(
    () => (evento ? getReformFormas(evento) : []),
    [evento],
  );
  const budgetFormas = useMemo(
    () => (evento ? getBudgetReformFormas(evento) : []),
    [evento],
  );
  const selectedForma = useMemo(
    () => reformFormas.find((forma) => forma.id === selectedFormaId) ?? null,
    [reformFormas, selectedFormaId],
  );
  const selectedBudgetForma = useMemo(
    () =>
      selectedForma &&
      (selectedForma.tipoAval === "FONDOS_PUBLICOS" ||
        selectedForma.tipoAval === "AUTOGESTION")
        ? selectedForma
        : null,
    [selectedForma],
  );
  const originalBudgetTotal = useMemo(
    () =>
      (evento ? getFormaBudgetItems(evento, selectedBudgetForma) : []).reduce(
        (sum, item) => sum + (Number.parseFloat(item.presupuesto) || 0),
        0,
      ),
    [evento, selectedBudgetForma],
  );
  const proposedBudgetTotal = useMemo(() => getBudgetTotal(budgetRows), [budgetRows]);
  const generalSummaryRows = useMemo(
    () => [
      {
        label: "Nombre",
        previous: evento?.nombre ?? "-",
        next: generalForm?.nombre ?? "-",
      },
      {
        label: "Tipo de evento",
        previous:
          EVENTO_TAREA_OPTIONS.find(
            (option) =>
              option.value ===
              (normalizeEventoTipoEvento(evento?.tipoEvento) ?? evento?.tipoEvento),
          )?.label ??
          evento?.tipoEvento ??
          "-",
        next:
          EVENTO_TAREA_OPTIONS.find(
            (option) => option.value === (generalForm?.tipoEvento ?? ""),
          )?.label ??
          generalForm?.tipoEvento ??
          "-",
      },
      {
        label: "Alcance",
        previous:
          EVENTO_ALCANCE_OPTIONS.find(
            (option) =>
              option.value ===
              (normalizeEventoAlcance(evento?.alcance) ?? evento?.alcance),
          )?.label ??
          evento?.alcance ??
          "-",
        next:
          EVENTO_ALCANCE_OPTIONS.find(
            (option) => option.value === (generalForm?.alcance ?? ""),
          )?.label ??
          generalForm?.alcance ??
          "-",
      },
      {
        label: "Lugar",
        previous: evento?.lugar ?? "-",
        next: generalForm?.lugar ?? "-",
      },
      {
        label: "Ciudad",
        previous: evento?.ciudad ?? "-",
        next: generalForm?.ciudad ?? "-",
      },
      {
        label: "Provincia",
        previous: evento?.provincia ?? "-",
        next: generalForm?.provincia ?? "-",
      },
      {
        label: "País",
        previous: evento?.pais ?? "-",
        next: generalForm?.pais ?? "-",
      },
      {
        label: "Mes programación",
        previous:
          MONTH_OPTIONS.find((option) => option.value === (evento?.mesProgramado ?? 0))
            ?.label ?? "-",
        next:
          MONTH_OPTIONS.find((option) => option.value === (generalForm?.mesProgramado || 0))
            ?.label ?? "-",
      },
      {
        label: "Fecha inicio",
        previous: formatDateInput(evento?.fechaInicio),
        next: generalForm?.fechaInicio ?? "-",
      },
      {
        label: "Fecha fin",
        previous: formatDateInput(evento?.fechaFin),
        next: generalForm?.fechaFin ?? "-",
      },
    ].filter((row) => hasSummaryChange(row.previous, row.next)),
    [evento, generalForm],
  );
  const delegationSummaryRows = useMemo(
    () => [
      {
        label: "Atletas hombres",
        previous: selectedForma?.numAtletasHombres ?? evento?.numAtletasHombres ?? 0,
        next: participantsForm?.numAtletasHombres ?? 0,
      },
      {
        label: "Atletas mujeres",
        previous: selectedForma?.numAtletasMujeres ?? evento?.numAtletasMujeres ?? 0,
        next: participantsForm?.numAtletasMujeres ?? 0,
      },
      {
        label: "Entrenadores/otros hombres",
        previous:
          selectedForma?.numEntrenadoresHombres ??
          evento?.numEntrenadoresHombres ??
          0,
        next: participantsForm?.numEntrenadoresHombres ?? 0,
      },
      {
        label: "Entrenadores/otros mujeres",
        previous:
          selectedForma?.numEntrenadoresMujeres ??
          evento?.numEntrenadoresMujeres ??
          0,
        next: participantsForm?.numEntrenadoresMujeres ?? 0,
      },
      {
        label: "Presupuesto",
        previous: selectedBudgetForma
          ? formatCurrency(originalBudgetTotal)
          : "Sin selección",
        next: selectedBudgetForma
          ? formatCurrency(proposedBudgetTotal)
          : "Sin selección",
      },
    ].filter((row) => hasSummaryChange(row.previous, row.next)),
    [
      evento,
      originalBudgetTotal,
      participantsForm,
      proposedBudgetTotal,
      selectedBudgetForma,
      selectedForma,
    ],
  );

  const canSubmitReforma = canCreateReforma(user);
  const hasPendingReform = Boolean(evento?.tieneReformaPendiente);
  const proposedChanges = useMemo(() => {
    if (!evento || !generalForm || !participantsForm) return {};

    const payload: Record<string, unknown> = {};
    const currentLugar = normalizeTextValue(evento.lugar);
    const nextLugar = normalizeTextValue(generalForm.lugar);
    const currentCiudad = normalizeTextValue(evento.ciudad);
    const nextCiudad = normalizeTextValue(generalForm.ciudad);
    const currentProvincia = normalizeTextValue(evento.provincia);
    const nextProvincia = normalizeTextValue(generalForm.provincia);
    const currentPais = normalizeTextValue(evento.pais);
    const nextPais = normalizeTextValue(generalForm.pais);

    if (generalForm.nombre !== evento.nombre) payload.nombre = generalForm.nombre;
    if (
      generalForm.tipoEvento !==
      (normalizeEventoTipoEvento(evento.tipoEvento) ?? evento.tipoEvento ?? "")
    ) {
      payload.tipoEvento = generalForm.tipoEvento;
    }
    if (
      generalForm.alcance !==
      (normalizeEventoAlcance(evento.alcance) ?? evento.alcance ?? "")
    ) {
      payload.alcance = generalForm.alcance;
    }
    if (nextLugar !== currentLugar) payload.lugar = generalForm.lugar.trim();
    if (nextCiudad !== currentCiudad) payload.ciudad = generalForm.ciudad.trim();
    if (nextProvincia !== currentProvincia) {
      payload.provincia = generalForm.provincia.trim();
    }
    if (nextPais !== currentPais) payload.pais = generalForm.pais.trim();
    if (generalForm.mesProgramado !== (evento.mesProgramado ?? "")) {
      payload.mesProgramado =
        typeof generalForm.mesProgramado === "number"
          ? generalForm.mesProgramado
          : undefined;
    }
    if (generalForm.fechaInicio !== formatDateInput(evento.fechaInicio)) {
      payload.fechaInicio = formatDateInput(generalForm.fechaInicio);
    }
    if (generalForm.fechaFin !== formatDateInput(evento.fechaFin)) {
      payload.fechaFin = formatDateInput(generalForm.fechaFin);
    }

    if (selectedForma) {
      const previousParticipants = selectedForma;

      const hasParticipantChanges =
        participantsForm.numAtletasHombres !== previousParticipants.numAtletasHombres ||
        participantsForm.numAtletasMujeres !== previousParticipants.numAtletasMujeres ||
        participantsForm.numEntrenadoresHombres !==
          previousParticipants.numEntrenadoresHombres ||
        participantsForm.numEntrenadoresMujeres !==
          previousParticipants.numEntrenadoresMujeres;

      const hasBudgetChanges =
        selectedBudgetForma &&
        evento &&
        getBudgetRowsChanged(
          budgetRows,
          getFormaBudgetItems(evento, selectedBudgetForma),
        );

      if (hasParticipantChanges || hasBudgetChanges) {
        const formaEntry: {
          tipoAval: string;
          numEntrenadoresHombres: number;
          numEntrenadoresMujeres: number;
          numAtletasHombres: number;
          numAtletasMujeres: number;
          items?: { itemId: number; mes: number; presupuesto: number }[];
        } = {
          tipoAval: selectedForma.tipoAval,
          numEntrenadoresHombres: participantsForm.numEntrenadoresHombres,
          numEntrenadoresMujeres: participantsForm.numEntrenadoresMujeres,
          numAtletasHombres: participantsForm.numAtletasHombres,
          numAtletasMujeres: participantsForm.numAtletasMujeres,
        };

        if (selectedBudgetForma && hasBudgetChanges) {
          formaEntry.items = budgetRows
            .filter((row) => row.status !== "removed")
            .map((row) => ({
              itemId: row.itemId,
              mes: row.mes,
              presupuesto: Number.parseFloat(row.presupuesto) || 0,
            }))
            .filter(
              (item): item is { itemId: number; mes: number; presupuesto: number } =>
                Number.isFinite(item.itemId),
            );
        }

        payload.formasParticipacion = [formaEntry];
      }
    }

    return payload;
  }, [
    budgetRows,
    evento,
    generalForm,
    participantsForm,
    selectedBudgetForma,
    selectedForma,
  ]);

  const hasUnresolvableBudgetItems = useMemo(() => {
    if (!selectedBudgetForma) return false;

    return budgetRows.some((row) => {
      if (row.status === "removed") return false;
      if (!row.itemId) return true;
      return false;
    });
  }, [budgetRows, selectedBudgetForma]);

  const stepOneMissingFields = useMemo(
    () =>
      getRequiredStepOneFields({
        requestReason,
        firmaCreadorNombre,
        firmaCreadorCargo,
        firmaRevisorNombre,
        firmaRevisorCargo,
        firmaAprobadorNombre,
        firmaAprobadorCargo,
        mesEjecucion,
      }),
    [
      firmaAprobadorCargo,
      firmaAprobadorNombre,
      firmaCreadorCargo,
      firmaCreadorNombre,
      firmaRevisorCargo,
      firmaRevisorNombre,
      mesEjecucion,
      requestReason,
    ],
  );
  const stepOneValidationError =
    stepOneMissingFields.length > 0
      ? `Completá los datos obligatorios del paso 1: ${stepOneMissingFields.join(", ")}.`
      : null;

  const handleSubmit = async () => {
    if (!evento || !requestReason.trim()) return;
    if (typeof mesEjecucion !== "number") {
      setSubmitError("Seleccioná el mes en el que se va a ejecutar la reforma.");
      return;
    }
    if (!canSubmitReforma) {
      setSubmitError("Tu usuario no tiene permiso para solicitar reformas.");
      return;
    }
    if (hasPendingReform) {
      setSubmitError(
        "Este evento ya tiene una reforma pendiente. No se puede solicitar otra reforma hasta que la actual se apruebe o rechace.",
      );
      return;
    }
    if (hasUnresolvableBudgetItems) {
      setSubmitError(
        "No se puede enviar la reforma porque falta la relacion real itemId para uno o mas items presupuestarios cambiados.",
      );
      return;
    }
    if (Object.keys(proposedChanges).length === 0) {
      setSubmitError("No hay cambios para enviar en esta reforma.");
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);
      setSubmitSuccess(null);

      const payload = {
        eventoId: evento.id,
        motivo: requestReason.trim(),
        de: requestDe.trim() || undefined,
        para: requestPara.trim() || undefined,
        firmaCreadorNombre: optionalText(firmaCreadorNombre),
        firmaCreadorCargo: optionalText(firmaCreadorCargo),
        firmaRevisorNombre: optionalText(firmaRevisorNombre),
        firmaRevisorCargo: optionalText(firmaRevisorCargo),
        firmaAprobadorNombre: optionalText(firmaAprobadorNombre),
        firmaAprobadorCargo: optionalText(firmaAprobadorCargo),
        observacion: requestObservation.trim() || undefined,
        mesEjecucion,
        cambiosPropuestos: proposedChanges,
      };
      const response = await createReform(payload);

      if (adjuntosReforma.length > 0) {
        try {
          await uploadReformAdjuntos(response.data.id, adjuntosReforma);
        } catch (uploadErr: unknown) {
          setSubmitted(true);
          setSubmitError(
            uploadErr instanceof Error
              ? `La reforma ${response.data.id} se creó, pero falló la carga de adjuntos: ${uploadErr.message}`
              : `La reforma ${response.data.id} se creó, pero falló la carga de adjuntos.`,
          );
          return;
        }
      }

      setSubmitted(true);
      setSubmitSuccess("La solicitud de reforma fue registrada correctamente.");
      router.replace(`/reformas/${response.data.id}`);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 403) {
        setSubmitError(
          "No tienes permisos para solicitar reformas con este usuario.",
        );
        return;
      }

      setSubmitError(
        err instanceof Error
          ? err.message
          : "No se pudo registrar la solicitud de reforma.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const budgetComparisonRows = useMemo(() => {
    if (!evento || !selectedBudgetForma) return [];

    const originalItems = getFormaBudgetItems(evento, selectedBudgetForma);

    return budgetRows.map((row) => {
      const originalItem = originalItems.find(
        (item) => item.id === row.sourceId,
      );
      const originalOption = itemsCatalogo.find(
        (option) => option.id === originalItem?.item.id,
      );
      const currentOption = itemsCatalogo.find((option) => option.id === row.itemId);
      const originalMonth =
        MONTH_OPTIONS.find((option) => option.value === originalItem?.mes)?.label ??
        "Mes no definido";
      const currentMonth =
        MONTH_OPTIONS.find((option) => option.value === row.mes)?.label ??
        "Mes no definido";

      return {
        id: row.localId,
        beforeLabel: originalOption?.nombre ?? originalItem?.item.nombre ?? "Sin item",
        beforeMonth: originalMonth,
        beforeBudget: originalItem
          ? formatCurrency(Number.parseFloat(originalItem.presupuesto) || 0)
          : "-",
        afterLabel:
          row.status === "removed"
            ? "Item retirado"
            : currentOption?.nombre ?? "Item sin seleccionar",
        afterMonth: row.status === "removed" ? "-" : currentMonth,
        afterBudget:
          row.status === "removed"
            ? "-"
            : formatCurrency(Number.parseFloat(row.presupuesto) || 0),
        labelChanged:
          (originalOption?.nombre ?? originalItem?.item.nombre ?? "Sin item") !==
          (row.status === "removed"
            ? "Item retirado"
            : currentOption?.nombre ?? "Item sin seleccionar"),
        monthChanged:
          originalMonth !== (row.status === "removed" ? "-" : currentMonth),
        budgetChanged:
          (originalItem
            ? formatCurrency(Number.parseFloat(originalItem.presupuesto) || 0)
            : "-") !==
          (row.status === "removed"
            ? "-"
            : formatCurrency(Number.parseFloat(row.presupuesto) || 0)),
        removed: row.status === "removed",
        added: row.status === "new",
      };
    });
  }, [budgetRows, evento, itemsCatalogo, selectedBudgetForma]);

  const previewYear = useMemo(() => {
    const source = generalForm?.fechaInicio || evento?.fechaInicio;
    if (typeof source === "string" && source.length >= 4) {
      return source.slice(0, 4);
    }
    return String(new Date().getFullYear());
  }, [evento?.fechaInicio, generalForm?.fechaInicio]);

  const currentPreviewInfoRows = useMemo<ReformaPreviewInfoRow[]>(() => {
    const entrenadores =
      (selectedForma?.numEntrenadoresHombres ?? evento?.numEntrenadoresHombres ?? 0) +
      (selectedForma?.numEntrenadoresMujeres ?? evento?.numEntrenadoresMujeres ?? 0);
    const deportistas =
      (selectedForma?.numAtletasHombres ?? evento?.numAtletasHombres ?? 0) +
      (selectedForma?.numAtletasMujeres ?? evento?.numAtletasMujeres ?? 0);

    return [
      {
        label: "Nombre",
        value: formatPreviewValue(evento?.nombre),
        changed: normalizeTextValue(evento?.nombre) !== normalizeTextValue(generalForm?.nombre),
      },
      {
        label: "Provincia",
        value: formatPreviewValue(
          [evento?.ciudad, evento?.provincia].filter(Boolean).join(" - "),
        ),
        changed:
          normalizeTextValue(evento?.ciudad) !== normalizeTextValue(generalForm?.ciudad) ||
          normalizeTextValue(evento?.provincia) !== normalizeTextValue(generalForm?.provincia),
      },
      {
        label: "Mes planificado",
        value: getMonthLabel(evento?.mesProgramado),
        changed: evento?.mesProgramado !== generalForm?.mesProgramado,
      },
      {
        label: "Genero",
        value: formatPreviewValue(formatGenero(evento?.genero)),
      },
      {
        label: "N° de entrenadores",
        value: String(entrenadores),
        changed:
          entrenadores !==
          ((participantsForm?.numEntrenadoresHombres ?? 0) +
            (participantsForm?.numEntrenadoresMujeres ?? 0)),
      },
      {
        label: "N° de deportistas",
        value: String(deportistas),
        changed:
          deportistas !==
          ((participantsForm?.numAtletasHombres ?? 0) +
            (participantsForm?.numAtletasMujeres ?? 0)),
      },
      {
        label: "Damas",
        value: String(selectedForma?.numAtletasMujeres ?? evento?.numAtletasMujeres ?? 0),
        changed:
          (selectedForma?.numAtletasMujeres ?? evento?.numAtletasMujeres ?? 0) !==
          (participantsForm?.numAtletasMujeres ?? 0),
      },
      {
        label: "Varones",
        value: String(selectedForma?.numAtletasHombres ?? evento?.numAtletasHombres ?? 0),
        changed:
          (selectedForma?.numAtletasHombres ?? evento?.numAtletasHombres ?? 0) !==
          (participantsForm?.numAtletasHombres ?? 0),
      },
    ];
  }, [evento, generalForm, participantsForm, selectedForma]);

  const proposedPreviewInfoRows = useMemo<ReformaPreviewInfoRow[]>(() => {
    const entrenadores =
      (participantsForm?.numEntrenadoresHombres ?? 0) +
      (participantsForm?.numEntrenadoresMujeres ?? 0);
    const deportistas =
      (participantsForm?.numAtletasHombres ?? 0) +
      (participantsForm?.numAtletasMujeres ?? 0);

    return [
      {
        label: "Nombre",
        value: formatPreviewValue(generalForm?.nombre || evento?.nombre),
        changed: normalizeTextValue(evento?.nombre) !== normalizeTextValue(generalForm?.nombre),
      },
      {
        label: "Provincia",
        value: formatPreviewValue(
          [generalForm?.ciudad || evento?.ciudad, generalForm?.provincia || evento?.provincia]
            .filter(Boolean)
            .join(" - "),
        ),
        changed:
          normalizeTextValue(evento?.ciudad) !== normalizeTextValue(generalForm?.ciudad) ||
          normalizeTextValue(evento?.provincia) !== normalizeTextValue(generalForm?.provincia),
      },
      {
        label: "Mes de ejecución",
        value: getMonthLabel(mesEjecucion),
        changed: typeof mesEjecucion === "number",
      },
      {
        label: "Genero",
        value: formatPreviewValue(formatGenero(evento?.genero)),
      },
      {
        label: "N° de entrenadores",
        value: String(entrenadores),
        changed:
          ((selectedForma?.numEntrenadoresHombres ?? evento?.numEntrenadoresHombres ?? 0) +
            (selectedForma?.numEntrenadoresMujeres ?? evento?.numEntrenadoresMujeres ?? 0)) !==
          entrenadores,
      },
      {
        label: "N° de deportistas",
        value: String(deportistas),
        changed:
          ((selectedForma?.numAtletasHombres ?? evento?.numAtletasHombres ?? 0) +
            (selectedForma?.numAtletasMujeres ?? evento?.numAtletasMujeres ?? 0)) !==
          deportistas,
      },
      {
        label: "Damas",
        value: String(participantsForm?.numAtletasMujeres ?? 0),
        changed:
          (selectedForma?.numAtletasMujeres ?? evento?.numAtletasMujeres ?? 0) !==
          (participantsForm?.numAtletasMujeres ?? 0),
      },
      {
        label: "Varones",
        value: String(participantsForm?.numAtletasHombres ?? 0),
        changed:
          (selectedForma?.numAtletasHombres ?? evento?.numAtletasHombres ?? 0) !==
          (participantsForm?.numAtletasHombres ?? 0),
      },
    ];
  }, [evento, generalForm, mesEjecucion, participantsForm, selectedForma]);

  const currentPreviewBudgetRows = useMemo<ReformaPreviewBudgetRow[]>(() => {
    const items = evento && selectedBudgetForma ? getFormaBudgetItems(evento, selectedBudgetForma) : [];

    return items.map((item) => ({
      codigo: String(item.item.numero ?? "-"),
      item: formatPreviewValue(item.item.nombre),
      valor: formatCurrency(Number.parseFloat(item.presupuesto) || 0),
      changed: budgetRows.some(
        (row) =>
          row.sourceId === item.id &&
          (row.status === "removed" ||
            row.itemId !== item.item.id ||
            row.mes !== item.mes ||
            (Number.parseFloat(row.presupuesto) || 0) !==
              (Number.parseFloat(item.presupuesto) || 0)),
      ),
    }));
  }, [budgetRows, evento, selectedBudgetForma]);

  const proposedPreviewBudgetRows = useMemo<ReformaPreviewBudgetRow[]>(() => {
    return budgetRows
      .filter((row) => row.status !== "removed")
      .map((row) => {
        const originalItem =
          evento && selectedBudgetForma
            ? getFormaBudgetItems(evento, selectedBudgetForma).find(
                (item) => item.id === row.sourceId,
              )
            : undefined;
        const catalogItem = itemsCatalogo.find((item) => item.id === row.itemId);
        return {
          codigo: String(catalogItem?.numero ?? row.itemNumero ?? "-"),
          item: formatPreviewValue(catalogItem?.nombre ?? "Item sin seleccionar"),
          valor: formatCurrency(Number.parseFloat(row.presupuesto) || 0),
          changed:
            row.status === "new" ||
            !originalItem ||
            originalItem.item.id !== row.itemId ||
            originalItem.mes !== row.mes ||
            (Number.parseFloat(originalItem.presupuesto) || 0) !==
              (Number.parseFloat(row.presupuesto) || 0),
        };
      });
  }, [budgetRows, evento, itemsCatalogo, selectedBudgetForma]);

  const hasInformativeChanges =
    generalSummaryRows.length > 0 ||
    delegationSummaryRows.some((row) => row.label !== "Presupuesto");
  const hasBudgetChanges = budgetComparisonRows.length > 0;

  const handleSelectForma = (value: string) => {
    const formaId = value ? Number(value) : "";
    const forma =
      typeof formaId === "number"
        ? reformFormas.find((item) => item.id === formaId) ?? null
        : null;

    setSelectedFormaId(forma?.id ?? "");
    if (evento) {
      setParticipantsForm(buildInitialParticipantsForm(evento, forma));
      setBudgetRows(getInitialBudgetRows(getFormaBudgetItems(evento, forma)));
    } else {
      setBudgetRows(getInitialBudgetRows([]));
    }
    setExpandedBudgetRows([]);
  };

  const handleBudgetChange = (
    localId: string,
    field: keyof BudgetRow,
    value: string | number,
  ) => {
    setBudgetRows((prev) =>
      prev.map((row) => {
        if (row.localId !== localId) return row;

        if (field === "itemNumero") {
          const itemNumero = typeof value === "number" ? value : Number(value);
          const selectedItem = itemsCatalogo.find((item) => item.numero === itemNumero);
          return {
            ...row,
            itemNumero: selectedItem?.numero ?? "",
            itemId: selectedItem?.id,
          };
        }

        return { ...row, [field]: value };
      }),
    );
  };

  const handleAddBudgetRow = () => {
    if (!selectedBudgetForma) return;

    const localId = `new-${Date.now()}`;
    setBudgetRows((prev) => [
      ...prev,
        {
          localId,
          itemId: undefined,
          itemNumero: "",
          mes: 1,
          presupuesto: "0",
        status: "new",
      },
    ]);
    setExpandedBudgetRows((prev) =>
      prev.includes(localId) ? prev : [...prev, localId],
    );
  };

  const formatBytes = (value: number) => {
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleAdjuntosChange = (e: ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files ?? []);
    if (incoming.length === 0) return;

    setAdjuntosWarning(null);
    setAdjuntosReforma((prev) => {
      const existingKeys = new Set(prev.map((f) => `${f.name}_${f.size}`));
      const fresh = incoming.filter((f) => !existingKeys.has(`${f.name}_${f.size}`));
      const validFiles: File[] = [];
      const rejectedType: string[] = [];
      const rejectedSize: string[] = [];

      fresh.forEach((file) => {
        const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
        if (!ALLOWED_ADJUNTO_REFORMA_EXTENSIONS.has(extension)) {
          rejectedType.push(file.name);
          return;
        }
        if (file.size > MAX_ADJUNTO_REFORMA_BYTES) {
          rejectedSize.push(file.name);
          return;
        }
        validFiles.push(file);
      });

      if (rejectedType.length > 0) {
        setAdjuntosWarning(
          `Archivos no permitidos: ${rejectedType.join(", ")}. Solo se aceptan PDF, PNG, JPG, JPEG, XLSX, XLS y CSV.`,
        );
      } else if (rejectedSize.length > 0) {
        setAdjuntosWarning(
          `Estos archivos superan 5MB: ${rejectedSize.join(", ")}.`,
        );
      }

      const combined = [...prev, ...validFiles];

      if (combined.length > MAX_ADJUNTOS_REFORMA) {
        setAdjuntosWarning(
          `Solo podes adjuntar hasta ${MAX_ADJUNTOS_REFORMA} archivos. Se descartaron ${
            combined.length - MAX_ADJUNTOS_REFORMA
          } archivo(s).`,
        );
        return combined.slice(0, MAX_ADJUNTOS_REFORMA);
      }

      return combined;
    });

    e.target.value = "";
  };

  const handleRemoveAdjunto = (index: number) => {
    setAdjuntosWarning(null);
    setAdjuntosReforma((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleRemoveBudgetRow = (localId: string) => {
    setBudgetRows((prev) =>
      prev.flatMap((row) => {
        if (row.localId !== localId) return [row];
        if (row.status === "new") return [];
        return [{ ...row, status: row.status === "removed" ? "existing" : "removed" }];
      }),
    );
    setExpandedBudgetRows((prev) => prev.filter((id) => id !== localId));
  };

  const toggleBudgetRow = (localId: string) => {
    setExpandedBudgetRows((prev) =>
      prev.includes(localId)
        ? prev.filter((id) => id !== localId)
        : [...prev, localId],
    );
  };

  const goNext = () => {
    if (currentStep !== 1) return;
    if (stepOneValidationError) {
      setSubmitError(stepOneValidationError);
      return;
    }
    setSubmitError(null);
    setCurrentStep(2);
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as WizardStep);
    }
  };

  const handleStepChange = (step: WizardStep) => {
    if (step === currentStep) return;
    if (step === 2 && currentStep === 1 && stepOneValidationError) {
      setSubmitError(stepOneValidationError);
      return;
    }
    setSubmitError(null);
    setCurrentStep(step);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-gray-600 dark:text-gray-300" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Cargando formulario de reforma...
          </p>
        </div>
      </div>
    );
  }

  if (!authLoading && !canSubmitReforma) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-4">
          <AlertBanner
            variant="error"
            message="No tienes permiso para solicitar reformas."
            description="Solo administradores o entrenadores con permiso habilitado pueden registrar una reforma."
          />
          <Link
            href={evento ? `/eventos/${evento.id}` : "/eventos"}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al evento
          </Link>
        </div>
      </div>
    );
  }

  if (error || !evento || !generalForm || !participantsForm) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4 dark:bg-gray-950">
        <div className="w-full max-w-lg rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
          <p className="font-medium">{error || "No se encontró el evento."}</p>
          <Link
            href="/eventos"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-rose-700 underline dark:text-rose-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a eventos
          </Link>
        </div>
      </div>
    );
  }

  if (hasPendingReform) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4 dark:bg-gray-950">
        <div className="w-full max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
          <p className="text-lg font-semibold">Reforma no disponible</p>
          <p className="mt-2 text-sm">
            Este evento ya tiene una reforma pendiente.
          </p>
          <p className="mt-1 text-sm">
            No se puede solicitar otra reforma hasta que la actual se apruebe o rechace.
          </p>
          <Link
            href={`/eventos/${evento.id}`}
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al evento
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-white dark:bg-gray-950">
      {submitError ? (
        <div className="fixed right-4 top-4 z-50 w-full max-w-sm">
          <AlertBanner
            variant="error"
            message={submitError}
            onClose={() => setSubmitError(null)}
          />
        </div>
      ) : null}
      {submitSuccess ? (
        <div className="fixed right-4 top-4 z-50 w-full max-w-sm">
          <AlertBanner
            variant="success"
            message={submitSuccess}
            onClose={() => setSubmitSuccess(null)}
          />
        </div>
      ) : null}

      <div className="w-full lg:w-1/2 overflow-y-auto border-r border-gray-200 dark:border-gray-800">
        <div className="mx-auto max-w-3xl px-6 py-8 sm:px-8">
          <div className="mb-8">
            <Link
              href={`/eventos/${evento.id}`}
              className="mb-6 inline-flex items-center gap-2 text-sm text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al detalle del evento
            </Link>

            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                <ClipboardEdit className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
                  Solicitud de reforma
                </p>
                <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {evento.nombre}
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                  Propón cambios puntuales sobre el evento y deja claro qué se
                  modifica, por qué y cómo impacta al presupuesto o a la delegación.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-8 flex items-center gap-4">
            <StepBadge
              step={1}
              label="Solicitud"
              active={currentStep === 1}
              completed={currentStep > 1}
              onClick={() => handleStepChange(1)}
            />
            <StepBadge
              step={2}
              label="Cambios"
              active={currentStep === 2}
              completed={false}
              onClick={() => handleStepChange(2)}
            />
          </div>

          {submitted ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900/60 dark:bg-emerald-950/30">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h2 className="text-lg font-semibold text-emerald-800 dark:text-emerald-200">
                    Reforma generada correctamente
                  </h2>
                  <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">
                    La solicitud de reforma fue registrada con exito.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {currentStep === 2 ? (
            <div className="space-y-8">
              <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                  <div className="mb-5 flex items-center gap-3">
                    <FileText className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    <div>
                      <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                        Información general
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Propón nuevos valores manteniendo visible el contexto actual.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Nombre del evento
                      </span>
                      <input
                        value={generalForm.nombre}
                        onChange={(e) =>
                          setGeneralForm((prev) =>
                            prev ? { ...prev, nombre: e.target.value } : prev,
                          )
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Tipo de evento
                      </span>
                      <select
                        value={generalForm.tipoEvento}
                        onChange={(e) =>
                          setGeneralForm((prev) =>
                            prev ? { ...prev, tipoEvento: e.target.value } : prev,
                          )
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                      >
                        <option value="">Selecciona un tipo</option>
                        {EVENTO_TAREA_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Alcance
                      </span>
                      <select
                        value={generalForm.alcance}
                        onChange={(e) =>
                          setGeneralForm((prev) =>
                            prev ? { ...prev, alcance: e.target.value } : prev,
                          )
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                      >
                        <option value="">Selecciona un alcance</option>
                        {EVENTO_ALCANCE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Lugar
                      </span>
                      <input
                        value={generalForm.lugar}
                        onChange={(e) =>
                          setGeneralForm((prev) =>
                            prev ? { ...prev, lugar: e.target.value } : prev,
                          )
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Ciudad
                      </span>
                      <input
                        value={generalForm.ciudad}
                        onChange={(e) =>
                          setGeneralForm((prev) =>
                            prev ? { ...prev, ciudad: e.target.value } : prev,
                          )
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Provincia
                      </span>
                      <input
                        value={generalForm.provincia}
                        onChange={(e) =>
                          setGeneralForm((prev) =>
                            prev ? { ...prev, provincia: e.target.value } : prev,
                          )
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        País
                      </span>
                      <input
                        value={generalForm.pais}
                        onChange={(e) =>
                          setGeneralForm((prev) =>
                            prev ? { ...prev, pais: e.target.value } : prev,
                          )
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Mes programación
                      </span>
                      <select
                        value={
                          generalForm.mesProgramado === ""
                            ? ""
                            : String(generalForm.mesProgramado)
                        }
                        onChange={(e) =>
                          setGeneralForm((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  mesProgramado:
                                    e.target.value === ""
                                      ? ""
                                      : Number(e.target.value),
                                }
                              : prev,
                          )
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                      >
                        <option value="">Selecciona un mes</option>
                        {MONTH_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Fecha inicio
                      </span>
                      <input
                        type="date"
                        value={generalForm.fechaInicio}
                        onChange={(e) =>
                          setGeneralForm((prev) =>
                            prev ? { ...prev, fechaInicio: e.target.value } : prev,
                          )
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Fecha fin
                      </span>
                      <input
                        type="date"
                        value={generalForm.fechaFin}
                        onChange={(e) =>
                          setGeneralForm((prev) =>
                            prev ? { ...prev, fechaFin: e.target.value } : prev,
                          )
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                      />
                    </label>
                  </div>
                </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-6 flex items-center gap-3">
                  <Users className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  <div>
                    <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                      Delegación y presupuesto
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Selecciona el tipo de participación para desplegar la delegación y el presupuesto.
                    </p>
                  </div>
                </div>

                <label className="mb-6 block space-y-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Tipo de participación
                  </span>
                  <select
                    value={selectedFormaId === "" ? "" : String(selectedFormaId)}
                    onChange={(e) => handleSelectForma(e.target.value)}
                    disabled={reformFormas.length <= 1}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 disabled:opacity-70 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                  >
                    <option value="">
                      {reformFormas.length > 1
                        ? "Selecciona un tipo de participación"
                        : "Sin tipos de participación"}
                    </option>
                    {reformFormas.map((forma) => (
                      <option key={forma.id} value={forma.id}>
                        {getTipoAvalLabel(forma.tipoAval)}
                        {forma.referencia?.trim()
                          ? ` - ${forma.referencia.trim()}`
                          : ""}
                      </option>
                    ))}
                  </select>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    {reformFormas.length === 1
                      ? "Se seleccionó automáticamente porque este evento solo tiene un tipo de participación."
                      : "Cada opción muestra el tipo de participación junto con su referencia, si existe."}
                  </span>
                </label>

                {!selectedForma ? (
                  <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-950/40 dark:text-gray-400">
                    {reformFormas.length === 0
                      ? "Este evento no tiene tipos de participación registrados."
                      : "Selecciona un tipo de participación para desplegar la delegación y el presupuesto."}
                  </div>
                ) : (
                  <div className="grid gap-6">
                    <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                      <div className="mb-5 flex items-center gap-3">
                        <Users className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        <div>
                          <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                            Participantes
                          </h2>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Ajusta la delegación del tipo seleccionado.
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Atletas hombres
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={participantsForm.numAtletasHombres}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '');
                              setParticipantsForm((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      numAtletasHombres: Number(value) || 0,
                                    }
                                  : prev,
                              );
                            }}
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                          />
                        </label>
                        <label className="space-y-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Atletas mujeres
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={participantsForm.numAtletasMujeres}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '');
                              setParticipantsForm((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      numAtletasMujeres: Number(value) || 0,
                                    }
                                  : prev,
                              );
                            }}
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                          />
                        </label>
                        <label className="space-y-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Entrenadores y otro personal (hombres)
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={participantsForm.numEntrenadoresHombres}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '');
                              setParticipantsForm((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      numEntrenadoresHombres: Number(value) || 0,
                                    }
                                  : prev,
                              );
                            }}
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                          />
                        </label>
                        <label className="space-y-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Entrenadores y otro personal (mujeres)
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={participantsForm.numEntrenadoresMujeres}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '');
                              setParticipantsForm((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      numEntrenadoresMujeres: Number(value) || 0,
                                    }
                                  : prev,
                              );
                            }}
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                          />
                        </label>
                      </div>
                    </section>

                    <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                      <div className="mb-5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <DollarSign className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                          <div>
                            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                              Items presupuestarios
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Permite editar, agregar o retirar items de la propuesta.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddBudgetRow}
                          disabled={!selectedBudgetForma}
                          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                        >
                          <Plus className="h-4 w-4" />
                          Agregar item
                        </button>
                      </div>

                      {!selectedBudgetForma ? (
                        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-950/40 dark:text-gray-400">
                          {budgetFormas.length === 0
                            ? "Este evento no tiene tipos de participación con fondos públicos o autogestión para reformar presupuesto."
                            : selectedForma.tipoAval === "SOLO_RESULTADO"
                              ? "El tipo de participación seleccionado no maneja presupuesto."
                              : "Selecciona un tipo de participación válido para editar su presupuesto."}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {budgetRows.map((row) => (
                      <div
                        key={row.localId}
                        className={`rounded-2xl border p-4 ${
                          row.status === "removed"
                            ? "border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/20"
                            : "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => toggleBudgetRow(row.localId)}
                            className="flex min-w-0 flex-1 items-start gap-3 text-left"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {itemsCatalogo.find(
                                  (option) => option.id === row.itemId,
                                )?.nombre ||
                                  (row.status === "new"
                                    ? "Nuevo item"
                                    : "Item sin seleccionar")}
                              </p>
                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {MONTH_OPTIONS.find((option) => option.value === row.mes)
                                  ?.label || "Mes no definido"}{" "}
                                · {formatCurrency(Number.parseFloat(row.presupuesto) || 0)}
                              </p>
                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {row.status === "removed"
                                  ? "Item marcado para retiro"
                                  : "Haz clic para editar este item."}
                              </p>
                            </div>
                            <ChevronDown
                              className={`mt-0.5 h-5 w-5 shrink-0 text-gray-400 transition-transform ${
                                expandedBudgetRows.includes(row.localId)
                                  ? "rotate-180"
                                  : ""
                              }`}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveBudgetRow(row.localId)}
                            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                              row.status === "removed"
                                ? "bg-white text-rose-700 dark:bg-gray-900 dark:text-rose-300"
                                : "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                            }`}
                          >
                            <Trash2 className="h-4 w-4" />
                            {row.status === "removed" ? "Restaurar" : "Retirar"}
                          </button>
                        </div>

                        {expandedBudgetRows.includes(row.localId) ? (
                          <div className="mt-4 grid gap-4 border-t border-gray-200 pt-4 md:grid-cols-2 dark:border-gray-800">
                            <label className="space-y-2">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Item presupuestario
                              </span>
                              <select
                                value={row.itemNumero}
                                onChange={(e) =>
                                  handleBudgetChange(
                                    row.localId,
                                    "itemNumero",
                                    e.target.value ? Number(e.target.value) : "",
                                  )
                                }
                                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-300"
                                disabled={row.status === "removed"}
                              >
                                <option value="">Selecciona un item</option>
                                {itemsCatalogo.map((option) => (
                                  <option key={option.id} value={option.numero}>
                                    {option.numero} - {option.nombre}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="space-y-2">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Mes
                              </span>
                              <select
                                value={row.mes}
                                onChange={(e) =>
                                  handleBudgetChange(
                                    row.localId,
                                    "mes",
                                    Number(e.target.value) || 1,
                                  )
                                }
                                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-300"
                                disabled={row.status === "removed"}
                              >
                                {MONTH_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="space-y-2 md:col-span-2">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Presupuesto
                              </span>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={row.presupuesto}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/[^\d.]/g, '');
                                  const cleanValue = value.replace(/\.(?=.*\.)/g, '');
                                  handleBudgetChange(
                                    row.localId,
                                    "presupuesto",
                                    cleanValue,
                                  );
                                }}
                                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-300"
                                disabled={row.status === "removed"}
                              />
                            </label>
                          </div>
                        ) : null}
                      </div>
                          ))}
                        </div>
                      )}
                    </section>
                  </div>
                )}
              </section>
            </div>
          ) : null}

          {currentStep === 1 ? (
            <div className="space-y-6">
              <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Motivo de la solicitud
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Redacta el motivo general que se enviará junto con los cambios propuestos.
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      De
                    </span>
                    <input
                      type="text"
                      value={requestDe}
                      onChange={(e) => setRequestDe(e.target.value)}
                      placeholder="Ej: Lic. Miguel Vallejos Lara / Director del DTM"
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                      maxLength={255}
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Para
                    </span>
                    <input
                      type="text"
                      value={requestPara}
                      onChange={(e) => setRequestPara(e.target.value)}
                      placeholder="Ej: Lcda. Dayana Granda Armijos / Responsable del PDA"
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                      maxLength={255}
                    />
                  </label>
                </div>

                <label className="mt-4 block space-y-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Mes de ejecución <span className="text-rose-500">*</span>
                  </span>
                  <select
                    value={mesEjecucion === "" ? "" : String(mesEjecucion)}
                    onChange={(e) => {
                      const value = e.target.value;
                      setMesEjecucion(value === "" ? "" : Number(value));
                    }}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                  >
                    <option value="">Seleccioná un mes</option>
                    {MONTH_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    Mes en el que se ejecutará el pago o la ejecución del evento.
                  </span>
                </label>

                <label className="mt-4 block space-y-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Motivo <span className="text-rose-500">*</span>
                  </span>
                  <textarea
                    rows={5}
                    value={requestReason}
                    onChange={(e) => setRequestReason(e.target.value)}
                    placeholder="Ejemplo: se ajusta presupuesto y nombre del evento por planificación actualizada."
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                  />
                </label>
                <label className="mt-4 block space-y-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Observación adicional
                  </span>
                  <textarea
                    rows={4}
                    value={requestObservation}
                    onChange={(e) => setRequestObservation(e.target.value)}
                    placeholder="Comentario opcional para complementar la solicitud."
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                  />
                </label>
                <section className="mt-4 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-gray-950/50">
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Firmas del documento
                    </h3>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Estos datos se usarán para las tres firmas del Excel de la reforma.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Firma solicitante - nombre
                      </span>
                      <input
                        type="text"
                        value={firmaCreadorNombre}
                        onChange={(e) => setFirmaCreadorNombre(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                        maxLength={255}
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Firma solicitante - cargo
                      </span>
                      <input
                        type="text"
                        value={firmaCreadorCargo}
                        onChange={(e) => setFirmaCreadorCargo(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                        maxLength={255}
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
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                        maxLength={255}
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
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                        maxLength={255}
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Firma aprobador - nombre
                      </span>
                      <input
                        type="text"
                        value={firmaAprobadorNombre}
                        onChange={(e) => setFirmaAprobadorNombre(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                        maxLength={255}
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Firma aprobador - cargo
                      </span>
                      <input
                        type="text"
                        value={firmaAprobadorCargo}
                        onChange={(e) => setFirmaAprobadorCargo(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                        maxLength={255}
                      />
                    </label>
                  </div>
                </section>

                <section className="mt-4 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-gray-950/50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                        <Paperclip className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          Documentos adjuntos
                        </h3>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Adjuntá respaldos opcionales solo para esta reforma.
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                      {adjuntosReforma.length}/{MAX_ADJUNTOS_REFORMA}
                    </span>
                  </div>

                  <input
                    type="file"
                    multiple
                    onChange={handleAdjuntosChange}
                    disabled={adjuntosReforma.length >= MAX_ADJUNTOS_REFORMA}
                    className="mt-4 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:file:bg-gray-800 dark:file:text-gray-200"
                  />
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Podés adjuntar hasta {MAX_ADJUNTOS_REFORMA} archivos de máximo 5MB. Formatos: PDF, PNG, JPG, JPEG, XLSX, XLS, CSV.
                  </p>

                  {adjuntosWarning ? (
                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                      {adjuntosWarning}
                    </p>
                  ) : null}

                  {adjuntosReforma.length > 0 ? (
                    <ul className="mt-3 space-y-2">
                      {adjuntosReforma.map((archivo, index) => (
                        <li
                          key={`${archivo.name}_${archivo.size}_${index}`}
                          className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-gray-900 dark:text-gray-100">
                              {archivo.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {formatBytes(archivo.size)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAdjunto(index)}
                            className="shrink-0 text-gray-400 transition hover:text-rose-600 dark:hover:text-rose-400"
                            aria-label={`Quitar ${archivo.name}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              </section>

              {hasUnresolvableBudgetItems ? (
                <section className="rounded-2xl border border-dashed border-rose-300 bg-rose-50 p-6 dark:border-rose-800 dark:bg-rose-950/20">
                  <h3 className="font-semibold text-rose-800 dark:text-rose-200">
                    Pendiente de mapeo de items
                  </h3>
                  <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">
                    Falta seleccionar uno o más items del catálogo oficial para poder
                    enviar la reforma con sus `itemId` reales.
                  </p>
                </section>
              ) : null}
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-6 dark:border-gray-800">
            <button
              type="button"
              onClick={goBack}
              disabled={currentStep === 1}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Atrás
            </button>

            {currentStep < 2 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={Boolean(stepOneValidationError)}
                className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
              >
                Continuar
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={
                  !requestReason.trim() ||
                  typeof mesEjecucion !== "number" ||
                  submitting ||
                  hasUnresolvableBudgetItems ||
                  Object.keys(proposedChanges).length === 0
                }
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-medium text-gray-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {submitting ? "Enviando..." : "Enviar solicitud"}
              </button>
            )}
          </div>
        </div>
      </div>

      <aside className="hidden lg:block lg:w-1/2 overflow-y-auto bg-slate-100 dark:bg-slate-900">
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
                  <div>{selectedForma ? getTipoAvalLabel(selectedForma.tipoAval) : "Sin forma"}</div>
                  <div>{hasInformativeChanges ? "Datos informativos: X" : "Datos informativos: -"}</div>
                  <div>{hasBudgetChanges ? "Presupuesto: X" : "Presupuesto: -"}</div>
                </div>
              </div>

              <div className="border border-slate-400">
                <div className="grid grid-cols-[88px_1fr] border-b border-slate-400 text-[10px] uppercase text-slate-900">
                  <div className="border-r border-slate-400 px-2 py-1 font-bold">De:</div>
                  <div className="px-2 py-1">{formatPreviewValue(requestDe)}</div>
                </div>
                <div className="grid grid-cols-[88px_1fr] text-[10px] uppercase text-slate-900">
                  <div className="border-r border-slate-400 px-2 py-1 font-bold">Para:</div>
                  <div className="px-2 py-1">{formatPreviewValue(requestPara)}</div>
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
                  <ReformaPreviewInfoTable title="PDA aprobado" rows={currentPreviewInfoRows} />
                  <ReformaPreviewBudgetTable
                    rows={currentPreviewBudgetRows}
                    total={formatCurrency(originalBudgetTotal)}
                  />
                </div>

                <div className="flex items-center justify-center border-y border-slate-400 bg-slate-50 text-center text-[11px] font-bold uppercase tracking-wide text-slate-900">
                  Por
                </div>

                <div>
                  <ReformaPreviewInfoTable
                    title="Evento a aprobar en el PDA"
                    rows={proposedPreviewInfoRows}
                  />
                  <ReformaPreviewBudgetTable
                    rows={proposedPreviewBudgetRows}
                    total={formatCurrency(proposedBudgetTotal)}
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
    </div>
  );
}
