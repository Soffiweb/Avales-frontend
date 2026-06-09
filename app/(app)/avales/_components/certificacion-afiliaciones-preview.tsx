import type { Aval } from "@/types/aval";
import {
  formatDateDMY,
  getCalendarDateParts,
  getResponsibleTrainerName,
} from "@/lib/utils/formatters";

export const SECRETARIA_DTM_NOMBRE_DEFAULT = "SECRETARIA DEL DTM";
export const SECRETARIA_DTM_CARGO_DEFAULT = "SECRETARIA DEL DTM - FDPL";

type DeportistaRow = {
  id: number;
  nombre: string;
  cedula: string;
  fechaNacimiento?: string | null;
  observacion?: string | null;
};

type Props = {
  aval: Aval;
  secretariaNombre: string;
  secretariaCargo: string;
  /** Sobrescribe los deportistas de aval.avalTecnico (útil cuando hay ediciones no guardadas). */
  deportistasOverride?: DeportistaRow[];
  /** Sobrescribe el nombre del entrenador responsable cuando aval.entrenadores no está poblado. */
  entrenadorNombreOverride?: string;
  /** Error de fetch de secretaria — muestra en el documento para debug. */
  secretariaErrorDebug?: string;
};

const PREVIEW_MONTHS_ABBR = [
  "ENE", "FEB", "MAR", "ABR", "MAY", "JUN",
  "JUL", "AGO", "SEP", "OCT", "NOV", "DIC",
];

function formatBirthDate(value?: string | null) {
  const parts = getCalendarDateParts(value);
  if (!parts) return "-";
  const dia = String(parts.day).padStart(2, "0");
  return `${dia}/${PREVIEW_MONTHS_ABBR[parts.month - 1]}/${parts.year}`;
}

export default function CertificacionAfiliacionesPreview({
  aval,
  secretariaNombre,
  secretariaCargo,
  deportistasOverride,
  entrenadorNombreOverride,
  secretariaErrorDebug,
}: Props) {
  const tecnico = aval.avalTecnico;
  const evento = aval.evento;
  const disciplina = evento?.disciplina?.nombre?.toUpperCase() ?? "SIN DISCIPLINA";
  const entrenadorResponsable = (
    entrenadorNombreOverride?.trim() ||
    getResponsibleTrainerName(aval, "")
  ).toUpperCase() || "ENTRENADOR RESPONSABLE";
  const year = new Date().getFullYear();

  const deportistas: DeportistaRow[] = deportistasOverride ?? (tecnico?.deportistasAval ?? []).map((item) => {
    const withExtras = item as typeof item & {
      observacion?: string | null;
      deportista: typeof item.deportista & { fechaNacimiento?: string | null };
    };
    return {
      id: item.deportista?.id ?? item.id,
      nombre: item.deportista?.nombre ?? `Deportista ${item.id}`,
      cedula: item.deportista?.cedula ?? "-",
      fechaNacimiento: withExtras.deportista?.fechaNacimiento,
      observacion: withExtras.observacion,
    };
  });

  const fechaEmisionDisplay = formatDateDMY(aval.fechaEmision) || "-";

  return (
    <div className="bg-white p-5 xl:p-6 border border-slate-300 text-slate-900">
      {/* Encabezado: destinatario */}
      <div className="text-[13px] leading-5 space-y-0.5">
        <p>Lic.</p>
        <p className="font-semibold uppercase">{entrenadorResponsable}</p>
        <p className="uppercase">ENTRENADOR DE {disciplina} DE FDPL</p>
        <p>Ciudad.-</p>
      </div>

      <p className="mt-4 text-[13px] leading-5">De mis consideraciones:</p>

      <p className="mt-3 text-[13px] leading-5">
        Por medio de la presente me permito dirigirme a usted, para extender mi cordial saludo y
        desearle lo mejor al frente de las actividades encomendadas para el desarrollo del deporte
        de nuestra ciudad y provincia de Loja.
      </p>

      <p className="mt-3 text-[13px] leading-5 font-semibold">
        A lo solicitado por usted mediante el AVAL TÉCNICO DE PARTICIPACIÓN COMPETITIVA DEL DEPORTE
        DEL &quot;{disciplina}&quot; Presentado en esta dependencia el {year}.
      </p>

      <p className="mt-3 text-[13px] leading-5">
        Certifico que una vez revisados los archivos que se mantienen en la Secretaría de la FDPL
        relacionados con la &quot;AFILIACIÓN {year} de los deportistas de FDPL&quot;. Me permito
        informarle lo siguiente:
      </p>

      {/* Tabla de deportistas */}
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-cyan-200">
              {["No.", "APELLIDOS Y NOMBRES", "CÉDULA", "FECHA DE NAC.", "OBSERVACIONES"].map(
                (col) => (
                  <th
                    key={col}
                    className="border border-slate-500 px-2 py-1.5 text-left font-semibold"
                  >
                    {col}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {deportistas.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="border border-slate-400 px-2 py-3 text-center text-slate-500"
                >
                  Sin deportistas registrados.
                </td>
              </tr>
            ) : (
              deportistas.map((d, index) => (
                <tr key={d.id}>
                  <td className="border border-slate-400 px-2 py-1 text-center align-top">
                    {index + 1}
                  </td>
                  <td className="border border-slate-400 px-2 py-1 align-top">{d.nombre}</td>
                  <td className="border border-slate-400 px-2 py-1 align-top">{d.cedula}</td>
                  <td className="border border-slate-400 px-2 py-1 align-top">
                    {formatBirthDate(d.fechaNacimiento)}
                  </td>
                  <td className="border border-slate-400 px-2 py-1 align-top font-semibold">
                    {d.observacion?.trim() || `AFILIADO/A ${year}`}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Firmante */}
      <div className="pt-6 text-[12px]">
        <p>Atentamente,</p>
        <div className="mt-8">
          <p className="text-slate-400">____________________________</p>
          {secretariaErrorDebug && !secretariaNombre.trim() ? (
            <p className="text-rose-500 text-[10px] font-mono break-all">
              ⚠ {secretariaErrorDebug}
            </p>
          ) : (
            <>
              <p className="font-semibold uppercase">
                {secretariaNombre.trim() || SECRETARIA_DTM_NOMBRE_DEFAULT}
              </p>
              <p className="uppercase">
                {secretariaCargo.trim() || SECRETARIA_DTM_CARGO_DEFAULT}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
