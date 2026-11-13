// Citas de ejemplo para la demostración.
// Las fechas se calculan a partir de hoy (los próximos 2 días abiertos),
// para que siempre aparezcan en el panel del administrador.
// Para borrarlas: DELETE FROM appointments; en la base de datos, o
// borra el archivo server/data/citas.db y vuelve a arrancar el servidor.
require('dotenv').config();
const config = require('./config');
const { db, ensureAdmin } = require('./db');

function nextOpenDays(count) {
  const days = [];
  const d = new Date();
  d.setDate(d.getDate() + 1); // desde mañana
  while (days.length < count) {
    const day = d.getDay();
    if (config.openDays.includes(day)) {
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push(date);
    }
    d.setDate(d.getDate() + 1);
  }
  return days;
}

ensureAdmin();

const count = db.prepare('SELECT COUNT(*) AS n FROM appointments').get().n;
if (count > 0) {
  console.log(`Ya hay ${count} cita(s); no se agregaron ejemplos.`);
  process.exit(0);
}

const [day1, day2] = nextOpenDays(2);
const insert = db.prepare(
  `INSERT INTO appointments
   (studio_id, client_name, client_phone, client_email, style, description, date, time, status)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

insert.run(
  config.studio.id,
  'Ejemplo: Ana López',
  '5512345678',
  'ana@ejemplo.com',
  'Fineline',
  'Ejemplo: una flor pequeña en la muñeca, trazo fino.',
  day1,
  config.openTime,
  'pendiente'
);
insert.run(
  config.studio.id,
  'Ejemplo: Carlos Ruiz',
  '5598765432',
  null,
  'Realismo',
  'Ejemplo: retrato de su perro en el antebrazo, en blanco y negro.',
  day2,
  config.openTime,
  'confirmada'
);

console.log('Se crearon 2 citas de ejemplo.');
