import cors from 'cors';
import express from 'express';

import routes from './routes/index.js';

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json());
app.use(routes);

app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
});
