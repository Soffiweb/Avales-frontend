import type { Aval } from "@/types/aval";
import { formatLocationWithProvince } from "@/lib/utils/formatters";

type FormData = {
  deportistas: Array<{
    id: number;
    deportistaExternoId?: string;
    nombre: string;
    apellido?: string;
    nombres?: string;
    apellidos?: string;
    cedula?: string;
    fechaNacimiento?: string;
    payload?: Record<string, unknown>;
    observacion?: string;
    rol?: string;
  }>;
  entrenadores: Array<{ id: number; nombre: string }>;
  fechaHoraSalida: string;
  fechaHoraRetorno: string;
  lugarSalida: string;
  lugarRetorno: string;
  transporteSalida: string;
  transporteRetorno: string;
  objetivos: string[];
  criterios: string[];
  observaciones?: string;
};

type AvalDocumentPreviewProps = {
  aval: Aval;
  formData: FormData;
  mode?: "all" | "nomina" | "solicitud";
};

const TRANSPORTE_LABELS: Record<string, string> = {
  AEREO: "TRANSPORTE AEREO",
  TERRESTRE: "TRANSPORTE TERRESTRE",
  VEHICULO_PROPIO: "VEHICULO PROPIO",
  MARITIMO: "TRANSPORTE MARITIMO",
  OTRO: "OTRO",
};

function formatFechaNacimiento(fecha?: string) {
  if (!fecha) return "-";
  const parsed = new Date(fecha);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("es-EC");
}

function formatFechaEventoDocumento(inicio?: string, fin?: string) {
  if (!inicio) return "-";

  const start = new Date(inicio);
  if (Number.isNaN(start.getTime())) return "-";

  const startFormatted = start.toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  if (!fin) return startFormatted.toUpperCase();

  const end = new Date(fin);
  if (Number.isNaN(end.getTime())) return startFormatted.toUpperCase();

  const endFormatted = end.toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return `${startFormatted} AL ${endFormatted}`.toUpperCase();
}

