"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, DollarSign, FileText, Plus, Trash2, Users } from "lucide-react";

import {
  EVENTO_ALCANCE_OPTIONS,
  EVENTO_TAREA_OPTIONS,
  getTipoAvalLabel,
  normalizeEventoAlcance,
  normalizeEventoTipoEvento,
} from "@/lib/constants";
import { MES_OPCIONES } from "@/lib/api/reforms-multi";
import { formatCurrency, formatDateInput } from "@/lib/utils/formatters";
import type { CatalogItemPresupuestario } from "@/types/catalog";
import type { Evento, EventoItem, FormaParticipacionCupos } from "@/types/evento";
import type { ReformChangesDto } from "@/lib/api/reforms";

export type EventoMovimientoLinea = {
  itemId: number;
  itemNombre: string;
  mes: number;
  montoOriginal: number;
  montoNuevo: number;
};

export type EventoCambiosResult = {
  cambiosPropuestos: ReformChangesDto;
  hasUnresolvableBudgetItems: boolean;
  /** FormaParticipacion elegida, dueña de los movimientos de presupuesto. */
  formaParticipacionId: number | null;
  /** Ítems cuyo valor cambió (baja = origen, sube = destino), para esta misma evento. */
  movimientos: EventoMovimientoLinea[];
};

type GeneralForm = {
  nombre: string;
  tipoEvento: string;
  alcance: string;
  lugar: string;
  ciudad: string;
  provincia: string;
  pais: string;
  mesProgramado: number | "";
  fechaInicio: string;
  fechaFin: string;
};

type ParticipantsForm = {
  numAtletasHombres: number;
  numAtletasMujeres: number;
  numEntrenadoresHombres: number;
  numEntrenadoresMujeres: number;
};

type BudgetRow = {
  localId: string;
  sourceId?: number;
  itemId?: number;
  itemNumero: number | "";
  mes: number;
  presupuesto: string;
  status: "existing" | "new" | "removed";
};

export function getInitialBudgetRows(items: EventoItem[] = []): BudgetRow[] {
  return items.map((item) => ({
    localId: `existing-${item.id}`,
    sourceId: item.id,
    itemId: item.item.id,
    itemNumero: item.item.numero ?? "",
    mes: item.mes ?? 1,
    presupuesto: item.presupuesto ?? "0",
    status: "existing",
  }));
}

export function buildInitialGeneralForm(evento: Evento): GeneralForm {
  return {
    nombre: evento.nombre ?? "",
    tipoEvento:
      normalizeEventoTipoEvento(evento.tipoEvento) ?? evento.tipoEvento ?? "",
    alcance: normalizeEventoAlcance(evento.alcance) ?? evento.alcance ?? "",
    lugar: evento.lugar ?? "",
    ciudad: evento.ciudad ?? "",
    provincia: evento.provincia ?? "",
    pais: evento.pais ?? "",
    mesProgramado: evento.mesProgramado ?? "",
    fechaInicio: formatDateInput(evento.fechaInicio),
    fechaFin: formatDateInput(evento.fechaFin),
  };
}

export function getReformFormas(evento: Evento): FormaParticipacionCupos[] {
  return evento.formasParticipacion ?? [];
}

export function getBudgetReformFormas(evento: Evento): FormaParticipacionCupos[] {
  return (evento.formasParticipacion ?? []).filter(
    (forma) =>
      forma.tipoAval === "FONDOS_PUBLICOS" || forma.tipoAval === "AUTOGESTION",
  );
}

export function getFormaBudgetItems(
  evento: Evento,
  forma?: FormaParticipacionCupos | null,
): EventoItem[] {
  if (!forma) return [];
  if ((forma.items?.length ?? 0) > 0) return forma.items ?? [];

  if (forma.tipoAval === "FONDOS_PUBLICOS" || forma.tipoAval === "AUTOGESTION") {
    return (evento.eventoItems ?? []).filter(
      (item) => item.fuente === forma.tipoAval,
    );
  }

  return [];
}

