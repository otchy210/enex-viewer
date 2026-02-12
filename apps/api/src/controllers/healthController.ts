import { getHealthStatus } from '../services/healthService.js';

import type { Request, Response } from 'express';


export const healthController = (_req: Request, res: Response): void => {
  res.json(getHealthStatus());
};
