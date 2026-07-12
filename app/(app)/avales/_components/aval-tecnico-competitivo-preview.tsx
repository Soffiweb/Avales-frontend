import type { Aval, EntrenadorAval } from "@/types/aval";
import { buildAvalTecnicoDescriptor } from "avales-shared";
import type { AvalTecnicoInput } from "avales-shared";
import {
  formatDateWithOptions,
  getResponsibleTrainerData,
} from "@/lib/utils/formatters";
import { formatCategoryLabel } from "@/lib/utils/categories";
import {
  getAvalDelegationSummary,
  getAvalPresupuestoItems,
} from "@/lib/utils/aval-collections";

type Props = {
  aval: Aval;
  fechaEmision: string;
  descripcion: string;
  observacion: string;
  firmanteNombre: string;
  firmanteCargo: string;
};

function getTrainerFullName(item: EntrenadorAval): string {
  const nombre = [
    item.entrenador?.nombre ?? item.usuario?.nombre ?? item.nombre,
    item.entrenador?.apellido ?? item.usuario?.apellido ?? item.apellido,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
  return nombre || item.entrenadorNombre || `Entrenador ${item.id}`;
}

export default function AvalTecnicoCompetitivoPreview({
  aval,
  fechaEmision,
  descripcion,
  observacion,
  firmanteNombre,
  firmanteCargo,
}: Props) {
  const evento = aval.evento;
  const tecnico = aval.avalTecnico;
  const responsable = getResponsibleTrainerData(aval);

  // Entrenadores ordenados con el principal primero: es el responsable, el
  // resto son los "asistentes" que se listan aparte.
  const entrenadoresOrdenados = [...(aval.entrenadores ?? [])].sort(
    (a, b) => Number(Boolean(b.esPrincipal)) - Number(Boolean(a.esPrincipal)),
  );
  const entrenadoresAsistentes = entrenadoresOrdenados
    .slice(1)
    .map(getTrainerFullName);

  const otrosParticipantes = (aval.otrosParticipantes ?? []).map((p) => ({
    cargo: p.cargo,
    nombre: p.usuario
      ? `${p.usuario.nombre ?? ""} ${p.usuario.apellido ?? ""}`.trim()
      : (p.nombre ?? "").trim(),
  }));

  const deportistasRoster = tecnico?.deportistasAval ?? [];

  // Conteo REAL de la delegación (no cupos planificados): entrenadores y
  // atletas por género, tomados del roster real del aval.
  const delegacion = getAvalDelegationSummary(aval, {
    deportistas: deportistasRoster.map((d) => ({
      genero: d.deportista?.genero,
      payload: d.deportista?.payload as Record<string, unknown> | undefined,
    })),
    entrenadores: aval.entrenadores ?? [],
  });

  // Lookup de nombre de rubro por id de item de la forma de participación
  // (los requerimientos guardan solo `formaParticipacionItemId`).
  const presupuestoItemNombreById = new Map(
    getAvalPresupuestoItems(aval).map((item) => [item.id, item.item?.nombre]),
  );

  const input: AvalTecnicoInput = {
    numeroAval: tecnico?.numeroAval ?? aval.aval ?? aval.numeroColeccion,
    fechaDocumento: formatDateWithOptions(fechaEmision, {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
    descripcion,
    disciplina: evento?.disciplina?.nombre,
    categoria: formatCategoryLabel(
      evento?.categoria?.nombre ?? evento?.categoriaCodigo,
    ),
    genero: evento?.genero,
    eventoNombre: evento?.nombre,
    provincia: evento?.provincia,
    ciudad: evento?.ciudad,
    lugar: evento?.lugar,
    fechaInicio: evento?.fechaInicio,
    fechaFin: evento?.fechaFin,
    entrenadorResponsable: {
      nombre: responsable.nombre,
      cedula: responsable.cedula,
    },
    entrenadoresAsistentes,
    otrosParticipantes,
    objetivos: [...(tecnico?.objetivos ?? [])]
      .sort((a, b) => a.orden - b.orden)
      .map((o) => o.descripcion),
    criterios: [...(tecnico?.criterios ?? [])]
      .sort((a, b) => a.orden - b.orden)
      .map((c) => c.descripcion),
    delegacion: {
      entrenadoresD: delegacion.entrenadores.mujeres,
      entrenadoresV: delegacion.entrenadores.hombres,
      oficialesD: 0,
      oficialesV: 0,
      atletasD: delegacion.deportistas.mujeres,
      atletasV: delegacion.deportistas.hombres,
    },
    deportistas: deportistasRoster.map((d) => {
      const payload = d.deportista?.payload as
        | Record<string, unknown>
        | undefined;
      return {
        apellidosNombres: `${d.deportista?.apellidos ?? ""} ${
          d.deportista?.nombres ?? ""
        }`.trim(),
        cedula: d.deportista?.cedula,
        fechaNacimiento: payload?.fechaNacimiento as string | undefined,
        observacion: "",
      };
    }),
    requerimientos: (tecnico?.requerimientos ?? []).map((r) => ({
      rubro:
        (r.formaParticipacionItemId != null
          ? presupuestoItemNombreById.get(r.formaParticipacionItemId)
          : undefined) ??
        r.otroConcepto ??
        "",
      detalle: r.detalle,
      valor:
        r.montoSolicitado != null && r.montoSolicitado !== ""
          ? Number(r.montoSolicitado)
          : (r.valorUnitario ?? 0),
    })),
    salida: {
      fecha: tecnico?.fechaHoraSalida,
      lugar: tecnico?.lugarSalida,
      transporte: tecnico?.transporteSalida,
    },
    retorno: {
      fecha: tecnico?.fechaHoraRetorno,
      lugar: tecnico?.lugarRetorno,
      transporte: tecnico?.transporteRetorno,
    },
    observacion,
    // Nombres de toda la delegación para la tabla de FIRMAS: entrenadores,
    // luego deportistas, luego otros participantes. Mismo orden que el PDF.
    firmasDelegacion: [
      ...entrenadoresOrdenados.map(getTrainerFullName),
      ...deportistasRoster.map((d) =>
        `${d.deportista?.nombres ?? ""} ${d.deportista?.apellidos ?? ""}`.trim(),
      ),
      ...otrosParticipantes.map((p) => p.nombre),
    ],
    firmanteNombre,
    firmanteCargo,
  };

  const doc = buildAvalTecnicoDescriptor(input);

  return (
    <div className="bg-white p-5 xl:p-6 border border-slate-300 text-slate-900 space-y-4">
      {/* Encabezado */}
      <div>
        <p className="text-center text-[13px] font-bold uppercase leading-5">
          {doc.title}
        </p>
        <div className="flex justify-between items-baseline mt-1">
          <p className="text-[11px] font-semibold">Nro. {doc.numeroAval}</p>
          <p className="text-[11px]">{doc.fechaDocumento || "-"}</p>
        </div>
      </div>

      {/* Descripción */}
      <p className="text-[10px] leading-[14px]">{doc.descripcion}</p>

      {/* Datos informativos */}
      <div>
        <p className="text-[11px] font-semibold uppercase mb-1">Datos Informativos</p>
        <table className="w-full border-collapse text-[10px]">
          <tbody>
            {doc.datosInfo.map((row) => (
              <tr key={row.label}>
                <td className="w-1/3 border border-slate-400 px-2 py-1 font-semibold">
                  {row.label}
                </td>
                <td className="border border-slate-400 px-2 py-1">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Objetivos de participación */}
      {doc.objetivos.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase mb-1">
            Objetivos de Participación
          </p>
          <table className="w-full border-collapse text-[10px]">
            <tbody>
              {doc.objetivos.map((row) => (
                <tr key={row.numero}>
                  <td className="w-7 border border-slate-400 px-2 py-1 text-center align-top">
                    {row.numero}
                  </td>
                  <td className="border border-slate-400 px-2 py-1">{row.texto}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Criterios de selección */}
      {doc.criterios.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase mb-1">
            Criterios de Selección
          </p>
          <table className="w-full border-collapse text-[10px]">
            <tbody>
              {doc.criterios.map((row) => (
                <tr key={row.numero}>
                  <td className="w-7 border border-slate-400 px-2 py-1 text-center align-top">
                    {row.numero}
                  </td>
                  <td className="border border-slate-400 px-2 py-1">{row.texto}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delegación */}
      <div>
        <p className="text-[11px] font-semibold uppercase mb-1">Conformación de la Delegación</p>
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr>
              <th className="border border-slate-400 px-2 py-1 text-center" colSpan={2}>
                ENTRENADORES
              </th>
              {doc.delegacion.showOficiales && (
                <th className="border border-slate-400 px-2 py-1 text-center" colSpan={2}>
                  OFICIALES
                </th>
              )}
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
              {doc.delegacion.showOficiales && (
                <>
                  <th className="border border-slate-400 px-2 py-1 text-center">D</th>
                  <th className="border border-slate-400 px-2 py-1 text-center">V</th>
                </>
              )}
              <th className="border border-slate-400 px-2 py-1 text-center">D</th>
              <th className="border border-slate-400 px-2 py-1 text-center">V</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-400 px-2 py-1 text-center">
                {doc.delegacion.entrenadoresD}
              </td>
              <td className="border border-slate-400 px-2 py-1 text-center">
                {doc.delegacion.entrenadoresV}
              </td>
              {doc.delegacion.showOficiales && (
                <>
                  <td className="border border-slate-400 px-2 py-1 text-center">
                    {doc.delegacion.oficialesD}
                  </td>
                  <td className="border border-slate-400 px-2 py-1 text-center">
                    {doc.delegacion.oficialesV}
                  </td>
                </>
              )}
              <td className="border border-slate-400 px-2 py-1 text-center">
                {doc.delegacion.atletasD}
              </td>
              <td className="border border-slate-400 px-2 py-1 text-center">
                {doc.delegacion.atletasV}
              </td>
              <td className="border border-slate-400 px-2 py-1 text-center">
                {doc.delegacion.total}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Listado de deportistas */}
      <div>
        <p className="text-[11px] font-semibold uppercase mb-1">Listado de Deportistas</p>
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
            {doc.deportistas.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="border border-slate-400 px-2 py-2 text-center text-slate-500"
                >
                  Sin deportistas registrados.
                </td>
              </tr>
            ) : (
              doc.deportistas.map((d) => (
                <tr key={d.numero}>
                  <td className="border border-slate-400 px-2 py-0.5 text-center align-top">
                    {d.numero}
                  </td>
                  <td className="border border-slate-400 px-2 py-0.5 align-top">
                    {d.apellidosNombres}
                  </td>
                  <td className="border border-slate-400 px-2 py-0.5 align-top">{d.cedula}</td>
                  <td className="border border-slate-400 px-2 py-0.5 align-top">
                    {d.fechaNacimiento}
                  </td>
                  <td className="border border-slate-400 px-2 py-0.5 align-top">
                    {d.observacion}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Requerimientos presupuestarios */}
      <div>
        <p className="text-[11px] font-semibold uppercase mb-1">Requerimientos Presupuestarios</p>
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="bg-slate-100">
              {doc.requerimientosHeaders.map((header, index) => (
                <th
                  key={header}
                  className={`border border-slate-400 px-2 py-1 ${
                    index === 0
                      ? "text-center w-7"
                      : index === 3
                        ? "text-right w-20"
                        : "text-left"
                  }`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {doc.requerimientos.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="border border-slate-400 px-2 py-2 text-center text-slate-500"
                >
                  Sin requerimientos presupuestarios.
                </td>
              </tr>
            ) : (
              <>
                {doc.requerimientos.map((item) => (
                  <tr key={item.numero}>
                    <td className="border border-slate-400 px-2 py-0.5 text-center">
                      {item.numero}
                    </td>
                    <td className="border border-slate-400 px-2 py-0.5">{item.rubro}</td>
                    <td className="border border-slate-400 px-2 py-0.5">{item.detalle}</td>
                    <td className="border border-slate-400 px-2 py-0.5 text-right">
                      {item.valor}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="border border-slate-400 px-2 py-0.5" colSpan={2} />
                  <td className="border border-slate-400 px-2 py-0.5 font-semibold">TOTAL</td>
                  <td className="border border-slate-400 px-2 py-0.5 text-right font-semibold">
                    {doc.requerimientosTotal}
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
                  <span>{doc.salida.fecha}</span>
                  <span>{doc.salida.hora}</span>
                  <span>{doc.salida.lugar}</span>
                  <span>{doc.salida.transporte}</span>
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
                  <span>{doc.retorno.fecha}</span>
                  <span>{doc.retorno.hora}</span>
                  <span>{doc.retorno.lugar}</span>
                  <span>{doc.retorno.transporte}</span>
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
          {doc.observacion || "-"}
        </p>
      </div>

      {/* Firmas de la delegación */}
      {doc.firmas.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase mb-1">Firmas</p>
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-slate-100">
                {doc.firmasHeaders.map((header, index) => (
                  <th
                    key={header}
                    className={`border border-slate-400 px-2 py-1 ${
                      index === 1 ? "text-left" : "text-center"
                    }`}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {doc.firmas.map((f) => (
                <tr key={f.numero}>
                  <td className="border border-slate-400 px-2 py-0.5 text-center">
                    {f.numero}
                  </td>
                  <td className="border border-slate-400 px-2 py-0.5">{f.nombre}</td>
                  <td className="border border-slate-400 px-2 py-0.5 text-center">
                    {f.sumilla || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Firmante */}
      <div className="pt-4 text-[10px] leading-4">
        <p>Atentamente,</p>
        <div className="mt-6">
          <p className="text-slate-400">____________________________</p>
          <p className="font-semibold uppercase">{doc.firma.nombre || "-"}</p>
          <p className="uppercase">{doc.firma.cargo || "-"}</p>
        </div>
      </div>
    </div>
  );
}
