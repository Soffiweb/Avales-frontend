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
  /** Rol con el que el usuario está operando en esta sesión (elegido en /auth/select-role). */
  rolActivo?: Role;
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
  roles: Role[];
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
  switchRole: (rol: Role) => Promise<void>;
};
