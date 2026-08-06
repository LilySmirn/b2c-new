export const normalizeMkbCode = (code: string) => code.trim().toUpperCase();

export const isMkbCodeAllowed = (code: string, allowedCodes: string[] | null) => {
  if (allowedCodes === null) return true;

  const normalizedCode = normalizeMkbCode(code);

  return allowedCodes.some((allowedCode) => {
    const normalizedAllowedCode = normalizeMkbCode(allowedCode);

    return normalizedCode === normalizedAllowedCode ||
      normalizedCode.startsWith(`${normalizedAllowedCode}.`);
  });
};