// Marcas diacríticas combinables Unicode (acentos, tildes, etc.)
const DIACRITIC_REGEX = /[̀-ͯ]/g;

/** Quita tildes, pasa a minúsculas y trim. "Estación" → "estacion". */
export function normalizeForSearch(text: string | null | undefined): string {
  if (typeof text !== "string") return "";
  return text.normalize("NFD").replace(DIACRITIC_REGEX, "").toLowerCase().trim();
}

/**
 * True si TODAS las palabras del término matchean en AL MENOS UNO de los campos.
 * Insensible a tildes, mayúsculas, orden y espacios extra.
 *
 * @example
 * matchesSearchTerm("luis riofrio", ["LUIS ALFREDO", "RIOFRIO GUILLIN"]) // true
 * matchesSearchTerm("riofrio luis", ["LUIS ALFREDO", "RIOFRIO GUILLIN"]) // true (cualquier orden)
 * matchesSearchTerm("luis pepe", ["LUIS ALFREDO", "RIOFRIO GUILLIN"])    // false
 */
export function matchesSearchTerm(
  search: string | null | undefined,
  fields: (string | null | undefined)[],
): boolean {
  const term = normalizeForSearch(search);
  if (!term) return true;
  const tokens = term.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const normalizedFields = fields.map((f) => normalizeForSearch(f));
  return tokens.every((token) =>
    normalizedFields.some((field) => field.includes(token)),
  );
}
