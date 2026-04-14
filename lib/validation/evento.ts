import { z } from "zod";

export const eventoItemSchema = z.object({
  itemId: z.number().int().positive("Selecciona un item"),
  mes: z.number().int().min(1, "Mes minimo 1").max(12, "Mes maximo 12"),
  presupuesto: z.number().min(0, "Presupuesto no puede ser negativo"),
});

export const eventoSchema = z.object({
  codigo: z
    .string()
    .min(1, "Codigo requerido")
    .max(50, "Codigo: maximo 50 caracteres"),
  tipoParticipacion: z
    .string()
    .min(1, "Tipo de participacion requerido")
    .max(100),
  tipoEvento: z.string().min(1, "Tipo de evento requerido").max(100),
  nombre: z
    .string()
    .min(3, "Nombre: minimo 3 caracteres")
    .max(200, "Nombre: maximo 200 caracteres"),
  lugar: z.string().min(1, "Lugar requerido").max(200),
  genero: z.enum(["MASCULINO", "FEMENINO", "MASCULINO_FEMENINO"], {
    message: "Selecciona genero",
  }),
  disciplinaCodigo: z.string().min(1, "Selecciona una disciplina"),
  categoriaId: z.number().int().positive("Selecciona una categoria"),
  provincia: z.string().min(1, "Provincia requerida").max(100),
  ciudad: z.string().min(1, "Ciudad requerida").max(100),
  pais: z.string().min(1, "Pais requerido").max(100),
  alcance: z.string().min(1, "Alcance requerido").max(100),
  fechaInicio: z.string().min(1, "Fecha de inicio requerida"),
  fechaFin: z.string().min(1, "Fecha de fin requerida"),
  numEntrenadoresHombres: z
    .number()
    .int()
    .min(0, "Numero de entrenadores hombres invalido"),
  numEntrenadoresMujeres: z
    .number()
    .int()
    .min(0, "Numero de entrenadores mujeres invalido"),
  numAtletasHombres: z.number().int().min(0, "Numero de atletas hombres invalido"),
  numAtletasMujeres: z.number().int().min(0, "Numero de atletas mujeres invalido"),
  eventoItems: z.array(eventoItemSchema).optional(),
});

export type EventoFormValues = z.infer<typeof eventoSchema>;

export type EventoItemPayload = {
  itemId: number;
  mes: number;
  presupuesto: number;
};

export type CreateEventoPayload = {
  codigo: string;
  tipoParticipacion: string;
  tipoEvento: string;
  nombre: string;
  lugar: string;
  genero: "MASCULINO" | "FEMENINO" | "MASCULINO_FEMENINO";
  disciplinaCodigo: string;
  categoriaId: number;
  provincia: string;
  ciudad: string;
  pais: string;
  alcance: string;
  fechaInicio: string;
  fechaFin: string;
  numEntrenadoresHombres: number;
  numEntrenadoresMujeres: number;
  numAtletasHombres: number;
  numAtletasMujeres: number;
};
