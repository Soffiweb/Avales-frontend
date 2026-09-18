import type { ReactNode } from "react";

/**
 * Tarjeta de sección con el estilo compartido de la app.
 *
 * Existe por el mismo motivo que los primitivos de `table.tsx`: el className
 * del contenedor (borde + radio + sombra + fondo, y sus variantes oscuras)
 * estaba copiado tal cual en las tres tarjetas del sidebar del detalle de aval,
 * en las tarjetas de objetivos/criterios y otra vez dentro de
 * `CollapsibleSection`. Cualquier ajuste de borde o de sombra obligaba a tocar
 * todas y, en la práctica, siempre quedaba alguna atrás con el estilo viejo.
 *
 * Lo que se comparte no es solo el contenedor sino también el encabezado: chip
 * de icono pastel + título, sobre una banda `slate-50/70` separada por un
 * borde. Por eso el encabezado se expone aparte (`SectionCardHeaderTitle` y las
 * dos constantes de clase): las secciones colapsables necesitan ese MISMO
 * encabezado pero dentro de un `<summary>`, y un `<div>` no se puede usar ahí
 * sin perder el desplegado nativo de `<details>`. Compartir las clases en vez
 * de forzar un `as="summary"` deja el componente simple y el colapsable
 * honesto: sigue siendo HTML nativo, sin estado ni JavaScript propios.
 */

/**
 * Tonos admitidos para el chip de icono.
 *
 * Es una lista cerrada a propósito: el chip tiene que combinar fondo, texto y
 * borde del mismo tono, y dejarlo abierto a cualquier color termina en chips
 * con borde de un color y fondo de otro.
 */
export type SectionIconTone = "indigo" | "emerald" | "sky" | "amber" | "slate";

const ICON_TONE_CLASSES: Record<SectionIconTone, string> = {
  indigo:
    "bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/30",
  emerald:
    "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  sky: "bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30",
  amber:
    "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  slate:
    "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/30",
};

/**
 * Clases del contenedor de la tarjeta.
 *
 * Lleva `overflow-hidden` porque el encabezado pinta su propio fondo hasta el
 * borde: sin recorte, la banda se sale por las esquinas redondeadas.
 */
export const SECTION_CARD_CLASS =
  "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-700 dark:bg-slate-800";

/** Clases de la banda de encabezado, compartidas por `div` y por `summary`. */
export const SECTION_CARD_HEADER_CLASS =
  "flex items-start justify-between gap-4 border-b border-slate-200/80 bg-slate-50/70 px-6 py-4 dark:border-slate-700 dark:bg-slate-900/40";

/**
 * Micro-patrón de etiqueta: el texto chiquito en mayúsculas que rotula un dato.
 *
 * Estaba escrito a mano una quincena de veces con tres variantes distintas de
 * tamaño y color, así que el mismo tipo de rótulo se veía diferente según la
 * sección.
 *
 * `as` existe porque el mismo rótulo aparece suelto (`p`), dentro de una lista
 * de definiciones (`dt`) y en línea junto a un icono (`span`); el estilo es el
 * mismo, la semántica no.
 */
export function SectionLabel({
  children,
  as: Tag = "p",
  className = "",
}: {
  children: ReactNode;
  as?: "p" | "dt" | "span";
  className?: string;
}) {
  return (
    <Tag
      className={`text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 ${className}`}
    >
      {children}
    </Tag>
  );
}

/**
 * Contenido del encabezado: chip de icono + título + una línea opcional de
 * contexto. Se expone suelto para que el `<summary>` del colapsable lo use tal
 * cual.
 */
export function SectionCardHeaderTitle({
  title,
  icon,
  iconTone = "slate",
  meta,
}: {
  title: ReactNode;
  icon?: ReactNode;
  iconTone?: SectionIconTone;
  meta?: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2.5">
        {icon ? (
          <span
            className={`flex shrink-0 items-center justify-center rounded-lg border p-1.5 ${ICON_TONE_CLASSES[iconTone]}`}
            aria-hidden="true"
          >
            {icon}
          </span>
        ) : null}
        <h2 className="truncate text-sm font-bold text-slate-900 sm:text-base dark:text-slate-100">
          {title}
        </h2>
      </div>
      {meta ? <div className="mt-1">{meta}</div> : null}
    </div>
  );
}

export function SectionCard({
  title,
  icon,
  iconTone = "slate",
  meta,
  actions,
  children,
  /** Para tarjetas cuyo contenido trae su propio padding o va a sangre. */
  bodyClassName = "p-6",
  className = "",
}: {
  title?: ReactNode;
  icon?: ReactNode;
  iconTone?: SectionIconTone;
  meta?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
  className?: string;
}) {
  return (
    <div className={`${SECTION_CARD_CLASS} ${className}`}>
      {/* Sin título no hay banda: un encabezado vacío se lee como un renglón
          que faltó completar. */}
      {title ? (
        <div className={SECTION_CARD_HEADER_CLASS}>
          <SectionCardHeaderTitle
            title={title}
            icon={icon}
            iconTone={iconTone}
            meta={meta}
          />
          {actions ? (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          ) : null}
        </div>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}
