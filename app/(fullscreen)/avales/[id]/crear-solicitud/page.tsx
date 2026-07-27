"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/app/providers/auth-provider";
import { getNormalizedRoles } from "@/lib/auth/access";
import { getAval } from "@/lib/api/avales";
import type {
  Aval,
  DeportistaAval,
  PropositoDto,
  EntrenadorAval,
  ModalidadParticipacion,
  OtroParticipanteAval,
  RubroPresupuestarioDto,
  TipoAval,
} from "@/types/aval";
import { getSectionConfig } from "@/lib/aval-form-config";
import { useAvalFormConfig } from "@/lib/hooks/use-aval-form-config";
import { getTipoAvalLabel } from "@/lib/constants";
import {
  ListaDeportistasPreview,
  SolicitudAvalPreview,
} from "@/app/(app)/avales/_components/aval-document-preview";
import type { Genero } from "@/types/user";
import PreviewCollapsible from "@/app/(app)/avales/_components/preview-collapsible";
import Paso01Deportistas from "@/app/(app)/avales/_components/paso-01-deportistas";
import Paso02Logistica from "@/app/(app)/avales/_components/paso-02-logistica";
import Paso03Objetivos from "@/app/(app)/avales/_components/paso-03-objetivos";
import Paso04Presupuesto from "@/app/(app)/avales/_components/paso-04-presupuesto";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { inferEventoGenero } from "@/types/evento";
import { avalFlowDebugLog, summarizeAval } from "@/lib/debug/aval-flow";
import { getAvalDocumentTitle } from "@/lib/utils/aval-collections";

type WizardStep = 1 | 2 | 3 | 4;

type FormData = {
  // Paso 1: Participantes
  deportistas: Array<{
    id: number;
    deportistaExternoId?: string;
    nombre: string;
    apellido?: string;
    nombres?: string;
    apellidos?: string;
    cedula?: string;
    fechaNacimiento?: string;
    genero?: string;
    categoriaId?: number;
    categoriaNombre?: string;
    afiliacion?: string;
    canton?: string;
    club?: string;
    entrenadorNombre?: string;
    ordenProposito?: number;
    propositos?: PropositoDto[];
    afiliado?: boolean;
    payload?: Record<string, unknown>;
    observacion?: string;
    rol?: string;
    modalidadParticipacion?: ModalidadParticipacion;
  }>;
  entrenadores: Array<{
    id: number;
    nombre: string;
    esTextoLibre?: boolean;
    genero?: Genero;
  }>;
  otrosParticipantes?: Array<{
    cargo: string;
    nombre?: string;
    usuarioId?: number;
    genero?: Genero;
  }>;

  // Paso 2: Logística
  fechaHoraSalida: string;
  fechaHoraRetorno: string;
  lugarSalida: string;
  lugarRetorno: string;
  transporteSalida: string;
  transporteRetorno: string;

  // Paso 3: Objetivos y Criterios
  objetivos: string[];
  criterios: string[];

  // Paso 4: Observaciones
  observaciones?: string;
  adjuntosSolicitud?: File[];
  tipoAval?: TipoAval;
  requerimientos?: RubroPresupuestarioDto[];
  montoSolicitado?: number;
};

const INITIAL_FORM_DATA: FormData = {
  deportistas: [],
  entrenadores: [],
  otrosParticipantes: [],
  fechaHoraSalida: "",
  fechaHoraRetorno: "",
  lugarSalida: "",
  lugarRetorno: "",
  transporteSalida: "",
  transporteRetorno: "",
  objetivos: [],
  criterios: [],
  observaciones: "",
  adjuntosSolicitud: [],
  tipoAval: undefined,
  requerimientos: [],
  montoSolicitado: undefined,
};

function normalizeGenero(value: unknown): Genero | undefined {
  if (typeof value !== "string") return undefined;
  const genero = value.trim().toUpperCase();
  if (genero === "MASCULINO") return "MASCULINO";
  if (genero === "FEMENINO") return "FEMENINO";
  if (genero === "MASCULINO_FEMENINO") return "MASCULINO_FEMENINO";
  return undefined;
}

