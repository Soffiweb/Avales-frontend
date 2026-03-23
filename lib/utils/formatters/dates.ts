const DEFAULT_LOCALE = "es-EC";
const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

type DateFormatOptions = Intl.DateTimeFormatOptions & {
  fallback?: string;
  locale?: string;
};

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function formatDateWithOptions(
  value?: string | null,
  options: DateFormatOptions = {},
): string {
  const {
    fallback = "-",
    locale = DEFAULT_LOCALE,
    ...dateOptions
  } = options;
  const date = parseDate(value);
  if (!date) return fallback;
  return date.toLocaleDateString(locale, dateOptions);
}

export function formatDate(value?: string | null): string {
  const date = parseDate(value);
  if (!date) return "-";
  const month = date.toLocaleDateString(DEFAULT_LOCALE, { month: "long" });
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month} ${day} del ${year}`;
}

export function formatDateNumeric(value?: string | null): string {
  return formatDateWithOptions(value);
}

export function formatDateShort(value?: string | null): string {
  return formatDateWithOptions(value, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateLong(value?: string | null): string {
  return formatDateWithOptions(value, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatDateTime(value?: string | null): string {
  const date = parseDate(value);
  if (!date) return "-";
  return date.toLocaleString(DEFAULT_LOCALE);
}

export function formatDateTimeShort(value?: string | null): string {
  const date = parseDate(value);
  if (!date) return "-";
  return date.toLocaleString(DEFAULT_LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateRange(
  inicio?: string | null,
  fin?: string | null,
): string {
  if (!inicio) return "-";
  const startDate = parseDate(inicio);
  const endDate = parseDate(fin);

  if (!startDate) return "-";

  const startStr = startDate.toLocaleDateString(DEFAULT_LOCALE, {
    day: "numeric",
    month: "short",
  });

  if (!endDate) {
    return `${startStr}, ${startDate.getFullYear()}`;
  }

  const endStr = endDate.toLocaleDateString(DEFAULT_LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return `${startStr} - ${endStr}`;
}

export function formatDateInput(value?: string | null): string {
  const date = parseDate(value);
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export function formatDateDMY(value?: string | null): string {
  const date = parseDate(value);
  if (!date) return "-";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

export function formatTimeCompact(value?: string | null): string {
  const date = parseDate(value);
  if (!date) return "-";
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}H${mm}`;
}

export function formatDocumentEventDateRange(
  inicio?: string | null,
  fin?: string | null,
): string {
  if (!inicio) return "-";

  const start = parseDate(inicio);
  if (!start) return "-";

  const startFormatted = start.toLocaleDateString(DEFAULT_LOCALE, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const end = parseDate(fin);
  if (!end) return startFormatted.toUpperCase();

  const endFormatted = end.toLocaleDateString(DEFAULT_LOCALE, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return `${startFormatted} AL ${endFormatted}`.toUpperCase();
}

export function formatEventDateRangeForDescripcion(
  fechaInicio?: string | null,
  fechaFin?: string | null,
): string {
  if (!fechaInicio) return "en fecha por definir";
  const start = parseDate(fechaInicio);
  if (!start) return "en fecha por definir";

  if (!fechaFin) {
    return `el ${start.toLocaleDateString(DEFAULT_LOCALE, {
      day: "numeric",
      month: "long",
      year: "numeric",
    })}`;
  }

  const end = parseDate(fechaFin);
  if (!end) {
    return `el ${start.toLocaleDateString(DEFAULT_LOCALE, {
      day: "numeric",
      month: "long",
      year: "numeric",
    })}`;
  }

  const sameMonth =
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear();

  if (sameMonth) {
    return `del ${start.getDate()} al ${end.getDate()} de ${start.toLocaleDateString(
      DEFAULT_LOCALE,
      { month: "long", year: "numeric" },
    )}`;
  }

  return `del ${start.toLocaleDateString(DEFAULT_LOCALE, {
    day: "numeric",
    month: "long",
    year: "numeric",
  })} al ${end.toLocaleDateString(DEFAULT_LOCALE, {
    day: "numeric",
    month: "long",
    year: "numeric",
  })}`;
}

export function formatCurrentLongDate(): string {
  return new Date().toLocaleDateString(DEFAULT_LOCALE, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatMonth(month: number): string {
  return MONTHS[month - 1] || `Mes ${month}`;
}
