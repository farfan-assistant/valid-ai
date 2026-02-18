import 'dotenv/config';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { getDb } from './db/schema.js';
import { ValidationStore } from './db/queries.js';
import { IdeaValidator } from './ai/validator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Config
const PORT = process.env.PORT || 3400;
const DB_PATH = process.env.DATABASE_PATH || './data/valid.db';
const API_KEY = process.env.OPENAI_API_KEY;
const BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

if (!API_KEY) {
  console.error('ERROR: OPENAI_API_KEY is required. Set it in .env or environment.');
  process.exit(1);
}

// Initialize
const db = getDb(DB_PATH);
const store = new ValidationStore(db);
const validator = new IdeaValidator({ apiKey: API_KEY, baseUrl: BASE_URL, model: MODEL });

const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, 'web')));

// -------------------------------------------------------------------
// API Routes
// -------------------------------------------------------------------

// POST /api/validate — Submit an idea for validation
app.post('/api/validate', async (req, res) => {
  const { idea } = req.body;

  if (!idea || typeof idea !== 'string' || idea.trim().length < 10) {
    return res.status(400).json({
      error: 'Please provide an idea description (at least 10 characters).',
    });
  }

  const trimmed = idea.trim();
  if (trimmed.length > 5000) {
    return res.status(400).json({
      error: 'Idea description too long (max 5000 characters).',
    });
  }

  const id = uuidv4();
  store.create(id, trimmed);

  // Run validation async — respond immediately with the ID
  res.status(202).json({ id, status: 'processing' });

  // Process in background
  try {
    const result = await validator.validate(trimmed);
    store.complete(id, result.category, result.score.overall, result);
    console.log(`✅ Validation complete: ${id} — Score: ${result.score.overall}/100`);
  } catch (err) {
    store.fail(id, err.message);
    console.error(`❌ Validation failed: ${id} — ${err.message}`);
  }
});

// POST /api/validate/sync — Submit and wait for result
app.post('/api/validate/sync', async (req, res) => {
  const { idea } = req.body;

  if (!idea || typeof idea !== 'string' || idea.trim().length < 10) {
    return res.status(400).json({
      error: 'Please provide an idea description (at least 10 characters).',
    });
  }

  const trimmed = idea.trim();
  if (trimmed.length > 5000) {
    return res.status(400).json({
      error: 'Idea description too long (max 5000 characters).',
    });
  }

  const id = uuidv4();
  store.create(id, trimmed);

  try {
    const result = await validator.validate(trimmed);
    const record = store.complete(id, result.category, result.score.overall, result);
    record.result = result;
    console.log(`✅ Validation complete: ${id} — Score: ${result.score.overall}/100`);
    res.json(record);
  } catch (err) {
    store.fail(id, err.message);
    console.error(`❌ Validation failed: ${id} — ${err.message}`);
    res.status(500).json({ id, status: 'failed', error: err.message });
  }
});

// GET /api/validations/:id — Get a specific validation
app.get('/api/validations/:id', (req, res) => {
  const record = store.getById(req.params.id);
  if (!record) return res.status(404).json({ error: 'Validation not found' });
  res.json(record);
});

// GET /api/validations — List recent validations
app.get('/api/validations', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const sort = req.query.sort === 'score' ? 'score' : 'recent';
  const list = sort === 'score' ? store.listByScore(limit) : store.listRecent(limit);
  res.json({ validations: list, ...store.stats() });
});

// GET /api/stats — Quick stats
app.get('/api/stats', (req, res) => {
  res.json(store.stats());
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', model: MODEL });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'web', 'index.html'));
});

// -------------------------------------------------------------------
// Start
// -------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`\n🚀 Valid.ai running at http://localhost:${PORT}`);
  console.log(`   Model: ${MODEL}`);
  console.log(`   Database: ${DB_PATH}\n`);
});

export { app, store };
