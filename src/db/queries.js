export class ValidationStore {
  constructor(db) {
    this.db = db;
    this._prepare();
  }

  _prepare() {
    this.stmts = {
      insert: this.db.prepare(`
        INSERT INTO validations (id, idea, status, created_at)
        VALUES (?, ?, 'pending', datetime('now'))
      `),

      complete: this.db.prepare(`
        UPDATE validations
        SET status = 'complete',
            category = ?,
            score = ?,
            result = ?,
            completed_at = datetime('now')
        WHERE id = ?
      `),

      fail: this.db.prepare(`
        UPDATE validations
        SET status = 'failed',
            error = ?,
            completed_at = datetime('now')
        WHERE id = ?
      `),

      getById: this.db.prepare(`
        SELECT * FROM validations WHERE id = ?
      `),

      listRecent: this.db.prepare(`
        SELECT id, idea, category, score, status, created_at, completed_at
        FROM validations
        ORDER BY created_at DESC
        LIMIT ?
      `),

      listByScore: this.db.prepare(`
        SELECT id, idea, category, score, status, created_at, completed_at
        FROM validations
        WHERE status = 'complete'
        ORDER BY score DESC
        LIMIT ?
      `),

      count: this.db.prepare(`
        SELECT COUNT(*) as total FROM validations
      `),

      countToday: this.db.prepare(`
        SELECT COUNT(*) as total FROM validations
        WHERE created_at >= date('now')
      `),
    };
  }

  create(id, idea) {
    this.stmts.insert.run(id, idea);
    return this.stmts.getById.get(id);
  }

  complete(id, category, score, result) {
    this.stmts.complete.run(category, score, JSON.stringify(result), id);
    return this.stmts.getById.get(id);
  }

  fail(id, error) {
    this.stmts.fail.run(error, id);
    return this.stmts.getById.get(id);
  }

  getById(id) {
    const row = this.stmts.getById.get(id);
    if (row && row.result) row.result = JSON.parse(row.result);
    return row;
  }

  listRecent(limit = 20) {
    return this.stmts.listRecent.all(limit);
  }

  listByScore(limit = 20) {
    return this.stmts.listByScore.all(limit);
  }

  stats() {
    return {
      total: this.stmts.count.get().total,
      today: this.stmts.countToday.get().total,
    };
  }
}
