"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  Users,
  Calendar,
  FileCheck,
  FileText,
  AlertCircle,
  Activity,
  Trophy,
  TrendingUp,
  Percent,
  Clock,
  DollarSign,
  Wallet,
} from "lucide-react";

import { useAuth } from "@/app/providers/auth-provider";
import { getNormalizedRoles, isAdminUser, isTrainerUser } from "@/lib/auth/access";
import {
  getAllStatistics,
  getAvalesTimeline,
  getPresupuestoStats,
  getTotalDeportistasFromSoffimedh,
  type AllStatistics,
  type TimelineItem,
  type PresupuestoStats,
} from "@/lib/api/statistics";
import AlertBanner from "@/components/ui/alert-banner";
import { formatRoles } from "@/lib/utils/formatters/text";
import TrainerDashboardSection from "./_components/trainer-dashboard-section";
import PdaDashboardSection from "./_components/pda-dashboard-section";

const COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#14b8a6",
];

const PERIODO_OPTIONS = [
  { label: "3 meses", value: 3 },
  { label: "6 meses", value: 6 },
  { label: "12 meses", value: 12 },
];

const tooltipStyle = {
  contentStyle: {
    backgroundColor: "rgb(31 41 55)",
    border: "1px solid rgb(55 65 81)",
    borderRadius: "8px",
    color: "#fff",
    fontSize: "13px",
  },
  itemStyle: { color: "#fff" },
};

