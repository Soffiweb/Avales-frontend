import type { CatalogItem } from "@/types/catalog";

export type Role = string;

export type RoleDto = {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
};

export type RoleLike = Role | RoleDto;

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
  roles?: RoleLike[];
  /** Rol con el que el usuario está operando en esta sesión (elegido en /auth/select-role). */
  rolActivo?: RoleLike;
  rolId?: number;
  disciplinas?: UserDisciplina[];
  categorias?: number[];
  puedeSolicitarReformas?: boolean;
  pushToken?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type UserListResponse = User[];

/** Respuesta del login cuando el usuario tiene 2+ roles y debe elegir. */
export type RoleSelectionRequired = {
  requiresRoleSelection: true;
  roles: RoleLike[];
  selectionToken: string;
};

/** Resultado del POST /auth/login: sesión lista o pendiente de selección. */
export type LoginResult = User | RoleSelectionRequired;

export function loginRequiresSelection(
  result: LoginResult,
): result is RoleSelectionRequired {
  return (
    typeof result === "object" &&
    result !== null &&
    (result as RoleSelectionRequired).requiresRoleSelection === true
  );
}

export type AuthContextType = {
  user: User | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  switchRole: (rol: RoleLike) => Promise<void>;
};
