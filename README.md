# Vehicle Service and Maintenance Logger

## Requirements

- Node.js 20 or newer
- MongoDB running locally, or an accessible MongoDB deployment

## Configure the backend

```powershell
Copy-Item server\.env.example server\.env
Copy-Item client\.env.example client\.env
```

Set `MONGODB_URI` in `server\.env` to your own MongoDB connection string. Never commit that file. Set `SESSION_SECRET` to a locally generated random value of at least 32 characters; for example, run `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` and copy the result into `server\.env` without sharing it. `PORT` defaults to `5000`. `CLIENT_ORIGIN` must contain the exact frontend origin (the example uses the Vite development origin). Set `TRUST_PROXY=1` only when the API is behind a trusted reverse proxy. `COOKIE_SAME_SITE` defaults to `lax`; set it to `none` only for a frontend and API on different sites, and only over HTTPS (the server forces Secure cookies for this setting). For a separately hosted frontend, set `VITE_API_BASE_URL` in the client build environment to the API base URL ending in `/api`, and set `CLIENT_ORIGIN` to the exact frontend origin.

## Install and run

Install dependencies from the project root and in each app folder:

```powershell
npm install
npm --prefix server install
npm --prefix client install
```

Start the API and Vite in two terminals:

```powershell
npm run dev:server
npm run dev:client
```

The API listens on `http://localhost:5000`; Vite proxies `/api` to it. The frontend runs at the URL Vite prints.

## Public and private pages

Home (`/`), About (`/about`), Contact (`/contact`), maintenance tips (`/maintenance`), Login (`/login`), and Register (`/register`) are public.

The dashboard, vehicles, service history, reminders, expenses, and settings require a signed-in account. Authentication uses bcrypt password hashes and MongoDB-backed sessions in HttpOnly cookies. Production cookies are Secure; state-changing requests require an allowed origin and a session-bound CSRF token. Configure `CLIENT_ORIGIN` exactly and use HTTPS in production.

## API and record ownership

- `GET /api/health` — API status and database connection state.
- `GET /api/db-status` — database status (`503` until connected).
- `GET /api/auth/csrf`, `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`.
- `POST /api/feedback` — validates and stores a public feedback message. No email is sent; there is intentionally no public feedback read endpoint.
- `/api/vehicles`, `/api/services`, `/api/reminders`, `/api/expenses` — authenticated `GET`, `POST`, `PUT /:id`, and `DELETE /:id`.

Every private query and mutation is scoped to the authenticated account on the server. The frontend never supplies an owner ID as authorization.

## Existing database and browser records

The existing Atlas database was inspected read-only before the schema changes. It contained `vehicles`, `services`, `reminders`, and `expenses`, with no user collection or owner indexes. Existing records have no owner, so they remain unchanged and are not returned to any account. Do not assign them automatically. Before making them available, take a backup and decide explicitly which account should own each existing record; then perform and verify a reviewed, additive ownership migration. The app no longer runs the old unauthenticated `/api/migrate` import.

Existing `localStorage` records are left in place but are no longer loaded into authenticated accounts or imported automatically. This prevents an account from claiming browser-wide records that have no verified owner. Review and assign them separately before any import.

The existing database has a globally unique vehicle-registration index. It is retained to avoid a destructive index change; registration numbers therefore remain unique across all accounts until a separately reviewed index migration is approved.

## Checks

```powershell
npm --prefix server test
npm run check:server
npm --prefix client run lint
npm run build
```
