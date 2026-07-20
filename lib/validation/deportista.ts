import { z } from "zod";

export const deportistaSchema = z.object({
  nombres: z.string().min(2, "Nombres: minimo 2 caracteres").max(120),
  apellidos: z.string().min(2, "Apellidos: minimo 2 caracteres").max(120),
  cedula: z.string().regex(/^\d{10}$/, "Cedula invalida: deben ser 10 digitos"),
  genero: z
    .enum(["masculino", "femenino", "otro"])
    .refine((value) => value !== undefined, {
      message: "Selecciona genero",
    }),
  fechaNacimiento: z.string().min(1, "Fecha de nacimiento requerida"),
  categoriaCodigo: z.string().min(1, "Selecciona una categoria válida"),
  disciplinaCodigo: z.string().min(1, "Selecciona una disciplina"),
  afiliacion: z.boolean(),
  afiliacionInicio: z.string().optional().or(z.literal("")),
  afiliacionFin: z.string().optional().or(z.literal("")),
});

export type DeportistaFormValues = z.input<typeof deportistaSchema>;

export type CreateDeportistaPayload = {
  nombres: string;
  apellidos: string;
  cedula: string;
  genero: "MASCULINO" | "FEMENINO" | "OTRO";
  fechaNacimiento: string;
  categoriaCodigo: string;
  disciplinaCodigo: string;
  afiliacion: boolean;
  afiliacionInicio?: string;
  afiliacionFin?: string;
};
