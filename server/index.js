require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('./config');
const { db, ensureAdmin } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'cambia-este-secreto-en-produccion';
const STUDIO_ID = config.studio.id;

app.use(cors());
app.use(express.json());

// ---------- Utilidades de horarios ----------

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function toHHMM(minutes) {
  const h = String(Math.floor(minutes / 60)).padStart(2, '0');
  const m = String(minutes % 60).padStart(2, '0');
  return `${h}:${m}`;
}

// Todos los horarios posibles de un día, según la configuración.
function allSlots() {
  const slots = [];
  let t = toMinutes(config.openTime);
  const end = toMinutes(config.closeTime);
  while (t + config.slotMinutes <= end) {
    slots.push(toHHMM(t));
    t += config.slotMinutes;
  }
  return slots;
}

function isOpenDay(dateStr) {
  // dateStr: YYYY-MM-DD. Se interpreta en hora local sin zona horaria.
  const [y, m, d] = dateStr.split('-').map(Number);
  const day = new Date(y, m - 1, d).getDay();
  return config.openDays.includes(day);
}

function isPastDate(dateStr) {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return dateStr < todayStr;
}

// ---------- Autenticación ----------

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Falta el token de acceso.' });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
}

// ---------- Rutas públicas ----------

app.get('/api/health', (req, res) => {
  res.json({ ok: true, studio: config.studio.slug });
});

// Información pública del estudio (nombre, estilos, horarios).
// El frontend la usa para dibujar el formulario.
app.get('/api/config', (req, res) => {
  res.json({
    studio: config.studio,
    openDays: config.openDays,
    openTime: config.openTime,
    closeTime: config.closeTime,
    slotMinutes: config.slotMinutes,
    styles: config.styles,
  });
});

// Horarios disponibles de un día: ?date=YYYY-MM-DD
app.get('/api/slots', (req, res) => {
  const { date } = req.query;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Falta el parámetro date (YYYY-MM-DD).' });
  }
  if (isPastDate(date)) {
    return res.json({ date, open: false, reason: 'past', slots: [] });
  }
  if (!isOpenDay(date)) {
    return res.json({ date, open: false, reason: 'closed', slots: [] });
  }
  const booked = db
    .prepare(
      `SELECT time FROM appointments
       WHERE studio_id = ? AND date = ? AND status IN ('pendiente', 'confirmada')`
    )
    .all(STUDIO_ID, date)
    .map((row) => row.time);
  const slots = allSlots().map((time) => ({
    time,
    available: !booked.includes(time),
  }));
  res.json({ date, open: true, slots });
});

// Crear una cita (público).
app.post('/api/appointments', (req, res) => {
  const { name, phone, email, style, description, date, time } = req.body || {};

  if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) {
    return res.status(400).json({ error: 'El nombre es obligatorio (2 a 80 caracteres).' });
  }
  if (!phone || typeof phone !== 'string' || !/^[+()\-.\s\d]{7,20}$/.test(phone.trim())) {
    return res.status(400).json({ error: 'El teléfono/WhatsApp es obligatorio y debe ser válido.' });
  }
  if (email && (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))) {
    return res.status(400).json({ error: 'El correo no tiene un formato válido.' });
  }
  if (!config.styles.includes(style)) {
    return res.status(400).json({ error: 'El estilo elegido no es válido.' });
  }
  if (!description || typeof description !== 'string' || description.trim().length < 10 || description.trim().length > 500) {
    return res.status(400).json({ error: 'Describe tu idea en 10 a 500 caracteres.' });
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || isPastDate(date)) {
    return res.status(400).json({ error: 'La fecha no es válida o ya pasó.' });
  }
  if (!isOpenDay(date)) {
    return res.status(400).json({ error: 'El estudio no abre ese día.' });
  }
  if (!time || !allSlots().includes(time)) {
    return res.status(400).json({ error: 'El horario elegido no es válido.' });
  }

  try {
    const result = db
      .prepare(
        `INSERT INTO appointments
         (studio_id, client_name, client_phone, client_email, style, description, date, time, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')`
      )
      .run(
        STUDIO_ID,
        name.trim(),
        phone.trim(),
        email ? email.trim() : null,
        style,
        description.trim(),
        date,
        time
      );
    const created = db
      .prepare('SELECT * FROM appointments WHERE id = ?')
      .get(result.lastInsertRowid);
    return res.status(201).json(created);
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Ese horario ya está ocupado. Elige otro.' });
    }
    console.error(err);
    return res.status(500).json({ error: 'No se pudo guardar la cita.' });
  }
});

// ---------- Autenticación del administrador ----------

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Faltan el usuario o la contraseña.' });
  }
  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
  }
  const token = jwt.sign(
    { sub: admin.id, username: admin.username, studio_id: admin.studio_id },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
  res.json({ token, username: admin.username });
});

// ---------- Rutas del administrador ----------

app.get('/api/appointments', authMiddleware, (req, res) => {
  const rows = db
    .prepare(
      `SELECT * FROM appointments WHERE studio_id = ?
       ORDER BY date ASC, time ASC`
    )
    .all(STUDIO_ID);
  res.json(rows);
});

app.patch('/api/appointments/:id', authMiddleware, (req, res) => {
  const { status } = req.body || {};
  if (!['pendiente', 'confirmada', 'cancelada'].includes(status)) {
    return res.status(400).json({ error: 'El estado no es válido.' });
  }
  const result = db
    .prepare('UPDATE appointments SET status = ? WHERE id = ? AND studio_id = ?')
    .run(status, req.params.id, STUDIO_ID);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'No existe una cita con ese id.' });
  }
  const updated = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// ---------- Arranque ----------

ensureAdmin();

app.listen(PORT, () => {
  console.log(`Inkontruoo Citas API en http://localhost:${PORT}`);
});
