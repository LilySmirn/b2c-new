import type { MkbSearchResult } from "./types";

export const formatMkbResult = ({ code, name }: MkbSearchResult) =>
  `${code}: ${name}`;

export const getCodeFromMatch = (item: string) =>
  item.split(":")[0]?.trim() ?? item.trim();

export const extractNormalizedSearchCode = (search: string) => {
  const code = search.match(/^[A-ZА-Я]\d{2}(?:\.\d+)?/i)?.[0];
  return code ? code.toUpperCase() : null;
};

export const resolveSelectedCode = (
  query: string,
  apiMatches: MkbSearchResult[],
) => {
  const exactMatch = apiMatches.find(
    (item) => formatMkbResult(item) === query,
  );
  if (exactMatch) return exactMatch.code;

  const normalized = extractNormalizedSearchCode(query.trim());
  return normalized ? getCodeFromMatch(normalized) : null;
};

export const getDiagnosisTitle = (
  code: string,
  sourceText: string,
  apiMatches: MkbSearchResult[],
) => {
  const formattedMatch = sourceText.trim();
  if (
    getCodeFromMatch(formattedMatch).toUpperCase() === code.toUpperCase() &&
    formattedMatch.includes(":")
  ) {
    return formattedMatch;
  }

  const apiMatch = apiMatches.find(
    (item) => item.code.toUpperCase() === code.toUpperCase(),
  );

  return apiMatch ? formatMkbResult(apiMatch) : code;
};
