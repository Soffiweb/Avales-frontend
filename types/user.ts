import type { CatalogItem } from "@/types/catalog";

export type Role =
  | "SUPER_ADMIN"
  | "SUPERADMIN"
  | "ADMIN"
  | "ADMINISTRADOR"
  | "SECRETARIA"
  | "DTM"
  | "METODOLOGO"
  | "ENTRENADOR"
  | "USUARIO"
  | "DEPORTISTA"
  | "PDA"
  | "CONTROL_PREVIO"
  | "COMPRAS_PUBLICAS"
  | "FINANCIERO";

export type Genero = "MASCULINO" | "FEMENINO" | "MASCULINO_FEMENINO";

export type UserDisciplina = number | CatalogItem;

export type User = {
  id: number;
  email: string;
  nombre: string;
  apellido: string;
  cedula: string;
  genero?: Genero;
  categoria?: CatalogItem;
  categoriaId?: number;
  categoriaCodigo?: string | null;
  disciplina?: CatalogItem;
  disciplinaId?: number;
  disciplinaCodigo?: string | null;
  disciplinasDetalle?: CatalogItem[];
  roles?: Role[];
  rolId?: number;
  disciplinas?: UserDisciplina[];
  categorias?: number[];
  puedeSolicitarReformas?: boolean;
  pushToken?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type UserListResponse = User[];

export type AuthContextType = {
  user: User | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
};
