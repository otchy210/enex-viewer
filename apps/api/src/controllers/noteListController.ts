import { parseQueryIntegerValue, parseSingleQueryValue } from '../lib/httpQuery.js';
import { listNotes } from '../services/noteListService.js';

import type { Request, Response } from 'express';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export const noteListController = (req: Request, res: Response): void => {
  const importId = req.params.importId;
  if (!importId) {
    res.status(400).json({
      code: 'INVALID_IMPORT_ID',
      message: 'importId is required.'
    });
    return;
  }

  const qResult = parseSingleQueryValue(req.query.q, 'q must be a single string.');
  if (!qResult.ok) {
    res.status(400).json({
      code: 'INVALID_QUERY',
      message: qResult.message
    });
    return;
  }

  const limitResult = parseSingleQueryValue(req.query.limit, 'limit must be a single value.');
  if (!limitResult.ok) {
    res.status(400).json({
      code: 'INVALID_QUERY',
      message: limitResult.message
    });
    return;
  }

  const offsetResult = parseSingleQueryValue(req.query.offset, 'offset must be a single value.');
  if (!offsetResult.ok) {
    res.status(400).json({
      code: 'INVALID_QUERY',
      message: offsetResult.message
    });
    return;
  }

  const parsedLimit = parseQueryIntegerValue(limitResult.value, 'limit', {
    min: 1,
    max: MAX_LIMIT
  });
  if (!parsedLimit.ok) {
    res.status(400).json({
      code: 'INVALID_QUERY',
      message: parsedLimit.message
    });
    return;
  }

  const parsedOffset = parseQueryIntegerValue(offsetResult.value, 'offset', { min: 0 });
  if (!parsedOffset.ok) {
    res.status(400).json({
      code: 'INVALID_QUERY',
      message: parsedOffset.message
    });
    return;
  }

  const limit = limitResult.value === undefined ? DEFAULT_LIMIT : parsedLimit.value;
  const offset = offsetResult.value === undefined ? 0 : parsedOffset.value;

  const result = listNotes(importId, {
    q: qResult.value,
    limit,
    offset
  });

  if (!result) {
    res.status(404).json({
      code: 'IMPORT_NOT_FOUND',
      message: 'Import session not found.'
    });
    return;
  }

  res.json(result);
};
