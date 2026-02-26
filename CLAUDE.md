# CLAUDE.md — AI Assistant Guide for gestion_tareas

## Project Overview

**gestion_tareas** (Task Management System) is a web application for managing team activities, participants, and notifications. It integrates with Google Workspace (Sheets, Calendar, Gmail) for data persistence and communication. The backend is composed of serverless Netlify Functions; the frontend is pure vanilla JavaScript.

---

## Architecture

```
/
├── public/                   # Frontend static files (served by Netlify)
│   ├── index.html            # Main app shell (requires authentication)
│   ├── login.html            # User selection / login page
│   ├── app.js                # Main application logic (tabs, modals, state)
│   ├── calendario.js         # Calendar view functionality
│   └── styles.css            # Global styles
│
├── netlify/functions/        # Serverless backend (Node.js, AWS Lambda-compatible)
│   ├── actividades-crear.js      # POST  — create activity
│   ├── actividades-listar.js     # GET   — list activities
│   ├── actividades-actualizar.js # PUT   — update activity
│   ├── personas-crear.js         # POST  — create person
│   ├── personas-listar.js        # GET   — list persons
│   ├── personas-actualizar.js    # PUT   — update person
│   └── personas-eliminar.js      # DELETE — delete person
│
├── src/                      # Shared backend services
│   ├── config/
│   │   └── google-config.js       # OAuth2 client setup
│   ├── services/
│   │   ├── sheets-service.js      # Google Sheets read/write
│   │   ├── calendar-service.js    # Google Calendar CRUD
│   │   └── gmail-service.js       # Gmail sending via API
│   └── utils/
│       └── email-templates.js     # HTML email templates
│
├── .env.example              # Required environment variable template
├── netlify.toml              # Netlify routing and build config
└── package.json              # Dependencies and scripts
```

---

## Technology Stack

| Layer       | Technology                                  |
|-------------|---------------------------------------------|
| Frontend    | Vanilla JavaScript (ES6+), HTML5, CSS3      |
| Backend     | Node.js — Netlify Functions (serverless)    |
| Database    | Google Sheets (via Sheets API v4)           |
| Calendar    | Google Calendar API                         |
| Email       | Gmail API                                   |
| Auth        | Google OAuth 2.0 (refresh token flow)       |
| Deployment  | Netlify (static + functions)                |

---

## Environment Setup

### Required Environment Variables

Copy `.env.example` to `.env` and fill in all values:

```bash
cp .env.example .env
```

| Variable                | Description                             |
|-------------------------|-----------------------------------------|
| `GOOGLE_CLIENT_ID`      | OAuth 2.0 Client ID from Google Cloud   |
| `GOOGLE_CLIENT_SECRET`  | OAuth 2.0 Client Secret                 |
| `GOOGLE_REDIRECT_URI`   | OAuth redirect URL (localhost for dev)  |
| `GOOGLE_SPREADSHEET_ID` | Google Sheets document ID               |
| `GOOGLE_CALENDAR_ID`    | Target Google Calendar ID               |
| `GOOGLE_REFRESH_TOKEN`  | Long-lived OAuth refresh token          |

### Obtaining the Google Refresh Token

```bash
npm run get-token
```

This opens an OAuth consent flow. Authorize the app for Sheets, Calendar, and Gmail scopes. The script outputs the refresh token to store in `.env`.

### Google Sheets Structure

The spreadsheet must have three sheets with these exact names:

**`Actividades`** (columns A–K):
- A: ID (`ACT_<timestamp>_<random>`)
- B: Title
- C: Start Date (`YYYY-MM-DD`)
- D: Start Time (`HH:MM`)
- E: Duration (minutes)
- F: Participants (comma-separated emails)
- G: Description
- H: Status (`Activa` / `Completada` / `Cancelada`)
- I: Google Calendar Event ID
- J: Created By (email)
- K: Creation Timestamp