export function buildInitialParticipantsForm(
  evento: Evento,
  forma?: FormaParticipacionCupos | null,
): ParticipantsForm {
  if (forma) {
    return {
      numAtletasHombres: forma.numAtletasHombres ?? 0,
      numAtletasMujeres: forma.numAtletasMujeres ?? 0,
      numEntrenadoresHombres: forma.numEntrenadoresHombres ?? 0,
      numEntrenadoresMujeres: forma.numEntrenadoresMujeres ?? 0,
    };
  }

  return {
    numAtletasHombres: evento.numAtletasHombres ?? 0,
    numAtletasMujeres: evento.numAtletasMujeres ?? 0,
    numEntrenadoresHombres: evento.numEntrenadoresHombres ?? 0,
    numEntrenadoresMujeres: evento.numEntrenadoresMujeres ?? 0,
  };
}

export function getBudgetTotal(rows: BudgetRow[]) {
  return rows
    .filter((row) => row.status !== "removed")
    .reduce((acc, row) => acc + (Number.parseFloat(row.presupuesto) || 0), 0);
}

function normalizeTextValue(value?: string | null) {
  return value?.trim() ?? "";
}

type Props = {
  evento: Evento;
  itemsCatalogo: CatalogItemPresupuestario[];
  onChange: (result: EventoCambiosResult) => void;
  onRemove: () => void;
  defaultExpanded?: boolean;
};

