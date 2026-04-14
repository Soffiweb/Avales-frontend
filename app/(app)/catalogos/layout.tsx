"use client";

import RoleGuard from "@/components/auth/role-guard";

export default function CatalogosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleGuard>{children}</RoleGuard>;
}
