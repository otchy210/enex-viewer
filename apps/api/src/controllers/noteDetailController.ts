import type { Request, Response } from 'express';

import { parseQueryValue } from '../lib/httpQuery.js';
import { fetchNoteDetail } from '../services/noteDetailService.js';

export const noteDetailController = (req: Request, res: Response) => {
  const importId = parseQueryValue(req.params.importId) ?? '';
  const noteId = parseQueryValue(req.params.noteId) ?? '';
  const result = fetchNoteDetail(importId, noteId);

  if (!result.ok) {
    return res.status(404).json({
      code: result.error.code,
      message: result.error.message
    });
  }

  return res.json(result.note);
};
