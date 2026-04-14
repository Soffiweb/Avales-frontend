"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";

import AlertBanner from "@/components/ui/alert-banner";
import ConfirmModal from "@/components/ui/confirm-modal";
import type { CatalogItem } from "@/types/catalog";

type CatalogPayload = {
  nombre: string;
  codigo?: string | null;
};

type Notice = {
  variant: "success" | "error";
  message: string;
  description?: string;
} | null;

type Props = {
  title: string;
  description: string;
  items: CatalogItem[];
  loading: boolean;
  error: string | null;
  emptyMessage: string;
  onReload: () => Promise<void>;
  onCreate: (payload: CatalogPayload) => Promise<void>;
  onUpdate: (id: number, payload: CatalogPayload) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  singularTitle: string;
  backHref?: string;
};

export default function CatalogCrudView({
  title,
  description,
  items,
  loading,
  error,
  emptyMessage,
  onReload,
  onCreate,
  onUpdate,
  onDelete,
  singularTitle,
  backHref = "/catalogos",
}: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmItem, setConfirmItem] = useState<CatalogItem | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const isEditing = Boolean(editingItem);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const resetForm = () => {
    setEditingItem(null);
    setNombre("");
    setCodigo("");
    setFormError(null);
    setFormOpen(false);
  };

  const openCreate = () => {
    setEditingItem(null);
    setNombre("");
    setCodigo("");
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (item: CatalogItem) => {
    setEditingItem(item);
    setNombre(item.nombre ?? "");
    setCodigo(item.codigo ?? "");
    setFormError(null);
    setFormOpen(true);
  };

  const submit = async () => {
    const cleanNombre = nombre.trim();
    const cleanCodigo = codigo.trim();

    if (!cleanNombre) {
      setFormError("El nombre es obligatorio.");
      return;
    }

    try {
      setSaving(true);
      setFormError(null);

      const payload = {
        nombre: cleanNombre,
        codigo: cleanCodigo || null,
      };

      if (editingItem) {
        await onUpdate(editingItem.id, payload);
        setNotice({
          variant: "success",
          message: `${singularTitle} actualizado correctamente.`,
        });
      } else {
        await onCreate(payload);
        setNotice({
          variant: "success",
          message: `${singularTitle} creado correctamente.`,
        });
      }

      resetForm();
      await onReload();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo guardar el registro.";
      setFormError(message);
      setNotice({ variant: "error", message });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!confirmItem) return;

    try {
      setDeleting(true);
      await onDelete(confirmItem.id);
      setNotice({
        variant: "success",
        message: `${confirmItem.nombre} eliminado correctamente.`,
      });
      setConfirmItem(null);
      await onReload();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo eliminar el registro.";
      setNotice({ variant: "error", message });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-6xl mx-auto">
      {notice && (
        <div className="fixed top-4 right-4 z-50 max-w-sm w-full">
          <AlertBanner
            variant={notice.variant}
            message={notice.message}
            description={notice.description}
            onClose={() => setNotice(null)}
          />
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href={backHref}
              className="text-sm font-medium text-violet-600 dark:text-violet-400 hover:underline"
            >
              Volver
            </Link>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="btn bg-violet-600 text-white hover:bg-violet-500 inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo
        </button>
      </div>

      {error && (
        <div className="mb-6">
          <AlertBanner
            variant="error"
            message="No se pudo cargar la información."
            description={error}
          />
        </div>
      )}

      {formOpen && (
        <div className="mb-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {isEditing ? `Editar ${singularTitle}` : `Nuevo ${singularTitle}`}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Solo se muestran nombre y codigo.
              </p>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Cerrar
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                Nombre
              </label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-violet-500 focus:outline-none"
                placeholder="Nombre"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                Codigo
              </label>
              <input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-violet-500 focus:outline-none"
                placeholder="Codigo"
              />
            </div>
          </div>

          {formError && (
            <p className="mt-4 text-sm text-rose-600 dark:text-rose-300">
              {formError}
            </p>
          )}

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="btn border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                void submit();
              }}
              className="btn bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-60"
              disabled={saving}
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="min-h-[30vh] flex items-center justify-center rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Cargando catalogo...
            </p>
          </div>
        </div>
      ) : error && items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-rose-300 dark:border-rose-800 bg-white dark:bg-gray-800 p-10 text-center">
          <p className="text-sm text-rose-700 dark:text-rose-300">
            No se pudieron cargar los registros.
          </p>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-10 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {emptyMessage}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm"
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                <div className="min-w-0">
                  <h2
                    className="text-lg font-semibold text-gray-900 dark:text-gray-100 leading-snug"
                    style={{
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: 2,
                      overflow: "hidden",
                    }}
                  >
                    {item.nombre}
                  </h2>
                  {item.codigo ? (
                    <p className="mt-2 text-sm text-violet-600 dark:text-violet-300 font-medium break-all">
                      {item.codigo}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
                      Sin codigo
                    </p>
                  )}
                  {typeof item.eventosCount === "number" && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {item.eventosCount} evento
                      {item.eventosCount === 1 ? "" : "s"}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-1">
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                    aria-label={`Editar ${item.nombre}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmItem(item)}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-rose-600 hover:text-rose-700 dark:text-rose-300 dark:hover:text-rose-200"
                    aria-label={`Eliminar ${item.nombre}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={Boolean(confirmItem)}
        title={`Eliminar ${confirmItem?.nombre ?? "registro"}`}
        description="Esta accion no se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        loading={deleting}
        onConfirm={() => {
          void confirmDelete();
        }}
        onClose={() => setConfirmItem(null)}
      />
    </div>
  );
}
