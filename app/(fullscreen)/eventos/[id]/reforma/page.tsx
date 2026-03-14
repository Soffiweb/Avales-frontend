"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  Circle,
  ClipboardEdit,
  DollarSign,
  FileText,
  Loader2,
  MapPin,
  Plus,
  Save,
  Trash2,
  Users,
} from "lucide-react";

import AlertBanner from "@/components/ui/alert-banner";
import { getItemsPresupuestarios } from "@/lib/api/catalog";
import { getEvento } from "@/lib/api/eventos";
import { createReform } from "@/lib/api/reforms";
import type { CatalogItemPresupuestario } from "@/types/catalog";
import type { Evento } from "@/types/evento";
import { calcularTotalEvento } from "@/types/evento";

type WizardStep = 1 | 2 | 3;
type EditableSection = "general" | "participants" | "budget";

type SectionSelection = Record<EditableSection, boolean>;

type GeneralForm = {
  nombre: string;
  lugar: string;
  ciudad: string;
  provincia: string;
  pais: string;
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

function formatDateInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function getInitialBudgetRows(evento: Evento): BudgetRow[] {
  return (evento.eventoItems ?? []).map((item) => ({
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
    lugar: evento.lugar ?? "",
    ciudad: evento.ciudad ?? "",
    provincia: evento.provincia ?? "",
    pais: evento.pais ?? "",
    fechaInicio: formatDateInput(evento.fechaInicio),
    fechaFin: formatDateInput(evento.fechaFin),
  };
}

function buildInitialParticipantsForm(evento: Evento): ParticipantsForm {
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

function SectionCard({
  icon,
  title,
  description,
  checked,
  onToggle,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full rounded-2xl border p-5 text-left transition ${
        checked
          ? "border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900"
          : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${
            checked
              ? "bg-white/15 text-white dark:bg-gray-900/10 dark:text-gray-900"
              : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
          }`}
        >
          {icon}
        </div>
        {checked ? (
          <CheckCircle2 className="h-5 w-5 shrink-0" />
        ) : (
          <Circle className="h-5 w-5 shrink-0 text-gray-300 dark:text-gray-600" />
        )}
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p
        className={`mt-2 text-sm ${
          checked
            ? "text-gray-100 dark:text-gray-700"
            : "text-gray-500 dark:text-gray-400"
        }`}
      >
        {description}
      </p>
    </button>
  );
}

function SummaryRow({
  label,
  previous,
  next,
}: {
  label: string;
  previous: string | number;
  next: string | number;
}) {
  const changed = String(previous) !== String(next);

  return (
    <div className="grid grid-cols-[1.3fr_1fr_1fr] gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="font-medium text-slate-700 dark:text-slate-200">{label}</div>
      <div className="text-slate-500 dark:text-slate-400">{previous || "-"}</div>
      <div className={changed ? "font-medium text-amber-700 dark:text-amber-300" : "text-slate-500 dark:text-slate-400"}>
        {next || "-"}
      </div>
    </div>
  );
}

function BudgetComparisonRow({
  beforeLabel,
  beforeMonth,
  beforeBudget,
  afterLabel,
  afterMonth,
  afterBudget,
  labelChanged,
  monthChanged,
  budgetChanged,
  removed = false,
  added = false,
}: {
  beforeLabel: string;
  beforeMonth: string;
  beforeBudget: string;
  afterLabel: string;
  afterMonth: string;
  afterBudget: string;
  labelChanged: boolean;
  monthChanged: boolean;
  budgetChanged: boolean;
  removed?: boolean;
  added?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
      <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Antes
        </p>
        <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
          {beforeLabel}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {beforeMonth}
        </p>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
          {beforeBudget}
        </p>
      </div>

      <div
        className={`rounded-lg p-3 ${
          removed
            ? "bg-rose-50 dark:bg-rose-950/30"
            : added
            ? "bg-emerald-50 dark:bg-emerald-950/30"
            : "bg-amber-50 dark:bg-amber-950/30"
        }`}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Despues
        </p>
        <p
          className={`mt-2 text-sm font-medium ${
            labelChanged
              ? "text-rose-700 dark:text-rose-300"
              : "text-slate-900 dark:text-slate-100"
          }`}
        >
          {afterLabel}
        </p>
        <p
          className={`mt-1 text-xs ${
            monthChanged
              ? "text-rose-700 dark:text-rose-300"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          {afterMonth}
        </p>
        <p
          className={`mt-2 text-sm ${
            budgetChanged
              ? "text-rose-700 dark:text-rose-300"
              : "text-slate-700 dark:text-slate-300"
          }`}
        >
          {afterBudget}
        </p>
      </div>
    </div>
  );
}

export default function EventoReformaPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [evento, setEvento] = useState<Evento | null>(null);
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [selectedSections, setSelectedSections] = useState<SectionSelection>({
    general: false,
    participants: false,
    budget: false,
  });
  const [generalForm, setGeneralForm] = useState<GeneralForm | null>(null);
  const [participantsForm, setParticipantsForm] = useState<ParticipantsForm | null>(
    null,
  );
  const [budgetRows, setBudgetRows] = useState<BudgetRow[]>([]);
  const [expandedBudgetRows, setExpandedBudgetRows] = useState<string[]>([]);
  const [requestReason, setRequestReason] = useState("");
  const [requestObservation, setRequestObservation] = useState("");
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
        setParticipantsForm(buildInitialParticipantsForm(eventData));
        const initialBudgetRows = getInitialBudgetRows(eventData);
        setBudgetRows(initialBudgetRows);
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

  const selectedCount = useMemo(
    () => Object.values(selectedSections).filter(Boolean).length,
    [selectedSections],
  );

  const originalBudgetTotal = useMemo(
    () => (evento ? calcularTotalEvento(evento) : 0),
    [evento],
  );
  const proposedBudgetTotal = useMemo(() => getBudgetTotal(budgetRows), [budgetRows]);

  const canContinueFromStep1 = selectedCount > 0;

  const proposedChanges = useMemo(() => {
    if (!evento || !generalForm || !participantsForm) return {};

    const payload: Record<string, unknown> = {};

    if (selectedSections.general) {
      if (generalForm.nombre !== evento.nombre) payload.nombre = generalForm.nombre;
      if (generalForm.lugar !== evento.lugar) payload.lugar = generalForm.lugar;
      if (generalForm.ciudad !== evento.ciudad) payload.ciudad = generalForm.ciudad;
      if (generalForm.provincia !== evento.provincia) {
        payload.provincia = generalForm.provincia;
      }
      if (generalForm.pais !== evento.pais) payload.pais = generalForm.pais;
      if (generalForm.fechaInicio !== formatDateInput(evento.fechaInicio)) {
        payload.fechaInicio = new Date(generalForm.fechaInicio).toISOString();
      }
      if (generalForm.fechaFin !== formatDateInput(evento.fechaFin)) {
        payload.fechaFin = new Date(generalForm.fechaFin).toISOString();
      }
    }

    if (selectedSections.participants) {
      if (participantsForm.numAtletasHombres !== evento.numAtletasHombres) {
        payload.numAtletasHombres = participantsForm.numAtletasHombres;
      }
      if (participantsForm.numAtletasMujeres !== evento.numAtletasMujeres) {
        payload.numAtletasMujeres = participantsForm.numAtletasMujeres;
      }
      if (
        participantsForm.numEntrenadoresHombres !== evento.numEntrenadoresHombres
      ) {
        payload.numEntrenadoresHombres = participantsForm.numEntrenadoresHombres;
      }
      if (
        participantsForm.numEntrenadoresMujeres !== evento.numEntrenadoresMujeres
      ) {
        payload.numEntrenadoresMujeres = participantsForm.numEntrenadoresMujeres;
      }
    }

    if (selectedSections.budget) {
      payload.eventoItems = budgetRows
        .filter((row) => row.status !== "removed")
        .map((row) => ({
          itemId: row.itemId,
          mes: row.mes,
          presupuesto: Number.parseFloat(row.presupuesto) || 0,
        }))
        .filter((item): item is { itemId: number; mes: number; presupuesto: number } =>
          Number.isFinite(item.itemId),
        );
    }

    return payload;
  }, [budgetRows, evento, generalForm, participantsForm, selectedSections]);

  const hasUnresolvableBudgetItems = useMemo(() => {
    if (!selectedSections.budget || !evento) return false;

    return budgetRows.some((row) => {
      if (row.status === "removed") return false;
      if (!row.itemId) return true;
      return false;
    });
  }, [budgetRows, evento, selectedSections.budget]);

  const handleSubmit = async () => {
    if (!evento || !requestReason.trim()) return;
    if (hasUnresolvableBudgetItems) {
      setSubmitError(
        "No se puede enviar la reforma porque falta la relacion real itemId para uno o mas items presupuestarios cambiados.",
      );
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);
      setSubmitSuccess(null);

      await createReform({
        eventoId: evento.id,
        motivo: requestReason.trim(),
        observacion: requestObservation.trim() || undefined,
        cambiosPropuestos: proposedChanges,
      });

      setSubmitted(true);
      setSubmitSuccess("La solicitud de reforma fue registrada correctamente.");
      router.push(`/eventos/${evento.id}?status=reform-requested`);
    } catch (err: unknown) {
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
    if (!selectedSections.budget) return [];

    return budgetRows.map((row) => {
      const originalItem = evento.eventoItems?.find((item) => item.id === row.sourceId);
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
  }, [budgetRows, evento, itemsCatalogo, selectedSections.budget]);

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
    if (currentStep < 3) {
      setCurrentStep((prev) => (prev + 1) as WizardStep);
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as WizardStep);
    }
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

  if (evento.estado !== "DISPONIBLE") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4 dark:bg-gray-950">
        <div className="w-full max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
          <p className="text-lg font-semibold">Reforma no disponible</p>
          <p className="mt-2 text-sm">
            Solo los eventos en estado DISPONIBLE pueden solicitar reforma.
          </p>
          <p className="mt-1 text-sm">
            Estado actual del evento: {evento.estado || "Sin estado"}.
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

  const hasPendingReform = Boolean(evento.tieneReformaPendiente);

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
              label="Secciones"
              active={currentStep === 1}
              completed={currentStep > 1}
              onClick={() => setCurrentStep(1)}
            />
            <StepBadge
              step={2}
              label="Cambios"
              active={currentStep === 2}
              completed={currentStep > 2}
              onClick={() => setCurrentStep(2)}
            />
            <StepBadge
              step={3}
              label="Motivo"
              active={currentStep === 3}
              completed={false}
              onClick={() => setCurrentStep(3)}
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

          {currentStep === 1 ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  ¿Qué deseas reformar?
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Selecciona solo las áreas que el entrenador necesita modificar.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <SectionCard
                  icon={<FileText className="h-5 w-5" />}
                  title="Información general"
                  description="Título, sede, ciudad, provincia, país y fechas del evento."
                  checked={selectedSections.general}
                  onToggle={() =>
                    setSelectedSections((prev) => ({
                      ...prev,
                      general: !prev.general,
                    }))
                  }
                />
                <SectionCard
                  icon={<Users className="h-5 w-5" />}
                  title="Participantes"
                  description="Cantidad de atletas y entrenadores."
                  checked={selectedSections.participants}
                  onToggle={() =>
                    setSelectedSections((prev) => ({
                      ...prev,
                      participants: !prev.participants,
                    }))
                  }
                />
                <SectionCard
                  icon={<DollarSign className="h-5 w-5" />}
                  title="Items presupuestarios"
                  description="Agregar, quitar o reajustar valores del presupuesto."
                  checked={selectedSections.budget}
                  onToggle={() =>
                    setSelectedSections((prev) => ({
                      ...prev,
                      budget: !prev.budget,
                    }))
                  }
                />
              </div>
            </div>
          ) : null}

          {currentStep === 2 ? (
            <div className="space-y-8">
              {selectedSections.general ? (
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
                    <label className="space-y-2 md:col-span-2">
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
              ) : null}

              {selectedSections.participants ? (
                <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                  <div className="mb-5 flex items-center gap-3">
                    <Users className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    <div>
                      <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                        Participantes
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Ajusta la delegación propuesta.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Atletas hombres
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={participantsForm.numAtletasHombres}
                        onChange={(e) =>
                          setParticipantsForm((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  numAtletasHombres: Number(e.target.value) || 0,
                                }
                              : prev,
                          )
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Atletas mujeres
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={participantsForm.numAtletasMujeres}
                        onChange={(e) =>
                          setParticipantsForm((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  numAtletasMujeres: Number(e.target.value) || 0,
                                }
                              : prev,
                          )
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Entrenadores hombres
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={participantsForm.numEntrenadoresHombres}
                        onChange={(e) =>
                          setParticipantsForm((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  numEntrenadoresHombres:
                                    Number(e.target.value) || 0,
                                }
                              : prev,
                          )
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Entrenadores mujeres
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={participantsForm.numEntrenadoresMujeres}
                        onChange={(e) =>
                          setParticipantsForm((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  numEntrenadoresMujeres:
                                    Number(e.target.value) || 0,
                                }
                              : prev,
                          )
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                      />
                    </label>
                  </div>
                </section>
              ) : null}

              {selectedSections.budget ? (
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
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar item
                    </button>
                  </div>

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
                                type="number"
                                min={0}
                                step="0.01"
                                value={row.presupuesto}
                                onChange={(e) =>
                                  handleBudgetChange(
                                    row.localId,
                                    "presupuesto",
                                    e.target.value,
                                  )
                                }
                                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-300"
                                disabled={row.status === "removed"}
                              />
                            </label>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          ) : null}

          {currentStep === 3 ? (
            <div className="space-y-6">
              <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Motivo de la solicitud
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Redacta el motivo general que se enviará junto con los cambios propuestos.
                </p>
                <textarea
                  rows={5}
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="Ejemplo: se ajusta presupuesto y nombre del evento por planificación actualizada."
                  className="mt-4 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                />
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

            {currentStep < 3 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={currentStep === 1 && !canContinueFromStep1}
                className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
              >
                Continuar
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!requestReason.trim() || submitting || hasUnresolvableBudgetItems}
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
            {/* Temporalmente oculto: resumen superior con secciones y totales.
            <div className="rounded-3xl bg-slate-950 p-6 text-white dark:bg-slate-800">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
                Resumen de la reforma
              </p>
              <h2 className="mt-3 text-2xl font-semibold">{evento.nombre}</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-300">
                    Secciones
                  </p>
                  <p className="mt-2 text-3xl font-bold">{selectedCount}</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-300">
                    Total actual
                  </p>
                  <p className="mt-2 text-2xl font-bold">
                    {formatCurrency(originalBudgetTotal)}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-300">
                    Total propuesto
                  </p>
                  <p className="mt-2 text-2xl font-bold">
                    {formatCurrency(proposedBudgetTotal)}
                  </p>
                </div>
              </div>
            </div>
            */}

            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-4 flex items-center gap-3">
                <MapPin className="h-5 w-5 text-slate-500" />
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  Antes y después
                </h3>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-[1.3fr_1fr_1fr] gap-3 px-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <div>Campo</div>
                  <div>Antes</div>
                  <div>Después</div>
                </div>
                {selectedSections.general ? (
                  <>
                    <SummaryRow
                      label="Nombre"
                      previous={evento.nombre}
                      next={generalForm.nombre}
                    />
                    <SummaryRow
                      label="Lugar"
                      previous={evento.lugar}
                      next={generalForm.lugar}
                    />
                    <SummaryRow
                      label="Ciudad"
                      previous={evento.ciudad}
                      next={generalForm.ciudad}
                    />
                  </>
                ) : null}

                {selectedSections.participants ? (
                  <>
                    <SummaryRow
                      label="Atletas H"
                      previous={evento.numAtletasHombres}
                      next={participantsForm.numAtletasHombres}
                    />
                    <SummaryRow
                      label="Atletas M"
                      previous={evento.numAtletasMujeres}
                      next={participantsForm.numAtletasMujeres}
                    />
                    <SummaryRow
                      label="Entrenadores H"
                      previous={evento.numEntrenadoresHombres}
                      next={participantsForm.numEntrenadoresHombres}
                    />
                    <SummaryRow
                      label="Entrenadores M"
                      previous={evento.numEntrenadoresMujeres}
                      next={participantsForm.numEntrenadoresMujeres}
                    />
                  </>
                ) : null}

                {selectedSections.budget ? (
                  <SummaryRow
                    label="Presupuesto total"
                    previous={formatCurrency(originalBudgetTotal)}
                    next={formatCurrency(proposedBudgetTotal)}
                  />
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-4 flex items-center gap-3">
                <CalendarRange className="h-5 w-5 text-slate-500" />
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  Comparacion de presupuesto
                </h3>
              </div>

              <div className="space-y-4">
                {selectedSections.budget ? (
                  budgetComparisonRows.length > 0 ? (
                    <>
                      {budgetComparisonRows.map((row) => (
                        <BudgetComparisonRow
                          key={row.id}
                          beforeLabel={row.beforeLabel}
                          beforeMonth={row.beforeMonth}
                          beforeBudget={row.beforeBudget}
                          afterLabel={row.afterLabel}
                          afterMonth={row.afterMonth}
                          afterBudget={row.afterBudget}
                          labelChanged={row.labelChanged}
                          monthChanged={row.monthChanged}
                          budgetChanged={row.budgetChanged}
                          removed={row.removed}
                          added={row.added}
                        />
                      ))}
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              Total antes
                            </p>
                            <p className="mt-2 font-medium text-slate-900 dark:text-slate-100">
                              {formatCurrency(originalBudgetTotal)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              Total despues
                            </p>
                            <p className="mt-2 font-medium text-slate-900 dark:text-slate-100">
                              {formatCurrency(proposedBudgetTotal)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                      No hay items presupuestarios para comparar.
                    </div>
                  )
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    Esta solicitud no incluye cambios en items presupuestarios.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
