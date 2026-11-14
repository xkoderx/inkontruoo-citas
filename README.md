# Inkontruoo Citas

Sistema sencillo para reservar citas en **Inkontruoo Tattoo Studio** (el estudio
de Erick Michel Deloera): el cliente llena un formulario con su idea, elige
fecha y horario, y el estudio confirma o cancela cada cita desde un panel de
administrador con inicio de sesión.

Es un proyecto de portafolio: demuestra una aplicación completa con **React +
Node/Express + SQLite + JWT + API REST**, con base de datos, autenticación,
validación en frontend y backend, y control de horarios ocupados.

El sitio del estudio vive aparte, en https://xkoderx.github.io/inkontruoo/.

## Qué demuestra

- **Frontend (React + Vite):** formulario de reserva con horarios cargados de
  la API, estados de carga y error, y panel de administrador.
- **Backend (Node + Express):** API REST en JSON con validación, códigos de
  estado correctos y control de doble reserva.
- **Base de datos (SQLite):** citas, estudios y administradores; un horario
  solo puede tener una cita activa (índice único parcial).
- **Autenticación (JWT + bcrypt):** login del administrador, token de 8 horas
  y rutas protegidas.
- **Configuración en un solo archivo:** todo lo específico del estudio
  (nombre, horarios, estilos) vive en `server/config.js`, así el día de mañana
  puede crecer a varios estudios sin reescribir la aplicación.

## Cómo levantarlo en local

Necesitas [Node.js](https://nodejs.org) 20 o más.

```sh
npm run install:all   # instala dependencias de la raíz, server y client
cp server/.env.example server/.env   # edita la contraseña del admin si quieres
npm run seed          # crea 2 citas de ejemplo (opcional)
npm run dev           # levanta la API (puerto 3001) y el cliente (puerto 5173)
```

Abre http://localhost:5173: el formulario de reserva. El panel de administrador
está en la pestaña "Administrador" (usuario y contraseña de tu `server/.env`).

Para correr cada parte por separado:

```sh
npm --prefix server run dev    # API en http://localhost:3001
npm --prefix client run dev    # web en http://localhost:5173
```

El cliente de producción se construye con `npm run build` (genera `client/dist/`).

## Si el servidor no arranca: error "Could not locate the bindings file"

El backend usa `better-sqlite3`, un módulo nativo que descarga su archivo
compilado (`.node`) con su script de instalación. Si npm tiene bloqueados los
scripts de instalación, ese archivo nunca se descarga y al arrancar el servidor
sale `Error: Could not locate the bindings file`.

Para permitir solo ese script, en la carpeta del proyecto:

```sh
npm install-scripts approve better-sqlite3
```

Luego vuelve a instalar las dependencias del servidor y arráncalo:

```sh
npm --prefix server install
npm --prefix server run dev
```

Se recomienda Node 22 o más nuevo: esas versiones ya traen el archivo
compilado listo para descargar. Con Node 20, aunque se apruebe el script, no
hay archivo listo y habría que compilarlo con herramientas de C++.

## Endpoints de la API

| Método | Ruta | Qué hace |
| ------ | ---- | -------- |
| GET | `/api/health` | Estado de la API |
| GET | `/api/config` | Datos públicos del estudio (estilos, horarios) |
| GET | `/api/slots?date=YYYY-MM-DD` | Horarios de un día y cuáles están libres |
| POST | `/api/appointments` | Crea una cita (público) |
| POST | `/api/auth/login` | Login del administrador, devuelve un JWT |
| GET | `/api/appointments` | Lista las citas (admin) |
| PATCH | `/api/appointments/:id` | Cambia el estado: `pendiente`, `confirmada`, `cancelada` (admin) |

Reglas de las citas: no se aceptan fechas pasadas ni días en los que el estudio
no abre; un horario ocupado no se puede volver a reservar (la API responde
`409`); una cita cancelada libera su horario.

## Cómo cambiar los horarios

Los horarios son **de ejemplo** (martes a sábado, 11:00–19:00, citas de 1 hora).
Patron debe confirmar los horarios reales del estudio. Para cambiarlos, edita
solo `server/config.js`: `openDays` (0 = domingo … 6 = sábado), `openTime`,
`closeTime`, `slotMinutes` y `styles`.

## Qué sigue

- **Despliegue:** el frontend es una app Vite y se puede publicar en GitHub
  Pages; la API necesita un host con Node (por ejemplo, el plan gratuito de
  Render) y la URL pública de la API se pone en `VITE_API_URL` al construir el
  cliente.
- **Dirección SaaS:** el modelo de datos ya tiene una tabla `studios` y cada
  cita y cada administrador pertenecen a un estudio, para que en el futuro el
  sistema pueda ofrecerse a otros tatuadores sin reescribirlo. Eso todavía no
  está construido: hoy funciona con un solo estudio.
- **Mejoras posibles:** subir foto de referencia, confirmación por WhatsApp,
  recordatorios y cancelación de citas por parte del cliente.

## Licencia

Proyecto de portafolio de Erick Michel Deloera (Inkontruoo Tattoo Studio).
