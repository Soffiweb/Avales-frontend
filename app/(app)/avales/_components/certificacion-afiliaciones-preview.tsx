import type { Aval } from "@/types/aval";
import { buildAfiliacionDescriptor } from "avales-shared";
import type { AfiliacionInput } from "avales-shared";
import {
  formatDateWithOptions,
  getResponsibleTrainerName,
} from "@/lib/utils/formatters";

// Exportados por compatibilidad con las páginas que importan estas constantes.
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
  deportistasOverride?: DeportistaRow[];
  entrenadorNombreOverride?: string;
  secretariaErrorDebug?: string;
};

/** Nombre corto del entrenador: "Yasmir Laucerica ..." → "Yasmir L." */
function shortTrainerName(fullName: string): string {
  const parts = fullName.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]} ${parts[1][0]}.`;
  return fullName;
}

export default function CertificacionAfiliacionesPreview({
  aval,
  entrenadorNombreOverride,
}: Props) {
  const evento = aval.evento;
  const provincia = evento?.provincia ?? "";
  const responsable = (
    entrenadorNombreOverride?.trim() || getResponsibleTrainerName(aval, "")
  ).trim();
  const entrenadorCanton = [
    responsable ? shortTrainerName(responsable) : "",
    provincia,
  ]
    .filter(Boolean)
    .join("-");

  const deportistas: AfiliacionInput["deportistas"] = (
    aval.avalTecnico?.deportistasAval ?? []
  ).map((item) => {
    const payload = (item.deportista?.payload ??
      (item as { payload?: unknown }).payload ??
      {}) as Record<string, unknown>;
    const apellidos =
      item.deportista?.apellidos ??
      (item as { apellidos?: string }).apellidos ??
      "";
    const nombres =
      item.deportista?.nombres ??
      item.deportista?.nombre ??
      (item as { nombres?: string }).nombres ??
      "";
    const cedula =
      item.deportista?.cedula ??
      (item as { cedula?: string }).cedula ??
      "";
    return {
      apellidosNombres: `${apellidos} ${nombres}`.trim() || item.deportista?.nombre || "-",
      cedula,
      fechaNacimiento: payload.fechaNacimiento as string | undefined,
      afiliado: Boolean(payload.afiliado),
      categoria: evento?.categoria?.nombre,
      entrenadorCanton,
    };
  });

  const fechaDoc = formatDateWithOptions(aval.fechaEmision, {
    day: "2-digit",
    month: "long",
    year: "numeric",
    fallback: "",
  });

  const doc = buildAfiliacionDescriptor({
    deporte: evento?.disciplina?.nombre,
    categoria: evento?.categoria?.nombre,
    evento: evento?.nombre,
    fechaDocumento: fechaDoc ? `Loja, ${fechaDoc}` : "",
    entrenadorCanton,
    deportistas,
  });

  const cell = "border border-slate-400 px-1.5 py-1 align-top";

  return (
    <div className="bg-white p-4 xl:p-6 border border-slate-300 text-slate-900">
      <h2 className="text-center text-base font-bold">{doc.title}</h2>
      <p className="mt-1 text-center text-[11px] text-slate-600">
        <span className="font-semibold">Deporte:</span> {doc.deporte} &nbsp;
        <span className="font-semibold">Evento:</span> {doc.evento} &nbsp;
        <span className="font-semibold">Fecha:</span> {doc.fechaDocumento}
      </p>

      <div className="mt-3 overflow-x-auto">
        <table className="min-w-[900px] w-full border-collapse text-[10px]">
          <thead className="bg-slate-100">
            <tr>
              {doc.headers.datosGenerales.map((h) => (
                <th key={h} className={`${cell} font-semibold text-center`} rowSpan={2}>
                  {h}
                </th>
              ))}
              <th className={`${cell} font-semibold text-center`} colSpan={4}>
                ESTADO DE PREPARACIÓN
              </th>
              <th className={`${cell} font-semibold text-center`} rowSpan={2}>
                {doc.headers.pruebas}
              </th>
              <th className={`${cell} font-semibold text-center`} rowSpan={2}>
                {doc.headers.marcas}
              </th>
              <th className={`${cell} font-semibold text-center`} colSpan={2}>
                PROPÓSITOS
              </th>
            </tr>
            <tr>
              {doc.headers.estadoPreparacion.map((h) => (
                <th key={h} className={`${cell} font-semibold text-center`}>
                  {h}
                </th>
              ))}
              {doc.headers.propositos.map((h) => (
                <th key={h} className={`${cell} font-semibold text-center`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {doc.deportistas.length === 0 ? (
              <tr>
                <td colSpan={15} className={`${cell} text-center text-slate-500`}>
                  Sin deportistas registrados.
                </td>
              </tr>
            ) : (
              doc.deportistas.map((d) => (
                <tr key={`${d.numero}-${d.cedula}`}>
                  <td className={`${cell} text-center`}>{d.numero}</td>
                  <td className={cell}>{d.apellidosNombres}</td>
                  <td className={`${cell} text-center`}>{d.afiliacion}</td>
                  <td className={`${cell} text-center`}>{d.categoria}</td>
                  <td className={cell}>{d.entrenadorCanton}</td>
                  <td className={`${cell} text-center`}>{d.cedula}</td>
                  <td className={`${cell} text-center`}>{d.fechaNacimiento}</td>
                  <td className={cell}>{d.estadoFisico}</td>
                  <td className={cell}>{d.estadoTecTac}</td>
                  <td className={cell}>{d.estadoTeorico}</td>
                  <td className={cell}>{d.estadoPsic}</td>
                  <td className={cell}>{d.pruebas}</td>
                  <td className={cell}>{d.marcas}</td>
                  <td className={cell}>{d.propositoMarcas}</td>
                  <td className={cell}>{d.propositoUbicacion}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
