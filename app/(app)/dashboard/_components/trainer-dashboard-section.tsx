"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  CheckCircle2,
  Clock3,
  FileText,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import { useAuth } from "@/app/providers/auth-provider";
import { isAdminUser, isTrainerUser } from "@/lib/auth/access";
import {
  getTrainerDashboardStats,
  type TrainerDashboardStats,
} from "@/lib/api/statistics";
import AlertBanner from "@/components/ui/alert-banner";

type StatCardProps = {
  label: string;
  value: number;
  description: string;
  icon: ReactNode;
  accent: string;
  className?: string;
};

function StatCard({
  label,
  value,
  description,
  icon,
  accent,
  className = "",
}: StatCardProps) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
            {value}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {description}
          </p>
        </div>
        <div className={`rounded-lg p-2.5 ${accent}`}>{icon}</div>
      </div>
    </div>
  );
}

function StatSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 ${className}`}
    >
      <div className="flex items-start justify-between gap-3 animate-pulse">
        <div className="flex-1">
          <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="mt-3 h-8 w-20 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="mt-2 h-3 w-32 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}

function buildStats(data: TrainerDashboardStats | null) {
  return [
    {
      label: "Total de avales",
      value: data?.totalAvales ?? 0,
      description: "Resumen general de tus solicitudes",
      icon: (
        <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
      ),
      accent: "bg-indigo-50 dark:bg-indigo-900/30",
      className: "md:col-span-2 xl:col-span-4",
    },
    {
      label: "Borradores",
      value: data?.borradores ?? 0,
      description: "Aún no enviados",
      icon: <FileText className="h-5 w-5 text-amber-600 dark:text-amber-300" />,
      accent: "bg-amber-50 dark:bg-amber-900/30",
    },
    {
      label: "Solicitados",
      value: data?.solicitados ?? 0,
      description: "En proceso de revisión",
      icon: <Clock3 className="h-5 w-5 text-sky-600 dark:text-sky-300" />,
      accent: "bg-sky-50 dark:bg-sky-900/30",
    },
    {
      label: "Aprobados",
      value: data?.aprobados ?? 0,
      description: "Aceptados por el flujo",
      icon: (
        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
      ),
      accent: "bg-emerald-50 dark:bg-emerald-900/30",
    },
    {
      label: "Rechazados",
      value: data?.rechazados ?? 0,
      description: "Requieren atención",
      icon: <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-300" />,
      accent: "bg-rose-50 dark:bg-rose-900/30",
    },
  ];
}

export default function TrainerDashboardSection() {
  const { user } = useAuth();
  const [stats, setStats] = useState<TrainerDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!user || !isTrainerUser(user) || isAdminUser(user)) {
        if (active) setLoading(false);
        return;
      }

      try {
        if (active) {
          setLoading(true);
          setError(null);
        }

        const res = await getTrainerDashboardStats();
        if (!active) return;

        setStats(res.data);
      } catch (err: unknown) {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo cargar el dashboard de entrenador.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [user]);

  if (!user || !isTrainerUser(user) || isAdminUser(user)) {
    return null;
  }

  const cards = buildStats(stats);
  const isEmpty = !loading && !error && (stats?.totalAvales ?? 0) === 0;

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Mi dashboard
          </h2>
          <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200">
            Entrenador
          </span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Resumen de tus avales propios.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatSkeleton className="md:col-span-2 xl:col-span-4" />
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
        </div>
      ) : error ? (
        <AlertBanner
          variant="error"
          message="No se pudo cargar el dashboard"
          description={error}
        />
      ) : (
        <>
          {isEmpty && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300">
              Aún no tienes avales registrados.
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <StatCard key={card.label} {...card} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
