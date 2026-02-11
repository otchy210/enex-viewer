
import { parsePathParam } from '../lib/httpPath.js';
import { fetchNoteDetail } from '../services/noteDetailService.js';

import type { Request, Response } from 'express';

export const noteDetailController = (req: Request, res: Response) => {
  const importId = parsePathParam(req.params.importId) ?? '';
  const noteId = parsePathParam(req.params.noteId) ?? '';
  const result = fetchNoteDetail(importId, noteId);

  if (!result.ok) {
    return res.status(404).json({
      code: result.error.code,
      message: result.error.message
    });
  }

  return res.json(result.note);
};
