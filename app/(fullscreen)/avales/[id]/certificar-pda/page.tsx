"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { useApprovalFlow } from "@/lib/hooks/use-approval-flow";
import { aprobarAval, adminSavePda, createPda } from "@/lib/api/avales";
import type { Aval, AvalPresupuestoFuente } from "@/types/aval";
import {
  formatCurrency,
  formatEventScheduleSentence,
  getResponsibleTrainerName,
} from "@/lib/utils/formatters";
import { formatCategoryLabel } from "@/lib/utils/categories";
import {
  ListaDeportistasPreview,
  SolicitudAvalPreview,
  type AvalPreviewFormData,
} from "@/app/(app)/avales/_components/aval-document-preview";
import { type PdaDraft } from "@/app/(app)/avales/_components/pda-preview";
import PresupuestoSalidaAnticipoPreview from "@/app/(app)/avales/_components/presupuesto-salida-anticipo-preview";
import ResponsableAnticipoPicker, {
  EMPTY_RESPONSABLE_ANTICIPO,
  buildResponsableAnticipoPayload,
  getResponsableAnticipoPreviewLabel,
  validateResponsableAnticipoDraft,
  type ResponsableAnticipoDraft,
} from "@/app/(app)/avales/_components/responsable-anticipo-picker";
import AlertBanner from "@/components/ui/alert-banner";
import PreviewCollapsible from "@/app/(app)/avales/_components/preview-collapsible";
import { isPdaUser } from "@/lib/auth/access";
import { getApprovalStageLabel, getTipoAvalLabel } from "@/lib/constants";
import {
  getNextApprovalStageForAval,
  getPreviousApprovalStagesForAval,
} from "@/lib/approval-flow";
import {
  getAvalPresupuestoItems,
  parseNotasFromBd,
  type NotaDraft,
} from "@/lib/utils/aval-collections";
import AvalDocumentosSection from "@/app/(app)/avales/_components/aval-documentos-section";
import { avalFlowDebugLog, summarizeAval } from "@/lib/debug/aval-flow";
import { useAutosaveDraft } from "@/lib/hooks/use-autosave-draft";
import SaveIndicator from "@/components/ui/save-indicator";
// import DraftRestoredToast from "@/components/ui/draft-restored-toast";

const INITIAL_PDA_DRAFT: PdaDraft = {
  descripcion: "",
  numeroPda: "",
  numeroAval: "",
  codigoActividad: "004",
  nombreFirmante: "",
  cargoFirmante: "",
};

const EMPTY_DOCS_DATA: AvalPreviewFormData = {
  deportistas: [],
  entrenadores: [],
  fechaHoraSalida: "",
  fechaHoraRetorno: "",
  lugarSalida: "",
  lugarRetorno: "",
  transporteSalida: "",
  transporteRetorno: "",
  objetivos: [],
  criterios: [],
  observaciones: "",
};

type BudgetDraftDia = {
  localId: string;
  nombrePersonalizado?: string;
  noDias?: number;
  cantidad?: number;
  valorUnitario?: number;
};

type BudgetDraftItem = {
  id: number;
  itemId: number;
  codigo: string | number;
  nombreBase: string;
  nombrePersonalizado: string;
  actividad: string;
  originalTotal: number;
  usaDetallePorDia: boolean;
  dias: BudgetDraftDia[];
};

type PdaAutosaveState = {
  draft: PdaDraft;
  budgetDraftItems: BudgetDraftItem[];
};

function resolveBudgetItemNombre(
  item: Pick<BudgetDraftItem, "nombreBase" | "nombrePersonalizado">,
) {
  return item.nombrePersonalizado.trim() || item.nombreBase;
}

function createBudgetDiaLocalId() {
  return `dia-${Math.random().toString(36).slice(2, 10)}`;
}

function buildTrainerDocsData(aval: Aval): AvalPreviewFormData {
  const tecnico = aval.avalTecnico;

  const deportistas = (tecnico?.deportistasAval ?? []).map((item) => {
    const withExtras = item as typeof item & {
      observacion?: string | null;
      deportista: typeof item.deportista & { fechaNacimiento?: string | null };
    };
    return {
      id: item.deportista?.id ?? item.id,
      nombre: item.deportista?.nombre ?? `Deportista ${item.id}`,
      cedula: item.deportista?.cedula ?? undefined,
      fechaNacimiento: withExtras.deportista?.fechaNacimiento ?? undefined,
      observacion: withExtras.observacion ?? undefined,
      rol: item.rol ?? undefined,
    };
  });

  const entrenadores = [...(aval.entrenadores ?? [])]
    .sort(
      (a, b) => Number(Boolean(b.esPrincipal)) - Number(Boolean(a.esPrincipal)),
    )
    .map((item) => {
      const withUser = item as typeof item & {
        usuario?: { nombre?: string; apellido?: string };
        entrenador?: { nombre?: string; apellido?: string };
        nombre?: string;
        apellido?: string;
      };
      const nombre = (
        [
          withUser.entrenador?.nombre ??
            withUser.usuario?.nombre ??
            withUser.nombre,
          withUser.entrenador?.apellido ??
            withUser.usuario?.apellido ??
            withUser.apellido,
        ]
          .filter(Boolean)
          .join(" ")
          .trim() || item.entrenadorNombre || `Entrenador ${item.id}`
      ).toUpperCase();
      return { id: item.entrenadorId ?? item.entrenador?.id ?? item.id, nombre };
    });

  return {
    deportistas,
    entrenadores,
    fechaHoraSalida: tecnico?.fechaHoraSalida ?? "",
    fechaHoraRetorno: tecnico?.fechaHoraRetorno ?? "",
    lugarSalida: tecnico?.lugarSalida ?? "",
    lugarRetorno: tecnico?.lugarRetorno ?? "",
    transporteSalida: tecnico?.transporteSalida ?? "",
    transporteRetorno: tecnico?.transporteRetorno ?? "",
    objetivos: [...(tecnico?.objetivos ?? [])]
      .sort((a, b) => a.orden - b.orden)
      .map((item) => item.descripcion),
    criterios: [...(tecnico?.criterios ?? [])]
      .sort((a, b) => a.orden - b.orden)
      .map((item) => item.descripcion),
    observaciones: tecnico?.observaciones ?? "",
  };
}

