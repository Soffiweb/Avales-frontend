import { z } from "zod";

const rolesSchema = z
  .array(z.string().trim().min(1))
  .min(1, "Asigna al menos un rol");

const baseUserSchema = z.object({
  nombre: z.string().min(2, "Nombre: minimo 2 caracteres").max(60),
  apellido: z
    .string()
    .max(60, "Apellido: maximo 60 caracteres")
    .optional()
    .or(z.literal("")),
  email: z.string().email("Email invalido").max(120),
  cedula: z
    .string()
    .regex(/^\d{10}$/, "Cedula invalida: deben ser 10 digitos"),
  genero: z
    .enum(["MASCULINO", "FEMENINO", "MASCULINO_FEMENINO"])
    .optional()
    .or(z.literal("")),
  categoriaId: z.number().int().positive("Selecciona una categoria"),
  disciplinaIds: z
    .array(z.number().int().positive("Selecciona una disciplina valida"))
    .min(1, "Selecciona al menos una disciplina"),
  roles: rolesSchema,
  puedeSolicitarReformas: z.boolean().default(false),
});

export const profileSchema = z.object({
  nombre: z.string().min(2, "Nombre: minimo 2 caracteres").max(60),
  apellido: z.string().min(2, "Apellido: minimo 2 caracteres").max(60),
  email: z.string().email("Email invalido").max(120),
  cedula: z
    .string()
    .regex(/^\d{10}$/, "Cedula invalida: deben ser 10 digitos"),
  categoriaId: z.number().int().positive("Categoria invalida").optional(),
  disciplinaId: z.number().int().positive("Disciplina invalida").optional(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

export const createUserSchema = baseUserSchema.extend({
  password: z.string().min(6, "Password: minimo 6 caracteres").max(120),
});

export const updateUserSchema = baseUserSchema.extend({
  password: z
    .string()
    .min(6, "Password: minimo 6 caracteres")
    .max(120)
    .optional()
    .or(z.literal("")),
});

export type CreateUserFormValues = z.input<typeof createUserSchema>;
export type UpdateUserFormValues = z.input<typeof updateUserSchema>;
export type UserFormValues = CreateUserFormValues | UpdateUserFormValues;

export type CreateUserPayload = z.output<typeof createUserSchema>;
export type UpdateUserPayload = Partial<CreateUserPayload>;
