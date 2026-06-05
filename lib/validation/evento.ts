import {
  EVENTO_TIPO_PARTICIPACION_OPTIONS,
  EVENTO_TAREA_OPTIONS,
  EVENTO_ALCANCE_OPTIONS,
  EVENTO_CATEGORIA_OPTIONS,
  type EventoTipoParticipacion
} from "@/lib/constants";
import { z } from "zod";
import type { CreateEventoPayload as CreateEventoPayloadType } from "@/types/evento";

export const eventoItemSchema = z.object({
  itemId: z.number().int().positive("Selecciona un item"),
  mes: z.number().int().min(1, "Mes minimo 1").max(12, "Mes maximo 12"),
  presupuesto: z.number().min(0, "Presupuesto no puede ser negativo"),
  fuente: z.enum(["FONDOS_PUBLICOS", "AUTOGESTION"], {
    error: () => ({ message: "Selecciona una fuente" }),
  }),
  montoComprometido: z.number().min(0).optional(),
  montoEjecutado: z.number().min(0).optional(),
});

const optionalDateSchema = z.string().optional().or(z.literal(""));

export const eventoSchema = z.object({
  codigo: z
    .string()
    .min(1, "Codigo requerido")
    .max(50, "Codigo: maximo 50 caracteres"),
  tipoParticipacion: z
    .enum(
      EVENTO_TIPO_PARTICIPACION_OPTIONS.map((option) => option.value) as [
        EventoTipoParticipacion,
        ...EventoTipoParticipacion[],
      ]
    )
    .or(z.literal(""))
    .refine((value) => value !== "", {
      message: "Selecciona un tipo de participacion",
    }),
  tipoEvento: z
    .enum(
      EVENTO_TAREA_OPTIONS.map((option) => option.value) as [string, ...string[]]
    )
    .or(z.literal(""))
    .refine((value) => value !== "", {
      message: "Selecciona una tarea válida",
    }),
  nombre: z
    .string()
    .min(3, "Nombre: minimo 3 caracteres")
    .max(200, "Nombre: maximo 200 caracteres"),
  lugar: z.string().min(1, "Lugar requerido").max(200),
  genero: z
    .enum(["MASCULINO", "FEMENINO", "MASCULINO_FEMENINO"])
    .or(z.literal(""))
    .refine((value) => value !== "", {
      message: "Selecciona genero",
    }),
  disciplinaCodigo: z.string().min(1, "Selecciona una disciplina"),
  categoriaCodigo: z
    .enum(
      EVENTO_CATEGORIA_OPTIONS.map((option) => option.value) as [string, ...string[]]
    )
    .or(z.literal(""))
    .refine((value) => value !== "", {
      message: "Selecciona una categoría válida",
    }),
  mesProgramado: z
    .number()
    .int()
    .min(1, "Selecciona un mes programado")
    .max(12, "Selecciona un mes programado"),
  provincia: z.string().min(1, "Provincia requerida").max(100),
  ciudad: z.string().min(1, "Ciudad requerida").max(100),
  pais: z.string().min(1, "Pais requerido").max(100),
  alcance: z
    .enum(
      EVENTO_ALCANCE_OPTIONS.map((option) => option.value) as [string, ...string[]]
    )
    .or(z.literal(""))
    .refine((value) => value !== "", {
      message: "Selecciona un alcance válido",
    }),
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

export type EventoFormValues = z.input<typeof eventoSchema>;

export type EventoItemPayload = {
  itemId: number;
  mes: number;
  presupuesto: number;
  fuente: "FONDOS_PUBLICOS" | "AUTOGESTION";
  montoComprometido?: number;
  montoEjecutado?: number;
};

export type CreateEventoPayload = Omit<CreateEventoPayloadType, "eventoItems"> & {
  eventoItems?: EventoItemPayload[];
};
