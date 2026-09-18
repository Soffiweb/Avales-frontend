"use client";

import Link from "next/link";
import {
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileEdit,
  FileText,
  Stamp,
} from "lucide-react";

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
  formatLocationWithProvince,
  getResponsibleTrainerName,
} from "@/lib/utils/formatters";
import {
  TableContainer,
  Table,
  TableHead,
  TableBody,
  Th,
  Tr,
  Td,
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

const COLUMN_COUNT = 8;

const ACTION_BASE =
  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors";

export default function AvalListTable({
  avales,
  loading,
  error,
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

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <tr>
            <Th>N.°</Th>
            <Th>Evento</Th>
            <Th>Tipo</Th>
            <Th>Estado</Th>
            <Th>Responsable</Th>
            <Th>Ubicación</Th>
            <Th className="text-center">Delegación</Th>
            <Th className="text-right">Acciones</Th>
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
                <Tr key={aval.id}>
                  <Td className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                    {getAvalNumero(aval) ?? aval.id}
                  </Td>

                  <Td className="max-w-[22rem] whitespace-normal">
                    <span
                      className="block truncate font-medium text-gray-900 dark:text-gray-100"
                      title={evento?.nombre ?? undefined}
                    >
                      {evento?.nombre || "-"}
                    </span>
                  </Td>

                  <Td className="text-xs">{getTipoAvalLabel(aval.tipoAval)}</Td>

                  <Td>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles}`}
                    >
                      <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      {stageLabel}
                    </span>
                  </Td>

                  <Td className="max-w-[14rem]">
                    <span className="block truncate">
                      {getResponsibleTrainerName(aval, "-")}
                    </span>
                  </Td>

                  <Td className="max-w-[14rem]">
                    <span className="block truncate">
                      {formatLocationWithProvince(evento) || "-"}
                    </span>
                  </Td>

                  <Td className="text-center tabular-nums">
                    <span title="Deportistas / Entrenadores">
                      {totalDeportistas} / {totalEntrenadores}
                    </span>
                  </Td>

                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/avales/${aval.id}`}
                        className={`${ACTION_BASE} border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300 dark:hover:bg-sky-950/50`}
                        aria-label={`Ver detalle del aval de ${evento?.nombre || "evento"}`}
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                        Ver
                      </Link>

                      {canEditSolicitud && (
                        <Link
                          href={`/avales/${aval.id}/crear-solicitud`}
                          className={`${ACTION_BASE} bg-indigo-500 text-white hover:bg-indigo-600`}
                        >
                          <FileEdit className="h-3.5 w-3.5" aria-hidden="true" />
                          {editSolicitudLabel}
                        </Link>
                      )}
                      {canPdaAct && (
                        <Link
                          href={`/avales/${aval.id}/certificar-pda`}
                          className={`${ACTION_BASE} bg-cyan-600 text-white hover:bg-cyan-700`}
                        >
                          <Stamp className="h-3.5 w-3.5" aria-hidden="true" />
                          Certificar
                        </Link>
                      )}
                      {canComprasAct && (
                        <Link
                          href={`/avales/${aval.id}/certificar-compras-publicas`}
                          className={`${ACTION_BASE} bg-emerald-600 text-white hover:bg-emerald-700`}
                        >
                          <Stamp className="h-3.5 w-3.5" aria-hidden="true" />
                          Certificar
                        </Link>
                      )}
                      {canDtmAct && (
                        <Link
                          href={`/avales/${aval.id}/revision-dtm`}
                          className={`${ACTION_BASE} bg-amber-500 text-white hover:bg-amber-600`}
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                          Revisar
                        </Link>
                      )}
                      {canMetodologoAct && (
                        <Link
                          href={`/avales/${aval.id}/revision-metodologo`}
                          className={`${ACTION_BASE} bg-amber-500 text-white hover:bg-amber-600`}
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                          Revisar
                        </Link>
                      )}
                      {canControlPrevioAct && (
                        <Link
                          href={`/avales/${aval.id}/revision-control-previo`}
                          className={`${ACTION_BASE} bg-amber-500 text-white hover:bg-amber-600`}
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                          Revisar
                        </Link>
                      )}
                      {canFinancieroAct && (
                        <Link
                          href={`/avales/${aval.id}/certificacion-financiera`}
                          className={`${ACTION_BASE} bg-indigo-600 text-white hover:bg-indigo-700`}
                        >
                          <Stamp className="h-3.5 w-3.5" aria-hidden="true" />
                          Certificar
                        </Link>
                      )}
                    </div>
                  </Td>
                </Tr>
              );
            })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
