import cors from 'cors';
import express from 'express';

import { sendApiErrorResponse } from './lib/apiErrorResponse.js';
import routes from './routes/index.js';

export const createApp = (): express.Express => {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(routes);
  app.use(
    (error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error(error);
      if (res.headersSent) {
        return;
      }

      sendApiErrorResponse(res, 500, 'INTERNAL_SERVER_ERROR', 'Unexpected error.');
    }
  );

  return app;
};