function getEditableSolicitudState(aval: Aval, isAdmin = false) {
  if (isAdmin) return true;
  return (
    aval.estado === "BORRADOR" || aval.etapaActual === "SOLICITUD"
  );
}

function getDeportistaFormId(deportista: DeportistaAval, index: number) {
  const parsedExternalId = Number.parseInt(deportista.deportistaExternoId ?? "", 10);
  return deportista.deportista?.id || (Number.isFinite(parsedExternalId) ? parsedExternalId : index + 1);
}

function getEntrenadorDisplayName(entrenador: EntrenadorAval) {
  if (entrenador.entrenadorNombre) return entrenador.entrenadorNombre;
  return (
    [
      entrenador.entrenador?.nombre ??
        entrenador.usuario?.nombre ??
        entrenador.nombre,
      entrenador.entrenador?.apellido ??
        entrenador.usuario?.apellido ??
        entrenador.apellido,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() || `Entrenador ${entrenador.id}`
  );
}

function getOtroParticipanteDisplayName(otro: OtroParticipanteAval) {
  if (otro.nombre) return otro.nombre;
  return (
    [otro.usuario?.nombre, otro.usuario?.apellido].filter(Boolean).join(" ").trim() ||
    `Participante ${otro.id}`
  );
}

function toRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function toStringValue(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function toNumberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function toBooleanValue(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function resolvePropositos(
  item: DeportistaAval,
  payload: Record<string, unknown> | undefined,
): PropositoDto[] | undefined {
  const source = Array.isArray(item.propositos)
    ? item.propositos
    : Array.isArray(payload?.propositos)
      ? (payload!.propositos as unknown[])
      : undefined;
  if (!source) return undefined;

  return source
    .map((entry) => toRecord(entry))
    .filter((record): record is Record<string, unknown> => Boolean(record))
    .map((record) => ({
      orden: toNumberValue(record.orden),
      ubicacionActual: toStringValue(record.ubicacionActual),
      divisionPeso: toStringValue(record.divisionPeso),
      prueba: toStringValue(record.prueba),
      marcaActual: toStringValue(record.marcaActual),
      unidadMarcaActual: toStringValue(record.unidadMarcaActual),
      ubicacionProposito: toStringValue(record.ubicacionProposito),
      marcaProposito: toStringValue(record.marcaProposito),
      unidadMarcaProposito: toStringValue(record.unidadMarcaProposito),
    }));
}

function buildInitialFormData(aval: Aval): FormData {
  const deportistas = (aval.avalTecnico?.deportistasAval ?? []).map((item, index) => {
    const payload = toRecord(item.deportista?.payload);
    const afiliado =
      toBooleanValue(payload?.afiliado) ??
      toBooleanValue(payload?.afiliacion) ??
      false;

    return {
      id: getDeportistaFormId(item, index),
      deportistaExternoId: item.deportistaExternoId,
      nombre:
        item.deportista?.nombre ??
        item.deportista?.nombres ??
        "",
      apellido:
        item.deportista?.apellido ??
        item.deportista?.apellidos ??
        "",
      nombres: item.deportista?.nombres,
      apellidos: item.deportista?.apellidos,
      cedula: item.deportista?.cedula,
      fechaNacimiento: toStringValue(payload?.fechaNacimiento),
      genero: item.deportista?.genero,
      categoriaId:
        item.categoriaId ??
        item.deportista?.categoriaId ??
        toNumberValue(payload?.categoriaId),
      categoriaNombre:
        item.categoriaNombre ??
        item.deportista?.categoriaNombre ??
        toStringValue(payload?.categoriaNombre),
      afiliacion:
        item.afiliacion ??
        item.deportista?.afiliacion ??
        toStringValue(payload?.afiliacion),
      canton:
        item.canton ??
        item.deportista?.canton ??
        toStringValue(payload?.canton),
      club:
        item.club ??
        item.deportista?.club ??
        toStringValue(payload?.club),
      entrenadorNombre:
        item.entrenadorNombre ??
        item.deportista?.entrenadorNombre ??
        toStringValue(payload?.entrenadorNombre),
      ordenProposito:
        item.ordenProposito ??
        item.deportista?.ordenProposito ??
        toNumberValue(payload?.ordenProposito),
      propositos: resolvePropositos(item, payload),
      afiliado,
      payload,
      observacion: afiliado ? "AFILIADO/A 2026" : "SIN AFILIACION",
      rol: item.rol,
      modalidadParticipacion: item.modalidadParticipacion ?? undefined,
    };
  });

  const entrenadores = [...(aval.entrenadores ?? [])]
    .sort((a, b) => Number(Boolean(b.esPrincipal)) - Number(Boolean(a.esPrincipal)))
    .map((item, index) => {
      // API returns user ID nested as `entrenador.id`, not flat `entrenadorId`
      const entrenadorUserId = (item.entrenadorId ?? item.entrenador?.id) as number | null | undefined;
      const isTextoLibre = entrenadorUserId == null;
      return {
        id: isTextoLibre ? -(index + 1) : entrenadorUserId!,
        nombre: getEntrenadorDisplayName(item),
        genero: normalizeGenero(
          item.genero ?? item.entrenador?.genero ?? item.usuario?.genero,
        ),
        ...(isTextoLibre ? { esTextoLibre: true as const } : {}),
      };
    });

  const otrosParticipantes = (aval.otrosParticipantes ?? []).map((item) => ({
    cargo: item.cargo,
    nombre: getOtroParticipanteDisplayName(item),
    usuarioId: item.usuarioId ?? undefined,
    genero: normalizeGenero(item.genero ?? item.usuario?.genero),
  }));

  return {
    deportistas,
    entrenadores,
    otrosParticipantes,
    fechaHoraSalida: aval.avalTecnico?.fechaHoraSalida ?? "",
    fechaHoraRetorno: aval.avalTecnico?.fechaHoraRetorno ?? "",
    lugarSalida: aval.avalTecnico?.lugarSalida ?? "",
    lugarRetorno: aval.avalTecnico?.lugarRetorno ?? "",
    transporteSalida: aval.avalTecnico?.transporteSalida ?? "",
    transporteRetorno: aval.avalTecnico?.transporteRetorno ?? "",
    objetivos: (aval.avalTecnico?.objetivos ?? []).map((item) => item.descripcion),
    criterios: (aval.avalTecnico?.criterios ?? []).map((item) => item.descripcion),
    observaciones: aval.comentario ?? aval.avalTecnico?.observaciones ?? "",
    adjuntosSolicitud: [],
    tipoAval: aval.tipoAval ?? undefined,
    requerimientos: aval.avalTecnico?.requerimientos ?? [],
    montoSolicitado: aval.montoSolicitado ?? undefined,
  };
}

export default function CrearSolicitudPage() {
  const params = useParams();
  const router = useRouter();
  const avalId = Number(params.id);

  const { user } = useAuth();
  const userRoles = getNormalizedRoles(user);
  const isAdminLike =
    userRoles.includes("ADMIN") || userRoles.includes("SUPER_ADMIN");

  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [aval, setAval] = useState<Aval | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewVisible, setPreviewVisible] = useState(true);
  const { config: formConfig } = useAvalFormConfig(aval);

  const loadAval = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAval(avalId);
      const avalData = response.data;
      setAval(avalData);
      const initialFormData = buildInitialFormData(avalData);
      setFormData(initialFormData);
      avalFlowDebugLog("crear-solicitud", "aval cargado para wizard", {
        avalId,
        aval: summarizeAval(avalData),
        initialFormData,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar el aval");
    } finally {
      setLoading(false);
    }
  }, [avalId]);

  useEffect(() => {
    loadAval();
  }, [loadAval]);

  const handleStepComplete = useCallback(
    (stepData: Partial<FormData>) => {
      avalFlowDebugLog("crear-solicitud", "paso completado", {
        currentStep,
        stepData,
      });
      setFormData((prev) => ({ ...prev, ...stepData }));
      if (currentStep < 4) {
        setCurrentStep((prev) => (prev + 1) as WizardStep);
      }
    },
    [currentStep],
  );

  const handlePreviewDataChange = useCallback((stepData: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...stepData }));
    if (!stepData.deportistas?.length) return;

    const genero = inferEventoGenero(stepData.deportistas);
    if (!genero) return;

    setAval((prev) =>
      prev
        ? {
            ...prev,
            evento: prev.evento ? { ...prev.evento, genero } : prev.evento,
          }
        : prev,
    );
  }, []);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as WizardStep);
    } else {
      router.push("/avales");
    }
  }, [currentStep, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Cargando información del aval...
          </p>
        </div>
      </div>
    );
  }

  if (error || !aval) {
    return (
      <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl p-6 text-center">
        {error || "No se encontró el aval"}
      </div>
    );
  }

  if (!getEditableSolicitudState(aval, isAdminLike)) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-xl p-6 text-center">
        <p className="font-medium mb-2">Esta solicitud no se puede editar</p>
        <p className="text-sm">
          Solo puedes editar la solicitud cuando el aval está en BORRADOR o su etapa actual es SOLICITUD.
        </p>
      </div>
    );
  }

  const presupuestoSection = getSectionConfig(formConfig, "PRESUPUESTO");
  const showPresupuestoStep =
    presupuestoSection?.visible ?? formData.tipoAval !== "SOLO_RESULTADO";
  const steps = [
    { number: 1 as WizardStep, title: "" },
    { number: 2 as WizardStep, title: "" },
    { number: 3 as WizardStep, title: "" },
    {
      number: 4 as WizardStep,
      title: showPresupuestoStep ? "" : "",
    },
  ];

  return (
    <div className="relative h-screen flex">
      {/* Left Panel - Form */}
      <div
        className={`w-full bg-white dark:bg-gray-900 flex flex-col ${
          previewVisible ? "lg:w-1/2" : ""
        }`}
      >
        <div className="h-full overflow-y-auto">
          <div
            className={`mx-auto px-6 sm:px-8 py-8 ${
              previewVisible ? "max-w-2xl" : "max-w-5xl"
            }`}
          >
            {/* Header */}
            <div className="mb-8">
              <button
                onClick={handleBack}
                className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-6"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Volver
              </button>
              {/* Progress Steps + badge */}
              <div className="mb-8">
                <div className="flex justify-end mb-2">
                  <div className="shrink-0 inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                    {getTipoAvalLabel(formData.tipoAval ?? aval.tipoAval)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {steps.map((step, index) => (
                    <div key={step.number} className="flex items-center gap-3">
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold select-none ${
                          currentStep === step.number
                            ? "bg-indigo-600 text-white"
                            : currentStep > step.number
                              ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                              : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {step.number}
                      </div>
                      {index < steps.length - 1 && (
                        <div className="w-12 h-0.5 bg-gray-200 dark:bg-gray-700" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Step Content */}
            {currentStep === 1 && (
              <Paso01Deportistas
                formData={formData}
                aval={aval}
                onComplete={handleStepComplete}
                onPreviewChange={handlePreviewDataChange}
                onBack={handleBack}
              />
            )}
            {currentStep === 2 && (
              <Paso02Logistica
                formData={formData}
                onComplete={handleStepComplete}
                onPreviewChange={handlePreviewDataChange}
                onBack={handleBack}
              />
            )}
            {currentStep === 3 && (
              <Paso03Objetivos
                formData={formData}
                onComplete={handleStepComplete}
                onPreviewChange={handlePreviewDataChange}
                onBack={handleBack}
              />
            )}
            {currentStep === 4 && (
              <Paso04Presupuesto
                formData={formData}
                onComplete={handleStepComplete}
                onPreviewChange={handlePreviewDataChange}
                onBack={handleBack}
                avalId={avalId}
                aval={aval}
                isAdminLike={isAdminLike}
              />
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Documento */}
      <div
        className={`${
          previewVisible ? "hidden lg:block lg:w-1/2" : "hidden"
        } bg-slate-100 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 overflow-y-auto`}
      >
        <div className="p-6 xl:p-8">
          <div className="space-y-6">
            {/* En la creacion de la solicitud el entrenador necesita ver la
                lista de deportistas siempre desplegada. */}
            <PreviewCollapsible title="Lista deportistas" defaultOpen>
              <ListaDeportistasPreview aval={aval} formData={formData} />
            </PreviewCollapsible>
            <PreviewCollapsible title={getAvalDocumentTitle(aval)} defaultOpen>
              <SolicitudAvalPreview aval={aval} formData={formData} />
            </PreviewCollapsible>
          </div>
        </div>
      </div>

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