**`Personas`** (columns A–E):
- A: Email
- B: Name
- C: Department
- D: Role/Position
- E: Active Status (`TRUE` / `FALSE`)

**`Log_Notificaciones`** (columns A–F):
- A: Timestamp
- B: Activity ID
- C: Recipient Email
- D: Notification Type
- E: Send Status
- F: Error Message

---

## Development Workflow

### Start Local Dev Server

```bash
npm install        # Install dependencies
npm run dev        # Start Netlify Dev (http://localhost:8888)
```

Netlify Dev emulates the serverless functions locally. The API is available at `http://localhost:8888/.netlify/functions/<function-name>`.

### Deploy to Production

```bash
npm run deploy     # Deploys to Netlify production
```

---

## API Reference

All endpoints are Netlify Functions under `/.netlify/functions/`. In production, the `netlify.toml` rewrites `/api/*` → `/.netlify/functions/:splat`.

### Activities

```
POST   /actividades-crear
Body:  { titulo, fecha_inicio, hora_inicio, duracion_min, participantes[], descripcion, creado_por }
→ Creates row in Sheets, event in Calendar, sends Gmail notifications

GET    /actividades-listar
→ Returns all activities from Sheets
Response: { success, data: Activity[], count }

PUT    /actividades-actualizar
Body:  { id, ...fields }
→ Updates Sheets row, updates Calendar event, notifies participants
```

### Persons

```
POST   /personas-crear
Body:  { email, nombre, departamento?, cargo?, activo? }

GET    /personas-listar
→ Returns all persons
Response: { success, data: Person[], count }

PUT    /personas-actualizar
Body:  { email, ...fields }

DELETE /personas-eliminar
Body:  { email }
```

All endpoints return `{ success: true/false, ... }` and include CORS headers (`Access-Control-Allow-Origin: *`).

---

## Frontend Architecture

### Authentication / Session

- Entry point is `/login.html`: fetches active persons and displays selection cards.
- Session is persisted to:
  - `localStorage` — if "Remember Me" is checked (survives browser close)
  - `sessionStorage` — otherwise (cleared on browser close)
- Auto-logout rules enforced in `app.js`:
  - 24 hours since login
  - 8 hours of inactivity (tracked via mousemove, click, keydown, scroll, touchstart)

### Application State (app.js)

Global state managed via plain variables:
- `actividades[]` — cached list of all activities
- `personas[]` — cached list of all persons
- `actividadSeleccionada` — currently selected activity for editing

State is refreshed from the API on tab switch and every 30 seconds (debounced). No framework or state library is used.

### UI Tabs

1. **Dashboard** — Activity cards with status filters
2. **Nueva Actividad** — Form to create a new activity
3. **Calendario** — Monthly calendar with event indicators
4. **Personas** — Contact management (create, edit, deactivate)

---

## Backend Services

### `src/services/sheets-service.js`

Singleton exported instance. Key methods:
- `crearActividad(data)` — Appends row, generates `ACT_<ts>_<rand>` ID
- `listarActividades()` — Reads all rows, maps columns to objects
- `actualizarActividad(id, updates)` — Finds row by ID, patches fields
- `actualizarEventoId(actividadId, eventId)` — Stores Calendar event ID back to Sheets
- `registrarNotificacion(log)` — Appends to `Log_Notificaciones`
- `obtenerPersonasActivas()` — Returns persons where column E = `TRUE`

### `src/services/calendar-service.js`

Singleton exported instance. Key details:
- Timezone: `Europe/Madrid`
- Reminders: email 60 min before, popup 15 min before
- `crearEvento(actividad)` — Creates event with attendees
- `actualizarEvento(eventId, actividad)` — Patches existing event
- `eliminarEvento(eventId)` — Deletes event (on cancellation)

### `src/services/gmail-service.js`

Singleton exported instance. Key details:
- Encodes messages in base64url (RFC 4648)
- Subject encoded as UTF-8 Base64 (`=?UTF-8?B?...?=`)
- `enviarNotificacion(to, subject, html)` — Sends single email
- Error logged but does not throw (fire-and-forget for notifications)

