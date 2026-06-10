export type TipoRol =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "SECRETARIA"
  | "SECRETARIA_DTM"
  | "DTM"
  | "METODOLOGO"
  | "ENTRENADOR"
  | "USUARIO"
  | "DEPORTISTA"
  | "PDA"
  | "CONTROL_PREVIO"
  | "FINANCIERO"
  | "COMPRAS_PUBLICAS";

export type Role = {
  id: number;
  codigo: TipoRol;
  nombre: string;
  descripcion: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpdateRolePayload = {
  nombre?: string;
  descripcion?: string | null;
};
