"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getAval } from "@/lib/api/avales";
import type { Aval } from "@/types/aval";
import {
  ListaDeportistasPreview,
  SolicitudAvalPreview,
} from "@/app/(app)/avales/_components/aval-document-preview";
import PreviewCollapsible from "@/app/(app)/avales/_components/preview-collapsible";
import Paso01Deportistas from "@/app/(app)/avales/_components/paso-01-deportistas";
import Paso02Logistica from "@/app/(app)/avales/_components/paso-02-logistica";
import Paso03Objetivos from "@/app/(app)/avales/_components/paso-03-objetivos";
import Paso04Presupuesto from "@/app/(app)/avales/_components/paso-04-presupuesto";
import { Loader2 } from "lucide-react";

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
  }>;
  entrenadores: Array<{ id: number; nombre: string }>;

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
  adjuntoSolicitud?: File | null;
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
  adjuntoSolicitud: null,
};

const STEPS = [
  { number: 1, title: "Participantes" },
  { number: 2, title: "Logística" },
  { number: 3, title: "Objetivos y Criterios" },
  { number: 4, title: "Presupuesto" },
];

export default function CrearSolicitudPage() {
  const params = useParams();
  const router = useRouter();
  const avalId = Number(params.id);

  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [aval, setAval] = useState<Aval | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAval = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAval(avalId);
      setAval(response.data);
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
      setFormData((prev) => ({ ...prev, ...stepData }));
      if (currentStep < 4) {
        setCurrentStep((prev) => (prev + 1) as WizardStep);
      }
    },
    [currentStep]
  );

  const handlePreviewDataChange = useCallback((stepData: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...stepData }));
  }, []);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as WizardStep);
    } else {
      router.push("/avales");
    }
  }, [currentStep, router]);

  const handleStepClick = useCallback((step: number) => {
    setCurrentStep(step as WizardStep);
  }, []);

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

  if (aval.estado !== "BORRADOR") {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-xl p-6 text-center">
        <p className="font-medium mb-2">Este aval no está en estado BORRADOR</p>
        <p className="text-sm">
          Solo puedes crear la solicitud técnica para avales en estado BORRADOR.
        </p>
      </div>
    );
  }

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

              {/* Progress Steps */}
              <div className="flex items-center gap-3 mb-8">
                {STEPS.map((step, index) => (
                  <div key={step.number} className="flex items-center gap-3">
                    <button
                      onClick={() => handleStepClick(step.number)}
                      className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-colors ${
                        currentStep === step.number
                          ? "bg-indigo-600 text-white"
                          : currentStep > step.number
                          ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {step.number}
                    </button>
                    {index < STEPS.length - 1 && (
                      <div className="w-12 h-0.5 bg-gray-200 dark:bg-gray-700" />
                    )}
                  </div>
                ))}
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
            <PreviewCollapsible title="Preview escuela de iniciacion" defaultOpen>
              <ListaDeportistasPreview aval={aval} formData={formData} />
            </PreviewCollapsible>
            <PreviewCollapsible title="Preview solicitud de aval" defaultOpen>
              <SolicitudAvalPreview aval={aval} formData={formData} />
            </PreviewCollapsible>
          </div>
        </div>
      </div>
    </div>
  );
}
