"use client";

import { Download, FileText, HeartPulse, ClipboardCheck } from "lucide-react";
import type { Aval, AdjuntoSolicitud } from "@/types/aval";

type Props = {
  aval: Aval;
};

function DownloadLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      download
      className="btn w-full justify-center bg-indigo-500 text-white hover:bg-indigo-600"
    >
      <Icon className="w-4 h-4 mr-2" />
      {label}
    </a>
  );
}

function AdjuntoLink({ adjunto }: { adjunto: AdjuntoSolicitud }) {
  return (
    <a
      href={adjunto.url}
      target="_blank"
      rel="noreferrer noopener"
      download
      title={`Descargar ${adjunto.nombreOriginal}`}
      className="btn w-full justify-center bg-indigo-500 text-white hover:bg-indigo-600 truncate"
    >
      <Download className="w-4 h-4 mr-2 shrink-0" />
      <span className="truncate">{adjunto.nombreOriginal}</span>
    </a>
  );
}

export default function AvalDocumentosSection({ aval }: Props) {
  const hasConvocatoria = Boolean(aval.convocatoriaUrl);
  const hasCertificado = Boolean(aval.certificadoMedicoUrl);
  const hasPronostico = Boolean(aval.pronosticoDeportistasUrl);
  const convocatoriaAdjuntos = aval.convocatoriaAdjuntos ?? [];
  const pronosticoAdjuntos = aval.pronosticoDeportistasAdjuntos ?? [];

  const hasAny =
    hasConvocatoria ||
    hasCertificado ||
    hasPronostico ||
    convocatoriaAdjuntos.length > 0 ||
    pronosticoAdjuntos.length > 0;

  if (!hasAny) return null;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950/60 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
        Documentos del aval
      </p>
      <div className="space-y-2">
        {hasConvocatoria && (
          <DownloadLink
            href={aval.convocatoriaUrl!}
            label="Descargar convocatoria"
            icon={Download}
          />
        )}
        {hasCertificado && (
          <DownloadLink
            href={aval.certificadoMedicoUrl!}
            label="Descargar certificado médico"
            icon={HeartPulse}
          />
        )}
        {hasPronostico && (
          <DownloadLink
            href={aval.pronosticoDeportistasUrl!}
            label="Descargar pronóstico de deportistas"
            icon={ClipboardCheck}
          />
        )}

        {convocatoriaAdjuntos.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
              Convocatorias adicionales
            </p>
            <ul className="space-y-2">
              {convocatoriaAdjuntos.map((adj) => (
                <li key={adj.id}>
                  <AdjuntoLink adjunto={adj} />
                </li>
              ))}
            </ul>
          </div>
        )}

        {pronosticoAdjuntos.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
              Pronósticos de deportistas adicionales
            </p>
            <ul className="space-y-2">
              {pronosticoAdjuntos.map((adj) => (
                <li key={adj.id}>
                  <AdjuntoLink adjunto={adj} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
