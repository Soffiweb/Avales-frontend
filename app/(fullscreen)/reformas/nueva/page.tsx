"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  AlertTriangle,
  ArrowLeft,
  ClipboardEdit,
  Eye,
  EyeOff,
  Loader2,
  Paperclip,
  Save,
  Search,
  X,
} from "lucide-react";

import AlertBanner from "@/components/ui/alert-banner";
import { useAuth } from "@/app/providers/auth-provider";
import { canCreateReforma } from "@/lib/auth/access";
import { canonicalizeRoleCode, getRoleCode, normalizeRoleCode } from "@/lib/auth/roles";
import { ApiError } from "@/lib/api/client";
import { getItemsPresupuestarios } from "@/lib/api/catalog";
import { getEvento } from "@/lib/api/eventos";
import {
  createReform,
  getReformErrorMessage,
  uploadReformAdjuntos,
  type CreateReformEventoPayload,
  type CreateReformPayload,
} from "@/lib/api/reforms";
import { getDirigido, listUsers, type DirigidoRole } from "@/lib/api/user";
import {
  MES_OPCIONES,
  getEventosDisponiblesReformaMulti,
  groupEventosDisponiblesPorEvento,
} from "@/lib/api/reforms-multi";
import type { User } from "@/types/user";
import type { CatalogItemPresupuestario } from "@/types/catalog";
import type { Evento } from "@/types/evento";
import { formatCurrency, formatRole } from "@/lib/utils/formatters";
import { isBalanced } from "@/app/(app)/reformas-multi/_components/balance-bar";
import BalanceAdvisory from "./_components/balance-advisory";
import type { EventoDisponibleAgrupado, FuentePresupuestoReforma } from "@/types/reforma-multi";
import EventoReformaCard from "./_components/evento-reforma-card";
import type { EventoCambiosResult, EventoMovimientoLinea } from "./_components/evento-cambios-card";
import {
  buildEditedEventoPreviewBlock,
  formatPreviewValue,
  type EditedEventoPreviewBlock,
} from "./_lib/reform-preview";
import {
  ReformaPreviewBudgetTable,
  ReformaPreviewInfoTable,
} from "./_components/reforma-preview-tables";

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
const DEFAULT_FIRMA_REVISOR_NOMBRE = "LIC. CARLOS JERVES";
const DEFAULT_FIRMA_REVISOR_CARGO = "METODOLOGO";
const DEFAULT_FIRMA_APROBADOR_NOMBRE = "LCDA. DAYANA GRANDA ARMIJOS";
const DEFAULT_FIRMA_APROBADOR_CARGO = "RESPONSABLE DEL PDA";

type SignatureFields = {
  nombre: string;
  cargo: string;
};

/** Movimiento de presupuesto de un ítem, con su evento/forma de referencia. */
type MovimientoLinea = EventoMovimientoLinea & {
  eventoId: number;
  formaParticipacionId: number;
};

