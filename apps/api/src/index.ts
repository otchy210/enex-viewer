import cors from 'cors';
import express from 'express';

import routes from './routes/index.js';

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json());
app.use(routes);
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  if (res.headersSent) {
    return;
  }

  res.status(500).json({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Unexpected error.'
  });
});

app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
});
