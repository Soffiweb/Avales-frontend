type CurrencyOptions = {
  currency?: string;
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  fallback?: string;
};

type DecimalOptions = {
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  fallback?: string;
};

export function formatNumber(value?: number | null): string {
  if (value === null || value === undefined) return "-";
  return value.toLocaleString("es-EC");
}

export function formatCurrency(
  value?: number | null,
  {
    currency = "USD",
    locale = "es-EC",
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    fallback = "-",
  }: CurrencyOptions = {},
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return fallback;
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
}

export function formatCurrencyFromString(
  value?: string | null,
  options?: CurrencyOptions,
): string {
  const parsed = Number.parseFloat(value ?? "");
  if (Number.isNaN(parsed)) return options?.fallback ?? "-";
  return formatCurrency(parsed, options);
}

export function formatDecimal(
  value?: number | null,
  {
    locale = "en-US",
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    fallback = "-",
  }: DecimalOptions = {},
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return fallback;
  }

  return value.toLocaleString(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  });
}

export function formatCompactCurrency(value: number): string {
  return Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumSignificantDigits: 3,
    notation: "compact",
  }).format(value);
}

export function formatCompactNumber(value: number): string {
  return Intl.NumberFormat("en-US", {
    maximumSignificantDigits: 3,
    notation: "compact",
  }).format(value);
}