function buildUserFullName(user?: { nombre?: string | null; apellido?: string | null } | null) {
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

function parseSignatureLabel(value: string): SignatureFields {
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
  if (matchingRole) return formatRole(getRoleCode(matchingRole));

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

    return buildSolicitudDirigidaLabel(first.nombre, first.apellido, resolveUserRoleLabel(first, role));
  } catch {
    return "";
  }
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function ReformaPreviewSignature({ nombre, cargo }: { nombre: string; cargo: string }) {
  return (
    <div className="pt-8 text-center text-[10px] uppercase text-slate-900">
      <div className="border-t border-slate-500 pt-1 font-semibold">{formatPreviewValue(nombre)}</div>
      <div className="font-bold">{formatPreviewValue(cargo)}</div>
    </div>
  );
}

function EditedEventosPreviewColumn({ blocks }: { blocks: EditedEventoPreviewBlock[] }) {
  return (
    <div className="border border-slate-400">
      <div className="border-b border-slate-400 bg-slate-100 px-2 py-1 text-center text-[10px] font-bold uppercase tracking-wide text-slate-900">
        Eventos
      </div>
      {blocks.length > 0 ? (
        blocks.map((block) => (
          <div key={block.eventoId} className="border-b border-slate-400 last:border-b-0">
            <div className="px-2 py-1 text-center text-[10px] font-bold uppercase text-slate-900">
              {block.title}
            </div>
            <div className="grid grid-cols-2 gap-0">
              <div>
                <ReformaPreviewInfoTable title="Actual" rows={block.currentInfoRows} />
                <ReformaPreviewBudgetTable
                  rows={block.currentBudgetRows}
                  total={formatCurrency(block.currentTotal)}
                />
              </div>
              <div>
                <ReformaPreviewInfoTable title="Propuesto" rows={block.proposedInfoRows} />
                <ReformaPreviewBudgetTable
                  rows={block.proposedBudgetRows}
                  total={formatCurrency(block.proposedTotal)}
                />
              </div>
            </div>
            <div className="border-t border-slate-400 bg-slate-50 px-2 py-1 text-right text-[10px] font-bold uppercase text-slate-900">
              Neto de este evento:{" "}
              <span className={block.proposedTotal - block.currentTotal < 0 ? "text-rose-600" : "text-emerald-700"}>
                {block.proposedTotal - block.currentTotal >= 0 ? "+" : ""}
                {formatCurrency(block.proposedTotal - block.currentTotal)}
              </span>
            </div>
          </div>
        ))
      ) : (
        <div className="px-2 py-6 text-center text-[10px] text-slate-500">Sin eventos agregados</div>
      )}
    </div>
  );
}

export default function NuevaReformaPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preloadEventoId = searchParams.get("eventoId");

  const canSubmitReforma = canCreateReforma(user);

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [itemsCatalogo, setItemsCatalogo] = useState<CatalogItemPresupuestario[]>([]);

  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cambiosPorEvento, setCambiosPorEvento] = useState<Record<number, EventoCambiosResult>>({});
  /** FormaParticipacion.id elegibles por evento (financiamiento correcto y sin aval), según el buscador. */
  const [eligibleFormaIdsByEvento, setEligibleFormaIdsByEvento] = useState<Record<number, number[]>>({});
  const preloadedRef = useRef(false);
  const eventosRef = useRef(eventos);
  useEffect(() => {
    eventosRef.current = eventos;
  }, [eventos]);

  const [eventoSearchTerm, setEventoSearchTerm] = useState("");
  const [eventoSearchDebounced, setEventoSearchDebounced] = useState("");
  const [eventoSearchResults, setEventoSearchResults] = useState<EventoDisponibleAgrupado[]>([]);
  const [eventoSearchLoading, setEventoSearchLoading] = useState(false);
  const [eventoSearchOpen, setEventoSearchOpen] = useState(false);
  const eventoSearchRef = useRef<HTMLDivElement>(null);

  const [motivo, setMotivo] = useState("");
  const [de, setDe] = useState(DEFAULT_REQUEST_DE);
  const [para, setPara] = useState(DEFAULT_REQUEST_PARA);
  const [firmaCreadorNombre, setFirmaCreadorNombre] = useState("");
  const [firmaCreadorCargo, setFirmaCreadorCargo] = useState("");
  const [firmaRevisorNombre, setFirmaRevisorNombre] = useState("");
  const [firmaRevisorCargo, setFirmaRevisorCargo] = useState("");
  const [firmaAprobadorNombre, setFirmaAprobadorNombre] = useState("");
  const [firmaAprobadorCargo, setFirmaAprobadorCargo] = useState("");
  const [observacion, setObservacion] = useState("");
  const [mesEjecucion, setMesEjecucion] = useState<number | "">("");
  const [adjuntosReforma, setAdjuntosReforma] = useState<File[]>([]);
  const [adjuntosWarning, setAdjuntosWarning] = useState<string | null>(null);

  const [fuente, setFuente] = useState<FuentePresupuestoReforma | "">("");
  /** Financiamiento pendiente de confirmar: cambiarlo con eventos agregados los borra a todos. */
  const [pendingFuente, setPendingFuente] = useState<FuentePresupuestoReforma | "" | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [confirmUnbalancedOpen, setConfirmUnbalancedOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  useEffect(() => {
    async function loadInitial() {
      try {
        setLoadingInitial(true);
        setInitialError(null);
        const itemsResponse = await getItemsPresupuestarios();
        setItemsCatalogo(itemsResponse.data ?? []);

        if (preloadEventoId && !preloadedRef.current) {
          preloadedRef.current = true;
          const id = Number(preloadEventoId);
          if (Number.isFinite(id)) {
            const response = await getEvento(id);

            // El evento puede ser elegible en Fondos Públicos, Autogestión o ninguna
            // (avalado/bloqueado). Se busca por código en ambas fuentes para detectar
            // en cuál; si es ambiguo (elegible en las dos, o en ninguna) no se
            // precarga y el usuario elige el financiamiento y lo busca a mano.
            const [publicosRes, autogestionRes] = await Promise.all([
              getEventosDisponiblesReformaMulti({
                fuente: "FONDOS_PUBLICOS",
                search: response.data.codigo,
              }).catch(() => ({ data: [] })),
              getEventosDisponiblesReformaMulti({
                fuente: "AUTOGESTION",
                search: response.data.codigo,
              }).catch(() => ({ data: [] })),
            ]);
            const publicosMatch = groupEventosDisponiblesPorEvento(publicosRes.data ?? []).find(
              (evento) => evento.id === id,
            );
            const autogestionMatch = groupEventosDisponiblesPorEvento(autogestionRes.data ?? []).find(
              (evento) => evento.id === id,
            );

            const unicoMatch =
              publicosMatch && !autogestionMatch
                ? { fuente: "FONDOS_PUBLICOS" as const, agrupado: publicosMatch }
                : autogestionMatch && !publicosMatch
                  ? { fuente: "AUTOGESTION" as const, agrupado: autogestionMatch }
                  : null;

            if (unicoMatch) {
              setFuente(unicoMatch.fuente);
              setEventos((prev) => (prev.some((evento) => evento.id === id) ? prev : [response.data, ...prev]));
              setEligibleFormaIdsByEvento((prev) => ({
                ...prev,
                [id]: unicoMatch.agrupado.formas.map((forma) => forma.formaParticipacionId),
              }));
            }
          }
        }
      } catch (err: unknown) {
        setInitialError(err instanceof Error ? err.message : "No se pudo cargar la información inicial.");
      } finally {
        setLoadingInitial(false);
      }
    }

    void loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        setDe((current) => (shouldAutofillSolicitudValue(current, DEFAULT_REQUEST_DE) ? dtmValue : current));
      }
      if (pdaValue) {
        setPara((current) =>
          shouldAutofillSolicitudValue(current, DEFAULT_REQUEST_PARA) ? pdaValue : current,
        );
      }

      const revisor = parseSignatureLabel(metodologoValue || dtmValue);
      setFirmaRevisorNombre((current) => current || revisor.nombre || DEFAULT_FIRMA_REVISOR_NOMBRE);
      setFirmaRevisorCargo((current) => current || revisor.cargo || DEFAULT_FIRMA_REVISOR_CARGO);

      const aprobador = parseSignatureLabel(pdaValue);
      setFirmaAprobadorNombre(
        (current) => current || aprobador.nombre || DEFAULT_FIRMA_APROBADOR_NOMBRE,
      );
      setFirmaAprobadorCargo((current) => current || aprobador.cargo || DEFAULT_FIRMA_APROBADOR_CARGO);
    }

    void loadSolicitudDefaults();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const creatorName = buildUserFullName(user);
    if (creatorName) {
      setFirmaCreadorNombre((current) => current || creatorName);
    }
  }, [user]);

  useEffect(() => {
    const timeout = setTimeout(() => setEventoSearchDebounced(eventoSearchTerm), 350);
    return () => clearTimeout(timeout);
  }, [eventoSearchTerm]);

  useEffect(() => {
    // Sin financiamiento elegido no hay búsqueda: evita cruzar Fondos Públicos con Autogestión.
    if (!fuente) {
      setEventoSearchResults([]);
      return;
    }

    let cancelled = false;

    async function fetchResults() {
      setEventoSearchLoading(true);
      try {
        const response = await getEventosDisponiblesReformaMulti({
          fuente: fuente as FuentePresupuestoReforma,
          search: eventoSearchDebounced || undefined,
        });
        if (!cancelled) {
          const grouped = groupEventosDisponiblesPorEvento(response.data ?? []);
          setEventoSearchResults(
            grouped.filter((evento) => !eventosRef.current.some((added) => added.id === evento.id)),
          );
        }
      } catch {
        if (!cancelled) setEventoSearchResults([]);
      } finally {
        if (!cancelled) setEventoSearchLoading(false);
      }
    }

    void fetchResults();
    return () => {
      cancelled = true;
    };
  }, [eventoSearchDebounced, fuente]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (eventoSearchRef.current && !eventoSearchRef.current.contains(event.target as Node)) {
        setEventoSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleAddEvento(agrupado: EventoDisponibleAgrupado) {
    try {
      const response = await getEvento(agrupado.id);
      setEventos((prev) => (prev.some((item) => item.id === response.data.id) ? prev : [...prev, response.data]));
      setEligibleFormaIdsByEvento((prev) => ({
        ...prev,
        [agrupado.id]: agrupado.formas.map((forma) => forma.formaParticipacionId),
      }));
    } finally {
      setEventoSearchTerm("");
      setEventoSearchResults([]);
      setEventoSearchOpen(false);
    }
  }

  function handleRemoveEvento(eventoId: number) {
    setEventos((prev) => prev.filter((evento) => evento.id !== eventoId));
    setCambiosPorEvento((prev) => {
      const next = { ...prev };
      delete next[eventoId];
      return next;
    });
    setEligibleFormaIdsByEvento((prev) => {
      const next = { ...prev };
      delete next[eventoId];
      return next;
    });
  }

  /** Cambiar el financiamiento con eventos agregados los borraría a todos: pide confirmación. */
  function requestFuenteChange(next: FuentePresupuestoReforma | "") {
    if (eventos.length > 0 && next !== fuente) {
      setPendingFuente(next);
      return;
    }
    setFuente(next);
  }

  function confirmFuenteChange() {
    if (pendingFuente === null) return;
    setFuente(pendingFuente);
    setEventos([]);
    setCambiosPorEvento({});
    setEligibleFormaIdsByEvento({});
    setPendingFuente(null);
  }

  function cancelFuenteChange() {
    setPendingFuente(null);
  }

  function handleEventoCambiosChange(eventoId: number, result: EventoCambiosResult) {
    setCambiosPorEvento((prev) => ({ ...prev, [eventoId]: result }));
  }

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
        setAdjuntosWarning(`Estos archivos superan 5MB: ${rejectedSize.join(", ")}.`);
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

  /** Todos los movimientos de presupuesto propuestos en las tarjetas de evento, con su evento/forma. */
  const movimientosPresupuesto = useMemo<MovimientoLinea[]>(
    () =>
      eventos.flatMap((evento) => {
        const result = cambiosPorEvento[evento.id];
        if (!result || result.formaParticipacionId == null) return [];
        return result.movimientos.map((m) => ({
          ...m,
          eventoId: evento.id,
          formaParticipacionId: result.formaParticipacionId as number,
        }));
      }),
    [eventos, cambiosPorEvento],
  );

  const recortes = useMemo(
    () => movimientosPresupuesto.filter((m) => m.montoNuevo < m.montoOriginal),
    [movimientosPresupuesto],
  );
  const adiciones = useMemo(
    () => movimientosPresupuesto.filter((m) => m.montoNuevo > m.montoOriginal),
    [movimientosPresupuesto],
  );

  const totalCortado = useMemo(
    () => recortes.reduce((sum, m) => sum + (m.montoOriginal - m.montoNuevo), 0),
    [recortes],
  );
  const totalAsignado = useMemo(
    () => adiciones.reduce((sum, m) => sum + (m.montoNuevo - m.montoOriginal), 0),
    [adiciones],
  );

  const balanced = isBalanced(totalCortado, totalAsignado);

  /** Tipos de aval usados por los eventos que sí mueven plata (deben coincidir entre sí y con `fuente`). */
  const tipoAvalsUsados = useMemo(() => {
    const set = new Set<string>();
    eventos.forEach((evento) => {
      const result = cambiosPorEvento[evento.id];
      if (!result || result.movimientos.length === 0) return;
      const forma = evento.formasParticipacion?.find((f) => f.id === result.formaParticipacionId);
      if (forma?.tipoAval) set.add(forma.tipoAval);
    });
    return set;
  }, [eventos, cambiosPorEvento]);

  const eventosPayload = useMemo<CreateReformEventoPayload[]>(
    () =>
      eventos
        .map((evento) => {
          const result = cambiosPorEvento[evento.id];
          if (!result || Object.keys(result.cambiosPropuestos).length === 0) return null;
          return { eventoId: evento.id, cambiosPropuestos: result.cambiosPropuestos };
        })
        .filter((entry): entry is CreateReformEventoPayload => entry !== null),
    [cambiosPorEvento, eventos],
  );

  const hasUnresolvableBudgetItems = eventos.some(
    (evento) => cambiosPorEvento[evento.id]?.hasUnresolvableBudgetItems,
  );

  /** true si algún evento bajó un ítem por debajo de lo ya comprometido/ejecutado. */
  const hasBelowMinimoItems = eventos.some(
    (evento) => cambiosPorEvento[evento.id]?.hasBelowMinimoItems,
  );

  const hasAnyContent = eventosPayload.length > 0;

  function validateStepOne(): string | null {
    if (typeof mesEjecucion !== "number") return "Selecciona el mes de ejecución.";
    if (!motivo.trim()) return "El motivo es obligatorio.";
    if (motivo.trim().length > 600) return "El motivo no puede superar los 600 caracteres.";
    if (!firmaCreadorNombre.trim()) return "La firma solicitante - nombre es obligatoria.";
    if (!firmaCreadorCargo.trim()) return "La firma solicitante - cargo es obligatoria.";
    if (!firmaAprobadorNombre.trim()) return "La firma aprobador - nombre es obligatoria.";
    if (!firmaAprobadorCargo.trim()) return "La firma aprobador - cargo es obligatoria.";
    return null;
  }

  function validateForm(): string | null {
    const stepOneError = validateStepOne();
    if (stepOneError) return stepOneError;
    if (!fuente) return "Selecciona el tipo de financiamiento a reformar.";
    if (hasUnresolvableBudgetItems) {
      return "Uno o más eventos tienen ítems presupuestarios sin resolver.";
    }
    if (hasBelowMinimoItems) {
      return "Uno o más ítems quedaron por debajo de lo ya comprometido o ejecutado.";
    }
    if (!hasAnyContent) {
      return "Agrega al menos un evento con cambios.";
    }
    if (tipoAvalsUsados.size > 1) {
      return "Los eventos con movimientos de presupuesto usan distintos tipos de aval; deben coincidir.";
    }
    if (tipoAvalsUsados.size === 1) {
      const [unicoTipoAval] = tipoAvalsUsados;
      if (unicoTipoAval !== fuente) {
        return "El financiamiento elegido no coincide con el tipo de aval de los eventos agregados.";
      }
    }
    return null;
  }

  const validationError = validateForm();
  const isUnbalanced = movimientosPresupuesto.length > 0 && !balanced;

  function handleContinueToStepTwo() {
    const error = validateStepOne();
    if (error) {
      setSubmitError(error);
      return;
    }
    setSubmitError(null);
    setCurrentStep(2);
  }

  function handleSubmitClick() {
    if (!canSubmitReforma) {
      setSubmitError("Tu usuario no tiene permiso para solicitar reformas.");
      return;
    }
    const error = validateForm();
    if (error) {
      setSubmitError(error);
      return;
    }
    if (isUnbalanced) {
      setConfirmUnbalancedOpen(true);
      return;
    }
    void submitReforma();
  }

  async function submitReforma() {
    try {
      setSubmitting(true);
      setSubmitError(null);

      const payload: CreateReformPayload = {
        motivo: motivo.trim(),
        de: optionalText(de),
        para: optionalText(para),
        firmaCreadorNombre: optionalText(firmaCreadorNombre),
        firmaCreadorCargo: optionalText(firmaCreadorCargo),
        firmaRevisorNombre: optionalText(firmaRevisorNombre),
        firmaRevisorCargo: optionalText(firmaRevisorCargo),
        firmaAprobadorNombre: optionalText(firmaAprobadorNombre),
        firmaAprobadorCargo: optionalText(firmaAprobadorCargo),
        observacion: optionalText(observacion),
        mesEjecucion: mesEjecucion as number,
        // Todo movimiento de presupuesto viaja como valor absoluto dentro de
        // eventos[].cambiosPropuestos.formasParticipacion[].items (ver
        // evento-cambios-card.tsx). No se usan eventosOrigen/eventosDestino:
        // esa validación de balance no existe en el backend para /reforms y
        // aquí el descuadre es intencional (permitido, con aviso).
        eventos: eventosPayload.length > 0 ? eventosPayload : undefined,
      };

      const response = await createReform(payload);

      if (adjuntosReforma.length > 0) {
        try {
          await uploadReformAdjuntos(response.data.id, adjuntosReforma);
        } catch (uploadErr: unknown) {
          setSubmitError(
            uploadErr instanceof Error
              ? `La reforma ${response.data.id} se creó, pero falló la carga de adjuntos: ${uploadErr.message}. Podés verla en /reformas/${response.data.id}.`
              : `La reforma ${response.data.id} se creó, pero falló la carga de adjuntos. Podés verla en /reformas/${response.data.id}.`,
          );
          return;
        }
      }

      router.replace(`/reformas/${response.data.id}`);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 403) {
        setSubmitError("No tienes permisos para solicitar reformas con este usuario.");
        return;
      }
      setSubmitError(getReformErrorMessage(err, "No se pudo registrar la solicitud de reforma."));
    } finally {
      setSubmitting(false);
    }
  }

  const previewYear = useMemo(() => String(new Date().getFullYear()), []);
  const hasInformativeChanges =
    Boolean(de.trim()) || Boolean(para.trim()) || Boolean(motivo.trim()) || typeof mesEjecucion === "number";
  const hasBudgetChanges = totalCortado > 0 || totalAsignado > 0;

  const editedEventoPreviewBlocks = useMemo(
    () =>
      eventos.map((evento) =>
        buildEditedEventoPreviewBlock(
          {
            evento,
            result: cambiosPorEvento[evento.id] ?? {
              cambiosPropuestos: {},
              hasUnresolvableBudgetItems: false,
              hasBelowMinimoItems: false,
              formaParticipacionId: null,
              movimientos: [],
            },
          },
          itemsCatalogo,
        ),
      ),
    [cambiosPorEvento, eventos, itemsCatalogo],
  );

  if (loadingInitial) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-gray-600 dark:text-gray-300" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Cargando formulario de reforma...</p>
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
            href="/reformas"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a reformas
          </Link>
        </div>
      </div>
    );
  }

  if (initialError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4 dark:bg-gray-950">
        <div className="w-full max-w-lg rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
          <p className="font-medium">{initialError}</p>
          <Link
            href="/reformas"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-rose-700 underline dark:text-rose-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a reformas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen flex bg-white dark:bg-gray-950">
      <div
        className={`w-full overflow-y-auto ${
          previewVisible ? "lg:w-1/2 border-r border-gray-200 dark:border-gray-800" : ""
        }`}
      >
        <div
          className={`px-6 py-8 sm:px-8 space-y-8 ${
            previewVisible
              ? "mx-auto max-w-3xl"
              : currentStep === 2
                ? "mx-auto max-w-[1500px]"
                : "mx-auto max-w-6xl"
          }`}
        >
          <div>
            <Link
              href="/reformas"
              className="inline-flex items-center gap-2 text-sm text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a reformas
            </Link>

            <div className="mt-4 flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                <ClipboardEdit className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
                  Solicitud de reforma
                </p>
                <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">Nueva reforma</h1>
                <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                  Edita datos de eventos y mueve presupuesto entre eventos en una sola solicitud.
                </p>
              </div>
            </div>
          </div>

          {submitError ? (
            <AlertBanner variant="error" message={submitError} onClose={() => setSubmitError(null)} />
          ) : null}

          <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                    currentStep === 1
                      ? "bg-amber-500 text-gray-950"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                  }`}
                >
                  1
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Datos generales</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Motivo, firmas y adjuntos</p>
                </div>
              </div>
              <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                    currentStep === 2
                      ? "bg-amber-500 text-gray-950"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  2
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Eventos y presupuesto</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Cambios y distribución</p>
                </div>
              </div>
            </div>
          </section>

          {currentStep === 1 ? (
            <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Motivo de la solicitud</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Datos generales que se enviarán junto con los cambios propuestos.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">De</span>
                <input
                  type="text"
                  value={de}
                  onChange={(e) => setDe(e.target.value)}
                  maxLength={255}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Para</span>
                <input
                  type="text"
                  value={para}
                  onChange={(e) => setPara(e.target.value)}
                  maxLength={255}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                />
              </label>
            </div>

            <label className="mt-4 block space-y-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Mes de ejecución <span className="text-rose-500">*</span>
              </span>
              <select
                value={mesEjecucion === "" ? "" : String(mesEjecucion)}
                onChange={(e) => setMesEjecucion(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
              >
                <option value="">Selecciona un mes</option>
                {MES_OPCIONES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-4 block space-y-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Motivo <span className="text-rose-500">*</span>
              </span>
              <textarea
                rows={4}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                maxLength={600}
                placeholder="Ejemplo: se ajusta presupuesto y nombre del evento por planificación actualizada."
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
              />
              <span className="block text-right text-xs text-gray-400">{motivo.length}/600</span>
            </label>

            <label className="mt-4 block space-y-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Observación adicional</span>
              <textarea
                rows={3}
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                placeholder="Comentario opcional para complementar la solicitud."
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
              />
            </label>

            <section className="mt-4 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-gray-950/50">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Firmas del documento</h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Estos datos se usarán para las tres firmas del Excel de la reforma.
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
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
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
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Firma revisor - nombre
                  </span>
                  <input
                    type="text"
                    value={firmaRevisorNombre}
                    onChange={(e) => setFirmaRevisorNombre(e.target.value)}
                    maxLength={255}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Firma revisor - cargo
                  </span>
                  <input
                    type="text"
                    value={firmaRevisorCargo}
                    onChange={(e) => setFirmaRevisorCargo(e.target.value)}
                    maxLength={255}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
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
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
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
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
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
                Podés adjuntar hasta {MAX_ADJUNTOS_REFORMA} archivos de máximo 5MB. Formatos: PDF, PNG, JPG,
                JPEG, XLSX, XLS, CSV.
              </p>

              {adjuntosWarning ? (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">{adjuntosWarning}</p>
              ) : null}

              {adjuntosReforma.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {adjuntosReforma.map((archivo, index) => (
                    <li
                      key={`${archivo.name}_${archivo.size}_${index}`}
                      className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900 dark:text-gray-100">{archivo.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatBytes(archivo.size)}</p>
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
          ) : null}

          {currentStep === 2 ? (
            <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Eventos a reformar
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Cada evento tiene su antes (izquierda) y su después, editable (derecha). Si bajás
                presupuesto en un evento y lo subís en otro, estás moviendo plata entre ellos.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Tipo de financiamiento a reformar <span className="text-rose-500">*</span>
              </label>
              <select
                value={fuente}
                onChange={(e) => requestFuenteChange((e.target.value as FuentePresupuestoReforma) || "")}
                className="form-select w-full border border-gray-300 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="">Selecciona un financiamiento</option>
                <option value="FONDOS_PUBLICOS">Fondos Públicos</option>
                <option value="AUTOGESTION">Autogestión</option>
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Todos los eventos de esta reforma deben ser de este mismo financiamiento; no se
                puede mezclar Fondos Públicos con Autogestión en una misma solicitud.
              </p>
            </div>

            <div className="relative" ref={eventoSearchRef}>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={eventoSearchTerm}
                  disabled={!fuente}
                  onChange={(e) => {
                    setEventoSearchTerm(e.target.value);
                    setEventoSearchOpen(true);
                  }}
                  onFocus={() => setEventoSearchOpen(true)}
                  placeholder={fuente ? "Buscar evento por nombre o código..." : "Elegí el financiamiento primero"}
                  className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-9 pr-4 text-sm outline-none transition focus:border-gray-900 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                />
              </div>

              {eventoSearchOpen && fuente ? (
                <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                  {eventoSearchLoading ? (
                    <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">Buscando...</div>
                  ) : eventoSearchResults.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      No se encontraron eventos disponibles para este financiamiento.
                    </div>
                  ) : (
                    <ul className="max-h-56 divide-y divide-gray-100 overflow-y-auto dark:divide-gray-700">
                      {eventoSearchResults.map((evento) => (
                        <li key={evento.id}>
                          <button
                            type="button"
                            className="w-full px-4 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                            onClick={() => void handleAddEvento(evento)}
                          >
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {evento.nombre}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {evento.codigo}
                              {evento.disciplina ? ` · ${evento.disciplina.nombre}` : ""}
                              {evento.formas.length > 1
                                ? ` · ${evento.formas.length} tipos de participación`
                                : evento.formas[0]?.referencia?.trim()
                                  ? ` · ${evento.formas[0].referencia?.trim()}`
                                  : ""}
                            </p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>

            <div className="space-y-4">
              {eventos.map((evento) => (
                <EventoReformaCard
                  key={evento.id}
                  evento={evento}
                  result={cambiosPorEvento[evento.id]}
                  itemsCatalogo={itemsCatalogo}
                  eligibleFormaIds={eligibleFormaIdsByEvento[evento.id] ?? []}
                  onChange={(result) => handleEventoCambiosChange(evento.id, result)}
                  onRemove={() => handleRemoveEvento(evento.id)}
                />
              ))}
              {eventos.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-950/40 dark:text-gray-400">
                  {fuente
                    ? "Ningún evento agregado. Usa el buscador para agregar eventos."
                    : "Elegí el financiamiento para poder buscar y agregar eventos."}
                </div>
              ) : null}
            </div>

            <BalanceAdvisory totalCortado={totalCortado} totalAsignado={totalAsignado} />
          </section>
          ) : null}

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-6 dark:border-gray-800">
            <Link
              href="/reformas"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Cancelar
            </Link>
            {currentStep === 1 ? (
              <button
                type="button"
                onClick={handleContinueToStepTwo}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-medium text-gray-950 transition hover:bg-amber-400"
              >
                Continuar
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Volver
                </button>
                <button
                  type="button"
                  onClick={handleSubmitClick}
                  disabled={Boolean(validationError) || submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-medium text-gray-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {submitting ? "Enviando..." : "Enviar solicitud"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <Transition.Root show={confirmUnbalancedOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          role="dialog"
          onClose={() => {
            if (!submitting) setConfirmUnbalancedOpen(false);
          }}
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
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl border border-rose-200 bg-white text-left align-middle shadow-xl transition-all dark:border-rose-900/60 dark:bg-gray-800">
                  <div className="space-y-3 px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Esta reforma queda descuadrada
                      </Dialog.Title>
                    </div>
                    <Dialog.Description className="text-sm text-gray-700 dark:text-gray-300">
                      Lo que <strong>bajaste</strong> en unos eventos (
                      <strong>{formatCurrency(totalCortado)}</strong>) no es igual a lo que{" "}
                      <strong>subiste</strong> en otros (
                      <strong>{formatCurrency(totalAsignado)}</strong>). Diferencia:{" "}
                      <strong>{formatCurrency(Math.abs(totalCortado - totalAsignado))}</strong>.
                    </Dialog.Description>
                    <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
                      Esto solo debería pasar cuando la plata sale de otro presupuesto ya existente
                      (no de otro evento de esta reforma). Si no es ese el caso, es casi seguro que
                      falta reflejar un evento, o un monto está mal escrito. Confirmá solo si estás
                      seguro — un descuadre real puede generar problemas de presupuesto más adelante.
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50/60 px-6 py-4 dark:border-gray-700/60 dark:bg-gray-900/30">
                    <button
                      type="button"
                      className="btn border-gray-200 text-gray-700 hover:border-gray-300 dark:border-gray-700/60 dark:text-gray-200 dark:hover:border-gray-600"
                      onClick={() => setConfirmUnbalancedOpen(false)}
                      disabled={submitting}
                    >
                      Revisar de nuevo
                    </button>
                    <button
                      type="button"
                      className="btn bg-rose-600 text-white hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => {
                        setConfirmUnbalancedOpen(false);
                        void submitReforma();
                      }}
                      disabled={submitting}
                    >
                      Entiendo, enviar igual
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>

      <Transition.Root show={pendingFuente !== null} as={Fragment}>
        <Dialog as="div" className="relative z-50" role="dialog" onClose={cancelFuenteChange}>
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
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl border border-amber-200 bg-white text-left align-middle shadow-xl transition-all dark:border-amber-900/60 dark:bg-gray-800">
                  <div className="space-y-3 px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Cambiar el financiamiento borra los eventos agregados
                      </Dialog.Title>
                    </div>
                    <Dialog.Description className="text-sm text-gray-700 dark:text-gray-300">
                      Tenés {eventos.length} evento{eventos.length === 1 ? "" : "s"} agregado
                      {eventos.length === 1 ? "" : "s"}. Como no se puede mezclar Fondos Públicos con
                      Autogestión en la misma reforma, cambiar el financiamiento los quita a todos.
                    </Dialog.Description>
                  </div>

                  <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50/60 px-6 py-4 dark:border-gray-700/60 dark:bg-gray-900/30">
                    <button
                      type="button"
                      className="btn border-gray-200 text-gray-700 hover:border-gray-300 dark:border-gray-700/60 dark:text-gray-200 dark:hover:border-gray-600"
                      onClick={cancelFuenteChange}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="btn bg-amber-500 text-gray-950 hover:bg-amber-400"
                      onClick={confirmFuenteChange}
                    >
                      Quitar y cambiar
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>

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
                  <div>
                    {fuente === "FONDOS_PUBLICOS"
                      ? "Fondos Públicos"
                      : fuente === "AUTOGESTION"
                        ? "Autogestión"
                        : "Sin fuente"}
                  </div>
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
                  <div className="border-r border-slate-400 px-2 py-1 font-bold">Presupuesto</div>
                  <div className="px-2 py-1 text-center">{hasBudgetChanges ? "X" : ""}</div>
                </div>
              </div>

              <div className="mt-3 space-y-3">
                <EditedEventosPreviewColumn blocks={editedEventoPreviewBlocks} />
              </div>

              <div className="mt-6 grid grid-cols-3 gap-6">
                <ReformaPreviewSignature nombre={firmaCreadorNombre} cargo={firmaCreadorCargo} />
                <ReformaPreviewSignature nombre={firmaRevisorNombre} cargo={firmaRevisorCargo} />
                <ReformaPreviewSignature nombre={firmaAprobadorNombre} cargo={firmaAprobadorCargo} />
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
    </div>
  );
}
