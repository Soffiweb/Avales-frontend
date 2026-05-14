"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const STORAGE_PREFIX = "avales:autosave:";

export type AutosaveStatus = "idle" | "saving" | "saved" | "restored";

export type AutosaveOptions<T> = {
  /** Key único del borrador. Se prefija con "avales:autosave:". */
  key: string;
  /** Estado actual del form. */
  state: T;
  /** Permite desactivar el guardado (ej: form read-only). Default: true. */
  enabled?: boolean;
  /** ms de debounce antes de escribir en localStorage. Default: 600. */
  debounceMs?: number;
  /** ID del usuario para evitar colisión entre cuentas en la misma PC. */
  userId?: string | number | null;
};

export type AutosaveResult<T> = {
  status: AutosaveStatus;
  lastSavedAt: Date | null;
  /** Lee el borrador guardado. Llamar en useEffect inicial. */
  restore: () => { state: T; savedAt: Date } | null;
  /** Borra el borrador del localStorage. Llamar al enviar/descartar. */
  clear: () => void;
};

function buildStorageKey(key: string, userId?: string | number | null) {
  const userPart = userId !== undefined && userId !== null ? `:u${userId}` : "";
  return `${STORAGE_PREFIX}${key}${userPart}`;
}

export function useAutosaveDraft<T>(
  options: AutosaveOptions<T>,
): AutosaveResult<T> {
  const { key, state, enabled = true, debounceMs = 600, userId } = options;
  const storageKey = buildStorageKey(key, userId);

  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const skipNextSave = useRef(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    // Evita guardar el estado inicial sin cambios reales del usuario
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }

    setStatus("saving");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        const payload = { state, savedAt: new Date().toISOString() };
        localStorage.setItem(storageKey, JSON.stringify(payload));
        setStatus("saved");
        setLastSavedAt(new Date());
      } catch (err) {
        console.warn("[autosave] failed to write:", err);
        setStatus("idle");
      }
    }, debounceMs);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [state, enabled, storageKey, debounceMs]);

  const restore = useCallback(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { state: T; savedAt: string };
      const savedAt = new Date(parsed.savedAt);
      setStatus("restored");
      setLastSavedAt(savedAt);
      // Resetear el skip para que el próximo cambio sí se guarde
      skipNextSave.current = true;
      return { state: parsed.state, savedAt };
    } catch {
      return null;
    }
  }, [storageKey]);

  const clear = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(storageKey);
      setStatus("idle");
      setLastSavedAt(null);
    } catch {
      // ignore
    }
  }, [storageKey]);

  return { status, lastSavedAt, restore, clear };
}
