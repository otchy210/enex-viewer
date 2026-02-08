import cors from 'cors';
import express from 'express';

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/message', (_req, res) => {
  res.json({
    message: 'Hello from TypeScript REST API',
    timestamp: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
});
