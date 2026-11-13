import { useEffect, useState } from 'react';
import { api } from '../api.js';

const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function BookingForm({ config }) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    style: config.styles[0],
    description: '',
    date: '',
    time: '',
  });
  const [slots, setSlots] = useState([]);
  const [dayInfo, setDayInfo] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);

  useEffect(() => {
    if (!form.date) {
      setSlots([]);
      setDayInfo(null);
      return;
    }
    setLoadingSlots(true);
    api
      .getSlots(form.date)
      .then((data) => {
        setDayInfo(data);
        setSlots(data.slots || []);
        setForm((f) => ({ ...f, time: '' }));
      })
      .catch(() => setError('No se pudieron cargar los horarios. Intenta de nuevo.'))
      .finally(() => setLoadingSlots(false));
  }, [form.date]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSending(true);
    try {
      const appointment = await api.createAppointment({
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        style: form.style,
        description: form.description,
        date: form.date,
        time: form.time,
      });
      setCreated(appointment);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  if (created) {
    return (
      <section className="card success">
        <h2>¡Cita registrada!</h2>
        <p>
          Gracias, <strong>{created.client_name}</strong>. Tu cita quedó
          pendiente de confirmación para el{' '}
          <strong>
            {created.date} a las {created.time}
          </strong>{' '}
          ({created.style}).
        </p>
        <p>
          El estudio te contactará por WhatsApp al {created.client_phone}{' '}
          para confirmarla. Si prefieres escribir directamente:{' '}
          <a href={config.studio.whatsapp} target="_blank" rel="noreferrer">
            WhatsApp del estudio
          </a>
          .
        </p>
        <button
          className="btn btn-secondary"
          onClick={() => {
            setCreated(null);
            setForm({
              name: '',
              phone: '',
              email: '',
              style: config.styles[0],
              description: '',
              date: '',
              time: '',
            });
          }}
        >
          Reservar otra cita
        </button>
      </section>
    );
  }

  const availableSlots = slots.filter((s) => s.available);

  return (
    <section className="card">
      <h2>Reserva tu cita</h2>
      <p className="muted">
        Llena el formulario y el estudio te confirmará por WhatsApp. Abrimos
        de martes a sábado, de {config.openTime} a {config.closeTime} (los
        horarios mostrados son de ejemplo hasta confirmar los reales).
      </p>
      <form onSubmit={handleSubmit}>
        <label>
          Nombre completo
          <input
            type="text"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            required
            minLength={2}
            maxLength={80}
            placeholder="Tu nombre"
          />
        </label>
        <label>
          Teléfono / WhatsApp
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            required
            placeholder="55 1234 5678"
          />
        </label>
        <label>
          Correo (opcional)
          <input
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            placeholder="tu@correo.com"
          />
        </label>
        <label>
          Estilo
          <select value={form.style} onChange={(e) => update('style', e.target.value)}>
            {config.styles.map((style) => (
              <option key={style} value={style}>
                {style}
              </option>
            ))}
          </select>
        </label>
        <label>
          Describe tu idea
          <textarea
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            required
            minLength={10}
            maxLength={500}
            rows={4}
            placeholder="Qué te quieres tatuar, en qué parte del cuerpo, tamaño aproximado..."
          />
        </label>
        <div className="row">
          <label>
            Fecha
            <input
              type="date"
              value={form.date}
              min={todayStr()}
              onChange={(e) => update('date', e.target.value)}
              required
            />
          </label>
          <label>
            Horario
            <select
              value={form.time}
              onChange={(e) => update('time', e.target.value)}
              required
              disabled={!form.date || loadingSlots || availableSlots.length === 0}
            >
              <option value="">Elige un horario</option>
              {availableSlots.map((s) => (
                <option key={s.time} value={s.time}>
                  {s.time}
                </option>
              ))}
            </select>
          </label>
        </div>
        {form.date && dayInfo && !dayInfo.open && (
          <p className="notice">
            {dayInfo.reason === 'past'
              ? 'Esa fecha ya pasó.'
              : 'El estudio no abre ese día. Prueba con otro día.'}
          </p>
        )}
        {form.date && dayInfo && dayInfo.open && availableSlots.length === 0 && (
          <p className="notice">No quedan horarios libres ese día. Prueba con otra fecha.</p>
        )}
        {form.date && dayInfo && dayInfo.open && slots.length > 0 && (
          <p className="muted small">
            Horarios ocupados ese día:{' '}
            {slots
              .filter((s) => !s.available)
              .map((s) => s.time)
              .join(', ') || 'ninguno'}
          </p>
        )}
        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={sending}>
          {sending ? 'Enviando...' : 'Reservar cita'}
        </button>
      </form>
    </section>
  );
}
