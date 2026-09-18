"use client";

import {
  Calendar,
  Download,
  Eye,
  Clock,
  Trash2,
  MapPin,
  Trophy,
  User,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileEdit,
  FileText,
  Stamp,
} from "lucide-react";

import { EyeIcon } from "@phosphor-icons/react";
import Link from "next/link";

import type { Aval, EtapaFlujo } from "@/types/aval";
import {
  getApprovalStageBadgeStyles,
  getApprovalStageLabel,
  getTipoAvalLabel,
} from "@/lib/constants";
import { getAvalCupos, getAvalNumero } from "@/lib/utils/aval-collections";
import {
  getAvalCurrentEtapa,
  getFinalApprovalStageForAval,
  isAvalFlowApproved,
  isStageReadyForAval,
} from "@/lib/approval-flow";
import {
  formatDate,
  formatLocationWithProvince,
  getResponsibleTrainerName,
} from "@/lib/utils/formatters";
import { Fragment, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import AlertBanner from "@/components/ui/alert-banner";
import AvalFlujoProgreso from "./aval-flujo-progreso";
import ConfirmModal from "@/components/ui/confirm-modal";
import RowActionsMenu, { type RowAction } from "@/components/ui/row-actions-menu";
import { deleteAvalRequest } from "@/lib/api/avales";
import { downloadAvalCompletoZip } from "@/lib/api/aval-pdfs";
import {
  TableContainer,
  Table,
  TableHead,
  TableBody,
  Th,
  Tr,
  Td,
  ExpandToggle,
  ExpandedRow,
} from "@/components/ui/table";

/**
 * Vista de tabla del listado de avales.
 *
 * Comparte props y reglas de permiso con `AvalListCard` — la logica por fila
 * es identica a proposito, para que ambas vistas habiliten exactamente las
 * mismas acciones. Si cambia una regla, tiene que cambiar en las dos.
 *
 * En pantalla se ven como maximo dos acciones por fila: "Ver" siempre, y una
 * accion de etapa que depende del rol del usuario y de la etapa del aval.
 */
type Props = {
  avales: Aval[];
  loading?: boolean;
  error?: string | null;
  isAdmin?: boolean;
  isSecretaria?: boolean;
  isPda?: boolean;
  isDtm?: boolean;
  isMetodologo?: boolean;
  isControlPrevio?: boolean;
  isFinanciero?: boolean;
  isComprasPublicas?: boolean;
  isTrainer?: boolean;
  userId?: number;
};

const STATUS_ICONS: Record<string, typeof Clock> = {
  DISPONIBLE: AlertCircle,
  BORRADOR: FileEdit,
  SOLICITADO: Clock,
  ACEPTADO: CheckCircle,
  RECHAZADO: XCircle,
};

function getStatusIcon(status?: string | null) {
  if (!status) return AlertCircle;
  return STATUS_ICONS[status.toUpperCase()] ?? AlertCircle;
}

const COLUMN_COUNT = 6;

/**
 * Paleta del avatar. El color sale de un hash del nombre para que la misma
 * persona se vea siempre igual: si fuera aleatorio o por índice de fila,
 * cambiaría al reordenar o paginar y dejaría de servir como pista visual.
 */
const AVATAR_TONES = [
  "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
  "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300",
];

function iniciales(nombre: string) {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const primera = partes[0][0] ?? "";
  const segunda = partes.length > 1 ? (partes[partes.length - 1][0] ?? "") : "";
  return (primera + segunda).toUpperCase();
}

function tonoAvatar(nombre: string) {
  let hash = 0;
  for (const char of nombre) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

function Avatar({ nombre }: { nombre: string }) {
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${tonoAvatar(nombre)}`}
      aria-hidden="true"
    >
      {iniciales(nombre)}
    </span>
  );
}

/** Par término/descripción del panel desplegable. */
function Detalle({
  icon: Icon,
  termino,
  children,
}: {
  icon: typeof Eye;
  termino: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon
        className="mt-0.5 h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500"
        aria-hidden="true"
      />
      <div className="min-w-0">
        <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {termino}
        </dt>
        <dd className="mt-0.5 text-sm text-gray-800 dark:text-gray-200">
          {children}
        </dd>
      </div>
    </div>
  );
}

export default function AvalListTable({
  avales,
  loading,
  error,
  isAdmin = false,
  isPda = false,
  isDtm = false,
  isMetodologo = false,
  isControlPrevio = false,
  isFinanciero = false,
  isComprasPublicas = false,
  isTrainer = false,
  userId,
}: Props) {
  const showEmpty = !loading && !error && avales.length === 0;
  // Varias filas pueden estar abiertas a la vez: sirve para comparar dos
  // avales sin tener que cerrar uno para ver el otro.
  const [abiertos, setAbiertos] = useState<Set<number>>(new Set());

  const queryClient = useQueryClient();
  // El aval a eliminar se guarda entero: el modal necesita su numero para que
  // el usuario confirme sobre cual esta actuando, no sobre "el seleccionado".
  const [aEliminar, setAEliminar] = useState<Aval | null>(null);
  const [accionError, setAccionError] = useState<string | null>(null);

  const eliminar = useMutation({
    mutationFn: (id: number) => deleteAvalRequest(id),
    onSuccess: async () => {
      setAEliminar(null);
      await queryClient.invalidateQueries({ queryKey: ["avales"] });
    },
    onError: (err: unknown) => {
      setAEliminar(null);
      setAccionError(
        err instanceof Error ? err.message : "No se pudo eliminar el aval.",
      );
    },
  });

  const descargar = async (aval: Aval) => {
    setAccionError(null);
    try {
      await downloadAvalCompletoZip(
        aval.id,
        `aval-${getAvalNumero(aval) ?? aval.id}.zip`,
      );
    } catch (err: unknown) {
      setAccionError(
        err instanceof Error ? err.message : "No se pudo descargar el aval.",
      );
    }
  };

  const toggle = (id: number) =>
    setAbiertos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      {accionError && (
        <div className="mb-3">
          <AlertBanner
            variant="error"
            message={accionError}
            onClose={() => setAccionError(null)}
          />
        </div>
      )}

    <TableContainer>
      <Table className="table-fixed">
        <TableHead>
          <tr>
            <Th className="w-10" aria-label="Detalle" />
            <Th className="w-24">N.°</Th>
            {/* Evento no lleva ancho: se queda con el espacio sobrante. */}
            <Th>Evento</Th>
            <Th className="w-44">Estado</Th>
            <Th className="w-56">Responsable</Th>
            {/* Solo el botón de tres puntos. El encabezado queda para
                lectores de pantalla: en 64px la palabra se cortaba, y sobre un
                menú de acciones no aporta nada visualmente. */}
            <Th className="w-16 pl-0 text-right">
              <span className="sr-only">Acciones</span>
            </Th>
          </tr>
        </TableHead>

        <TableBody>
          {loading &&
            Array.from({ length: 6 }).map((_, i) => (
              <tr key={`skeleton-${i}`} className="animate-pulse">
                {Array.from({ length: COLUMN_COUNT }).map((__, j) => (
                  <Td key={j}>
                    <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
                  </Td>
                ))}
              </tr>
            ))}

          {error && !loading && (
            <tr>
              <Td colSpan={COLUMN_COUNT} className="text-center text-red-500">
                {error}
              </Td>
            </tr>
          )}

          {showEmpty && (
            <tr>
              <Td colSpan={COLUMN_COUNT} className="py-12 text-center">
                <FileText className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
                <p className="text-base text-gray-500 dark:text-gray-400">
                  No hay avales para mostrar.
                </p>
              </Td>
            </tr>
          )}

          {!loading &&
            !error &&
            avales.map((aval) => {
              const etapaParaMostrar = getAvalCurrentEtapa(aval) as EtapaFlujo;

              // Mismas reglas que AvalListCard: solo se puede actuar si el aval
              // esta SOLICITADO, la etapa matchea el rol, y el ultimo evento del
              // historial no fue un rechazo.
              const isProcessable = aval.estado === "SOLICITADO";
              const lastHistorial = aval.historial?.[0];
              const wasRecentlyRejected = lastHistorial?.estado === "RECHAZADO";
              const stageMatchesRole = (etapaRol: EtapaFlujo) =>
                isProcessable &&
                !wasRecentlyRejected &&
                isStageReadyForAval(aval, etapaRol, etapaParaMostrar);

              const isAvalOwner =
                isTrainer &&
                userId !== undefined &&
                (aval.userId === userId ||
                  aval.entrenadores.some((e) => e.entrenadorId === userId));
              const canEditSolicitud =
                isAvalOwner &&
                (aval.estado === "BORRADOR" ||
                  etapaParaMostrar === "SOLICITUD");
              const editSolicitudLabel = aval.avalTecnico
                ? "Editar"
                : "Crear";

              // Mismas reglas que la pantalla de detalle: el dueño puede
              // eliminar su solicitud mientras siga en BORRADOR o no haya
              // pasado de SOLICITUD; un admin puede eliminar el aval completo.
              const canDeleteSolicitud =
                isAvalOwner &&
                (aval.estado === "BORRADOR" ||
                  (aval.estado === "SOLICITADO" &&
                    etapaParaMostrar === "SOLICITUD"));
              const puedeEliminar = canDeleteSolicitud || isAdmin;

              const canPdaAct = isPda && stageMatchesRole("PDA");
              const canComprasAct =
                isComprasPublicas && stageMatchesRole("COMPRAS_PUBLICAS");
              const canMetodologoAct =
                isMetodologo && stageMatchesRole("REVISION_METODOLOGO");
              const canDtmAct = isDtm && stageMatchesRole("REVISION_DTM");
              const canControlPrevioAct =
                isControlPrevio && stageMatchesRole("CONTROL_PREVIO");
              const canFinancieroAct =
                isFinanciero && stageMatchesRole("FINANCIERO");

              const isFlowApproved = isAvalFlowApproved(aval);
              const displayStage = isFlowApproved
                ? getFinalApprovalStageForAval(aval)
                : etapaParaMostrar;
              const statusStyles = getApprovalStageBadgeStyles(
                aval.estado,
                displayStage,
              );
              const StatusIcon = getStatusIcon(aval.estado);
              const stageLabel = isFlowApproved
                ? "Aprobado"
                : getApprovalStageLabel(etapaParaMostrar);

              const evento = aval.evento;
              const cupos = getAvalCupos(aval);
              const totalDeportistas =
                cupos.numAtletasHombres + cupos.numAtletasMujeres;
              const totalEntrenadores =
                cupos.numEntrenadoresHombres + cupos.numEntrenadoresMujeres;

              return (
                <Fragment key={aval.id}>
                  <Tr
                    className={
                      abiertos.has(aval.id)
                        ? "bg-gray-50 dark:bg-gray-900/50"
                        : ""
                    }
                  >
                    <Td className="w-10 py-2.5 pr-0">
                      <ExpandToggle
                        expanded={abiertos.has(aval.id)}
                        onToggle={() => toggle(aval.id)}
                        label={`el aval ${getAvalNumero(aval) ?? aval.id}`}
                      />
                    </Td>

                    <Td className="whitespace-nowrap py-2.5 font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {getAvalNumero(aval) ?? aval.id}
                    </Td>

                    <Td className="py-2.5">
                      <span
                        className="block truncate text-sm font-medium text-gray-900 dark:text-gray-100"
                        title={evento?.nombre ?? undefined}
                      >
                        {evento?.nombre || "-"}
                      </span>
                      <span className="mt-1 flex items-center gap-2 text-xs">
                        <span className="max-w-[12rem] truncate rounded-md bg-gray-100 px-1.5 py-0.5 font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                          {evento?.disciplina?.nombre || "Sin disciplina"}
                        </span>
                        {formatLocationWithProvince(evento) && (
                          <span className="truncate text-gray-400 dark:text-gray-500">
                            · {formatLocationWithProvince(evento)}
                          </span>
                        )}
                      </span>
                    </Td>

                    <Td className="py-2.5">
                      <span
                        className={`inline-flex max-w-full items-center gap-1.5 truncate rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyles.bg} ${statusStyles.text} ${statusStyles.border}`}
                        title={stageLabel}
                      >
                        <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                        {stageLabel}
                      </span>
                    </Td>

                    <Td className="py-2.5">
                      <span className="flex items-center gap-2">
                        <Avatar nombre={getResponsibleTrainerName(aval, "-")} />
                        <span
                          className="truncate text-sm"
                          title={getResponsibleTrainerName(aval, "-")}
                        >
                          {getResponsibleTrainerName(aval, "-")}
                        </span>
                      </span>
                    </Td>

                    <Td className="py-2.5 pl-0 text-right">
                      <RowActionsMenu
                        label={`el aval ${getAvalNumero(aval) ?? aval.id}`}
                        actions={
                          [
                            {
                              label: "Ver detalle",
                              icon: Eye,
                              href: `/avales/${aval.id}`,
                            },
                            canEditSolicitud && {
                              label: `${editSolicitudLabel} aval`,
                              icon: FileEdit,
                              href: `/avales/${aval.id}/crear-solicitud`,
                            },
                            canPdaAct && {
                              label: "Certificar PDA",
                              icon: Stamp,
                              href: `/avales/${aval.id}/certificar-pda`,
                            },
                            canComprasAct && {
                              label: "Certificar compras públicas",
                              icon: Stamp,
                              href: `/avales/${aval.id}/certificar-compras-publicas`,
                            },
                            canDtmAct && {
                              label: "Revisar como DTM",
                              icon: Eye,
                              href: `/avales/${aval.id}/revision-dtm`,
                            },
                            canMetodologoAct && {
                              label: "Revisar como metodólogo",
                              icon: Eye,
                              href: `/avales/${aval.id}/revision-metodologo`,
                            },
                            canControlPrevioAct && {
                              label: "Revisar control previo",
                              icon: Eye,
                              href: `/avales/${aval.id}/revision-control-previo`,
                            },
                            canFinancieroAct && {
                              label: "Certificación financiera",
                              icon: Stamp,
                              href: `/avales/${aval.id}/certificacion-financiera`,
                            },
                            {
                              label: "Descargar aval completo",
                              icon: Download,
                              onClick: () => void descargar(aval),
                            },
                            puedeEliminar && {
                              label: isAdmin
                                ? "Eliminar aval"
                                : "Eliminar solicitud",
                              icon: Trash2,
                              danger: true,
                              onClick: () => {
                                setAccionError(null);
                                setAEliminar(aval);
                              },
                            },
                          ].filter(Boolean) as RowAction[]
                        }
                      />
                    </Td>
                  </Tr>

                  {abiertos.has(aval.id) && (
                    <ExpandedRow
                      colSpan={COLUMN_COUNT}
                      // Sin condición, igual que el item "Ver detalle" del
                      // menú de acciones de esta misma fila: ver el aval no
                      // está restringido por rol, lo que se restringe son las
                      // acciones de etapa. El pie repite ese mismo acceso
                      // donde el usuario ya está mirando el detalle.
                      footer={
                        <Link
                          href={`/avales/${aval.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
                        >
                          <EyeIcon size={14} aria-hidden="true" />
                          Ver detalle completo
                        </Link>
                      }
                    >
                      <AvalFlujoProgreso aval={aval} />

                      <div className="my-4 border-t border-gray-200 dark:border-gray-700" />

                      <dl className="grid grid-cols-1 gap-x-10 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                        <Detalle icon={FileText} termino="Tipo de aval">
                          {getTipoAvalLabel(aval.tipoAval) || "-"}
                        </Detalle>
                        <Detalle icon={Trophy} termino="Disciplina">
                          {evento?.disciplina?.nombre || "Sin disciplina"}
                        </Detalle>
                        <Detalle icon={Calendar} termino="Fecha de emisión">
                          {aval.fechaEmision ? formatDate(aval.fechaEmision) : "-"}
                        </Detalle>
                        <Detalle icon={MapPin} termino="Ubicación">
                          {formatLocationWithProvince(evento) || "-"}
                        </Detalle>
                        <Detalle icon={User} termino="Responsable">
                          {getResponsibleTrainerName(aval, "-")}
                        </Detalle>
                        <Detalle icon={Users} termino="Delegación">
                          {totalDeportistas} deportista(s) · {totalEntrenadores}{" "}
                          entrenador(es)
                        </Detalle>
                      </dl>
                    </ExpandedRow>
                  )}
                </Fragment>
              );
            })}
        </TableBody>
      </Table>
    </TableContainer>

      {/* Misma advertencia que la pantalla de detalle: eliminar un aval borra
          datos y archivos en storage, y no se puede deshacer. No se muestra
          una confirmacion mas debil solo porque se dispare desde la lista. */}
      <ConfirmModal
        open={Boolean(aEliminar)}
        title={isAdmin ? "Eliminar aval completo" : "Eliminar solicitud de aval"}
        description={
          aEliminar
            ? isAdmin
              ? `¿Seguro que quieres eliminar el aval ${
                  getAvalNumero(aEliminar) ?? aEliminar.id
                }? Se borrarán todos los datos, archivos en storage y el evento quedará disponible para crear un nuevo aval. Esta acción no se puede deshacer.`
              : `¿Seguro que quieres eliminar la solicitud del aval ${
                  getAvalNumero(aEliminar) ?? aEliminar.id
                }? Esta acción no se puede deshacer.`
            : undefined
        }
        confirmLabel="Eliminar"
        loading={eliminar.isPending}
        onConfirm={() => aEliminar && eliminar.mutate(aEliminar.id)}
        onClose={() => setAEliminar(null)}
      />
    </>
  );
}
