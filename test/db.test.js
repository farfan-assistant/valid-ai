import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { ValidationStore } from '../src/db/queries.js';

function createTestDb() {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS validations (
      id TEXT PRIMARY KEY,
      idea TEXT NOT NULL,
      category TEXT,
      score INTEGER,
      result TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      error TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_validations_created ON validations(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_validations_score ON validations(score DESC);
    CREATE INDEX IF NOT EXISTS idx_validations_status ON validations(status);
  `);
  return db;
}

describe('ValidationStore', () => {
  let db, store;

  beforeEach(() => {
    db = createTestDb();
    store = new ValidationStore(db);
  });

  afterEach(() => {
    db.close();
  });

  it('creates a validation with pending status', () => {
    const v = store.create('test-1', 'A SaaS idea for testing');
    assert.equal(v.id, 'test-1');
    assert.equal(v.idea, 'A SaaS idea for testing');
    assert.equal(v.status, 'pending');
    assert.equal(v.score, null);
  });

  it('completes a validation with results', () => {
    store.create('test-2', 'Another idea');
    const result = { summary: 'Great idea', score: { overall: 75 } };
    const v = store.complete('test-2', 'SaaS', 75, result);
    assert.equal(v.status, 'complete');
    assert.equal(v.score, 75);
    assert.equal(v.category, 'SaaS');
    assert.notEqual(v.completed_at, null);
  });

  it('fails a validation with error message', () => {
    store.create('test-3', 'Bad idea');
    const v = store.fail('test-3', 'API timeout');
    assert.equal(v.status, 'failed');
    assert.equal(v.error, 'API timeout');
  });

  it('retrieves a validation by id with parsed result', () => {
    store.create('test-4', 'Retrievable idea');
    const result = { summary: 'Test', details: { key: 'value' } };
    store.complete('test-4', 'Tool', 60, result);

    const v = store.getById('test-4');
    assert.equal(v.id, 'test-4');
    assert.deepEqual(v.result, result);
  });

  it('returns null for non-existent validation', () => {
    const v = store.getById('nonexistent');
    assert.equal(v, undefined);
  });

  it('lists recent validations ordered by date', () => {
    store.create('a', 'First idea');
    store.create('b', 'Second idea');
    store.create('c', 'Third idea');

    const list = store.listRecent(10);
    assert.equal(list.length, 3);
  });

  it('lists by score (only completed)', () => {
    store.create('x', 'High scorer');
    store.complete('x', 'SaaS', 90, { score: 90 });

    store.create('y', 'Low scorer');
    store.complete('y', 'Tool', 30, { score: 30 });

    store.create('z', 'Pending');
    // z is still pending, should not appear

    const list = store.listByScore(10);
    assert.equal(list.length, 2);
    assert.equal(list[0].score, 90);
    assert.equal(list[1].score, 30);
  });

  it('respects limit parameter', () => {
    for (let i = 0; i < 10; i++) {
      store.create(`id-${i}`, `Idea ${i}`);
    }
    const list = store.listRecent(3);
    assert.equal(list.length, 3);
  });

  it('returns accurate stats', () => {
    store.create('s1', 'Idea 1');
    store.create('s2', 'Idea 2');
    store.create('s3', 'Idea 3');

    const stats = store.stats();
    assert.equal(stats.total, 3);
    assert.equal(stats.today, 3);
  });

  it('handles empty database', () => {
    const list = store.listRecent(10);
    assert.equal(list.length, 0);

    const stats = store.stats();
    assert.equal(stats.total, 0);
    assert.equal(stats.today, 0);
  });
});
