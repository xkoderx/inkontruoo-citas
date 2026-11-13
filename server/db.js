const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const config = require('./config');

// La base de datos es un archivo SQLite. Por defecto vive en
// server/data/citas.db (se ignora en git). Se puede cambiar con DB_PATH.
const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'citas.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Estudios: hoy hay uno (Inkontruoo). La tabla existe para que el modelo
// no asuma un único estudio de forma irreversible si el proyecto crece
// a varios estudios (SaaS).
db.exec(`
  CREATE TABLE IF NOT EXISTS studios (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    studio_id INTEGER NOT NULL REFERENCES studios(id),
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    client_email TEXT,
    style TEXT NOT NULL,
    description TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendiente'
      CHECK (status IN ('pendiente', 'confirmada', 'cancelada')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Un horario solo puede tener una cita activa (pendiente o confirmada).
  -- Una cita cancelada libera el horario para volver a reservarlo.
  CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_slot_active
    ON appointments (studio_id, date, time)
    WHERE status IN ('pendiente', 'confirmada');

  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    studio_id INTEGER NOT NULL REFERENCES studios(id),
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// El estudio de la configuración siempre existe en la tabla.
db.prepare('INSERT OR IGNORE INTO studios (id, name, slug) VALUES (?, ?, ?)').run(
  config.studio.id,
  config.studio.name,
  config.studio.slug
);

// Crea el administrador desde las variables de entorno si aún no existe.
// La contraseña nunca se guarda en texto plano: solo su hash bcrypt.
// Variables: ADMIN_USER y ADMIN_PASSWORD (ver .env.example).
function ensureAdmin() {
  const existing = db.prepare('SELECT id FROM admins WHERE username = ?').get(
    process.env.ADMIN_USER || 'admin'
  );
  if (existing) return false;
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    console.warn(
      'AVISO: no hay ADMIN_PASSWORD en el entorno; no se creó ningún administrador.'
    );
    return false;
  }
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(
    'INSERT INTO admins (studio_id, username, password_hash) VALUES (?, ?, ?)'
  ).run(config.studio.id, process.env.ADMIN_USER || 'admin', hash);
  return true;
}

module.exports = { db, ensureAdmin };
