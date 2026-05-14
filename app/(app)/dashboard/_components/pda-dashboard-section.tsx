"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { useAuth } from "@/app/providers/auth-provider";
import { getNormalizedRoles } from "@/lib/auth/access";
import { listAvales } from "@/lib/api/avales";
import AlertBanner from "@/components/ui/alert-banner";

type Stats = {
  pendientes: number;
  aprobados: number;
  rechazados: number;
};

type StatCardProps = {
  label: string;
  value: number;
  description: string;
  icon: ReactNode;
  accent: string;
};

function StatCard({ label, value, description, icon, accent }: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
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

function StatSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
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

const DONUT_COLORS = {
  aprobado: "#10b981",
  rechazado: "#f43f5e",
};

export default function PdaDashboardSection() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const roles = getNormalizedRoles(user);
  const isPda = roles.includes("PDA");

  useEffect(() => {
    let active = true;

    async function load() {
      if (!user?.id || !isPda) {
        if (active) setLoading(false);
        return;
      }

      try {
        if (active) {
          setLoading(true);
          setError(null);
        }

        const [pendientesRes, aprobadosRes, rechazadosRes] = await Promise.all([
          listAvales({
            estado: "SOLICITADO" as any,
            etapa: "SOLICITUD" as any,
            limit: 1,
          }),
          listAvales({
            procesadosPorUsuarioId: user.id,
            estadoHistorial: "ACEPTADO" as any,
            etapaHistorial: "PDA" as any,
            limit: 1,
          } as any),
          listAvales({
            procesadosPorUsuarioId: user.id,
            estadoHistorial: "RECHAZADO" as any,
            etapaHistorial: "PDA" as any,
            limit: 1,
          } as any),
        ]);

        if (!active) return;

        setStats({
          pendientes: pendientesRes.meta?.total ?? 0,
          aprobados: aprobadosRes.meta?.total ?? 0,
          rechazados: rechazadosRes.meta?.total ?? 0,
        });
      } catch (err: unknown) {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo cargar el dashboard del PDA.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [user, isPda]);

  if (!isPda) return null;

  const totalProcesados = (stats?.aprobados ?? 0) + (stats?.rechazados ?? 0);
  const pieData = [
    { name: "Aprobados", value: stats?.aprobados ?? 0, color: DONUT_COLORS.aprobado },
    { name: "Rechazados", value: stats?.rechazados ?? 0, color: DONUT_COLORS.rechazado },
  ].filter((item) => item.value > 0);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Mi dashboard
          </h2>
          <span className="inline-flex items-center rounded-full bg-cyan-50 px-2.5 py-0.5 text-xs font-medium text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-200">
            PDA
          </span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Resumen de avales pendientes y procesados por vos.
        </p>
      </div>

      {error ? (
        <AlertBanner
          variant="error"
          message="No se pudo cargar el dashboard"
          description={error}
        />
      ) : (
        <>
          {/* KPI Cards */}
          {loading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard
                label="Pendientes"
                value={stats?.pendientes ?? 0}
                description="Avales esperando tu certificación"
                icon={<Clock3 className="h-5 w-5 text-amber-600 dark:text-amber-300" />}
                accent="bg-amber-50 dark:bg-amber-900/30"
              />
              <StatCard
                label="Aprobados por mí"
                value={stats?.aprobados ?? 0}
                description="Total histórico que certificaste"
                icon={
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                }
                accent="bg-emerald-50 dark:bg-emerald-900/30"
              />
              <StatCard
                label="Rechazados por mí"
                value={stats?.rechazados ?? 0}
                description="Total histórico que rechazaste"
                icon={<XCircle className="h-5 w-5 text-rose-600 dark:text-rose-300" />}
                accent="bg-rose-50 dark:bg-rose-900/30"
              />
            </div>
          )}

          {/* Donut Chart */}
          {!loading && totalProcesados > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                Distribución de tus decisiones
              </h3>
              <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
                {totalProcesados} avales procesados en total
              </p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(17, 24, 39, 0.95)",
                        border: "none",
                        borderRadius: "0.5rem",
                        color: "#fff",
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      iconType="circle"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {!loading && totalProcesados === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300">
              Todavía no has procesado avales. Cuando aprobaste o rechazado tu
              primer aval, vas a ver acá la distribución.
            </div>
          )}
        </>
      )}
    </section>
  );
}
