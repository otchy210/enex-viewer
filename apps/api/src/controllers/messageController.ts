import { getMessagePayload } from '../services/messageService.js';

import type { Request, Response } from 'express';

export const messageController = (_req: Request, res: Response): void => {
  res.json(getMessagePayload());
};
