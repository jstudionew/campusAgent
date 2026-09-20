import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import routes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';
import { loadEnv } from './config/env.js';
import { pool } from './config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

loadEnv();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pickExistingDir = (candidates) => {
  for (const p of candidates) {
    try {
      if (p && fs.existsSync(p) && fs.statSync(p).isDirectory()) return p;
    } catch (_) {}
  }
  return null;
};

const resolveFrontendDistDir = () => {
  return pickExistingDir([
    path.resolve(process.cwd(), 'dist'),
    path.resolve(process.cwd(), '../dist'),
    path.resolve(__dirname, '..', '..', '..', 'dist'),
  ]);
};

// CORS
const allowed = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim().replace(/\/$/, ''))
  .filter(Boolean);

const corsOptions = {
  origin: (origin, cb) => {
    // Packaged Electron app loads via file:// where Origin can be 'null' or 'file://'
    if (!origin || origin === 'null' || origin.startsWith('file://')) {
      return cb(null, true);
    }
    const cleanOrigin = origin.replace(/\/$/, '');
    if (
      process.env.NODE_ENV !== 'production' ||
      allowed.length === 0 ||
      allowed.includes('*') ||
      allowed.includes(cleanOrigin) ||
      cleanOrigin.endsWith('.netlify.app')
    ) {
      return cb(null, true);
    }
    return cb(null, false);
  },
  credentials: true,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

const healthCheckHandler = async (req, res) => {
  let dbOk = false;
  try {
    const result = await Promise.race([
      pool.query('SELECT 1'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
    ]);
    if (result) dbOk = true;
  } catch (_) {
    dbOk = false;
  }
  return res.json({ status: 'ok', database: dbOk ? 'connected' : 'disconnected' });
};

app.get('/health', healthCheckHandler);
app.get('/api/health', healthCheckHandler);

// Mount API under /api to align with frontend VITE_API_URL default
app.use('/api', routes);

if (process.env.NODE_ENV === 'production') {
  const distDir = resolveFrontendDistDir();
  if (distDir) {
    const indexPath = path.join(distDir, 'index.html');

    app.use(express.static(distDir, { index: false, fallthrough: true }));

    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      if (path.extname(req.path)) return next();
      return res.sendFile(indexPath);
    });
  } else {
    try {
      console.warn('Frontend dist directory not found. Skipping static frontend serving.');
    } catch (_) {}
  }
}

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
