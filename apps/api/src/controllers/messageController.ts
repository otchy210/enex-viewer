import type { Request, Response } from 'express';

import { getMessagePayload } from '../services/messageService.js';

export const messageController = (_req: Request, res: Response) => {
  res.json(getMessagePayload());
};
