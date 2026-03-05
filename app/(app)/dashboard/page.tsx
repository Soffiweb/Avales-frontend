
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
} from "recharts";
import {
  Users,
  Calendar,
  FileCheck,
  FileText,
  AlertCircle,
  Activity,
  Trophy,
} from "lucide-react";

import { useAuth } from "@/app/providers/auth-provider";
import {
  getAllStatistics,
  getAvalesTimeline,
  getTotalDeportistasFromSoffimedh,
  type AllStatistics,
} from "@/lib/api/statistics";
import AlertBanner from "@/components/ui/alert-banner";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

export default function Dashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [stats, setStats] = useState<AllStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<{ label: string; creados: number; aprobados: number; rechazados: number }[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/signin");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    
    // Only load stats for admins
    const isAdmin = user.roles?.includes("ADMIN") || user.roles?.includes("SUPER_ADMIN");
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    async function loadStats() {
      try {
        setLoading(true);
        const [resStats, resTimeline, deportistasResult] = await Promise.allSettled([
          getAllStatistics(),
          getAvalesTimeline(12),
          getTotalDeportistasFromSoffimedh(),
        ]);

        if (resStats.status !== "fulfilled") {
          throw resStats.reason;
        }
        if (resTimeline.status !== "fulfilled") {
          throw resTimeline.reason;
        }

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
        // Map timeline data for the chart
        if (resTimeline.value.data && resTimeline.value.data.items) {
             setTimeline(resTimeline.value.data.items);
        }
      } catch (err: any) {
        setError(err.message || "Error al cargar estadísticas");
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [user]);

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

  const isAdmin = user.roles?.includes("ADMIN") || user.roles?.includes("SUPER_ADMIN");

  if (!isAdmin) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-8 text-center">
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-full mb-6">
          <Trophy className="w-16 h-16 text-indigo-500" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Bienvenido, {user.nombre}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-4">
          Gestiona tus avales y eventos desde el menú lateral. Si necesitas permisos adicionales, contacta al administrador.
        </p>
        <p className="text-xs text-gray-400">
          Tu rol actual: {user.roles?.join(", ") || "Ninguno"}
        </p>
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

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-[96rem] mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
          Dashboard Administrativo
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Vista general del rendimiento y estado del sistema.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Avales Totales"
          value={stats?.dashboard.totalAvales}
          icon={<FileText className="w-6 h-6 text-white" />}
          color="bg-blue-500"
        />
        <StatCard
          title="Por Aprobar"
          value={stats?.dashboard.avalesPendientes}
          icon={<Activity className="w-6 h-6 text-white" />}
          color="bg-amber-500"
        />
        <StatCard
          title="Aprobados"
          value={stats?.dashboard.avalesAprobados}
          icon={<FileCheck className="w-6 h-6 text-white" />}
          color="bg-green-500"
        />
        <StatCard
          title="Rechazados"
          value={stats?.dashboard.avalesRechazados}
          icon={<AlertCircle className="w-6 h-6 text-white" />}
          color="bg-red-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <StatCard
          title="Eventos Activos"
          value={stats?.dashboard.totalEventos}
          icon={<Calendar className="w-6 h-6 text-white" />}
          color="bg-indigo-500"
        />
         <StatCard
          title="Deportistas"
          value={stats?.dashboard.totalDeportistas}
          icon={<Users className="w-6 h-6 text-white" />}
          color="bg-purple-500"
        />
         <StatCard
          title="Entrenadores"
          value={stats?.dashboard.totalEntrenadores}
          icon={<Trophy className="w-6 h-6 text-white" />}
          color="bg-teal-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Timeline Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
            Evolución de Avales (Últimos 12 meses)
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeline} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="label" fontSize={12} tickMargin={10} />
                <YAxis fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgb(31 41 55)', border: 'none', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend />
                <Line type="monotone" dataKey="creados" stroke="#8884d8" name="Solicitados" strokeWidth={2} />
                <Line type="monotone" dataKey="aprobados" stroke="#82ca9d" name="Aprobados" strokeWidth={2} />
                <Line type="monotone" dataKey="rechazados" stroke="#ff8042" name="Rechazados" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
            Estado de Avales
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.porEstado.items || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {(stats?.porEstado.items || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stage Distribution */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
           <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
            Avales por Etapa de Aprobación
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats?.porEtapa.items || []}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={false} />
                <XAxis type="number" fontSize={12} />
                <YAxis dataKey="label" type="category" width={100} fontSize={10} />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} name="Cantidad" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Discipline Distribution */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
           <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
            Top Disciplinas
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats?.porDisciplina.items?.slice(0, 10) || []}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
                <XAxis dataKey="label" fontSize={12} tickMargin={10} angle={-45} textAnchor="end" height={60} />
                <YAxis fontSize={12} />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Solicitudes" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: any) {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {title}
        </p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {value ?? "-"}
        </p>
      </div>
    </div>
  );
}
