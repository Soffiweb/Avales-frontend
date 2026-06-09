"use client";

import { useEffect, useState } from "react";
import { Plane, Bus, Car, Ship, Calendar, Clock } from "lucide-react";

type FormData = {
  deportistas: Array<{
    id: number;
    deportistaExternoId?: string;
    nombre: string;
    apellido?: string;
    nombres?: string;
    apellidos?: string;
    cedula?: string;
    payload?: Record<string, unknown>;
    rol?: string;
  }>;
  entrenadores: Array<{ id: number; nombre: string }>;
  fechaEmision?: string;
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

type Paso02LogisticaProps = {
  formData: FormData;
  onComplete: (data: Partial<FormData>) => void;
  onPreviewChange?: (data: Partial<FormData>) => void;
  onBack: () => void;
};

const TRANSPORT_OPTIONS = [
  { value: "AEREO", label: "Aéreo", icon: Plane },
  { value: "TERRESTRE", label: "Terrestre", icon: Bus },
  { value: "VEHICULO_PROPIO", label: "Vehículo propio", icon: Car },
  { value: "MARITIMO", label: "Marítimo", icon: Ship },
  { value: "OTRO", label: "Otro", icon: Bus },
];

function resolveTransportSelection(value?: string) {
  if (!value) return { selected: "", custom: "" };
  const match = TRANSPORT_OPTIONS.find((option) => option.value === value);
  if (match) return { selected: value, custom: "" };
  return { selected: "OTRO", custom: value };
}

function splitDateTime(value: string) {
  if (!value) return { date: "", time: "" };
  const [date = "", rawTime = ""] = value.split("T");
  const time = rawTime.slice(0, 5);
  return { date, time };
}

export default function Paso02Logistica({
  formData,
  onComplete,
  onPreviewChange,
  onBack,
}: Paso02LogisticaProps) {
  const salidaInicial = splitDateTime(formData.fechaHoraSalida || "");
  const retornoInicial = splitDateTime(formData.fechaHoraRetorno || "");
  const transporteSalidaInicial = resolveTransportSelection(formData.transporteSalida);
  const transporteRetornoInicial = resolveTransportSelection(formData.transporteRetorno);
  const [fechaSalida, setFechaSalida] = useState(salidaInicial.date);
  const [horaSalida, setHoraSalida] = useState(salidaInicial.time);
  const [fechaRetorno, setFechaRetorno] = useState(retornoInicial.date);
  const [horaRetorno, setHoraRetorno] = useState(retornoInicial.time);
  const [lugarSalida, setLugarSalida] = useState(formData.lugarSalida || "");
  const [lugarRetorno, setLugarRetorno] = useState(formData.lugarRetorno || "");
  const [transporteSalida, setTransporteSalida] = useState(
    transporteSalidaInicial.selected,
  );
  const [transporteRetorno, setTransporteRetorno] = useState(
    transporteRetornoInicial.selected,
  );
  const [transporteSalidaOtro, setTransporteSalidaOtro] = useState(
    transporteSalidaInicial.custom,
  );
  const [transporteRetornoOtro, setTransporteRetornoOtro] = useState(
    transporteRetornoInicial.custom,
  );
  const [error, setError] = useState<string | null>(null);
  const fechaHoraSalida =
    fechaSalida && horaSalida ? `${fechaSalida}T${horaSalida}` : "";
  const fechaHoraRetorno =
    fechaRetorno && horaRetorno ? `${fechaRetorno}T${horaRetorno}` : "";

  useEffect(() => {
    onPreviewChange?.({
      fechaHoraSalida,
      fechaHoraRetorno,
      lugarSalida,
      lugarRetorno,
      transporteSalida:
        transporteSalida === "OTRO"
          ? transporteSalidaOtro.trim() || "OTRO"
          : transporteSalida,
      transporteRetorno:
        transporteRetorno === "OTRO"
          ? transporteRetornoOtro.trim() || "OTRO"
          : transporteRetorno,
    });
  }, [
    fechaHoraSalida,
    fechaHoraRetorno,
    lugarSalida,
    lugarRetorno,
    transporteSalida,
    transporteRetorno,
    transporteSalidaOtro,
    transporteRetornoOtro,
    onPreviewChange,
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fechaHoraSalida) {
      setError("Debes ingresar la fecha y hora de salida");
      return;
    }

    if (!lugarSalida.trim()) {
      setError("Debes ingresar el lugar de salida");
      return;
    }

    if (!fechaHoraRetorno) {
      setError("Debes ingresar la fecha y hora de retorno");
      return;
    }

    if (!lugarRetorno.trim()) {
      setError("Debes ingresar el lugar de retorno");
      return;
    }

    if (!transporteSalida) {
      setError("Debes seleccionar el medio de transporte de salida");
      return;
    }

    if (!transporteRetorno) {
      setError("Debes seleccionar el medio de transporte de retorno");
      return;
    }

    // Validar que fecha de retorno sea después de fecha de salida
    const salidaDate = new Date(fechaHoraSalida);
    const retornoDate = new Date(fechaHoraRetorno);

    if (retornoDate <= salidaDate) {
      setError("La fecha de retorno debe ser posterior a la fecha de salida");
      return;
    }

    onComplete({
      fechaHoraSalida,
      fechaHoraRetorno,
      lugarSalida: lugarSalida.trim(),
      lugarRetorno: lugarRetorno.trim(),
      transporteSalida:
        transporteSalida === "OTRO"
          ? transporteSalidaOtro.trim() || "OTRO"
          : transporteSalida,
      transporteRetorno:
        transporteRetorno === "OTRO"
          ? transporteRetornoOtro.trim() || "OTRO"
          : transporteRetorno,
    });
  };

  return (
    <div>
      <h1 className="text-2xl text-gray-800 dark:text-gray-100 font-bold mb-2">
        Información de logística
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Ingresa las fechas, horarios y medios de transporte para el viaje.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Salida Section */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-5 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Salida
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Lugar de salida
              </label>
              <input
                type="text"
                value={lugarSalida}
                onChange={(e) => setLugarSalida(e.target.value)}
                className="form-input w-full"
                placeholder="Ej: Complejo deportivo, Loja"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fecha y hora de salida
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="date"
                  value={fechaSalida}
                  onChange={(e) => setFechaSalida(e.target.value)}
                  className="form-input w-full"
                />
                <input
                  type="time"
                  value={horaSalida}
                  onChange={(e) => setHoraSalida(e.target.value)}
                  className="form-input w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Medio de transporte
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TRANSPORT_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = transporteSalida === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTransporteSalida(option.value)}
                      className={`flex items-center justify-center gap-2 p-2 rounded-md border transition text-xs ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                          : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 ${
                          isSelected
                            ? "text-indigo-600 dark:text-indigo-400"
                            : "text-gray-500 dark:text-gray-400"
                        }`}
                      />
                      <span className="font-medium">{option.label}</span>
                    </button>
                  );
                })}
              </div>
              {transporteSalida === "OTRO" && (
                <input
                  type="text"
                  value={transporteSalidaOtro}
                  onChange={(e) => setTransporteSalidaOtro(e.target.value)}
                  placeholder="Especifica el transporte (opcional)"
                  className="form-input w-full mt-2"
                />
              )}
            </div>
          </div>
        </div>

        {/* Retorno Section */}
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-5 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Retorno
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Lugar de retorno
              </label>
              <input
                type="text"
                value={lugarRetorno}
                onChange={(e) => setLugarRetorno(e.target.value)}
                className="form-input w-full"
                placeholder="Ej: Federación, Loja"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fecha y hora de retorno
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="date"
                  value={fechaRetorno}
                  onChange={(e) => setFechaRetorno(e.target.value)}
                  className="form-input w-full"
                />
                <input
                  type="time"
                  value={horaRetorno}
                  onChange={(e) => setHoraRetorno(e.target.value)}
                  className="form-input w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Medio de transporte
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TRANSPORT_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = transporteRetorno === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTransporteRetorno(option.value)}
                      className={`flex items-center justify-center gap-2 p-2 rounded-md border transition text-xs ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                          : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 ${
                          isSelected
                            ? "text-indigo-600 dark:text-indigo-400"
                            : "text-gray-500 dark:text-gray-400"
                        }`}
                      />
                      <span className="font-medium">{option.label}</span>
                    </button>
                  );
                })}
              </div>
              {transporteRetorno === "OTRO" && (
                <input
                  type="text"
                  value={transporteRetornoOtro}
                  onChange={(e) => setTransporteRetornoOtro(e.target.value)}
                  placeholder="Especifica el transporte (opcional)"
                  className="form-input w-full mt-2"
                />
              )}
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
          >
            ← Anterior
          </button>
          <button
            type="submit"
            className="btn bg-indigo-500 hover:bg-indigo-600 text-white"
          >
            Siguiente paso →
          </button>
        </div>
      </form>
    </div>
  );
}