function buildDefaultDescripcion(aval: Aval) {
  const evento = aval.evento;
  const disciplina = evento?.disciplina?.nombre ?? "[DISCIPLINA]";
  const fecha = formatEventScheduleSentence(evento);
  const eventoNombre = evento?.nombre ?? "[NOMBRE EVENTO]";
  const categoria = formatCategoryLabel(
    evento?.categoria?.nombre ?? evento?.categoriaCodigo,
    "",
  );
  const entrenadorResponsable = getResponsibleTrainerName(
    aval,
    "[NOMBRE ENTRENADOR RESPONSABLE]",
  );
  const numeroAval =
    aval.avalTecnico?.numeroAval ??
    aval.aval ??
    aval.numeroColeccion ??
    String(aval.id);

  return `De acuerdo al aval Técnico de Participación Competitiva ${numeroAval}, de la disciplina de ${disciplina} con fecha ${fecha}, suscrito por ${entrenadorResponsable} Entrenador de la disciplina me permito certificar que el evento ${eventoNombre.toUpperCase()}${
    categoria ? ` (${categoria.toUpperCase()})` : ""
  } consta en el PDA 2026 aprobado por el Ministerio del Deporte.`;
}

function joinWithCommaAndY(items: string[]) {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} y ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

function buildDefaultNotas(aval: Aval): NotaDraft[] {
  const requerimientosRaw = getAvalPresupuestoItems(aval)
    .map((item) => item.item?.nombre?.trim().toLowerCase())
    .filter((item): item is string => Boolean(item));
  const requerimientos = Array.from(new Set(requerimientosRaw));
  const requerimientosTexto = joinWithCommaAndY(requerimientos);

  return [
    {
      texto: requerimientosTexto
        ? `El requerimiento es ${requerimientosTexto}`
        : "El requerimiento es pasajes ida y vuelta, hospedaje, transporte de personal y deportistas, afiliacion y alimentacion",
    },
    {
      texto: `Las facturas de gastos deben solicitarse con los siguientes datos:
Razon Social: FEDERACION DEPORTIVA PROVINCIAL DE LOJA
RUC: 1191708241001
Direccion: EL TEJAR, CALLE MACARA SN ENTRE MERCADILLO Y AZUAY
Email: federacionloja@yahoo.es
Telefono: 0999819109`,
    },
    {
      texto: "El informe de gastos, se entregara como maximo 72 horas culminada la competencia",
    },
  ];
}

function validatePdaDraft(_draft: PdaDraft): string | null {
  // descripcion comentada — la descripción se gestiona en Certificación Financiera
  // if (!_draft.descripcion.trim()) return "La descripción del certificado es obligatoria.";
  // if (_draft.descripcion.includes("[NUMERO AVAL]"))
  //   return "La descripción aún contiene [NUMERO AVAL]. Debes reemplazarlo.";
  // if (_draft.descripcion.includes("[NOMBRE PRESIDENTE]"))
  //   return "La descripción aún contiene [NOMBRE PRESIDENTE]. Debes reemplazarlo.";
  return null;
}

