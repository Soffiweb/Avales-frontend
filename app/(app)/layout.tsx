"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layouts/sidebar";
import Header from "@/components/layouts/header";
import ReportButton from "@/components/ui/report-button";
import { useAuth } from "@/app/providers/auth-provider";
import { ROLES_WITHOUT_SIDEBAR } from "@/lib/navigation/sidebar.config";
import { canSeeSidebar } from "@/lib/auth/access";
import { authDebugLog } from "@/lib/auth/debug";

export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || user) return;
    authDebugLog("DefaultLayout: user null, redirect /signin");
    router.replace("/signin");
  }, [loading, router, user]);

  useEffect(() => {
    if (loading || !user) return;
    const roles = user.roles ?? [];
    if (roles.length > 1 && !user.rolActivo) {
      authDebugLog("DefaultLayout: sin rolActivo, redirect /select-role", {
        roles,
      });
      sessionStorage.setItem("avales:rolesToSelect", JSON.stringify(roles));
      router.replace("/select-role");
    }
  }, [loading, router, user]);

  if (loading || !user) return null;
  if ((user.roles?.length ?? 0) > 1 && !user.rolActivo) return null;

  const showSidebar = canSeeSidebar(user, ROLES_WITHOUT_SIDEBAR);

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      {showSidebar && <Sidebar />}

      <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        <Header />
        <main className="grow [&>*:first-child]:scroll-mt-16">{children}</main>
        <ReportButton />
      </div>
    </div>
  );
}
