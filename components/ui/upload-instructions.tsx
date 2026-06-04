"use client";

import { Info } from "lucide-react";
import { APP_CATEGORIES } from "@/lib/utils/categories";

type UploadInstructionsProps = {
  type: "usuarios" | "eventos";
  compact?: boolean;
};

const USERS_INSTRUCTIONS = [
  "Usa la plantilla y no cambies los nombres de las columnas.",
  "Formato: .xlsx (recomendado) o .csv.",
  "CEDULA debe tener 10 dígitos.",
  `CATEGORIA permite solo: ${APP_CATEGORIES.join(", ")}.`,
  "DISCIPLINA debe existir en el catálogo (código o nombre exacto).",
  "CARGO debe ser un rol válido del sistema.",
  "Si una CEDULA ya existe, se actualiza; si no existe, se crea.",
];

const EVENTS_INSTRUCTIONS = [
  "Usa la plantilla y no cambies los nombres de las columnas.",
  "Formato: .xlsx (recomendado) o .csv.",
  "Si el archivo incluye fechas, usa el formato YYYY-MM-DD.",
  'La hoja de datos debe ser la que contiene los encabezados "Evento" y "Actividad" (en la plantilla suele ser la hoja Aux).',
  "Lugar es opcional.",
  "Ciudad o Provincia: llena al menos una.",
  "Los ítems presupuestarios (códigos numéricos, ej: 530201) se detectan por columna; la fila debajo del encabezado debe tener la descripción del ítem.",
];

export default function UploadInstructions({
  type,
  compact = false,
}: UploadInstructionsProps) {
  const items = type === "usuarios" ? USERS_INSTRUCTIONS : EVENTS_INSTRUCTIONS;

  return (
    <div
      className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 ${
        compact ? "px-3 py-2" : "px-4 py-3"
      }`}
    >
      <div className="flex items-start gap-2">
        <Info className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
            Instrucciones
          </p>
          <ul className="mt-2 space-y-1">
            {items.map((text) => (
              <li
                key={text}
                className="text-xs text-gray-600 dark:text-gray-300 leading-5"
              >
                • {text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
