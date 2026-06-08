const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = null;
  }

  init() {
    return new Promise((resolve, reject) => {
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) reject(err);
        else {
          this.setupSchema()
            .then(() => this.migrate())
            .then(resolve)
            .catch(reject);
        }
      });
    });
  }

  setupSchema() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run(`
          CREATE TABLE IF NOT EXISTS bookings (
            id TEXT PRIMARY KEY,
            first_name_encrypted TEXT NOT NULL,
            last_name_encrypted TEXT NOT NULL,
            email_encrypted TEXT NOT NULL,
            phone_encrypted TEXT NOT NULL,
            vehicle TEXT NOT NULL,
            address_encrypted TEXT NOT NULL,
            service TEXT NOT NULL,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            notes TEXT,
            status TEXT DEFAULT 'pending',
            consent_at DATETIME,
            dropoff_address_encrypted TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        this.db.run(`CREATE INDEX IF NOT EXISTS idx_booking_date ON bookings(date)`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_booking_status ON bookings(status)`);

        this.db.run(`
          CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action TEXT NOT NULL,
            booking_id TEXT,
            admin_ip TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  async migrate() {
    const columns = await this.all('PRAGMA table_info(bookings)');
    const colNames = columns.map((c) => c.name);

    if (!colNames.includes('consent_at')) {
      await this.run('ALTER TABLE bookings ADD COLUMN consent_at DATETIME');
    }
    if (!colNames.includes('dropoff_address_encrypted')) {
      await this.run('ALTER TABLE bookings ADD COLUMN dropoff_address_encrypted TEXT');
    }

    await this.run(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_slot
      ON bookings(date, time) WHERE status != 'cancelled'
    `);
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

module.exports = Database;
