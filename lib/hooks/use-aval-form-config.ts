"use client";

import { useEffect, useState } from "react";

import { ApiError } from "@/lib/api/client";
import { getAvalFormConfig } from "@/lib/api/avales";
import { buildFallbackAvalFormConfig } from "@/lib/aval-form-config";
import type { Aval, AvalFormConfig } from "@/types/aval";

type UseAvalFormConfigResult = {
  config: AvalFormConfig | null;
  loading: boolean;
};

export function useAvalFormConfig(aval: Aval | null): UseAvalFormConfigResult {
  const [config, setConfig] = useState<AvalFormConfig | null>(
    aval ? buildFallbackAvalFormConfig(aval) : null,
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!aval) {
      setConfig(null);
      return;
    }

    const fallback = buildFallbackAvalFormConfig(aval);
    setConfig(fallback);

    let active = true;

    async function loadConfig() {
      try {
        setLoading(true);
        const response = await getAvalFormConfig(aval.id);
        if (!active) return;
        setConfig(response.data ?? fallback);
      } catch (error) {
        if (!active) return;
        if (error instanceof ApiError && error.status === 404) {
          setConfig(fallback);
        } else {
          setConfig(fallback);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadConfig();

    return () => {
      active = false;
    };
  }, [aval]);

  return { config, loading };
}
