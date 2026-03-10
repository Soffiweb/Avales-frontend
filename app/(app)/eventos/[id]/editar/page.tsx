"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import EventoForm from "../../_components/evento-form";
import EventoFormSkeleton from "../../_components/evento-form-skeleton";
import { getEvento } from "@/lib/api/eventos";
import type { Evento } from "@/types/evento";

export default function EditarEventoPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const [evento, setEvento] = useState<Evento | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEvento = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getEvento(id);
        setEvento(res.data);
      } catch (err: any) {
        setError(err?.message ?? "No se pudo cargar el evento.");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      void loadEvento();
    }
  }, [id]);

  const handleUpdated = async () => {
    router.push("/eventos?status=updated");
  };

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[96rem] mx-auto">
        <div className="mb-8">
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
          <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
          <div className="h-4 w-80 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <EventoFormSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[96rem] mx-auto">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!evento) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[96rem] mx-auto">
        <p className="text-gray-500 dark:text-gray-400">
          No se encontro el evento.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[96rem] mx-auto">
      <div className="mb-8">
        <Link
          href="/eventos"
          className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a eventos
        </Link>
        <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">
          Editar evento
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Modifica los datos del evento {evento.nombre}.
        </p>
      </div>

      <EventoForm mode="edit" evento={evento} onUpdated={handleUpdated} />
    </div>
  );
}
