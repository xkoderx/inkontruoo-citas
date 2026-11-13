// Cliente HTTP de la API. En desarrollo, Vite redirige /api al servidor
// Express (ver vite.config.js). En producción, define VITE_API_URL con
// la URL pública de la API.
const API_BASE = import.meta.env.VITE_API_URL || '';

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Error de comunicación con el servidor.');
  }
  return data;
}

export const api = {
  getConfig: () => request('/api/config'),
  getSlots: (date) => request(`/api/slots?date=${date}`),
  createAppointment: (payload) =>
    request('/api/appointments', { method: 'POST', body: payload }),
  login: (username, password) =>
    request('/api/auth/login', { method: 'POST', body: { username, password } }),
  getAppointments: (token) => request('/api/appointments', { token }),
  updateStatus: (id, status, token) =>
    request(`/api/appointments/${id}`, {
      method: 'PATCH',
      body: { status },
      token,
    }),
};
