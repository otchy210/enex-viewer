import type { Request, Response } from 'express';

import { getHealthStatus } from '../services/healthService.js';

export const healthController = (_req: Request, res: Response) => {
  res.json(getHealthStatus());
};
