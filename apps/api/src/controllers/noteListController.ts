import type { Request, Response } from 'express';

import { listNotes } from '../services/noteListService.js';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const parseQueryValue = (value: Request['query'][string]) => {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }
  if (typeof value === 'string') {
    return { ok: true, value };
  }
  return { ok: false, value: undefined };
};

const parseInteger = (
  value: string | undefined,
  name: string,
  options: { min: number; max?: number }
): { ok: true; value: number } | { ok: false; message: string } => {
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
    return { ok: false, message: `${name} must be at least ${options.min}.` };
  }
  if (options.max !== undefined && parsed > options.max) {
    return { ok: false, message: `${name} must be at most ${options.max}.` };
  }
  return { ok: true, value: parsed };
};

export const noteListController = (req: Request, res: Response) => {
  const importId = req.params.importId;
  if (!importId) {
    return res.status(400).json({
      code: 'INVALID_IMPORT_ID',
      message: 'importId is required.'
    });
  }

  const qResult = parseQueryValue(req.query.q);
  if (!qResult.ok) {
    return res.status(400).json({
      code: 'INVALID_QUERY',
      message: 'q must be a single string.'
    });
  }

  const limitResult = parseQueryValue(req.query.limit);
  if (!limitResult.ok) {
    return res.status(400).json({
      code: 'INVALID_QUERY',
      message: 'limit must be a single value.'
    });
  }

  const offsetResult = parseQueryValue(req.query.offset);
  if (!offsetResult.ok) {
    return res.status(400).json({
      code: 'INVALID_QUERY',
      message: 'offset must be a single value.'
    });
  }

  const parsedLimit = parseInteger(limitResult.value, 'limit', { min: 1, max: MAX_LIMIT });
  if (!parsedLimit.ok) {
    return res.status(400).json({
      code: 'INVALID_QUERY',
      message: parsedLimit.message
    });
  }

  const parsedOffset = parseInteger(offsetResult.value, 'offset', { min: 0 });
  if (!parsedOffset.ok) {
    return res.status(400).json({
      code: 'INVALID_QUERY',
      message: parsedOffset.message
    });
  }

  const limit = limitResult.value === undefined ? DEFAULT_LIMIT : parsedLimit.value;
  const offset = offsetResult.value === undefined ? 0 : parsedOffset.value;

  const result = listNotes(importId, {
    q: qResult.value,
    limit,
    offset
  });

  if (!result) {
    return res.status(404).json({
      code: 'IMPORT_NOT_FOUND',
      message: 'Import session not found.'
    });
  }

  return res.json(result);
};
