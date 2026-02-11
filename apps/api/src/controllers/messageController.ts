import { getMessagePayload } from '../services/messageService.js';

import type { Request, Response } from 'express';


export const messageController = (_req: Request, res: Response) => {
  res.json(getMessagePayload());
};
