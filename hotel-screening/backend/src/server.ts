import express from 'express';
import cors from 'cors';
import { env } from './env.js';
import projects from './routes/projects.js';
import y1 from './routes/y1.js';
import { requireEmail } from './middleware/authEmail.js';
import projection from './routes/projection.js';
import benchmarkImport from './routes/benchmark_import.js';
import selector from './routes/selector.js';

const app = express();
app.use(express.json());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: false }));

// Simulación de auth: tomamos el email desde header
app.use(requireEmail);

// Rutas
app.use(projects);
app.use(y1);
app.use(projection);
app.use(benchmarkImport);
app.use(selector);

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(env.PORT, () => {
  console.log(`[API] listening on :${env.PORT}`);
});
