export const parseQueryValue = (value: string | string[] | undefined): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value[0];
  }
  return undefined;
};

export const parseInteger = (value: string | string[] | undefined): number | undefined => {
  const raw = parseQueryValue(value);
  if (raw === undefined) {
    return undefined;
  }
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    return undefined;
  }
  return parsed;
};
