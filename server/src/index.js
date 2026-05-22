import cors from 'cors';
import express from 'express';
import dotenv from 'dotenv';
import { getPool } from './db.js';
import { authRouter } from './routes/auth.js';
import { cuentasRouter } from './routes/cuentas.js';
import { lugaresRouter } from './routes/lugares.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    await getPool();
    res.json({ ok: true, database: process.env.DB_DATABASE || 'EstacionaTEC' });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/cuentas', cuentasRouter);
app.use('/api/lugares', lugaresRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(port, () => {
  console.log(`API EstacionaTEC en http://localhost:${port}`);
});
