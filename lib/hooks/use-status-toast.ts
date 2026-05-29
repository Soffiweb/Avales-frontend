"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TOAST_DURATION } from "@/lib/constants";

export type ToastState = {
  variant: "success" | "error";
  message: string;
  description?: string;
};

type StatusMessages = Partial<
  Record<"created" | "updated" | "cancelled" | "deleted" | "error", ToastState>
>;

/**
 * Lee ?status= de la URL, muestra el toast correspondiente, limpia el param.
 * También expone setToast para toasts manuales (ej: tras eliminar).
 */
export function useStatusToast(pathname: string, messages: StatusMessages) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    const status = searchParams.get("status") as keyof StatusMessages | null;
    if (!status) return;

    const msg = messages[status];
    if (msg) setToast(msg);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("status");
    router.replace(params.toString() ? `${pathname}?${params}` : pathname, {
      scroll: false,
    });
    // searchParams changes on every nav — we only want to react to status changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), TOAST_DURATION);
    return () => clearTimeout(t);
  }, [toast]);

  return { toast, setToast };
}