export default function Dashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [stats, setStats] = useState<AllStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [presupuesto, setPresupuesto] = useState<PresupuestoStats | null>(null);
  const [meses, setMeses] = useState(12);
  const [activeTab, setActiveTab] = useState<"avales" | "presupuesto">(
    "avales",
  );

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/signin");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;

    const isAdmin = isAdminUser(user);
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    async function loadStats() {
      try {
        setLoading(true);
        const [resStats, resTimeline, deportistasResult, resPresupuesto] =
          await Promise.allSettled([
            getAllStatistics(),
            getAvalesTimeline(meses),
            getTotalDeportistasFromSoffimedh(),
            getPresupuestoStats(),
          ]);

        if (resStats.status !== "fulfilled") throw resStats.reason;
        if (resTimeline.status !== "fulfilled") throw resTimeline.reason;

        const totalDeportistas =
          deportistasResult.status === "fulfilled"
            ? deportistasResult.value
            : null;

        setStats({
          ...resStats.value.data,
          dashboard: {
            ...resStats.value.data.dashboard,
            totalDeportistas:
              typeof totalDeportistas === "number"
                ? totalDeportistas
                : resStats.value.data.dashboard.totalDeportistas,
          },
        });

        if (resTimeline.value.data?.items) {
          setTimeline(resTimeline.value.data.items);
        }

        if (
          resPresupuesto.status === "fulfilled" &&
          resPresupuesto.value.data
        ) {
          setPresupuesto(resPresupuesto.value.data);
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Error al cargar estadisticas";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [user, meses]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const isAdmin = isAdminUser(user);

  if (!isAdmin) {
    const isEntrenador = isTrainerUser(user);
    const roles = getNormalizedRoles(user);
    const isReviewer = roles.some((r) =>
      [
        "DTM",
        "METODOLOGO",
        "PDA",
        "CONTROL_PREVIO",
        "FINANCIERO",
        "COMPRAS_PUBLICAS",
        "SECRETARIA",
      ].includes(r),
    );

    const quickLinks = [
      isEntrenador && {
        label: "Mis Avales",
        href: "/avales",
        icon: FileCheck,
        description: "Ver y crear solicitudes de aval",
      },
      isEntrenador && {
        label: "Eventos",
        href: "/eventos",
        icon: Calendar,
        description: "Consultar eventos disponibles",
      },
      isReviewer && {
        label: "Avales por revisar",
        href: "/avales",
        icon: FileText,
        description: "Revisar solicitudes pendientes",
      },
    ].filter(Boolean) as {
      label: string;
      href: string;
      icon: typeof FileCheck;
      description: string;
    }[];

    return (
      <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Bienvenido, {user.nombre}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {isReviewer
              ? "Tienes solicitudes pendientes de revision."
              : "Gestiona tus avales y eventos deportivos."}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Rol: {user.roles?.length ? formatRoles(user.roles) : "Ninguno"}
          </p>
        </div>

        {isEntrenador && <TrainerDashboardSection />}
        <PdaDashboardSection />


        {quickLinks.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quickLinks.map((link) => (
              <a
                key={link.href + link.label}
                href={link.href}
                className="group flex items-start gap-4 p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-md transition-all"
              >
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 transition-colors">
                  <link.icon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    {link.label}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {link.description}
                  </p>
                </div>
              </a>
            ))}
          </div>
        )}

        {!isEntrenador && !isReviewer && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-full mb-4">
              <Trophy className="w-12 h-12 text-indigo-500" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 max-w-md">
              Usa el menu lateral para navegar. Si necesitas permisos
              adicionales, contacta al administrador.
            </p>
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <AlertBanner variant="error" message={error} />
      </div>
    );
  }

  // Calculated metrics
  const totalAvales = stats?.dashboard.totalAvales ?? 0;
  const aprobados = stats?.dashboard.avalesAprobados ?? 0;
  const pendientes = stats?.dashboard.avalesPendientes ?? 0;
  const rechazados = stats?.dashboard.avalesRechazados ?? 0;
  const tasaAprobacion =
    totalAvales > 0 ? Math.round((aprobados / totalAvales) * 100) : 0;
  const tasaRechazo =
    totalAvales > 0 ? Math.round((rechazados / totalAvales) * 100) : 0;

  // Timeline with cumulative data for area chart
  const timelineWithAccum = timeline.map((item, idx) => {
    const prevTotal = timeline.slice(0, idx).reduce((s, t) => s + t.creados, 0);
    return { ...item, acumulado: prevTotal + item.creados };
  });

  const TABS = [
    { key: "avales" as const, label: "Avales", icon: FileCheck },
    { key: "presupuesto" as const, label: "Presupuesto", icon: DollarSign },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[96rem] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Vista general del sistema de avales deportivos.
          </p>
        </div>
        {activeTab === "avales" && (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              {PERIODO_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMeses(opt.value)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    meses === opt.value
                      ? "bg-indigo-500 text-white"
                      : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-6" aria-label="Tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* === TAB: AVALES === */}
      {activeTab === "avales" && (
        <div className="space-y-6">
          {/* KPI Cards - Row 1: Avales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="Avales Totales"
              value={totalAvales}
              icon={<FileText className="w-5 h-5" />}
              color="bg-blue-500"
              iconColor="text-blue-500"
            />
            <StatCard
              title="Por Aprobar"
              value={pendientes}
              icon={<Activity className="w-5 h-5" />}
              color="bg-amber-500"
              iconColor="text-amber-500"
              subtitle={
                totalAvales > 0
                  ? `${Math.round((pendientes / totalAvales) * 100)}% del total`
                  : undefined
              }
            />
            <StatCard
              title="Aprobados"
              value={aprobados}
              icon={<FileCheck className="w-5 h-5" />}
              color="bg-emerald-500"
              iconColor="text-emerald-500"
              subtitle={`${tasaAprobacion}% aprobacion`}
            />
            <StatCard
              title="Rechazados"
              value={rechazados}
              icon={<AlertCircle className="w-5 h-5" />}
              color="bg-rose-500"
              iconColor="text-rose-500"
              subtitle={tasaRechazo > 0 ? `${tasaRechazo}% rechazo` : undefined}
            />
          </div>

          {/* KPI Cards - Row 2: Resources + Rate */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="Eventos Activos"
              value={stats?.dashboard.totalEventos}
              icon={<Calendar className="w-5 h-5" />}
              color="bg-indigo-500"
              iconColor="text-indigo-500"
            />
            <StatCard
              title="Deportistas"
              value={stats?.dashboard.totalDeportistas}
              icon={<Users className="w-5 h-5" />}
              color="bg-purple-500"
              iconColor="text-purple-500"
            />
            <StatCard
              title="Entrenadores"
              value={stats?.dashboard.totalEntrenadores}
              icon={<Trophy className="w-5 h-5" />}
              color="bg-teal-500"
              iconColor="text-teal-500"
            />
            <StatCard
              title="Tasa de Aprobacion"
              value={`${tasaAprobacion}%`}
              icon={<Percent className="w-5 h-5" />}
              color="bg-green-500"
              iconColor="text-green-500"
              subtitle={`${aprobados} de ${totalAvales} solicitudes`}
            />
          </div>

          {/* Charts Row 1: Timeline + Estado */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Timeline - takes 2 cols */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Evolucion de Avales
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Ultimos {meses} meses
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {timeline.reduce((s, t) => s + t.creados, 0)} total
                  </span>
                </div>
              </div>
              <div className="h-[280px] md:h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={timelineWithAccum}
                    margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorCreados"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#8b5cf6"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#8b5cf6"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="colorAprobados"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#10b981"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#10b981"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="label" fontSize={11} tickMargin={8} />
                    <YAxis fontSize={11} />
                    <Tooltip {...tooltipStyle} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="creados"
                      stroke="#8b5cf6"
                      fillOpacity={1}
                      fill="url(#colorCreados)"
                      strokeWidth={2}
                      name="Solicitados"
                    />
                    <Area
                      type="monotone"
                      dataKey="aprobados"
                      stroke="#10b981"
                      fillOpacity={1}
                      fill="url(#colorAprobados)"
                      strokeWidth={2}
                      name="Aprobados"
                    />
                    <Line
                      type="monotone"
                      dataKey="rechazados"
                      stroke="#ef4444"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Rechazados"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Estado Donut */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Estado de Avales
              </h3>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats?.porEstado.items || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {(stats?.porEstado.items || []).map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Legend below chart */}
              <div className="mt-2 space-y-2">
                {(stats?.porEstado.items || []).map((item, i) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span className="text-gray-600 dark:text-gray-400">
                        {item.label}
                      </span>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Charts Row 2: Etapa + Disciplina + Categoria */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Etapa de Aprobacion */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
                Por Etapa
              </h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats?.porEtapa.items || []}
                    layout="vertical"
                    margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      opacity={0.15}
                      horizontal={false}
                    />
                    <XAxis type="number" fontSize={11} />
                    <YAxis
                      dataKey="label"
                      type="category"
                      width={90}
                      fontSize={10}
                      tick={{ fill: "#9ca3af" }}
                    />
                    <Tooltip
                      {...tooltipStyle}
                      cursor={{ fill: "transparent" }}
                    />
                    <Bar
                      dataKey="value"
                      fill="#6366f1"
                      radius={[0, 6, 6, 0]}
                      name="Avales"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Disciplinas */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
                Top Disciplinas
              </h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats?.porDisciplina.items?.slice(0, 8) || []}
                    margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      opacity={0.15}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      fontSize={10}
                      tickMargin={8}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      tick={{ fill: "#9ca3af" }}
                    />
                    <YAxis fontSize={11} />
                    <Tooltip
                      {...tooltipStyle}
                      cursor={{ fill: "transparent" }}
                    />
                    <Bar
                      dataKey="value"
                      radius={[6, 6, 0, 0]}
                      name="Solicitudes"
                    >
                      {(stats?.porDisciplina.items?.slice(0, 8) || []).map(
                        (_, index) => (
                          <Cell
                            key={`disc-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ),
                      )}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Por Categoria */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Por Categoria
              </h3>
              {stats?.porCategoria.items &&
              stats.porCategoria.items.length > 0 ? (
                <>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.porCategoria.items}
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {stats.porCategoria.items.map((_, index) => (
                            <Cell
                              key={`cat-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip {...tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-2 space-y-2">
                    {stats.porCategoria.items.map((item, i) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: COLORS[i % COLORS.length],
                            }}
                          />
                          <span className="text-gray-600 dark:text-gray-400">
                            {item.label}
                          </span>
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500 text-sm">
                  Sin datos de categorias
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* === TAB: PRESUPUESTO === */}
      {activeTab === "presupuesto" &&
        presupuesto &&
        presupuesto.resumen.totalPresupuesto > 0 && (
          <div className="space-y-6">
            {/* Presupuesto KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard
                title="Presupuesto Total"
                value={`$${formatCompact(presupuesto.resumen.totalPresupuesto)}`}
                icon={<Wallet className="w-5 h-5" />}
                color="bg-emerald-500"
                iconColor="text-emerald-500"
                subtitle={`${presupuesto.resumen.totalEventosConPresupuesto} eventos con presupuesto`}
              />
              <StatCard
                title="Promedio por Evento"
                value={
                  presupuesto.resumen.totalEventosConPresupuesto > 0
                    ? `$${formatCompact(presupuesto.resumen.totalPresupuesto / presupuesto.resumen.totalEventosConPresupuesto)}`
                    : "-"
                }
                icon={<TrendingUp className="w-5 h-5" />}
                color="bg-blue-500"
                iconColor="text-blue-500"
              />
              <StatCard
                title="Items Presupuestarios"
                value={presupuesto.porItem.items.length}
                icon={<FileText className="w-5 h-5" />}
                color="bg-purple-500"
                iconColor="text-purple-500"
                subtitle="Partidas con asignacion"
              />
            </div>

            {/* Presupuesto Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Presupuesto por Mes */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
                  Presupuesto por Mes
                </h3>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={presupuesto.porMes.items}
                      margin={{ top: 0, right: 10, left: 10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="budgetGrad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#10b981"
                            stopOpacity={0.9}
                          />
                          <stop
                            offset="100%"
                            stopColor="#10b981"
                            stopOpacity={0.4}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        opacity={0.15}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
                        fontSize={10}
                        tickMargin={8}
                        tick={{ fill: "#9ca3af" }}
                      />
                      <YAxis
                        fontSize={11}
                        tickFormatter={(v) => `$${formatCompact(v)}`}
                      />
                      <Tooltip
                        {...tooltipStyle}
                        formatter={(value) => [
                          `$${Number(value).toLocaleString("es-EC", { minimumFractionDigits: 2 })}`,
                          "Presupuesto",
                        ]}
                      />
                      <Bar
                        dataKey="value"
                        fill="url(#budgetGrad)"
                        radius={[6, 6, 0, 0]}
                        name="Presupuesto"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Presupuesto por Disciplina */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
                  Presupuesto por Disciplina
                </h3>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={presupuesto.porDisciplina.items}
                      layout="vertical"
                      margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        opacity={0.15}
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        fontSize={11}
                        tickFormatter={(v) => `$${formatCompact(v)}`}
                      />
                      <YAxis
                        dataKey="label"
                        type="category"
                        width={90}
                        fontSize={10}
                        tick={{ fill: "#9ca3af" }}
                      />
                      <Tooltip
                        {...tooltipStyle}
                        cursor={{ fill: "transparent" }}
                        formatter={(value) => [
                          `$${Number(value).toLocaleString("es-EC", { minimumFractionDigits: 2 })}`,
                          "Presupuesto",
                        ]}
                      />
                      <Bar
                        dataKey="value"
                        radius={[0, 6, 6, 0]}
                        name="Presupuesto"
                      >
                        {presupuesto.porDisciplina.items.map((_, index) => (
                          <Cell
                            key={`bdisc-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Top Items Presupuestarios */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
                Top Partidas Presupuestarias
              </h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={presupuesto.porItem.items}
                    layout="vertical"
                    margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      opacity={0.15}
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      fontSize={11}
                      tickFormatter={(v) => `$${formatCompact(v)}`}
                    />
                    <YAxis
                      dataKey="label"
                      type="category"
                      width={200}
                      fontSize={10}
                      tick={{ fill: "#9ca3af" }}
                    />
                    <Tooltip
                      {...tooltipStyle}
                      cursor={{ fill: "transparent" }}
                      formatter={(value) => [
                        `$${Number(value).toLocaleString("es-EC", { minimumFractionDigits: 2 })}`,
                        "Total asignado",
                      ]}
                    />
                    <Bar
                      dataKey="value"
                      radius={[0, 6, 6, 0]}
                      name="Presupuesto"
                    >
                      {presupuesto.porItem.items.map((_, index) => (
                        <Cell
                          key={`bitem-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

      {/* Empty presupuesto state */}
      {activeTab === "presupuesto" &&
        (!presupuesto || presupuesto.resumen.totalPresupuesto === 0) && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
              <DollarSign className="w-10 h-10 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-gray-500 dark:text-gray-400">
              No hay datos de presupuesto disponibles.
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Los datos aparecen cuando se cargan eventos con items
              presupuestarios.
            </p>
          </div>
        )}
    </div>
  );
}

function formatCompact(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(0);
}

function StatCard({
  title,
  value,
  icon,
  color,
  iconColor,
  subtitle,
}: {
  title: string;
  value?: number | string | null;
  icon: React.ReactNode;
  color: string;
  iconColor?: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {title}
        </p>
        <div
          className={`p-2 rounded-lg bg-opacity-10 dark:bg-opacity-20 ${color.replace("bg-", "bg-")}/10 ${iconColor ?? "text-gray-500"}`}
        >
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        {value ?? "-"}
      </p>
      {subtitle && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {subtitle}
        </p>
      )}
    </div>
  );
}
