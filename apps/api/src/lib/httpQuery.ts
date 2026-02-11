import type { ParsedQs } from 'qs';

type QueryValue = string | ParsedQs | (string | ParsedQs)[] | undefined;

export type SingleValueResult =
  | { ok: true; value: string | undefined }
  | { ok: false; message: string };

export const parseSingleQueryValue = (value: QueryValue, message: string): SingleValueResult => {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }
  if (typeof value === 'string') {
    return { ok: true, value };
  }
  return { ok: false, message };
};

export type IntegerParseResult = { ok: true; value: number } | { ok: false; message: string };

export const parseQueryIntegerValue = (
  value: string | undefined,
  name: string,
  options: { min: number; max?: number }
): IntegerParseResult => {
  if (value === undefined) {
    return { ok: true, value: options.min };
  }
  const requirement = options.min === 0 ? 'a non-negative integer' : 'a positive integer';
  if (!/^\d+$/.test(value)) {
    return { ok: false, message: `${name} must be ${requirement}.` };
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return { ok: false, message: `${name} must be ${requirement}.` };
  }
  if (parsed < options.min) {
    return { ok: false, message: `${name} must be at least ${String(options.min)}.` };
  }
  if (options.max !== undefined && parsed > options.max) {
    return { ok: false, message: `${name} must be at most ${String(options.max)}.` };
  }
  return { ok: true, value: parsed };
};
