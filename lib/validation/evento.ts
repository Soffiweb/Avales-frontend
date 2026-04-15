import { EVENTO_TIPO_PARTICIPACION_OPTIONS, type EventoTipoParticipacion } from "@/lib/constants";
import { z } from "zod";

export const eventoItemSchema = z.object({
  itemId: z.number().int().positive("Selecciona un item"),
  mes: z.number().int().min(1, "Mes minimo 1").max(12, "Mes maximo 12"),
  presupuesto: z.number().min(0, "Presupuesto no puede ser negativo"),
});

const optionalDateSchema = z.string().optional().or(z.literal(""));

export const eventoSchema = z.object({
  codigo: z
    .string()
    .min(1, "Codigo requerido")
    .max(50, "Codigo: maximo 50 caracteres"),
  tipoParticipacion: z.enum(
    EVENTO_TIPO_PARTICIPACION_OPTIONS.map((option) => option.value) as [
      EventoTipoParticipacion,
      ...EventoTipoParticipacion[],
    ],
    {
      message: "Selecciona un tipo de participacion",
    }
  ),
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
  categoriaCodigo: z.string().min(1, "Selecciona una categoria"),
  mesProgramado: z.number().int().min(1, "Selecciona un mes programado").max(12, "Selecciona un mes programado"),
  provincia: z.string().min(1, "Provincia requerida").max(100),
  ciudad: z.string().min(1, "Ciudad requerida").max(100),
  pais: z.string().min(1, "Pais requerido").max(100),
  alcance: z.string().min(1, "Alcance requerido").max(100),
  fechaInicio: optionalDateSchema,
  fechaFin: optionalDateSchema,
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
}).superRefine((values, ctx) => {
  const hasInicio = Boolean(values.fechaInicio && values.fechaInicio.trim());
  const hasFin = Boolean(values.fechaFin && values.fechaFin.trim());

  if (hasInicio !== hasFin) {
    const message =
      "Debes registrar fecha de inicio y fecha de fin, o dejar ambas vacías.";
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["fechaInicio"],
      message,
    });
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["fechaFin"],
      message,
    });
  }
});

export type EventoFormValues = z.infer<typeof eventoSchema>;

export type EventoItemPayload = {
  itemId: number;
  mes: number;
  presupuesto: number;
};

export type CreateEventoPayload = {
  codigo: string;
  tipoParticipacion: EventoTipoParticipacion;
  tipoEvento: string;
  nombre: string;
  lugar: string;
  genero: "MASCULINO" | "FEMENINO" | "MASCULINO_FEMENINO";
  disciplinaCodigo: string;
  categoriaCodigo: string;
  mesProgramado: number;
  provincia: string;
  ciudad: string;
  pais: string;
  alcance: string;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  numEntrenadoresHombres: number;
  numEntrenadoresMujeres: number;
  numAtletasHombres: number;
  numAtletasMujeres: number;
  eventoItems?: EventoItemPayload[];
};
