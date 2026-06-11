"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/app/providers/auth-provider";
import { getNormalizedRoles } from "@/lib/auth/access";
import { getAval } from "@/lib/api/avales";
import type {
  Aval,
  DeportistaAval,
  EntrenadorAval,
  ModalidadParticipacion,
  RubroPresupuestarioDto,
  TipoAval,
} from "@/types/aval";
import { getSectionConfig } from "@/lib/aval-form-config";
import { useAvalFormConfig } from "@/lib/hooks/use-aval-form-config";
import { getTipoAvalLabel } from "@/lib/constants";
import { SolicitudAvalPreview } from "@/app/(app)/avales/_components/aval-document-preview";
import CertificacionAfiliacionesPreview, {
  SECRETARIA_DTM_NOMBRE_DEFAULT,
  SECRETARIA_DTM_CARGO_DEFAULT,
} from "@/app/(app)/avales/_components/certificacion-afiliaciones-preview";
import { listUsers } from "@/lib/api/user";
import type { User } from "@/types/user";
import PreviewCollapsible from "@/app/(app)/avales/_components/preview-collapsible";
import Paso01Deportistas from "@/app/(app)/avales/_components/paso-01-deportistas";
import Paso02Logistica from "@/app/(app)/avales/_components/paso-02-logistica";
import Paso03Objetivos from "@/app/(app)/avales/_components/paso-03-objetivos";
import Paso04Presupuesto from "@/app/(app)/avales/_components/paso-04-presupuesto";
import { Loader2 } from "lucide-react";
import { inferEventoGenero } from "@/types/evento";
import { avalFlowDebugLog, summarizeAval } from "@/lib/debug/aval-flow";

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
    club?: string;
    afiliacion?: boolean;
    payload?: Record<string, unknown>;
    observacion?: string;
    rol?: string;
    modalidadParticipacion?: ModalidadParticipacion;
  }>;
  entrenadores: Array<{ id: number; nombre: string; esTextoLibre?: boolean }>;

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

function getEditableSolicitudState(aval: Aval, isAdmin = false) {
  if (isAdmin) return true;
  return (
    aval.estado === "BORRADOR" ||
    (aval.estado === "SOLICITADO" && aval.etapaActual === "SOLICITUD")
  );
}

function getDeportistaFormId(deportista: DeportistaAval, index: number) {
  const parsedExternalId = Number.parseInt(deportista.deportistaExternoId ?? "", 10);
  return deportista.deportista?.id || (Number.isFinite(parsedExternalId) ? parsedExternalId : index + 1);
}

function getEntrenadorDisplayName(entrenador: EntrenadorAval) {
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

function buildInitialFormData(
  aval: Aval,
  tipoAvalFromQuery?: TipoAval | null,
): FormData {
  const deportistas = (aval.avalTecnico?.deportistasAval ?? []).map((item, index) => ({
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
    genero: item.deportista?.genero,
    payload:
      (item.deportista?.payload as Record<string, unknown> | undefined) ??
      undefined,
    rol: item.rol,
    modalidadParticipacion: item.modalidadParticipacion ?? undefined,
  }));

  const entrenadores = [...(aval.entrenadores ?? [])]
    .sort((a, b) => Number(Boolean(b.esPrincipal)) - Number(Boolean(a.esPrincipal)))
    .map((item) => ({
      id: item.entrenadorId ?? item.id,
      nombre: getEntrenadorDisplayName(item),
    }));

  return {
    deportistas,
    entrenadores,
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
    tipoAval: aval.tipoAval ?? tipoAvalFromQuery ?? undefined,
    requerimientos: aval.avalTecnico?.requerimientos ?? [],
    montoSolicitado: aval.montoSolicitado ?? undefined,
  };
}

export default function CrearSolicitudPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [secretariaDtm, setSecretariaDtm] = useState<User | null>(null);
  const [secretariaError, setSecretariaError] = useState<string | null>(null);
  const { config: formConfig } = useAvalFormConfig(aval);

  const loadAval = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAval(avalId);
      const avalData = response.data;
      setAval(avalData);
      const initialFormData = buildInitialFormData(
        avalData,
        searchParams.get("tipoAval") as TipoAval | null,
      );
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
  }, [avalId, searchParams]);

  useEffect(() => {
    loadAval();
  }, [loadAval]);

  useEffect(() => {
    let active = true;
    async function loadSecretaria() {
      try {
        const res = await listUsers({ role: "SECRETARIA_DTM", limit: 1 });
        if (!active) return;
        const raw = res.data as unknown;
        const users: User[] = Array.isArray(raw)
          ? (raw as User[])
          : Array.isArray((raw as Record<string, unknown>)?.items)
          ? ((raw as Record<string, unknown>).items as User[])
          : [];
        if (users.length > 0) {
          setSecretariaDtm(users[0]);
        } else {
          setSecretariaError("No hay usuario con rol SECRETARIA_DTM en el sistema.");
        }
      } catch (err) {
        if (!active) return;
        setSecretariaError(err instanceof Error ? err.message : "Error al buscar secretaria DTM.");
      }
    }
    void loadSecretaria();
    return () => { active = false; };
  }, []);

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
    avalFlowDebugLog("crear-solicitud", "preview actualizado", {
      currentStep,
      stepData,
    });
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
          Solo puedes editar la solicitud cuando el aval está en BORRADOR o en SOLICITADO con etapa SOLICITUD.
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
    <div className="h-screen flex">
      {/* Left Panel - Form */}
      <div className="w-full lg:w-1/2 bg-white dark:bg-gray-900 flex flex-col">
        <div className="h-full overflow-y-auto">
          <div className="max-w-xl mx-auto px-6 sm:px-8 py-8">
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
              />
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Documento */}
      <div className="hidden lg:block lg:w-1/2 bg-slate-100 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 overflow-y-auto">
        <div className="p-6 xl:p-8">
          <div className="space-y-6">
            <PreviewCollapsible title="Certificado de afiliación" defaultOpen>
              <CertificacionAfiliacionesPreview
                aval={aval}
                secretariaNombre={secretariaDtm ? `${secretariaDtm.nombre} ${secretariaDtm.apellido}` : SECRETARIA_DTM_NOMBRE_DEFAULT}
                secretariaCargo={SECRETARIA_DTM_CARGO_DEFAULT}
                secretariaErrorDebug={secretariaError ?? undefined}
                entrenadorNombreOverride={formData.entrenadores[0]?.nombre}
                deportistasOverride={formData.deportistas.map((d) => ({
                  id: d.id,
                  nombre: d.nombre,
                  cedula: d.cedula ?? "-",
                  fechaNacimiento: d.fechaNacimiento,
                  observacion: d.observacion,
                }))}
              />
            </PreviewCollapsible>
            <PreviewCollapsible title="Solicitud de aval" defaultOpen>
              <SolicitudAvalPreview aval={aval} formData={formData} />
            </PreviewCollapsible>
          </div>
        </div>
      </div>
    </div>
  );
}
