export const parseQueryValue = (value: string | string[] | undefined): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return undefined;
  }
  return undefined;
};

export const parseInteger = (value: string | string[] | undefined): number | undefined => {
  const raw = parseQueryValue(value);
  if (raw === undefined) {
    return undefined;
  }
  if (!/^\d+$/.test(raw)) {
    return undefined;
  }
  return Number.parseInt(raw, 10);
};