function formatLogisticaFecha(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function formatLogisticaHora(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}H${mm}`;
}

function formatTransporte(value?: string) {
  if (!value) return "-";
  return TRANSPORTE_LABELS[value] ?? value.replaceAll("_", " ");
}

function formatMoneda(value?: string) {
  const parsed = Number.parseFloat(value ?? "");
  if (Number.isNaN(parsed)) return "-";
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
  }).format(parsed);
}

export type AvalPreviewFormData = FormData;

export default function AvalDocumentPreview({
  aval,
  formData,
  mode = "all",
}: AvalDocumentPreviewProps) {
  const evento = aval.evento;
  const presupuestoItems = evento?.presupuesto ?? [];
  const entrenadorResponsable = formData.entrenadores[0]?.nombre ?? "POR DEFINIR";
  const asistente = formData.entrenadores[1]?.nombre ?? "-";
  const disciplina = evento?.disciplina?.nombre?.toUpperCase() ?? "SIN DISCIPLINA";
  const categoria = evento?.categoria?.nombre?.toUpperCase() ?? "SIN CATEGORIA";
  const genero = (evento?.genero ?? "MASCULINO_FEMENINO").replaceAll("_", " - ");
  const avalNumero =
    aval.avalTecnico?.numeroAval ??
    aval.aval ??
    aval.numeroColeccion ??
    String(aval.id ?? "S/N");
  const showDetallePage =
    Boolean(formData.fechaHoraSalida) ||
    Boolean(formData.fechaHoraRetorno) ||
    Boolean(formData.lugarSalida) ||
    Boolean(formData.lugarRetorno) ||
    Boolean(formData.transporteSalida) ||
    Boolean(formData.transporteRetorno) ||
    formData.objetivos.length > 0 ||
    formData.criterios.length > 0 ||
    Boolean(formData.observaciones?.trim());
  const showNomina = mode !== "solicitud";
  const showSolicitud = mode !== "nomina" && (showDetallePage || mode === "solicitud");

  return (
    <div className="w-full space-y-6 text-slate-900">
      {showNomina && (
        <div className="bg-white p-5 xl:p-6 border border-slate-300">
        <div className="text-[13px] leading-5 space-y-0.5">
          <p>Lic.</p>
          <p>{entrenadorResponsable.toUpperCase()}</p>
          <p className="font-semibold uppercase">ENTRENADOR DE {disciplina} DE FDPL</p>
          <p>Ciudad.-</p>
        </div>

        <p className="mt-4 text-[13px] leading-5">
          De mis consideraciones:
        </p>

        <p className="mt-3 text-[13px] leading-5">
          Por medio de la presente me permito dirigirme a usted, para extender
          mi cordial saludo y desear lo mejor al frente de las actividades
          encomendadas para el desarrollo del deporte de nuestra ciudad y
          provincia de Loja.
        </p>

        <p className="mt-3 text-[13px] leading-5 font-semibold">
          A lo solicitado por usted mediante el AVAL TÉCNICO DE PARTICIPACIÓN
          COMPETITIVA DEL DEPORTE DEL &quot;{disciplina}&quot; Presentado en esta
          dependencia el {new Date().getFullYear()}.
        </p>

        <div className="mt-4 border border-slate-400">
          <table className="w-full border-collapse text-[11px]">
            <tbody>
              <tr>
                <td className="w-1/3 border border-slate-400 px-2 py-1 font-semibold">
                  DEPORTE
                </td>
                <td className="border border-slate-400 px-2 py-1">{disciplina}</td>
              </tr>
              <tr>
                <td className="border border-slate-400 px-2 py-1 font-semibold">
                  DOCUMENTO
                </td>
                <td className="border border-slate-400 px-2 py-1">
                  AVAL TECNICO DE PARTICIPACION COMPETITIVA
                </td>
              </tr>
              <tr>
                <td className="border border-slate-400 px-2 py-1 font-semibold">
                  EVENTO
                </td>
                <td className="border border-slate-400 px-2 py-1">
                  {evento?.nombre?.toUpperCase() ?? "SIN EVENTO"}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-400 px-2 py-1 font-semibold">
                  GENERO
                </td>
                <td className="border border-slate-400 px-2 py-1">{genero}</td>
              </tr>
              <tr>
                <td className="border border-slate-400 px-2 py-1 font-semibold">
                  LUGAR Y FECHA
                </td>
                <td className="border border-slate-400 px-2 py-1">
                  {(formatLocationWithProvince(evento) || "-").toUpperCase()} /{" "}
                  {formatFechaEventoDocumento(evento?.fechaInicio, evento?.fechaFin)}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-400 px-2 py-1 font-semibold">
                  ENTRENADOR RESPONSABLE
                </td>
                <td className="border border-slate-400 px-2 py-1">
                  {entrenadorResponsable.toUpperCase()}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-400 px-2 py-1 font-semibold">
                  ASISTENTE
                </td>
                <td className="border border-slate-400 px-2 py-1">{asistente.toUpperCase()}</td>
              </tr>
              <tr>
                <td className="border border-slate-400 px-2 py-1 font-semibold">
                  DELEGADOS
                </td>
                <td className="border border-slate-400 px-2 py-1">-</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-[13px] leading-5">
          Certifico que una vez revisado los archivos que se mantienen en la
          Secretaria de las ESCUELAS DE INICIACIÓN DEPORTIVA relacionada a la
          &quot;AFILIACIÓN del {new Date().getFullYear()} de los deportistas de FDPL. Me
          permito informarle lo siguiente.
        </p>

        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-cyan-200">
                {[
                  "No.",
                  "APELLIDOS Y NOMBRES",
                  "PROFESOR",
                  "CEDULA",
                  "FECHA DE NAC.",
                  "OBSERVACIONES",
                ].map((col) => (
                  <th
                    key={col}
                    className="border border-slate-500 px-2 py-1.5 text-left font-semibold"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {formData.deportistas.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="border border-slate-400 px-2 py-3 text-center text-slate-500"
                  >
                    Selecciona deportistas para ver la nomina aqui.
                  </td>
                </tr>
              ) : (
                formData.deportistas.map((deportista, index) => (
                  <tr key={deportista.id}>
                    <td className="border border-slate-400 px-2 py-1 text-center align-top">
                      {index + 1}
                    </td>
                    <td className="border border-slate-400 px-2 py-1 align-top">
                      {deportista.nombre}
                    </td>
                    <td className="border border-slate-400 px-2 py-1 align-top">
                      {entrenadorResponsable.toUpperCase()}
                    </td>
                    <td className="border border-slate-400 px-2 py-1 align-top">
                      {deportista.cedula ?? "-"}
                    </td>
                    <td className="border border-slate-400 px-2 py-1 align-top">
                      {formatFechaNacimiento(deportista.fechaNacimiento)}
                    </td>
                    <td className="border border-slate-400 px-2 py-1 align-top font-semibold">
                      {deportista.observacion ?? "AFILIADO/A 2024"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="pt-4 text-[12px]">
          <p>Atentamente,</p>
          <div className="mt-8">
            <p className="text-slate-400">____________________________</p>
            <p className="font-semibold uppercase">{entrenadorResponsable}</p>
            <p className="text-[11px] uppercase">SECRETARIA ESCUELAS DE INICIACIÓN DEPORTIVA DE FDPL</p>
          </div>
        </div>
      </div>
      )}

      {showSolicitud && (
        <div className="bg-white p-5 xl:p-6 border border-slate-300 space-y-4">
          <h2 className="text-center text-[18px] font-semibold uppercase">
            Aval tecnico de participacion competitiva - {avalNumero}
          </h2>
          <h3 className="text-center text-[15px] font-semibold uppercase">
            Datos informativos
          </h3>

          <table className="w-full border-collapse text-[11px]">
            <tbody>
              <tr>
                <td className="w-1/4 border border-slate-400 px-2 py-1 font-semibold">
                  DEPORTE
                </td>
                <td className="border border-slate-400 px-2 py-1">{disciplina}</td>
              </tr>
              <tr>
                <td className="border border-slate-400 px-2 py-1 font-semibold">
                  CATEGORIAS
                </td>
                <td className="border border-slate-400 px-2 py-1">{categoria}</td>
              </tr>
              <tr>
                <td className="border border-slate-400 px-2 py-1 font-semibold">
                  GENERO
                </td>
                <td className="border border-slate-400 px-2 py-1">{genero}</td>
              </tr>
              <tr>
                <td className="border border-slate-400 px-2 py-1 font-semibold">
                  EVENTO
                </td>
                <td className="border border-slate-400 px-2 py-1">
                  {evento?.nombre?.toUpperCase() ?? "SIN EVENTO"}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-400 px-2 py-1 font-semibold">
                  LUGAR Y FECHA
                </td>
                <td className="border border-slate-400 px-2 py-1">
                  {(formatLocationWithProvince(evento) || "-").toUpperCase()} /{" "}
                  {formatFechaEventoDocumento(evento?.fechaInicio, evento?.fechaFin)}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-400 px-2 py-1 font-semibold">
                  ENTRENADOR RESPONSABLE
                </td>
                <td className="border border-slate-400 px-2 py-1">
                  {entrenadorResponsable.toUpperCase()}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-400 px-2 py-1 font-semibold">
                  ASISTENTE
                </td>
                <td className="border border-slate-400 px-2 py-1">{asistente.toUpperCase()}</td>
              </tr>
            </tbody>
          </table>

          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr>
                <th className="w-10 border border-slate-400 px-2 py-1 text-left">
                  N.º
                </th>
                <th className="border border-slate-400 px-2 py-1 text-left uppercase">
                  Objetivos de participacion
                </th>
              </tr>
            </thead>
            <tbody>
              {formData.objetivos.length === 0 ? (
                <tr>
                  <td
                    colSpan={2}
                    className="border border-slate-400 px-2 py-2 text-slate-500"
                  >
                    -
                  </td>
                </tr>
              ) : (
                formData.objetivos.map((objetivo, index) => (
                  <tr key={`obj-${index}`}>
                    <td className="border border-slate-400 px-2 py-1">{index + 1}</td>
                    <td className="border border-slate-400 px-2 py-1">{objetivo}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr>
                <th className="w-10 border border-slate-400 px-2 py-1 text-left">
                  N.º
                </th>
                <th className="border border-slate-400 px-2 py-1 text-left uppercase">
                  Criterios de seleccion
                </th>
              </tr>
            </thead>
            <tbody>
              {formData.criterios.length === 0 ? (
                <tr>
                  <td
                    colSpan={2}
                    className="border border-slate-400 px-2 py-2 text-slate-500"
                  >
                    -
                  </td>
                </tr>
              ) : (
                formData.criterios.map((criterio, index) => (
                  <tr key={`crt-${index}`}>
                    <td className="border border-slate-400 px-2 py-1">{index + 1}</td>
                    <td className="border border-slate-400 px-2 py-1">{criterio}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div>
            <p className="text-[12px] font-semibold uppercase">
              Conformacion de la delegacion
            </p>
            <table className="mt-1 w-full border-collapse text-[11px]">
              <thead>
                <tr>
                  <th className="border border-slate-400 px-2 py-1 text-center" colSpan={2}>
                    OFICIALES
                  </th>
                  <th className="border border-slate-400 px-2 py-1 text-center" colSpan={2}>
                    ATLETAS
                  </th>
                  <th className="border border-slate-400 px-2 py-1 text-center" rowSpan={2}>
                    TOTAL
                  </th>
                </tr>
                <tr>
                  <th className="border border-slate-400 px-2 py-1 text-center">D</th>
                  <th className="border border-slate-400 px-2 py-1 text-center">V</th>
                  <th className="border border-slate-400 px-2 py-1 text-center">D</th>
                  <th className="border border-slate-400 px-2 py-1 text-center">V</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-400 px-2 py-1 text-center">
                    {evento.numEntrenadoresHombres || 0}
                  </td>
                  <td className="border border-slate-400 px-2 py-1 text-center">
                    {evento.numEntrenadoresMujeres || 0}
                  </td>
                  <td className="border border-slate-400 px-2 py-1 text-center">
                    {evento.numAtletasHombres || 0}
                  </td>
                  <td className="border border-slate-400 px-2 py-1 text-center">
                    {evento.numAtletasMujeres || 0}
                  </td>
                  <td className="border border-slate-400 px-2 py-1 text-center">
                    {(evento.numEntrenadoresHombres || 0) +
                      (evento.numEntrenadoresMujeres || 0) +
                      (evento.numAtletasHombres || 0) +
                      (evento.numAtletasMujeres || 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <p className="text-[12px] font-semibold uppercase">Requerimientos</p>
            <table className="mt-1 w-full border-collapse text-[11px]">
              <thead>
                <tr>
                  <th className="w-10 border border-slate-400 px-2 py-1 text-left">
                    N.º
                  </th>
                  <th className="border border-slate-400 px-2 py-1 text-left">RUBRO</th>
                  <th className="w-28 border border-slate-400 px-2 py-1 text-right">
                    VALOR
                  </th>
                </tr>
              </thead>
              <tbody>
                {presupuestoItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="border border-slate-400 px-2 py-2 text-slate-500"
                    >
                      Sin items presupuestarios en este evento.
                    </td>
                  </tr>
                ) : (
                  presupuestoItems.map((item, index) => (
                    <tr key={item.id}>
                      <td className="border border-slate-400 px-2 py-1">
                        {index + 1}
                      </td>
                      <td className="border border-slate-400 px-2 py-1">
                        {item.item.nombre}
                      </td>
                      <td className="border border-slate-400 px-2 py-1 text-right">
                        {formatMoneda(item.presupuesto)}
                      </td>
                    </tr>
                  ))
                )}
                {presupuestoItems.length > 0 && (
                  <tr>
                    <td className="border border-slate-400 px-2 py-1" />
                    <td className="border border-slate-400 px-2 py-1 font-semibold">TOTAL</td>
                    <td className="border border-slate-400 px-2 py-1 text-right font-semibold">
                      {formatMoneda(
                        String(
                          presupuestoItems.reduce(
                            (sum, item) => sum + (Number.parseFloat(item.presupuesto) || 0),
                            0,
                          ),
                        ),
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <table className="w-full border-collapse text-[11px]">
            <tbody>
              <tr>
                <td className="w-20 border border-slate-400 px-2 py-1 font-semibold uppercase">
                  Salida
                </td>
                <td className="border border-slate-400 px-2 py-1">
                  <div className="grid grid-cols-4 gap-2">
                    <span className="font-semibold">Dia/fecha:</span>
                    <span className="font-semibold">Hora:</span>
                    <span className="font-semibold">Lugar:</span>
                    <span className="font-semibold">Transporte</span>
                    <span>{formatLogisticaFecha(formData.fechaHoraSalida)}</span>
                    <span>{formatLogisticaHora(formData.fechaHoraSalida)}</span>
                    <span>{(formData.lugarSalida || "-").toUpperCase()}</span>
                    <span>{formatTransporte(formData.transporteSalida)}</span>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="w-20 border border-slate-400 px-2 py-1 font-semibold uppercase">
                  Retorno
                </td>
                <td className="border border-slate-400 px-2 py-1">
                  <div className="grid grid-cols-4 gap-2">
                    <span className="font-semibold">Dia/fecha:</span>
                    <span className="font-semibold">Hora:</span>
                    <span className="font-semibold">Lugar:</span>
                    <span className="font-semibold">Transporte</span>
                    <span>{formatLogisticaFecha(formData.fechaHoraRetorno)}</span>
                    <span>{formatLogisticaHora(formData.fechaHoraRetorno)}</span>
                    <span>{(formData.lugarRetorno || "-").toUpperCase()}</span>
                    <span>{formatTransporte(formData.transporteRetorno)}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <div className="text-[12px]">
            <p className="font-semibold uppercase">Observacion:</p>
            <p className="mt-1 min-h-6">
              {formData.observaciones?.trim() || "-"}
            </p>
          </div>

          <div className="pt-4 text-[12px]">
            <p>Atentamente,</p>
            <div className="mt-8 flex justify-between">
              <div>
                <p className="text-slate-400">____________________________</p>
                <p className="font-semibold uppercase">{entrenadorResponsable}</p>
                <p className="text-[11px] uppercase">ENTRENADOR RESPONSABLE</p>
              </div>
              <div className="text-right">
                <p className="text-slate-400">____________________________</p>
                <p className="font-semibold uppercase">PRESIDENTE FDPL</p>
                <p className="text-[11px] uppercase">PRESIDENTE</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ListaDeportistasPreview({
  aval,
  formData,
}: {
  aval: Aval;
  formData: FormData;
}) {
  return <AvalDocumentPreview aval={aval} formData={formData} mode="nomina" />;
}

export function SolicitudAvalPreview({
  aval,
  formData,
}: {
  aval: Aval;
  formData: FormData;
}) {
  return <AvalDocumentPreview aval={aval} formData={formData} mode="solicitud" />;
}
