import type { Aval } from "@/types/aval";
import {
  formatCurrencyFromString,
  formatDateDMY,
  formatEventScheduleDocumentLabel,
  formatGenero,
  getCalendarDateParts,
  formatLocationWithProvince,
  formatTimeCompact,
  formatTransport,
} from "@/lib/utils/formatters";
import { formatCategoryLabel } from "@/lib/utils/categories";
import { getResponsibleTrainerName } from "@/lib/utils/formatters";
import {
  getAvalDelegationSummary,
  getAvalPresupuestoItems,
} from "@/lib/utils/aval-collections";

type Props = {
  aval: Aval;
  fechaEmision: string;
  observacion: string;
  firmanteNombre: string;
  firmanteCargo: string;
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

export default function AvalTecnicoCompetitivoPreview({
  aval,
  fechaEmision,
  observacion,
  firmanteNombre,
  firmanteCargo,
}: Props) {
  const evento = aval.evento;
  const tecnico = aval.avalTecnico;

  const avalNumero =
    tecnico?.numeroAval ?? aval.aval ?? aval.numeroColeccion ?? String(aval.id ?? "S/N");
  const disciplina = evento?.disciplina?.nombre?.toUpperCase() ?? "SIN DISCIPLINA";
  const categoria = formatCategoryLabel(
    evento?.categoria?.nombre ?? evento?.categoriaCodigo,
    "SIN CATEGORIA",
  ).toUpperCase();
  const genero = formatGenero(evento?.genero ?? "MASCULINO_FEMENINO");
  const eventoNombre = evento?.nombre?.toUpperCase() ?? "SIN EVENTO";
  const lugarFecha =
    `${(formatLocationWithProvince(evento) || "-").toUpperCase()} / ${formatEventScheduleDocumentLabel(evento)}`;
  const entrenadorResponsable = getResponsibleTrainerName(aval, "-").toUpperCase();
  const otrosEntrenadores = [...(aval.entrenadores ?? [])]
    .sort((a, b) => Number(Boolean(b.esPrincipal)) - Number(Boolean(a.esPrincipal)))
    .slice(1)
    .map((item) => {
      const withUser = item as typeof item & {
        usuario?: { nombre?: string; apellido?: string; cedula?: string };
        entrenador?: { nombre?: string; apellido?: string; cedula?: string };
        nombre?: string;
        apellido?: string;
        cedula?: string;
      };
      const nombreCompleto =
        [
          withUser.entrenador?.nombre ?? withUser.usuario?.nombre ?? withUser.nombre,
          withUser.entrenador?.apellido ?? withUser.usuario?.apellido ?? withUser.apellido,
        ]
          .filter(Boolean)
          .join(" ")
          .trim() || item.entrenadorNombre || `Entrenador ${item.id}`;
      const cedula =
        withUser.entrenador?.cedula ??
        withUser.usuario?.cedula ??
        withUser.cedula;
      const linea = cedula ? `${nombreCompleto} - ${cedula}` : nombreCompleto;
      return linea.toUpperCase();
    })
    .join(", ") || "-";

  const deportistas = (tecnico?.deportistasAval ?? []).map((item) => {
    const withExtras = item as typeof item & {
      observacion?: string | null;
      deportista: typeof item.deportista & { fechaNacimiento?: string | null };
    };
    return {
      id: item.deportista?.id ?? item.id,
      nombre: item.deportista?.nombre ?? `Deportista ${item.id}`,
      cedula: item.deportista?.cedula ?? "-",
      fechaNacimiento: withExtras.deportista?.fechaNacimiento,
      observacion: withExtras.observacion ?? "-",
    };
  });

  const presupuestoItems = getAvalPresupuestoItems(aval);
  const presupuestoTotal = presupuestoItems.reduce(
    (sum, item) => sum + (Number.parseFloat(item.presupuesto) || 0),
    0,
  );
  const delegacion = getAvalDelegationSummary(aval, {
    deportistas: (tecnico?.deportistasAval ?? []).map((d) => ({
      genero: d.deportista?.genero,
      payload: d.deportista?.payload as Record<string, unknown> | undefined,
    })),
    entrenadores: aval.entrenadores ?? [],
  });

  const numOficialesD = delegacion.entrenadores.mujeres;
  const numOficialesV = delegacion.entrenadores.hombres;
  const numAtletasD = delegacion.deportistas.mujeres;
  const numAtletasV = delegacion.deportistas.hombres;
  const totalDelegacion = delegacion.total;

  return (
    <div className="bg-white p-5 xl:p-6 border border-slate-300 text-slate-900 space-y-4">
      {/* Encabezado */}
      <div>
        <p className="text-center text-[13px] font-bold uppercase leading-5">
          Aval Técnico de Participación Competitiva
        </p>
        <div className="flex justify-between items-baseline mt-1">
          <p className="text-[11px] font-semibold">Nro. {avalNumero}</p>
          <p className="text-[11px]">{formatDateDMY(fechaEmision) || "-"}</p>
        </div>
      </div>

      {/* Descripción fija */}
      <p className="text-[10px] leading-[14px]">
        El departamento técnico metodológico de la federación deportiva provincial de Loja, una vez
        recibido, analizado, discutido el aval técnico, anexos y demás documentos necesarios para el
        efecto y al existir las factibilidades para su participación, concede el presente aval
        técnico de acuerdo con el siguiente detalle:
      </p>

      {/* Datos informativos */}
      <div>
        <p className="text-[11px] font-semibold uppercase mb-1">Datos Informativos</p>
        <table className="w-full border-collapse text-[10px]">
          <tbody>
            <tr>
              <td className="w-1/3 border border-slate-400 px-2 py-1 font-semibold">DEPORTE</td>
              <td className="border border-slate-400 px-2 py-1">{disciplina}</td>
            </tr>
            <tr>
              <td className="border border-slate-400 px-2 py-1 font-semibold">CATEGORÍAS</td>
              <td className="border border-slate-400 px-2 py-1">{categoria}</td>
            </tr>
            <tr>
              <td className="border border-slate-400 px-2 py-1 font-semibold">GÉNERO</td>
              <td className="border border-slate-400 px-2 py-1">{genero}</td>
            </tr>
            <tr>
              <td className="border border-slate-400 px-2 py-1 font-semibold">EVENTO</td>
              <td className="border border-slate-400 px-2 py-1">{eventoNombre}</td>
            </tr>
            <tr>
              <td className="border border-slate-400 px-2 py-1 font-semibold">LUGAR Y FECHA</td>
              <td className="border border-slate-400 px-2 py-1">{lugarFecha}</td>
            </tr>
            <tr>
              <td className="border border-slate-400 px-2 py-1 font-semibold">
                ENTRENADOR RESPONSABLE
              </td>
              <td className="border border-slate-400 px-2 py-1">{entrenadorResponsable}</td>
            </tr>
            <tr>
              <td className="border border-slate-400 px-2 py-1 font-semibold">ENTRENADORES</td>
              <td className="border border-slate-400 px-2 py-1">{otrosEntrenadores}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Delegación */}
      <div>
        <p className="text-[11px] font-semibold uppercase mb-1">Conformación de la Delegación</p>
        <table className="w-full border-collapse text-[10px]">
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
              <td className="border border-slate-400 px-2 py-1 text-center">{numOficialesD}</td>
              <td className="border border-slate-400 px-2 py-1 text-center">{numOficialesV}</td>
              <td className="border border-slate-400 px-2 py-1 text-center">{numAtletasD}</td>
              <td className="border border-slate-400 px-2 py-1 text-center">{numAtletasV}</td>
              <td className="border border-slate-400 px-2 py-1 text-center">{totalDelegacion}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Listado de atletas */}
      <div>
        <p className="text-[11px] font-semibold uppercase mb-1">Listado de Atletas</p>
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-400 px-2 py-1 text-left w-7">No.</th>
              <th className="border border-slate-400 px-2 py-1 text-left">APELLIDOS Y NOMBRES</th>
              <th className="border border-slate-400 px-2 py-1 text-left w-20">CÉDULA</th>
              <th className="border border-slate-400 px-2 py-1 text-left w-20">F. NACIMIENTO</th>
              <th className="border border-slate-400 px-2 py-1 text-left w-24">OBSERVACIÓN</th>
            </tr>
          </thead>
          <tbody>
            {deportistas.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="border border-slate-400 px-2 py-2 text-center text-slate-500"
                >
                  Sin deportistas registrados.
                </td>
              </tr>
            ) : (
              deportistas.map((d, index) => (
                <tr key={d.id}>
                  <td className="border border-slate-400 px-2 py-0.5 text-center align-top">
                    {index + 1}
                  </td>
                  <td className="border border-slate-400 px-2 py-0.5 align-top">{d.nombre}</td>
                  <td className="border border-slate-400 px-2 py-0.5 align-top">{d.cedula}</td>
                  <td className="border border-slate-400 px-2 py-0.5 align-top">
                    {formatBirthDate(d.fechaNacimiento)}
                  </td>
                  <td className="border border-slate-400 px-2 py-0.5 align-top">{d.observacion}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Requerimientos */}
      <div>
        <p className="text-[11px] font-semibold uppercase mb-1">Requerimientos</p>
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-400 px-2 py-1 text-left w-7">N.º</th>
              <th className="border border-slate-400 px-2 py-1 text-left">RUBRO</th>
              <th className="border border-slate-400 px-2 py-1 text-right w-16">VALOR</th>
            </tr>
          </thead>
          <tbody>
            {presupuestoItems.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="border border-slate-400 px-2 py-2 text-center text-slate-500"
                >
                  Sin requerimientos presupuestarios.
                </td>
              </tr>
            ) : (
              <>
                {presupuestoItems.map((item, index) => (
                  <tr key={item.id}>
                    <td className="border border-slate-400 px-2 py-0.5">{index + 1}</td>
                    <td className="border border-slate-400 px-2 py-0.5">{item.item.nombre}</td>
                    <td className="border border-slate-400 px-2 py-0.5 text-right">
                      {formatCurrencyFromString(item.presupuesto)}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="border border-slate-400 px-2 py-0.5" />
                  <td className="border border-slate-400 px-2 py-0.5 font-semibold">TOTAL</td>
                  <td className="border border-slate-400 px-2 py-0.5 text-right font-semibold">
                    {formatCurrencyFromString(String(presupuestoTotal))}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Logística */}
      <div>
        <p className="text-[11px] font-semibold uppercase mb-1">Logística</p>
        <table className="w-full border-collapse text-[10px]">
          <tbody>
            <tr>
              <td className="w-16 border border-slate-400 px-2 py-1 font-semibold uppercase">
                Salida
              </td>
              <td className="border border-slate-400 px-2 py-1">
                <div className="grid grid-cols-4 gap-2">
                  <span className="font-semibold">Día/fecha:</span>
                  <span className="font-semibold">Hora:</span>
                  <span className="font-semibold">Lugar:</span>
                  <span className="font-semibold">Transporte:</span>
                  <span>{formatDateDMY(tecnico?.fechaHoraSalida)}</span>
                  <span>{formatTimeCompact(tecnico?.fechaHoraSalida)}</span>
                  <span>{(tecnico?.lugarSalida || "-").toUpperCase()}</span>
                  <span>{formatTransport(tecnico?.transporteSalida)}</span>
                </div>
              </td>
            </tr>
            <tr>
              <td className="border border-slate-400 px-2 py-1 font-semibold uppercase">
                Retorno
              </td>
              <td className="border border-slate-400 px-2 py-1">
                <div className="grid grid-cols-4 gap-2">
                  <span className="font-semibold">Día/fecha:</span>
                  <span className="font-semibold">Hora:</span>
                  <span className="font-semibold">Lugar:</span>
                  <span className="font-semibold">Transporte:</span>
                  <span>{formatDateDMY(tecnico?.fechaHoraRetorno)}</span>
                  <span>{formatTimeCompact(tecnico?.fechaHoraRetorno)}</span>
                  <span>{(tecnico?.lugarRetorno || "-").toUpperCase()}</span>
                  <span>{formatTransport(tecnico?.transporteRetorno)}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Observación */}
      <div>
        <p className="text-[11px] font-semibold uppercase">Observación:</p>
        <p className="text-[10px] leading-[14px] mt-0.5 min-h-4">
          {observacion.trim() || "-"}
        </p>
      </div>

      {/* Firmante */}
      <div className="pt-4 text-[10px] leading-4">
        <p>Atentamente,</p>
        <div className="mt-6">
          <p className="text-slate-400">____________________________</p>
          <p className="font-semibold uppercase">{firmanteNombre.trim() || "-"}</p>
          <p className="uppercase">{firmanteCargo.trim() || "-"}</p>
        </div>
      </div>
    </div>
  );
}
