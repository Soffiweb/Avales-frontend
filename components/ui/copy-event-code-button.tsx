"use client";

import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

/**
 * Copia el código del evento al portapapeles.
 *
 * El código es lo que la gente pega en correos y planillas, y hasta ahora
 * había que seleccionarlo a mano desde un párrafo.
 *
 * Vive en `components/ui/` y no dentro de una pantalla porque el mismo código
 * de evento se muestra en dos lugares —el encabezado del detalle del aval y la
 * tarjeta de identidad del detalle del evento— y ahí el botón tiene que ser el
 * mismo: si cada pantalla escribiera el suyo, el aviso de "Copiado" duraría
 * distinto y el `aria-label` diría otra cosa en cada una.
 */
export default function CopyEventCodeButton({ codigo }: { codigo: string }) {
  const [copied, setCopied] = useState(false);

  // El aviso se apaga solo. El efecto limpia el temporizador porque si el
  // usuario navega dentro de esos dos segundos, el timer seguiría vivo
  // apuntando a un componente ya desmontado.
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopied(true);
    } catch {
      // Si el navegador niega el portapapeles no hay nada que avisar: el
      // código sigue visible y seleccionable justo al lado del botón.
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={
        copied
          ? "Código del evento copiado"
          : `Copiar el código del evento ${codigo}`
      }
      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
    >
      {copied ? (
        <CheckIcon
          size={12}
          weight="bold"
          aria-hidden="true"
          className="text-emerald-600 dark:text-emerald-400"
        />
      ) : (
        <CopyIcon size={12} weight="bold" aria-hidden="true" />
      )}
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}
