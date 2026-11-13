import { useEffect, useState } from 'react';
import { api } from '../api.js';

const STATUS_LABELS = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
};

export default function AdminPanel({ onLogout }) {
  const [token, setToken] = useState(() => localStorage.getItem('citas_token') || '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadAppointments(activeToken) {
    setLoading(true);
    try {
      const rows = await api.getAppointments(activeToken);
      setAppointments(rows);
      setError('');
    } catch (err) {
      setError(err.message);
      if (err.message.includes('Token')) handleLogout();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) loadAppointments(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function handleLogout() {
    localStorage.removeItem('citas_token');
    setToken('');
    setAppointments([]);
    onLogout();
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    try {
      const data = await api.login(username, password);
      localStorage.setItem('citas_token', data.token);
      setToken(data.token);
    } catch (err) {
      setError(err.message);
    }
  }

  async function changeStatus(id, status) {
    try {
      const updated = await api.updateStatus(id, status, token);
      setAppointments((rows) => rows.map((r) => (r.id === id ? updated : r)));
    } catch (err) {
      setError(err.message);
    }
  }

  if (!token) {
    return (
      <section className="card narrow">
        <h2>Panel del administrador</h2>
        <p className="muted">
          Inicia sesión para ver y gestionar las citas del estudio.
        </p>
        <form onSubmit={handleLogin}>
          <label>
            Usuario
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary" type="submit">
            Entrar
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="card wide">
      <div className="panel-header">
        <h2>Citas del estudio</h2>
        <button className="btn btn-secondary" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {loading && <p className="muted">Cargando citas...</p>}
      {!loading && appointments.length === 0 && (
        <p className="muted">No hay citas registradas todavía.</p>
      )}
      <ul className="appointments">
        {appointments.map((a) => (
          <li key={a.id} className={`appointment status-${a.status}`}>
            <div className="appointment-main">
              <strong>
                {a.date} · {a.time}
              </strong>{' '}
              — {a.client_name} ({a.client_phone})
              <span className="badge">{STATUS_LABELS[a.status]}</span>
              <div className="muted small">
                {a.style} · {a.description}
                {a.client_email ? ` · ${a.client_email}` : ''}
              </div>
            </div>
            <div className="appointment-actions">
              {a.status !== 'confirmada' && (
                <button
                  className="btn btn-small"
                  onClick={() => changeStatus(a.id, 'confirmada')}
                >
                  Confirmar
                </button>
              )}
              {a.status !== 'cancelada' && (
                <button
                  className="btn btn-small btn-danger"
                  onClick={() => changeStatus(a.id, 'cancelada')}
                >
                  Cancelar
                </button>
              )}
              {a.status === 'cancelada' && (
                <button
                  className="btn btn-small btn-secondary"
                  onClick={() => changeStatus(a.id, 'pendiente')}
                >
                  Volver a pendiente
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
