"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/auth-provider";
import { authDebugLog } from "@/lib/auth/debug";

export default function FullscreenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || user) return;
    authDebugLog("FullscreenLayout: user null, redirect /signin");
    router.replace("/signin");
  }, [loading, router, user]);

  useEffect(() => {
    if (loading || !user) return;
    const roles = user.roles ?? [];
    if (roles.length > 1 && !user.rolActivo) {
      authDebugLog("FullscreenLayout: sin rolActivo, redirect /select-role", {
        roles,
      });
      sessionStorage.setItem("avales:rolesToSelect", JSON.stringify(roles));
      router.replace("/select-role");
    }
  }, [loading, router, user]);

  if (loading || !user) return null;
  if ((user.roles?.length ?? 0) > 1 && !user.rolActivo) return null;

  return <>{children}</>;
}
