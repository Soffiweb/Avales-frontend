"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/auth-provider";

export default function FullscreenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || user) return;
    router.replace("/signin");
  }, [loading, router, user]);

  useEffect(() => {
    if (loading || !user) return;
    const roles = user.roles ?? [];
    if (roles.length > 1 && !user.rolActivo) {
      sessionStorage.setItem("avales:rolesToSelect", JSON.stringify(roles));
      router.replace("/select-role");
    }
  }, [loading, router, user]);

  if (loading || !user) return null;
  if ((user.roles?.length ?? 0) > 1 && !user.rolActivo) return null;

  return <>{children}</>;
}