export default function EventoCambiosCard({
  evento,
  itemsCatalogo,
  onChange,
  onRemove,
  defaultExpanded = true,
}: Props) {
  const [cardExpanded, setCardExpanded] = useState(defaultExpanded);
  const [generalForm, setGeneralForm] = useState<GeneralForm>(() =>
    buildInitialGeneralForm(evento),
  );

  const reformFormas = useMemo(() => getReformFormas(evento), [evento]);
  const budgetFormas = useMemo(() => getBudgetReformFormas(evento), [evento]);

  const initialForma = useMemo(() => {
    if (reformFormas.length === 1) return reformFormas[0];
    if (budgetFormas.length === 1) return budgetFormas[0];
    return null;
  }, [budgetFormas, reformFormas]);

  const [selectedFormaId, setSelectedFormaId] = useState<number | "">(
    initialForma?.id ?? "",
  );
  const [participantsForm, setParticipantsForm] = useState<ParticipantsForm>(() =>
    buildInitialParticipantsForm(evento, initialForma),
  );
  const [budgetRows, setBudgetRows] = useState<BudgetRow[]>(() =>
    getInitialBudgetRows(getFormaBudgetItems(evento, initialForma)),
  );
  const [expandedBudgetRows, setExpandedBudgetRows] = useState<string[]>([]);

  const selectedForma = useMemo(
    () => reformFormas.find((forma) => forma.id === selectedFormaId) ?? null,
    [reformFormas, selectedFormaId],
  );
  const selectedBudgetForma = useMemo(
    () =>
      selectedForma &&
      (selectedForma.tipoAval === "FONDOS_PUBLICOS" ||
        selectedForma.tipoAval === "AUTOGESTION")
        ? selectedForma
        : null,
    [selectedForma],
  );

  const proposedChanges = useMemo<ReformChangesDto>(() => {
    const payload: ReformChangesDto = {};
    const currentLugar = normalizeTextValue(evento.lugar);
    const nextLugar = normalizeTextValue(generalForm.lugar);
    const currentCiudad = normalizeTextValue(evento.ciudad);
    const nextCiudad = normalizeTextValue(generalForm.ciudad);
    const currentProvincia = normalizeTextValue(evento.provincia);
    const nextProvincia = normalizeTextValue(generalForm.provincia);
    const currentPais = normalizeTextValue(evento.pais);
    const nextPais = normalizeTextValue(generalForm.pais);

    if (generalForm.nombre !== evento.nombre) payload.nombre = generalForm.nombre;
    if (
      generalForm.tipoEvento !==
      (normalizeEventoTipoEvento(evento.tipoEvento) ?? evento.tipoEvento ?? "")
    ) {
      payload.tipoEvento = generalForm.tipoEvento;
    }
    if (
      generalForm.alcance !==
      (normalizeEventoAlcance(evento.alcance) ?? evento.alcance ?? "")
    ) {
      payload.alcance = generalForm.alcance;
    }
    if (nextLugar !== currentLugar) payload.lugar = generalForm.lugar.trim();
    if (nextCiudad !== currentCiudad) payload.ciudad = generalForm.ciudad.trim();
    if (nextProvincia !== currentProvincia) {
      payload.provincia = generalForm.provincia.trim();
    }
    if (nextPais !== currentPais) payload.pais = generalForm.pais.trim();
    if (generalForm.mesProgramado !== (evento.mesProgramado ?? "")) {
      payload.mesProgramado =
        typeof generalForm.mesProgramado === "number"
          ? generalForm.mesProgramado
          : undefined;
    }
    if (generalForm.fechaInicio !== formatDateInput(evento.fechaInicio)) {
      payload.fechaInicio = formatDateInput(generalForm.fechaInicio);
    }
    if (generalForm.fechaFin !== formatDateInput(evento.fechaFin)) {
      payload.fechaFin = formatDateInput(generalForm.fechaFin);
    }

    if (selectedForma) {
      const hasParticipantChanges =
        participantsForm.numAtletasHombres !== selectedForma.numAtletasHombres ||
        participantsForm.numAtletasMujeres !== selectedForma.numAtletasMujeres ||
        participantsForm.numEntrenadoresHombres !==
          selectedForma.numEntrenadoresHombres ||
        participantsForm.numEntrenadoresMujeres !==
          selectedForma.numEntrenadoresMujeres;

      if (hasParticipantChanges) {
        payload.formasParticipacion = [
          {
            tipoAval: selectedForma.tipoAval,
            numEntrenadoresHombres: participantsForm.numEntrenadoresHombres,
            numEntrenadoresMujeres: participantsForm.numEntrenadoresMujeres,
            numAtletasHombres: participantsForm.numAtletasHombres,
            numAtletasMujeres: participantsForm.numAtletasMujeres,
          },
        ];
      }
    }

    return payload;
  }, [evento, generalForm, participantsForm, selectedForma]);

  /** Ítems cuyo nuevo valor difiere del original: baja → recorte (origen),
   * sube → adición (destino) para este mismo evento. */
  const movimientos = useMemo<EventoMovimientoLinea[]>(() => {
    if (!selectedBudgetForma) return [];
    const originalItems = getFormaBudgetItems(evento, selectedBudgetForma);

    return budgetRows
      .filter((row) => row.status !== "removed" && typeof row.itemId === "number")
      .map((row) => {
        const originalItem = originalItems.find((item) => item.id === row.sourceId);
        const montoOriginal = originalItem
          ? Number.parseFloat(originalItem.presupuesto) || 0
          : 0;
        const montoNuevo = Number.parseFloat(row.presupuesto) || 0;
        const itemNombre =
          itemsCatalogo.find((option) => option.id === row.itemId)?.nombre ??
          originalItem?.item.nombre ??
          `Item #${row.itemId}`;

        return {
          itemId: row.itemId as number,
          itemNombre,
          mes: row.mes,
          montoOriginal,
          montoNuevo,
        };
      })
      .filter((linea) => linea.montoOriginal !== linea.montoNuevo);
  }, [budgetRows, evento, itemsCatalogo, selectedBudgetForma]);

  const budgetRowOriginalById = useMemo(() => {
    const map = new Map<string, number>();
    if (!selectedBudgetForma) return map;
    const originalItems = getFormaBudgetItems(evento, selectedBudgetForma);
    budgetRows.forEach((row) => {
      const originalItem = originalItems.find((item) => item.id === row.sourceId);
      map.set(row.localId, originalItem ? Number.parseFloat(originalItem.presupuesto) || 0 : 0);
    });
    return map;
  }, [budgetRows, evento, selectedBudgetForma]);

  const hasUnresolvableBudgetItems = useMemo(() => {
    if (!selectedBudgetForma) return false;

    return budgetRows.some((row) => {
      if (row.status === "removed") return false;
      return row.itemId == null;
    });
  }, [budgetRows, selectedBudgetForma]);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    onChangeRef.current({
      cambiosPropuestos: proposedChanges,
      hasUnresolvableBudgetItems,
      formaParticipacionId: selectedBudgetForma?.id ?? null,
      movimientos,
    });
  }, [proposedChanges, hasUnresolvableBudgetItems, selectedBudgetForma, movimientos]);

  const handleSelectForma = (value: string) => {
    const formaId = value ? Number(value) : "";
    const forma =
      typeof formaId === "number"
        ? reformFormas.find((item) => item.id === formaId) ?? null
        : null;

    setSelectedFormaId(forma?.id ?? "");
    setParticipantsForm(buildInitialParticipantsForm(evento, forma));
    setBudgetRows(getInitialBudgetRows(getFormaBudgetItems(evento, forma)));
    setExpandedBudgetRows([]);
  };

  const handleBudgetChange = (
    localId: string,
    field: keyof BudgetRow,
    value: string | number,
  ) => {
    setBudgetRows((prev) =>
      prev.map((row) => {
        if (row.localId !== localId) return row;

        if (field === "itemNumero") {
          const itemNumero = typeof value === "number" ? value : Number(value);
          const selectedItem = itemsCatalogo.find((item) => item.numero === itemNumero);
          return {
            ...row,
            itemNumero: selectedItem?.numero ?? "",
            itemId: selectedItem?.id,
          };
        }

        return { ...row, [field]: value };
      }),
    );
  };

  const handleAddBudgetRow = () => {
    if (!selectedBudgetForma) return;

    const localId = `new-${Date.now()}`;
    setBudgetRows((prev) => [
      ...prev,
      {
        localId,
        itemId: undefined,
        itemNumero: "",
        mes: 1,
        presupuesto: "0",
        status: "new",
      },
    ]);
    setExpandedBudgetRows((prev) => (prev.includes(localId) ? prev : [...prev, localId]));
  };

  const handleRemoveBudgetRow = (localId: string) => {
    setBudgetRows((prev) =>
      prev.flatMap((row) => {
        if (row.localId !== localId) return [row];
        if (row.status === "new") return [];
        return [{ ...row, status: row.status === "removed" ? "existing" : "removed" }];
      }),
    );
    setExpandedBudgetRows((prev) => prev.filter((id) => id !== localId));
  };

  const toggleBudgetRow = (localId: string) => {
    setExpandedBudgetRows((prev) =>
      prev.includes(localId) ? prev.filter((id) => id !== localId) : [...prev, localId],
    );
  };

  const hasAnyChange = Object.keys(proposedChanges).length > 0 || movimientos.length > 0;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-3 px-6 py-4">
        <button
          type="button"
          onClick={() => setCardExpanded((prev) => !prev)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${
              cardExpanded ? "rotate-180" : ""
            }`}
          />
          <div className="min-w-0">
            <p className="truncate font-semibold text-gray-900 dark:text-gray-100">
              {evento.nombre}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {evento.codigo}
              {hasAnyChange ? " · Con cambios propuestos" : " · Sin cambios"}
            </p>
          </div>
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Quitar
        </button>
      </div>

      {cardExpanded ? (
        <div className="space-y-6 border-t border-gray-200 px-6 py-6 dark:border-gray-800">
          <section>
            <div className="mb-5 flex items-center gap-3">
              <FileText className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Información general
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Propón nuevos valores manteniendo visible el contexto actual.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nombre del evento
                </span>
                <input
                  value={generalForm.nombre}
                  onChange={(e) =>
                    setGeneralForm((prev) => ({ ...prev, nombre: e.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tipo de evento
                </span>
                <select
                  value={generalForm.tipoEvento}
                  onChange={(e) =>
                    setGeneralForm((prev) => ({ ...prev, tipoEvento: e.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                >
                  <option value="">Selecciona un tipo</option>
                  {EVENTO_TAREA_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Alcance
                </span>
                <select
                  value={generalForm.alcance}
                  onChange={(e) =>
                    setGeneralForm((prev) => ({ ...prev, alcance: e.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                >
                  <option value="">Selecciona un alcance</option>
                  {EVENTO_ALCANCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Lugar
                </span>
                <input
                  value={generalForm.lugar}
                  onChange={(e) =>
                    setGeneralForm((prev) => ({ ...prev, lugar: e.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Ciudad
                </span>
                <input
                  value={generalForm.ciudad}
                  onChange={(e) =>
                    setGeneralForm((prev) => ({ ...prev, ciudad: e.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Provincia
                </span>
                <input
                  value={generalForm.provincia}
                  onChange={(e) =>
                    setGeneralForm((prev) => ({ ...prev, provincia: e.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  País
                </span>
                <input
                  value={generalForm.pais}
                  onChange={(e) =>
                    setGeneralForm((prev) => ({ ...prev, pais: e.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Mes programación
                </span>
                <select
                  value={generalForm.mesProgramado === "" ? "" : String(generalForm.mesProgramado)}
                  onChange={(e) =>
                    setGeneralForm((prev) => ({
                      ...prev,
                      mesProgramado: e.target.value === "" ? "" : Number(e.target.value),
                    }))
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                >
                  <option value="">Selecciona un mes</option>
                  {MES_OPCIONES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Fecha inicio
                </span>
                <input
                  type="date"
                  value={generalForm.fechaInicio}
                  onChange={(e) =>
                    setGeneralForm((prev) => ({ ...prev, fechaInicio: e.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Fecha fin
                </span>
                <input
                  type="date"
                  value={generalForm.fechaFin}
                  onChange={(e) =>
                    setGeneralForm((prev) => ({ ...prev, fechaFin: e.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                />
              </label>
            </div>
          </section>

          <section>
            <div className="mb-6 flex items-center gap-3">
              <Users className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Delegación y presupuesto
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Selecciona el tipo de participación para desplegar la delegación y el presupuesto.
                </p>
              </div>
            </div>

            <label className="mb-6 block space-y-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Tipo de participación
              </span>
              <select
                value={selectedFormaId === "" ? "" : String(selectedFormaId)}
                onChange={(e) => handleSelectForma(e.target.value)}
                disabled={reformFormas.length <= 1}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 disabled:opacity-70 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
              >
                <option value="">
                  {reformFormas.length > 1
                    ? "Selecciona un tipo de participación"
                    : "Sin tipos de participación"}
                </option>
                {reformFormas.map((forma) => (
                  <option key={forma.id} value={forma.id}>
                    {getTipoAvalLabel(forma.tipoAval)}
                    {forma.referencia?.trim() ? ` - ${forma.referencia.trim()}` : ""}
                  </option>
                ))}
              </select>
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                {reformFormas.length === 1
                  ? "Se seleccionó automáticamente porque este evento solo tiene un tipo de participación."
                  : "Cada opción muestra el tipo de participación junto con su referencia, si existe."}
              </span>
            </label>

            {!selectedForma ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-950/40 dark:text-gray-400">
                {reformFormas.length === 0
                  ? "Este evento no tiene tipos de participación registrados."
                  : "Selecciona un tipo de participación para desplegar la delegación y el presupuesto."}
              </div>
            ) : (
              <div className="grid gap-6">
                <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                  <div className="mb-5 flex items-center gap-3">
                    <Users className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                        Participantes
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Ajusta la delegación del tipo seleccionado.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Atletas hombres
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={participantsForm.numAtletasHombres}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          setParticipantsForm((prev) => ({
                            ...prev,
                            numAtletasHombres: Number(value) || 0,
                          }));
                        }}
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Atletas mujeres
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={participantsForm.numAtletasMujeres}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          setParticipantsForm((prev) => ({
                            ...prev,
                            numAtletasMujeres: Number(value) || 0,
                          }));
                        }}
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Entrenadores y otro personal (hombres)
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={participantsForm.numEntrenadoresHombres}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          setParticipantsForm((prev) => ({
                            ...prev,
                            numEntrenadoresHombres: Number(value) || 0,
                          }));
                        }}
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Entrenadores y otro personal (mujeres)
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={participantsForm.numEntrenadoresMujeres}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          setParticipantsForm((prev) => ({
                            ...prev,
                            numEntrenadoresMujeres: Number(value) || 0,
                          }));
                        }}
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-300"
                      />
                    </label>
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                          Items presupuestarios
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Escribí el nuevo valor de cada ítem: si lo bajás, esa plata queda
                          disponible para otro evento; si lo subís, tenés que bajar la misma
                          plata de otro lado para que cuadre.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddBudgetRow}
                      disabled={!selectedBudgetForma}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar item
                    </button>
                  </div>

                  {!selectedBudgetForma ? (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-950/40 dark:text-gray-400">
                      {budgetFormas.length === 0
                        ? "Este evento no tiene tipos de participación con fondos públicos o autogestión para reformar presupuesto."
                        : selectedForma.tipoAval === "SOLO_RESULTADO"
                          ? "El tipo de participación seleccionado no maneja presupuesto."
                          : "Selecciona un tipo de participación válido para editar su presupuesto."}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {budgetRows.map((row) => (
                        <div
                          key={row.localId}
                          className={`rounded-2xl border p-4 ${
                            row.status === "removed"
                              ? "border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/20"
                              : "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950/40"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => toggleBudgetRow(row.localId)}
                              className="flex min-w-0 flex-1 items-start gap-3 text-left"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                  {itemsCatalogo.find((option) => option.id === row.itemId)
                                    ?.nombre ||
                                    (row.status === "new" ? "Nuevo item" : "Item sin seleccionar")}
                                </p>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                  {MES_OPCIONES.find((option) => option.value === row.mes)?.label ||
                                    "Mes no definido"}{" "}
                                  · {row.presupuesto}
                                </p>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                  {row.status === "removed"
                                    ? "Item marcado para retiro"
                                    : "Haz clic para editar este item."}
                                </p>
                                {row.status !== "removed" &&
                                  (() => {
                                    const original = budgetRowOriginalById.get(row.localId) ?? 0;
                                    const nuevo = Number.parseFloat(row.presupuesto) || 0;
                                    const delta = nuevo - original;
                                    if (delta === 0) return null;
                                    return (
                                      <p
                                        className={`mt-1 text-xs font-medium ${
                                          delta > 0
                                            ? "text-emerald-600 dark:text-emerald-400"
                                            : "text-rose-600 dark:text-rose-400"
                                        }`}
                                      >
                                        {delta > 0
                                          ? `+${formatCurrency(delta)} (recibe, hay que bajarlo de otro lado)`
                                          : `${formatCurrency(delta)} (queda libre para otro evento)`}
                                      </p>
                                    );
                                  })()}
                              </div>
                              <ChevronDown
                                className={`mt-0.5 h-5 w-5 shrink-0 text-gray-400 transition-transform ${
                                  expandedBudgetRows.includes(row.localId) ? "rotate-180" : ""
                                }`}
                              />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveBudgetRow(row.localId)}
                              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                                row.status === "removed"
                                  ? "bg-white text-rose-700 dark:bg-gray-900 dark:text-rose-300"
                                  : "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                              }`}
                            >
                              <Trash2 className="h-4 w-4" />
                              {row.status === "removed" ? "Restaurar" : "Retirar"}
                            </button>
                          </div>

                          {expandedBudgetRows.includes(row.localId) ? (
                            <div className="mt-4 grid gap-4 border-t border-gray-200 pt-4 md:grid-cols-2 dark:border-gray-800">
                              <label className="space-y-2">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Item presupuestario
                                </span>
                                <select
                                  value={row.itemNumero}
                                  onChange={(e) =>
                                    handleBudgetChange(
                                      row.localId,
                                      "itemNumero",
                                      e.target.value ? Number(e.target.value) : "",
                                    )
                                  }
                                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-300"
                                  disabled={row.status === "removed"}
                                >
                                  <option value="">Selecciona un item</option>
                                  {itemsCatalogo.map((option) => (
                                    <option key={option.id} value={option.numero}>
                                      {option.numero} - {option.nombre}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="space-y-2">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Mes
                                </span>
                                <select
                                  value={row.mes}
                                  onChange={(e) =>
                                    handleBudgetChange(row.localId, "mes", Number(e.target.value) || 1)
                                  }
                                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-300"
                                  disabled={row.status === "removed"}
                                >
                                  {MES_OPCIONES.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="space-y-2 md:col-span-2">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Presupuesto
                                </span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={row.presupuesto}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/[^\d.]/g, "");
                                    const cleanValue = value.replace(/\.(?=.*\.)/g, "");
                                    handleBudgetChange(row.localId, "presupuesto", cleanValue);
                                  }}
                                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-900 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-300"
                                  disabled={row.status === "removed"}
                                />
                              </label>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}
          </section>

          {hasUnresolvableBudgetItems ? (
            <div className="rounded-2xl border border-dashed border-rose-300 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/20 dark:text-rose-300">
              Falta seleccionar uno o más items del catálogo oficial para poder enviar la
              reforma con sus <code>itemId</code> reales.
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