function normalizePositiveNumber(value: string, fallback?: number) {
  if (!value.trim()) return fallback;
  const parsed = Number.parseFloat(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function normalizeNonNegativeNumber(value: string, fallback?: number) {
  if (!value.trim()) return fallback;
  const parsed = Number.parseFloat(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

function normalizePositiveInteger(value: string, fallback?: number) {
  if (!value.trim()) return fallback;
  const digitsOnly = value.replace(/\D/g, "");
  if (!digitsOnly) return fallback;
  const parsed = Number.parseInt(digitsOnly, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function getDraftItemDiaTotal(dia: BudgetDraftDia) {
  return roundCurrency(
    (dia.noDias ?? 0) * (dia.cantidad ?? 0) * (dia.valorUnitario ?? 0),
  );
}

function getDraftItemTotal(item: BudgetDraftItem) {
  return roundCurrency(
    item.dias.reduce((sum, dia) => sum + getDraftItemDiaTotal(dia), 0),
  );
}

function createDefaultBudgetDia(
  valorUnitario = 0,
  nombrePersonalizado = "",
  noDias = 1,
  cantidad = 1,
): BudgetDraftDia {
  return {
    localId: createBudgetDiaLocalId(),
    nombrePersonalizado,
    noDias,
    cantidad,
    valorUnitario: roundCurrency(valorUnitario),
  };
}

function normalizeVisibleBudgetDias(dias: BudgetDraftDia[]): BudgetDraftDia[] {
  if (dias.length === 0) return [createDefaultBudgetDia()];
  return dias.map((dia) => ({
    ...dia,
    localId: dia.localId || createBudgetDiaLocalId(),
  }));
}

function sanitizeBudgetDias(dias: BudgetDraftDia[]): BudgetDraftDia[] {
  const validDias = dias.filter(
    (dia) =>
      typeof dia.noDias === "number" &&
      Number.isFinite(dia.noDias) &&
      dia.noDias > 0 &&
      typeof dia.cantidad === "number" &&
      Number.isFinite(dia.cantidad) &&
      dia.cantidad > 0 &&
      typeof dia.valorUnitario === "number" &&
      Number.isFinite(dia.valorUnitario) &&
      dia.valorUnitario >= 0,
  );

  if (validDias.length === 1) {
    const [dia] = validDias;
    return [
      {
        localId: dia.localId || createBudgetDiaLocalId(),
        nombrePersonalizado: dia.nombrePersonalizado?.trim() || "",
        noDias: dia.noDias,
        cantidad: dia.cantidad,
        valorUnitario: roundCurrency(dia.valorUnitario ?? 0),
      },
    ];
  }

  if (validDias.length > 1) {
    return validDias.map((dia) => ({
      localId: dia.localId || createBudgetDiaLocalId(),
      nombrePersonalizado: dia.nombrePersonalizado?.trim() || "",
      noDias: dia.noDias,
      cantidad: dia.cantidad,
      valorUnitario: roundCurrency(dia.valorUnitario ?? 0),
    }));
  }

  return [];
}

function collapseBudgetDias(
  dias: BudgetDraftDia[],
  fallbackValorUnitario = 0,
  fallbackNombrePersonalizado = "",
) {
  const validDias = sanitizeBudgetDias(dias);
  if (validDias.length === 0) {
    return [
      createDefaultBudgetDia(
        fallbackValorUnitario,
        fallbackNombrePersonalizado,
        1,
        1,
      ),
    ];
  }
  if (validDias.length === 1) {
    return validDias;
  }
  const cantidad = validDias.reduce(
    (sum, dia) => sum + (dia.noDias ?? 0) * (dia.cantidad ?? 0),
    0,
  );
  const total = validDias.reduce(
    (sum, dia) => sum + getDraftItemDiaTotal(dia),
    0,
  );

  return [
    {
      localId: createBudgetDiaLocalId(),
      nombrePersonalizado:
        validDias[0]?.nombrePersonalizado?.trim() ||
        fallbackNombrePersonalizado,
      noDias: 1,
      cantidad: cantidad || 1,
      valorUnitario:
        cantidad > 0
          ? roundCurrency(total / cantidad)
          : (validDias[0]?.valorUnitario ?? 0),
    },
  ];
}

function buildBudgetDraftItems(aval: Aval): BudgetDraftItem[] {
  const requerimientos = aval.avalTecnico?.requerimientos ?? [];

  // Si ya hay un PDA guardado, los días/cantidad/valor unitario reales
  // viven en aval.pda.items. Los preferimos por encima de los defaults
  // derivados del presupuesto efectivo del aval + avalTecnico.requerimientos para que
  // el form refleje lo último guardado al recargar (sino al editar se
  // pierde la data y volvés a ver los defaults).
  const pdaItemsByCatalog = new Map(
    (aval.pda?.items ?? []).map((pdaItem) => [pdaItem.itemId, pdaItem]),
  );

  return getAvalPresupuestoItems(aval).map((item) => {
    const totalOriginal = roundCurrency(
      Number.parseFloat(item.presupuesto ?? "0") || 0,
    );
    const pdaItem = pdaItemsByCatalog.get(item.item.id);

    if (pdaItem && Array.isArray(pdaItem.dias) && pdaItem.dias.length > 0) {
      const fallbackNombre =
        pdaItem.nombrePersonalizado?.trim() || item.item.nombre;
      const dias = sanitizeBudgetDias(
        pdaItem.dias.map((dia) => ({
          localId: createBudgetDiaLocalId(),
          nombrePersonalizado:
            dia.nombrePersonalizado?.trim() || fallbackNombre,
          noDias: Number(dia.noDias ?? 1),
          cantidad: Number(dia.cantidad ?? 0),
          valorUnitario: roundCurrency(Number(dia.valorUnitario ?? 0)),
        })),
      );
      return {
        id: item.id,
        itemId: item.item.id,
        codigo: item.item.codigo ?? String(item.item.numero),
        nombreBase: item.item.nombre,
        nombrePersonalizado:
          pdaItem.nombrePersonalizado?.trim() || item.item.nombre,
        actividad:
          item.item.actividad?.nombre ?? "EVENTOS DE PREPARACION Y COMPETENCIA",
        originalTotal: totalOriginal,
        usaDetallePorDia: dias.length > 1,
        dias:
          dias.length > 0
            ? dias
            : [createDefaultBudgetDia(totalOriginal, fallbackNombre)],
      };
    }

    const requerimiento = requerimientos.find(
      (c) => c.formaParticipacionItemId === item.id,
    );
    const noDias =
      normalizePositiveInteger(requerimiento?.cantidadDias ?? "1") || 1;
    const cantidad =
      normalizePositiveNumber(requerimiento?.cantidad ?? "1") || 1;
    const valorUnitario = roundCurrency(
      requerimiento?.valorUnitario && requerimiento.valorUnitario > 0
        ? requerimiento.valorUnitario
        : totalOriginal / (noDias * cantidad),
    );
    return {
      id: item.id,
      itemId: item.item.id,
      codigo: item.item.codigo ?? String(item.item.numero),
      nombreBase: item.item.nombre,
      nombrePersonalizado: item.item.nombre,
      actividad:
        item.item.actividad?.nombre ?? "EVENTOS DE PREPARACION Y COMPETENCIA",
      originalTotal: totalOriginal,
      usaDetallePorDia: false,
      dias: [
        {
          localId: createBudgetDiaLocalId(),
          nombrePersonalizado: item.item.nombre,
          noDias,
          cantidad,
          valorUnitario,
        },
      ],
    };
  });
}

function PresupuestoFuenteWidget({
  presupuesto,
}: {
  presupuesto: AvalPresupuestoFuente;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-4 py-3 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Presupuesto
        {presupuesto.fuente ? ` — ${getTipoAvalLabel(presupuesto.fuente)}` : ""}
      </p>
      <div className="grid grid-cols-3 gap-3">
        {(
          [
            { label: "Asignado", value: presupuesto.asignado },
            { label: "Comprometido", value: presupuesto.comprometido },
            { label: "Disponible", value: presupuesto.disponible },
          ] as const
        ).map(({ label, value }) => (
          <div key={label}>
            <p className="text-[0.65rem] text-gray-500 dark:text-gray-400">
              {label}
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {formatCurrency(value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CertificarAvalPage() {
  const params = useParams();
  const router = useRouter();
  const avalId = Number(params.id);

  const [draft, setDraft] = useState<PdaDraft>(INITIAL_PDA_DRAFT);
  const [budgetDraftItems, setBudgetDraftItems] = useState<BudgetDraftItem[]>([]);
  const [notas, setNotas] = useState<NotaDraft[]>([]);
  const [editableNotas, setEditableNotas] = useState<boolean[]>([]);
  const [notesInitialized, setNotesInitialized] = useState(false);
  const [responsableAnticipo, setResponsableAnticipo] =
    useState<ResponsableAnticipoDraft>(EMPTY_RESPONSABLE_ANTICIPO);
  const [responsableAnticipoInitialized, setResponsableAnticipoInitialized] =
    useState(false);
  // Autosave desactivado — refs y state conservados comentados por si se reactiva
  // const [draftRestoredAt, setDraftRestoredAt] = useState<Date | null>(null);
  // const [draftToastVisible, setDraftToastVisible] = useState(false);
  const autosaveRef = useRef<{ clear: () => void }>({ clear: () => {} });
  const autosaveRestoredRef = useRef(false);
  // const hasRestoredRef = useRef(false);

  const totalPresupuestoDraft = useMemo(
    () =>
      budgetDraftItems.reduce(
        (total, item) => total + getDraftItemTotal(item),
        0,
      ),
    [budgetDraftItems],
  );

  const {
    authLoading,
    user,
    hasRequiredRole: isPda,
    defaultSignerName,
    defaultSignerCargo,
    aval,
    loading,
    error,
    actionLoading,
    actionError,
    toast,
    setToast,
    rechazoMotivo,
    setRechazoMotivo,
    etapaDestino,
    setEtapaDestino,
    currentEtapa,
    isEditable,
    adminSaveOnly,
    summaryText,
    handleApprove,
    handleReject,
  } = useApprovalFlow({
    avalId,
    requiredRole: isPdaUser,
    editableEtapa: "SOLICITUD",
    approvalEtapa: (etapa, currentAval) =>
      getNextApprovalStageForAval(currentAval, etapa) ?? etapa,
    enableEtapaDestino: true,
    validateApprove: useCallback(() => {
      const pdaError = validatePdaDraft(draft);
      if (pdaError) return pdaError;

      const invalidItems = budgetDraftItems.filter(
        (item) =>
          sanitizeBudgetDias(item.dias).length === 0 ||
              sanitizeBudgetDias(item.dias).some(
                (dia) =>
                  !dia.noDias ||
                  !dia.cantidad ||
                  dia.noDias <= 0 ||
                  dia.cantidad <= 0 ||
                  dia.valorUnitario! < 0,
              ),
      );
      if (invalidItems.length > 0) {
        return "Todos los ítems deben tener no. días y cantidad mayores a 0, y valor unitario mayor o igual a 0.";
      }

      const responsableAnticipoError = validateResponsableAnticipoDraft(
        responsableAnticipo,
      );
      if (responsableAnticipoError) return responsableAnticipoError;

      return null;
    }, [draft, budgetDraftItems, responsableAnticipo]),
    onApproveAction: useCallback(
      async ({ aval: a, userId, approvalEtapa, adminSaveOnly }) => {
        const items = budgetDraftItems
          .map((item) => ({
            itemId: item.itemId,
            formaParticipacionItemId: item.id,
            nombrePersonalizado:
              item.nombrePersonalizado.trim() &&
              item.nombrePersonalizado.trim() !== item.nombreBase
                ? item.nombrePersonalizado.trim()
                : undefined,
            presupuesto: getDraftItemTotal(item),
            dias: (item.usaDetallePorDia
              ? sanitizeBudgetDias(item.dias)
              : collapseBudgetDias(
                  item.dias,
                  item.originalTotal,
                  resolveBudgetItemNombre(item),
                )
            ).map((dia) => ({
              nombrePersonalizado:
                dia.nombrePersonalizado?.trim() &&
                dia.nombrePersonalizado.trim() !== resolveBudgetItemNombre(item)
                  ? dia.nombrePersonalizado.trim()
                  : undefined,
              noDias: dia.noDias!,
              cantidad: dia.cantidad!,
              valorUnitario: dia.valorUnitario!,
              subtotal: getDraftItemDiaTotal(dia),
            })),
          }))
          .filter(
            (item) => Number.isFinite(item.presupuesto) && item.itemId > 0,
          );

        const notasPayload = notas
          .map((nota, index) => ({
            titulo: `NOTA ${index + 1}`,
            texto: nota.texto.trim(),
          }))
          .filter((nota) => nota.texto.length > 0);

        const pdaPayload = {
          descripcion: draft.descripcion.trim(),
          numeroPda: draft.numeroPda?.trim() || undefined,
          numeroAval: draft.numeroAval?.trim() || undefined,
          codigoActividad: draft.codigoActividad?.trim() || "004",
          nombreFirmante: draft.nombreFirmante?.trim() || undefined,
          cargoFirmante: draft.cargoFirmante?.trim() || undefined,
          items: items.length > 0 ? items : undefined,
          notas: notasPayload.length > 0 ? notasPayload : undefined,
          ...buildResponsableAnticipoPayload(responsableAnticipo),
        };

        avalFlowDebugLog("pda", "payload de aprobacion listo", {
          aval: summarizeAval(a),
          userId,
          approvalEtapa,
          pdaPayload,
          items,
        });

        if (adminSaveOnly) {
          await adminSavePda(a.id, userId, pdaPayload, approvalEtapa);
        } else {
          await createPda(a.id, pdaPayload);
          await aprobarAval(a.id, userId, approvalEtapa, {});
        }
        autosaveRef.current.clear();
      },
      [draft, budgetDraftItems, notas, responsableAnticipo, autosaveRef],
    ),
    onRejectSuccess: useCallback(() => { autosaveRef.current.clear(); }, [autosaveRef]),
    approveSuccessMessage: "PDA aprobado correctamente.",
    rejectSuccessMessage: "PDA rechazado correctamente.",
  });

  // Reset local state when navigating between avales
  useEffect(() => {
    setDraft(INITIAL_PDA_DRAFT);
    setBudgetDraftItems([]);
    setNotas([]);
    setEditableNotas([]);
    setNotesInitialized(false);
    setResponsableAnticipo(EMPTY_RESPONSABLE_ANTICIPO);
    setResponsableAnticipoInitialized(false);
    autosaveRestoredRef.current = false;
  }, [avalId]);

  // Initialize notes once aval loads — prefer BD data, fall back to computed defaults
  useEffect(() => {
    if (notesInitialized) return;
    if (!aval) return;
    const savedNotas = parseNotasFromBd(aval.pda?.notas);
    const initialNotas = savedNotas ?? buildDefaultNotas(aval);
    const fromBd = savedNotas !== null;
    setNotas(initialNotas);
    setEditableNotas(initialNotas.map(() => fromBd));
    setNotesInitialized(true);
  }, [notesInitialized, aval]);

  // Precarga el responsable del anticipo ya guardado en el aval (una sola vez).
  useEffect(() => {
    if (responsableAnticipoInitialized) return;
    if (!aval) return;
    const tecnico = aval.avalTecnico;
    if (tecnico?.responsableAnticipoId != null) {
      setResponsableAnticipo({
        mode: "usuario",
        usuarioId: tecnico.responsableAnticipoId,
        usuarioNombre: tecnico.responsableAnticipoNombre ?? undefined,
        usuarioDocumento: tecnico.responsableAnticipoNumeroDocumento ?? undefined,
        nombre: "",
        tipoDocumento: "",
        numeroDocumento: "",
      });
    } else if (tecnico?.responsableAnticipoNombre?.trim()) {
      setResponsableAnticipo({
        mode: "manual",
        nombre: tecnico.responsableAnticipoNombre,
        tipoDocumento: tecnico.responsableAnticipoTipoDocumento ?? "",
        numeroDocumento: tecnico.responsableAnticipoNumeroDocumento ?? "",
      });
    }
    setResponsableAnticipoInitialized(true);
  }, [responsableAnticipoInitialized, aval]);

  const handleNotaChange = useCallback((index: number, value: string) => {
    setNotas((prev) =>
      prev.map((nota, i) => (i === index ? { ...nota, texto: value } : nota)),
    );
  }, []);

  const handleAddNota = useCallback(() => {
    setNotas((prev) => [...prev, { texto: "" }]);
    setEditableNotas((prev) => [...prev, true]);
  }, []);

  const handleRemoveNota = useCallback((index: number) => {
    setNotas((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
    setEditableNotas((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleEnableNotaEdit = useCallback((index: number) => {
    setEditableNotas((prev) =>
      prev.map((editable, i) => (i === index ? true : editable)),
    );
  }, []);

  // Populate draft description, numbers and firmante from the loaded aval.
  // Si el PDA ya fue aprobado, preservamos el firmante original (no queremos
  // que un admin editando data pise el nombre del PDA que lo aprobo). Si no
  // hay PDA todavia, cae al usuario actual (defaultSigner*) como antes.
  useEffect(() => {
    if (!aval) return;
    if (draft.descripcion.trim()) return;
    setDraft((prev) => ({
      ...prev,
      descripcion: buildDefaultDescripcion(aval),
      numeroPda: prev.numeroPda || aval.pda?.numeroPda || "",
      numeroAval: prev.numeroAval || aval.pda?.numeroAval || "",
      nombreFirmante:
        aval.pda?.nombreFirmante ||
        prev.nombreFirmante ||
        defaultSignerName ||
        "",
      cargoFirmante:
        aval.pda?.cargoFirmante ||
        prev.cargoFirmante ||
        defaultSignerCargo ||
        "",
    }));
  }, [aval, draft.descripcion, defaultSignerName, defaultSignerCargo]);

  // Build budget items by aval funding source (skipped if restored from autosave)
  useEffect(() => {
    if (!aval) return;
    if (autosaveRestoredRef.current) return;
    if (aval.tipoAval === "SOLO_RESULTADO") {
      setBudgetDraftItems([]);
      return;
    }
    setBudgetDraftItems(buildBudgetDraftItems(aval));
  }, [aval]);

  // Autosave desactivado para este paso
  const autosaveCombined = useMemo<PdaAutosaveState>(
    () => ({ draft, budgetDraftItems }),
    [draft, budgetDraftItems],
  );

  const {
    status: autosaveStatus,
    lastSavedAt: autosaveLastSavedAt,
    // restore: restoreAutosave,
    // clear: clearAutosave,
  } = useAutosaveDraft<PdaAutosaveState>({
    key: `aval:${avalId}:pda`,
    state: autosaveCombined,
    enabled: false,
    userId: user?.id,
  });

  // useEffect(() => {
  //   autosaveRef.current = { clear: clearAutosave };
  // }, [clearAutosave]);

  // Restore autosave draft when the form first becomes editable
  // useEffect(() => {
  //   if (!aval || !isEditable || hasRestoredRef.current) return;
  //   hasRestoredRef.current = true;
  //   const restored = restoreAutosave();
  //   if (restored) {
  //     setDraft(restored.state.draft);
  //     setBudgetDraftItems(restored.state.budgetDraftItems);
  //     setDraftRestoredAt(restored.savedAt);
  //     setDraftToastVisible(true);
  //     autosaveRestoredRef.current = true;
  //   }
  // }, [aval, isEditable, restoreAutosave]);

  // const handleDiscardDraft = useCallback(() => {
  //   clearAutosave();
  //   if (aval) setBudgetDraftItems(buildBudgetDraftItems(aval));
  //   setDraft(INITIAL_PDA_DRAFT);
  //   setDraftToastVisible(false);
  //   autosaveRestoredRef.current = false;
  // }, [clearAutosave, aval]);

  const trainerDocsData = useMemo(
    () => (aval ? buildTrainerDocsData(aval) : EMPTY_DOCS_DATA),
    [aval],
  );

  const presupuestoItems = useMemo(() => {
    if (!aval) return [];
    return getAvalPresupuestoItems(aval);
  }, [aval]);
  const totalPresupuestoOriginal = useMemo(
    () =>
      presupuestoItems.reduce(
        (total, item) =>
          total + (Number.parseFloat(item.presupuesto ?? "0") || 0),
        0,
      ),
    [presupuestoItems],
  );
  const totalDifference = useMemo(
    () => roundCurrency(totalPresupuestoDraft - totalPresupuestoOriginal),
    [totalPresupuestoDraft, totalPresupuestoOriginal],
  );
  const totalMatches = Math.abs(totalDifference) < 0.01;

  const responsableAnticipoPreviewLabel = useMemo(
    () => getResponsableAnticipoPreviewLabel(responsableAnticipo),
    [responsableAnticipo],
  );

  const budgetPreviewItems = useMemo(
    () =>
      budgetDraftItems.map((item) => ({
        id: item.id,
        itemId: item.itemId,
        nombre: resolveBudgetItemNombre(item),
        total: getDraftItemTotal(item),
        dias: sanitizeBudgetDias(item.dias)
          .filter(
            (dia): dia is BudgetDraftDia =>
              typeof dia.noDias === "number" &&
              typeof dia.cantidad === "number" &&
              typeof dia.valorUnitario === "number",
          )
          .map((dia) => ({
            nombrePersonalizado: dia.nombrePersonalizado?.trim() || undefined,
            noDias: dia.noDias ?? 0,
            cantidad: dia.cantidad ?? 0,
            valorUnitario: dia.valorUnitario ?? 0,
            subtotal: getDraftItemDiaTotal(dia),
          })),
      })),
    [budgetDraftItems],
  );

  const handleDiaChange = useCallback(
    (
      itemId: number,
      diaLocalId: string,
      field: "noDias" | "cantidad" | "valorUnitario",
      value: string,
    ) => {
      setBudgetDraftItems((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) return item;
          return {
            ...item,
            dias: normalizeVisibleBudgetDias(item.dias).map((dia) =>
              dia.localId === diaLocalId
                ? {
                    ...dia,
                    [field]:
                      field === "noDias"
                        ? normalizePositiveInteger(value)
                        : field === "valorUnitario"
                          ? normalizeNonNegativeNumber(value)
                          : normalizePositiveNumber(value),
                  }
                : dia,
            ),
          };
        }),
      );
    },
    [],
  );

  const handleDiaNombreChange = useCallback(
    (itemId: number, diaLocalId: string, value: string) => {
      setBudgetDraftItems((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) return item;
          return {
            ...item,
            dias: normalizeVisibleBudgetDias(item.dias).map((dia) =>
              dia.localId === diaLocalId
                ? { ...dia, nombrePersonalizado: value }
                : dia,
            ),
          };
        }),
      );
    },
    [],
  );

  const handleNombrePersonalizadoChange = useCallback(
    (itemId: number, value: string) => {
      setBudgetDraftItems((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) return item;
          const updated = { ...item, nombrePersonalizado: value };
          if (!item.usaDetallePorDia && item.dias.length === 1) {
            updated.dias = [{ ...item.dias[0], nombrePersonalizado: value }];
          }
          return updated;
        }),
      );
    },
    [],
  );

  const handleToggleDetallePorDia = useCallback((itemId: number) => {
    setBudgetDraftItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;

        const nextUsesBreakdown = !item.usaDetallePorDia;
        if (nextUsesBreakdown) {
          const dias = normalizeVisibleBudgetDias(item.dias);
          const nombre = resolveBudgetItemNombre(item);
          return {
            ...item,
            usaDetallePorDia: true,
            dias: dias.length < 2
              ? [
                  ...dias,
                  {
                    localId: createBudgetDiaLocalId(),
                    nombrePersonalizado: nombre,
                    noDias: 1,
                    cantidad: 1,
                    valorUnitario: dias[0]?.valorUnitario ?? 0,
                  },
                ]
              : dias,
          };
        }
        return {
          ...item,
          usaDetallePorDia: false,
          dias: collapseBudgetDias(
            item.dias,
            item.originalTotal,
            resolveBudgetItemNombre(item),
          ),
        };
      }),
    );
  }, []);

  const handleAddDia = useCallback((itemId: number) => {
    setBudgetDraftItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const dias = normalizeVisibleBudgetDias(item.dias);
        return {
          ...item,
          usaDetallePorDia: true,
          dias: [
            ...dias,
            {
              localId: createBudgetDiaLocalId(),
              nombrePersonalizado: resolveBudgetItemNombre(item),
              noDias: 1,
              cantidad: 1,
              valorUnitario: dias[0]?.valorUnitario ?? 0,
            },
          ],
        };
      }),
    );
  }, []);

  const handleRemoveDia = useCallback((itemId: number, diaLocalId: string) => {
    setBudgetDraftItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;

        const dias = normalizeVisibleBudgetDias(item.dias).filter(
          (dia) => dia.localId !== diaLocalId,
        );

        if (dias.length <= 1) {
          return {
            ...item,
            usaDetallePorDia: false,
            dias: collapseBudgetDias(
              dias,
              item.originalTotal,
              resolveBudgetItemNombre(item),
            ),
          };
        }

        return {
          ...item,
          dias,
        };
      }),
    );
  }, []);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Cargando sesión...
          </p>
        </div>
      </div>
    );
  }

  if (!isPda) {
    return (
      <div className="px-6 py-8">
        <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl p-6 text-center">
          No tienes permisos para acceder a esta pantalla.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Cargando información del aval...
          </p>
        </div>
      </div>
    );
  }

  if (error || !aval) {
    return (
      <div className="px-6 py-8">
        <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl p-6 text-center">
          {error || "No se encontró el aval."}
        </div>
      </div>
    );
  }

  if (aval.tipoAval === "SOLO_RESULTADO") {
    return (
      <div className="px-6 py-8">
        <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-xl p-6 text-center">
          Este aval es de tipo <strong>Solo por Resultados</strong> y no
          requiere certificación PDA.
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex">
      {/* DraftRestoredToast desactivado — autosave deshabilitado
      <DraftRestoredToast
        visible={draftToastVisible}
        savedAt={draftRestoredAt}
        onDiscard={handleDiscardDraft}
        onDismiss={() => setDraftToastVisible(false)}
      /> */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 max-w-sm w-full drop-shadow-lg">
          <AlertBanner
            variant={toast.variant}
            message={toast.message}
            onClose={() => setToast(null)}
          />
        </div>
      )}
      <div className="w-full lg:w-1/2 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
        <div className="h-full w-full overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
            <button
              onClick={() => router.push("/avales")}
              className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>

            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                    Certificacion PDA
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Completa los datos del modelo PDA. El parrafo principal se
                    agregara despues.
                  </p>
                </div>
                {isEditable && (
                  <SaveIndicator
                    status={autosaveStatus}
                    lastSavedAt={autosaveLastSavedAt}
                    className="mt-2 shrink-0"
                  />
                )}
              </div>

              <div className="space-y-3 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Responsable del anticipo
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Quien recibe el anticipo del presupuesto. Si no seleccionas
                    a nadie, se mantiene el responsable ya guardado (o el
                    creador del aval por defecto).
                  </p>
                </div>
                <ResponsableAnticipoPicker
                  value={responsableAnticipo}
                  onChange={setResponsableAnticipo}
                  disabled={!isEditable}
                />
              </div>

              {/* Presupuesto por fuente */}
              {aval.presupuesto && (
                <div>
                  <PresupuestoFuenteWidget presupuesto={aval.presupuesto} />
                </div>
              )}

              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/40">
                <div className="flex items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Items del presupuesto
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Usa una fila simple o desglosa varias cuando cambie el
                      valor por día.
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                      Total
                    </p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {formatCurrency(totalPresupuestoDraft)}
                    </p>
                  </div>
                </div>

                <div className="px-4 pt-4">
                  <div
                    className={`rounded-xl border px-3 py-2 text-xs ${
                      totalMatches
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300"
                    }`}
                  >
                    <p>
                      Presupuesto original:{" "}
                      {formatCurrency(totalPresupuestoOriginal)}
                    </p>
                    <p>
                      Presupuesto asignado:{" "}
                      {formatCurrency(totalPresupuestoDraft)}
                    </p>
                    <p>
                      Diferencia: {formatCurrency(Math.abs(totalDifference))}
                    </p>
                  </div>
                </div>

                {budgetDraftItems.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">
                    Este aval no tiene items presupuestarios registrados.
                  </div>
                ) : (
                  <div className="space-y-6 p-4">
                    {budgetDraftItems.map((item) => (
                      <div
                        key={item.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                      >
                        {(() => {
                          const visibleDias = normalizeVisibleBudgetDias(item.dias);
                          const currentTotal = getDraftItemTotal(item);
                          const itemDifference = roundCurrency(
                            currentTotal - item.originalTotal,
                          );
                          const itemMatches = Math.abs(itemDifference) < 0.01;

                          return (
                            <>
                              <div className="bg-gray-50 dark:bg-gray-800/60 px-4 py-3">
                                <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                                  {item.codigo} -{" "}
                                  {resolveBudgetItemNombre(item)}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {item.actividad}
                                </p>
                                <div className="mt-3">
                                  <label className="block">
                                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                      Nombre personalizado
                                    </span>
                                    <input
                                      className="form-input mt-1 w-full"
                                      value={item.nombrePersonalizado}
                                      readOnly={!isEditable}
                                      disabled={!isEditable}
                                      onChange={(e) =>
                                        handleNombrePersonalizadoChange(
                                          item.id,
                                          e.target.value,
                                        )
                                      }
                                      placeholder={item.nombreBase}
                                    />
                                  </label>
                                </div>
                                <div className="mt-3 flex items-center justify-between gap-3">
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {item.usaDetallePorDia
                                      ? "Puedes agregar varias filas si cambian los días o la cantidad."
                                      : "Cada fila maneja no. dias, cantidad y valor unitario."}
                                  </p>
                                  <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300">
                                    <input
                                      type="checkbox"
                                      className="form-checkbox"
                                      checked={item.usaDetallePorDia}
                                      disabled={!isEditable}
                                      onChange={() =>
                                        handleToggleDetallePorDia(item.id)
                                      }
                                    />
                                    Usar varias filas
                                  </label>
                                </div>
                                <div
                                  className={`mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3 ${
                                    itemMatches
                                      ? "text-emerald-700 dark:text-emerald-300"
                                      : "text-amber-700 dark:text-amber-300"
                                  }`}
                                >
                                  <p>
                                    Inicial:{" "}
                                    {formatCurrency(item.originalTotal)}
                                  </p>
                                  <p>Actual: {formatCurrency(currentTotal)}</p>
                                  <p>
                                    Diferencia: {itemDifference > 0 ? "+" : ""}
                                    {formatCurrency(itemDifference)}
                                  </p>
                                </div>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-100 dark:bg-gray-800">
                                    <tr>
                                      {item.usaDetallePorDia && (
                                        <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300 w-[40%]">
                                          Nombre
                                        </th>
                                      )}
                                      <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">
                                        No. dias
                                      </th>
                                      <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">
                                        Cantidad
                                      </th>
                                      <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">
                                        V. Unitario
                                      </th>
                                      <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">
                                        Subtotal
                                      </th>
                                      {item.usaDetallePorDia && (
                                        <th className="px-3 py-2 text-center font-medium text-gray-600 dark:text-gray-300">
                                          Acciones
                                        </th>
                                      )}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {visibleDias.map((dia) => (
                                      <tr key={dia.localId}>
                                        {item.usaDetallePorDia && (
                                          <td className="px-3 py-2 w-[40%]">
                                            <input
                                              type="text"
                                              className="form-input w-full"
                                              value={
                                                dia.nombrePersonalizado || ""
                                              }
                                              readOnly={!isEditable}
                                              disabled={!isEditable}
                                              onChange={(e) =>
                                                handleDiaNombreChange(
                                                  item.id,
                                                  dia.localId,
                                                  e.target.value,
                                                )
                                              }
                                              placeholder={resolveBudgetItemNombre(
                                                item,
                                              )}
                                            />
                                          </td>
                                        )}
                                        <td className="px-3 py-2 text-right">
                                          <input
                                            type="text"
                                            inputMode="numeric"
                                            className="form-input w-20 ml-auto text-right"
                                            value={dia.noDias || ""}
                                            readOnly={!isEditable}
                                            disabled={!isEditable}
                                            onChange={(e) => {
                                              const value =
                                                e.target.value.replace(
                                                  /\D/g,
                                                  "",
                                                );
                                              handleDiaChange(
                                                item.id,
                                                dia.localId,
                                                "noDias",
                                                value,
                                              );
                                            }}
                                          />
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                          <input
                                            type="text"
                                            inputMode="decimal"
                                            className="form-input w-20 ml-auto text-right"
                                            value={dia.cantidad || ""}
                                            readOnly={!isEditable}
                                            disabled={!isEditable}
                                            onChange={(e) => {
                                              const value = e.target.value
                                                .replace(/[^0-9.,]/g, "")
                                                .replace(",", ".");
                                              handleDiaChange(
                                                item.id,
                                                dia.localId,
                                                "cantidad",
                                                value,
                                              );
                                            }}
                                          />
                                        </td>
                                          <td className="px-3 py-2 text-right">
                                            <input
                                              type="text"
                                              inputMode="decimal"
                                              className="form-input w-24 ml-auto text-right"
                                              value={dia.valorUnitario ?? ""}
                                            readOnly={!isEditable}
                                            disabled={!isEditable}
                                            onChange={(e) => {
                                              const value = e.target.value
                                                .replace(/[^0-9.,]/g, "")
                                                .replace(",", ".");
                                              handleDiaChange(
                                                item.id,
                                                dia.localId,
                                                "valorUnitario",
                                                value,
                                              );
                                            }}
                                          />
                                        </td>
                                        <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-gray-100">
                                          {formatCurrency(
                                            getDraftItemDiaTotal(dia),
                                          )}
                                        </td>
                                        {item.usaDetallePorDia && (
                                          <td className="px-3 py-2 text-center">
                                            {isEditable && (
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleRemoveDia(
                                                    item.id,
                                                    dia.localId,
                                                  )
                                                }
                                                className="text-rose-500 hover:text-rose-600 text-lg"
                                              >
                                                ×
                                              </button>
                                            )}
                                          </td>
                                        )}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              <div className="bg-gray-50 dark:bg-gray-800/40 px-4 py-2 flex items-center justify-between">
                                <div>
                                  {isEditable && item.usaDetallePorDia && (
                                    <button
                                      type="button"
                                      onClick={() => handleAddDia(item.id)}
                                      className="text-xs font-medium text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300"
                                    >
                                      + Agregar fila
                                    </button>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Total del ítem
                                  </p>
                                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    {formatCurrency(currentTotal)}
                                  </p>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Notas del presupuesto de salida
                  </h2>
                  {isEditable && (
                    <button
                      type="button"
                      onClick={handleAddNota}
                      className="btn bg-gray-900 text-white hover:bg-gray-800 text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Agregar nota
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {notas.map((nota, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <textarea
                        className="form-textarea w-full text-sm"
                        rows={4}
                        value={nota.texto}
                        readOnly={!isEditable || !editableNotas[index]}
                        disabled={!isEditable || !editableNotas[index]}
                        onChange={(e) => handleNotaChange(index, e.target.value)}
                        placeholder={`Nota ${index + 1}`}
                      />
                      {isEditable && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleEnableNotaEdit(index)}
                            className="btn bg-cyan-600 text-white hover:bg-cyan-700 text-xs"
                            title="Editar nota"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveNota(index)}
                            disabled={notas.length <= 1}
                            className="btn bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                            title="Eliminar nota"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Firmante
                  </h2>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="block md:col-span-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Nombre firmante
                    </span>
                    <input
                      className="form-input w-full mt-1"
                      value={draft.nombreFirmante}
                      readOnly={!isEditable}
                      disabled={!isEditable}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          nombreFirmante: e.target.value,
                        }))
                      }
                      placeholder="Ej: Lic. Juan Perez"
                    />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Cargo firmante
                    </span>
                    <input
                      className="form-input w-full mt-1"
                      value={draft.cargoFirmante}
                      readOnly={!isEditable}
                      disabled={!isEditable}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          cargoFirmante: e.target.value,
                        }))
                      }
                      placeholder="Ej: Metodologo Provincial"
                    />
                  </label>
                </div>
              </div>

              {isEditable && (
                <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/40 p-4 space-y-3">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Certificación PDA
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {summaryText}
                    </p>
                  </div>

                  {!adminSaveOnly && (
                    <label className="block">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                        Motivo de rechazo (si aplica)
                      </span>
                      <textarea
                        className="form-textarea w-full mt-1 text-sm"
                        rows={3}
                        value={rechazoMotivo}
                        onChange={(e) => setRechazoMotivo(e.target.value)}
                        placeholder="Escribe el motivo si vas a rechazar..."
                      />
                    </label>
                  )}

                  {!adminSaveOnly &&
                    getPreviousApprovalStagesForAval(aval, currentEtapa)
                      .length > 0 && (
                      <label className="block">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                          Regresar a etapa (opcional)
                        </span>
                        <select
                          className="form-select w-full mt-1 text-sm"
                          value={etapaDestino}
                          onChange={(e) => setEtapaDestino(e.target.value)}
                        >
                          <option value="">Etapa anterior (por defecto)</option>
                          {getPreviousApprovalStagesForAval(
                            aval,
                            currentEtapa,
                          ).map((e) => (
                            <option key={e} value={e}>
                              {getApprovalStageLabel(e)}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}

                  {actionError && (
                    <div className="text-xs text-rose-600 dark:text-rose-400">
                      {actionError}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2">
                    {!adminSaveOnly && (
                      <button
                        type="button"
                        onClick={handleReject}
                        disabled={actionLoading}
                        className="btn bg-rose-500 hover:bg-rose-600 text-white disabled:opacity-50"
                      >
                        Rechazar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={actionLoading}
                      className={`btn text-white disabled:opacity-50 ${
                        adminSaveOnly
                          ? "bg-amber-500 hover:bg-amber-600"
                          : "bg-emerald-500 hover:bg-emerald-600"
                      }`}
                    >
                      {adminSaveOnly ? "Guardar (admin)" : "Aprobar"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 bg-slate-100 dark:bg-slate-900 overflow-y-auto">
        <div className="p-2 xl:p-4">
          <div className="space-y-6">
            <AvalDocumentosSection aval={aval} />
            <PreviewCollapsible title="Lista deportistas">
              <ListaDeportistasPreview aval={aval} formData={trainerDocsData} />
            </PreviewCollapsible>
            <PreviewCollapsible title="Solicitud aval">
              <SolicitudAvalPreview aval={aval} formData={trainerDocsData} />
            </PreviewCollapsible>
            <PreviewCollapsible title="Presupuesto de salida" defaultOpen>
              <PresupuestoSalidaAnticipoPreview
                aval={aval}
                items={budgetPreviewItems}
                draft={{
                  notas: notas.map((n) => n.texto),
                  codigoActividad: draft.codigoActividad,
                  numeroAval: draft.numeroAval,
                  pdaFirmanteNombre: draft.nombreFirmante,
                  pdaFirmanteCargo: draft.cargoFirmante,
                  responsableAnticipoNombre:
                    responsableAnticipoPreviewLabel.nombre,
                  responsableAnticipoDocumento:
                    responsableAnticipoPreviewLabel.documento,
                }}
              />
            </PreviewCollapsible>
          </div>
        </div>
      </div>
    </div>
  );
}
