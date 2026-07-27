/** Motor que escribe el excel de pronostico: define que columnas se llenan. */
export type MotorPronostico =
  | "PRONOSTICO_1"
  | "PRONOSTICO_2"
  | "PRONOSTICO_3";

export type PronosticoPlantilla = {
  id: number;
  codigo: string;
  nombre: string;
  motor: MotorPronostico;
};

export type CatalogItem = {
  id: number;
  nombre: string;
  codigo?: string | null;
  eventosCount?: number | null;
  /**
   * Solo disciplinas: plantilla usada para el excel de pronostico. Sin
   * plantilla, el backend bloquea la creacion de avales de esa disciplina.
   */
  pronosticoPlantilla?: PronosticoPlantilla | null;
};

export type CatalogItemPresupuestario = {
  id: number;
  nombre: string;
  numero: number;
  descripcion: string;
  actividad?: {
    id: number;
    nombre: string;
    numero: number;
  };
};
