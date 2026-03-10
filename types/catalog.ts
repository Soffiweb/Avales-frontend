export type CatalogItem = {
  id: number;
  nombre: string;
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
