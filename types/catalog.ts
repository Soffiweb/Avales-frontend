export type CatalogItem = {
  id: number;
  nombre: string;
  codigo?: string | null;
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
