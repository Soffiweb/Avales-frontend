const DEFAULT_LOCALE = "es-EC";
const DEFAULT_TIME_ZONE = "America/Guayaquil";
const PLAIN_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
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
  const date = PLAIN_DATE_RE.test(value)
    ? new Date(`${value}T00:00:00-05:00`)
    : new Date(value);
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
  return date.toLocaleDateString(locale, {
    timeZone: DEFAULT_TIME_ZONE,
    ...dateOptions,
  });
}

export function formatDate(value?: string | null): string {
  const date = parseDate(value);
  if (!date) return "-";
  const month = date.toLocaleDateString(DEFAULT_LOCALE, {
    month: "long",
    timeZone: DEFAULT_TIME_ZONE,
  });
  const day = date.toLocaleDateString(DEFAULT_LOCALE, {
    day: "numeric",
    timeZone: DEFAULT_TIME_ZONE,
  });
  const year = date.toLocaleDateString(DEFAULT_LOCALE, {
    year: "numeric",
    timeZone: DEFAULT_TIME_ZONE,
  });
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
  return date.toLocaleString(DEFAULT_LOCALE, { timeZone: DEFAULT_TIME_ZONE });
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
    timeZone: DEFAULT_TIME_ZONE,
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
    timeZone: DEFAULT_TIME_ZONE,
  });

  if (!endDate) {
    return `${startStr}, ${startDate.toLocaleDateString(DEFAULT_LOCALE, {
      year: "numeric",
      timeZone: DEFAULT_TIME_ZONE,
    })}`;
  }

  const endStr = endDate.toLocaleDateString(DEFAULT_LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: DEFAULT_TIME_ZONE,
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
  const day = date.toLocaleDateString(DEFAULT_LOCALE, {
    day: "2-digit",
    timeZone: DEFAULT_TIME_ZONE,
  });
  const month = date.toLocaleDateString(DEFAULT_LOCALE, {
    month: "2-digit",
    timeZone: DEFAULT_TIME_ZONE,
  });
  const year = date.toLocaleDateString(DEFAULT_LOCALE, {
    year: "numeric",
    timeZone: DEFAULT_TIME_ZONE,
  });
  return `${day}-${month}-${year}`;
}

export function formatTimeCompact(value?: string | null): string {
  const date = parseDate(value);
  if (!date) return "-";
  const hh = date.toLocaleString(DEFAULT_LOCALE, {
    hour: "2-digit",
    hourCycle: "h23",
    timeZone: DEFAULT_TIME_ZONE,
  });
  const mm = date.toLocaleString(DEFAULT_LOCALE, {
    minute: "2-digit",
    timeZone: DEFAULT_TIME_ZONE,
  });
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
    timeZone: DEFAULT_TIME_ZONE,
  });

  const end = parseDate(fin);
  if (!end) return startFormatted.toUpperCase();

  const endFormatted = end.toLocaleDateString(DEFAULT_LOCALE, {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: DEFAULT_TIME_ZONE,
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
      timeZone: DEFAULT_TIME_ZONE,
    })}`;
  }

  const end = parseDate(fechaFin);
  if (!end) {
    return `el ${start.toLocaleDateString(DEFAULT_LOCALE, {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: DEFAULT_TIME_ZONE,
    })}`;
  }

  const sameMonth =
    start.toLocaleDateString(DEFAULT_LOCALE, {
      month: "2-digit",
      year: "numeric",
      timeZone: DEFAULT_TIME_ZONE,
    }) ===
    end.toLocaleDateString(DEFAULT_LOCALE, {
      month: "2-digit",
      year: "numeric",
      timeZone: DEFAULT_TIME_ZONE,
    });

  if (sameMonth) {
    return `del ${start.toLocaleDateString(DEFAULT_LOCALE, {
      day: "numeric",
      timeZone: DEFAULT_TIME_ZONE,
    })} al ${end.toLocaleDateString(DEFAULT_LOCALE, {
      day: "numeric",
      timeZone: DEFAULT_TIME_ZONE,
    })} de ${start.toLocaleDateString(DEFAULT_LOCALE, {
      month: "long",
      year: "numeric",
      timeZone: DEFAULT_TIME_ZONE,
    })}`;
  }

  return `del ${start.toLocaleDateString(DEFAULT_LOCALE, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: DEFAULT_TIME_ZONE,
  })} al ${end.toLocaleDateString(DEFAULT_LOCALE, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: DEFAULT_TIME_ZONE,
  })}`;
}

export function formatCurrentLongDate(): string {
  return new Date().toLocaleDateString(DEFAULT_LOCALE, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: DEFAULT_TIME_ZONE,
  });
}

export function formatMonth(month: number): string {
  return MONTHS[month - 1] || `Mes ${month}`;
}
