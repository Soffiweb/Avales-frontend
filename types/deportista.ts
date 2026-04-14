import type { CatalogItem } from "@/types/catalog";

export type Deportista = {
  id: number;
  externoId?: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  fechaNacimiento?: string;
  categoria?: CatalogItem;
  categoriaId?: number;
  categoriaCodigo?: string | null;
  disciplina?: CatalogItem;
  disciplinaId?: number;
  disciplinaCodigo?: string | null;
  genero?: string;
  club?: string;
  afiliacion: boolean;
  afiliacionInicio?: string | null;
  afiliacionFin?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type DeportistaListResponse = Deportista[];