### `src/utils/email-templates.js`

Three exported functions:
- `crearEmailNuevaActividad(actividad, nombreDestinatario)` — Blue header
- `crearEmailModificacion(actividad, nombreDestinatario)` — Orange header
- `crearEmailCancelacion(actividad, nombreDestinatario)` — Red header

---

## Netlify Configuration (`netlify.toml`)

```toml
[build]
  publish = "public"
  functions = "netlify/functions"
  command = "echo 'Building...'"

[[redirects]]
  from = "/"
  to = "/login.html"
  status = 200

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

---

## Key Conventions

### Naming

- **Functions:** kebab-case matching the resource and action (`personas-listar.js`)
- **Services:** camelCase methods, Spanish names (this is a Spanish-language project)
- **IDs:** `ACT_<unix_timestamp>_<random_alphanumeric>` (generated in `sheets-service.js`)
- **Sheet names:** PascalCase Spanish (`Actividades`, `Personas`, `Log_Notificaciones`)

### Code Style

- No transpiler or bundler — code must run directly in Node.js (functions) or modern browsers (frontend)
- All backend files use CommonJS (`require` / `module.exports`)
- No TypeScript — plain `.js` throughout
- Spanish used for: variable names, function names, comments, UI strings, sheet names
- English used for: technical identifiers, library/API fields

### Error Handling

- Every Netlify Function wraps its logic in `try/catch`
- On error, return `{ statusCode: 500, body: JSON.stringify({ success: false, error: message }) }`
- Gmail errors are logged but intentionally swallowed (notifications are non-critical)
- Sheets/Calendar errors bubble up and fail the request

### CORS

All functions must include these headers in every response (including OPTIONS):

```js
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};
```

---

## Testing

There is currently no test infrastructure. When adding tests, the recommended stack is:
- **Framework:** Jest or Vitest
- **Test location:** `tests/` directory mirroring `src/` and `netlify/functions/`
- **Mocking:** Mock `googleapis` responses to avoid real API calls
- **Script:** Add `"test": "jest"` to `package.json`

---

## Known Issues / Areas for Improvement

| Issue | Location | Notes |
|-------|----------|-------|
| No input validation | All Netlify functions | Raw user input passed to Google APIs |
| CORS fully open | All Netlify functions | `*` origin — restrict in production |
| No pagination | `actividades-listar`, `personas-listar` | All records loaded at once |
| No test coverage | Entire codebase | Zero tests currently exist |
| Session stored in browser storage | `app.js`, `login.html` | Vulnerable to XSS |
| Calendar event titles not sanitized | `calendar-service.js` | Potential injection |
| `app.js` frontend not fully reviewed | `public/app.js` | Large file, confirm completeness |

---

## Common Tasks for AI Assistants

### Adding a new Netlify Function

1. Create `netlify/functions/<resource>-<action>.js`
2. Export a `handler(event, context)` function
3. Include CORS headers on all responses (including OPTIONS preflight)
4. Load environment variables via `process.env.*` (dotenv loaded by Netlify CLI in dev)
5. Use services from `src/services/` for Google API interactions

### Modifying the Google Sheets Schema

1. Update the relevant service in `src/services/sheets-service.js` (column index mapping)
2. Update the corresponding Netlify function to pass/return the new field
3. Update the frontend form/display in `public/app.js`
4. Manually add the column to the Google Sheets document

### Adding a New Email Template

1. Add a new exported function in `src/utils/email-templates.js`
2. Call it from `src/services/gmail-service.js`
3. Invoke the Gmail service in the relevant Netlify function after the data change

### Debugging API Issues

- Run `npm run dev` and check Netlify CLI output for function logs
- `personas-listar.js` has extensive `console.log` instrumentation as a reference pattern
- In production, check Netlify dashboard → Functions → logs
