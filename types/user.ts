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
  /** RUC del usuario (opcional). Si está y `usarRuc=true`, se usa en documentos contables en vez de la cédula. */
  ruc?: string | null;
  /** Si true, en documentos contables (financiero, presupuesto salida, PDA) se usa el RUC. */
  usarRuc?: boolean;
  genero?: Genero;
  categoria?: CatalogItem;
  categoriaId?: number;
  categoriaCodigo?: string | null;
  disciplina?: CatalogItem;
  disciplinaId?: number;
  disciplinaCodigo?: string | null;
  disciplinasDetalle?: CatalogItem[];
  roles?: RoleLike[];
  /** Roles del usuario con su nombre configurado (ej. "Director del DTM").
   *  Lo manda el backend en `cleanUser` junto a `roles` (que son solo códigos).
   *  Preferí este para mostrar el rol al usuario; el `nombre` es lo que se
   *  configuró en el catálogo de roles. */
  rolesDetalle?: RoleDto[];
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
  selectionToken?: string;
  accessToken?: string;
};

export type AuthTokenResult = {
  accessToken: string;
  user?: User;
} & Partial<User>;

/** Resultado del POST /auth/login: sesión lista o pendiente de selección. */
export type LoginResult = User | RoleSelectionRequired | AuthTokenResult;

export function loginRequiresSelection(
  result: LoginResult,
): result is RoleSelectionRequired {
  return (
    typeof result === "object" &&
    result !== null &&
    (result as RoleSelectionRequired).requiresRoleSelection === true
  );
}

export function getUserFromLoginResult(result: LoginResult): User | null {
  if (loginRequiresSelection(result)) return null;
  if ("accessToken" in result) {
    if (result.user) return result.user;
    if (typeof result.id === "number" && typeof result.email === "string") {
      const user = { ...result } as Record<string, unknown>;
      delete user.accessToken;
      delete user.user;
      return user as User;
    }
    return null;
  }
  return result;
}

export type AuthContextType = {
  user: User | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  switchRole: (rol: RoleLike) => Promise<void>;
};
