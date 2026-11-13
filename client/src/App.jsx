import { useEffect, useState } from 'react';
import { api } from './api.js';
import BookingForm from './components/BookingForm.jsx';
import AdminPanel from './components/AdminPanel.jsx';

export default function App() {
  const [config, setConfig] = useState(null);
  const [error, setError] = useState('');
  const [view, setView] = useState('booking'); // 'booking' | 'admin'

  useEffect(() => {
    api
      .getConfig()
      .then(setConfig)
      .catch(() => setError('No se pudo conectar con el servidor de citas.'));
  }, []);

  return (
    <div className="page">
      <header className="site-header">
        <div className="brand">
          <span className="brand-name">Inkontruoo</span>
          <span className="brand-sub">Citas · Tattoo Studio</span>
        </div>
        <nav>
          <button
            className={view === 'booking' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setView('booking')}
          >
            Reservar cita
          </button>
          <button
            className={view === 'admin' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setView('admin')}
          >
            Administrador
          </button>
        </nav>
      </header>

      <main>
        {error && <p className="error center">{error}</p>}
        {!config && !error && <p className="muted center">Cargando...</p>}
        {config && view === 'booking' && <BookingForm config={config} />}
        {config && view === 'admin' && <AdminPanel onLogout={() => {}} />}
      </main>

      <footer className="site-footer">
        {config && (
          <>
            <a href={config.studio.instagram} target="_blank" rel="noreferrer">
              Instagram
            </a>
            {' · '}
            <a href={config.studio.whatsapp} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
            {' · '}
            <a href={`mailto:${config.studio.email}`}>{config.studio.email}</a>
          </>
        )}
        <div className="muted small">
          Inkontruoo Tattoo Studio — Arte que deja huella
        </div>
      </footer>
    </div>
  );
}
