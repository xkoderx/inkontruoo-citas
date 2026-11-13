// Configuración del estudio.
//
// ESTOS HORARIOS SON UN EJEMPLO. Patron debe confirmar los horarios reales
// del estudio. Para cambiarlos, edita solo este archivo: todo lo específico
// del estudio (nombre, horarios, estilos) vive aquí, no repartido por el
// código. Si el proyecto crece a varios estudios (SaaS), esta configuración
// pasará a guardarse por estudio en la base de datos.
const config = {
  studio: {
    id: 1,
    name: 'Inkontruoo',
    slug: 'inkontruoo',
    tagline: 'Tattoo Studio',
    instagram: 'https://instagram.com/inkontruoo',
    whatsapp: 'https://wa.me/525615151624',
    email: 'erickmichele@outlook.com',
  },

  // Días abiertos (0 = domingo, 1 = lunes, ..., 6 = sábado).
  // Ejemplo: martes a sábado.
  openDays: [2, 3, 4, 5, 6],

  // Horario de atención (ejemplo). Formato HH:MM, 24 horas.
  openTime: '11:00',
  closeTime: '19:00',

  // Duración de cada cita en minutos.
  slotMinutes: 60,

  // Estilos que ofrece el estudio.
  styles: ['Fineline', 'Geométrico', 'Realismo', 'Personalizado'],
};

module.exports = config;
