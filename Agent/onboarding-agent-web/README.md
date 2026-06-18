# ChildCare Coordinator Portal

Web application for **coordinators** and **admins** to onboard caregivers, review self-registrations, verify profiles, set login passwords, and manage platform operations.

Part of the [HappyHands Elders](../README.md) monorepo.

---

## Stack

| Layer | Technology |
|-------|------------|
| UI | React 19 |
| Build | Vite 8 |
| Routing | React Router 7 |
| Server state | TanStack Query |
| Forms | React Hook Form + Zod |
| Styling | Tailwind CSS 4 |
| HTTP | Axios |

---

## Quick start

```bash
cd Agent/onboarding-agent-web
cp .env.example .env
npm install
npm run dev
```

Open **http://localhost:5173**

### Environment

```bash
# .env
VITE_API_BASE_URL=http://localhost:5000/api/v1
# VITE_API_HOST=http://localhost:5000   # optional — uploads origin override
```

The backend must be running (`Backend/` → `npm run dev`).

### Login credentials (after backend seed)

| Role | Email | Password |
|------|-------|----------|
| Coordinator | `coordinator@childcare.com` | `ChildCare@123` |
| Admin | `admin@childcare.com` | `ChildCare@123` |

---

## NPM scripts

```bash
npm run dev       # Development server (port 5173)
npm run build     # Production build → dist/
npm run preview   # Preview production build locally
npm run lint      # ESLint
```

---

## Routes & features

| Path | Access | Description |
|------|--------|-------------|
| `/login` | Public | Email/password login |
| `/` | Coordinator, Admin | Dashboard with stats |
| `/registrations` | Coordinator, Admin | Self-registered caregivers pending review |
| `/caregivers` | Coordinator, Admin | List onboarded caregivers |
| `/caregivers/new` | Coordinator, Admin | Onboard new caregiver (photo, ID, skills, rates, zones) |
| `/caregivers/:id` | Coordinator, Admin | Detail, verification, set password |
| `/caregivers/:id/edit` | Coordinator, Admin | Edit profile |
| `/profile` | Coordinator, Admin | Agency name, location, service radius |
| `/admin` | Admin only | Platform dashboard |
| `/admin/agents` | Admin | Create/edit coordinators |
| `/admin/users` | Admin | Enable/disable users |
| `/admin/bookings` | Admin | All bookings |
| `/admin/caregivers` | Admin | All caregivers |
| `/admin/skills` | Admin | Skill catalog CRUD |

### Key workflows

1. **Onboard caregiver** — `/caregivers/new` → upload photo + ID proof → set skills, rates, zones → save.
2. **Set login password** — on caregiver detail → share email + password with caregiver.
3. **Verify** — approve or reject; status becomes `VERIFIED` or `REJECTED`.
4. **Review self-registrations** — `/registrations` for app-registered caregivers.

---

## Project layout

```
Agent/onboarding-agent-web/
├── src/
│   ├── pages/              # Route pages (Dashboard, ServantList, admin/*)
│   ├── components/         # UI, forms, maps, modals
│   ├── context/            # AuthContext (JWT storage)
│   ├── hooks/              # useSkills, etc.
│   └── lib/                # api.js, geo, onboarding report PDF
├── public/                 # Static assets
├── Dockerfile              # nginx production image
├── nginx.conf              # SPA routing + caching
└── .env.example
```

---

## Production build

### Local build

```bash
VITE_API_BASE_URL=https://api.yourdomain.com/api/v1 npm run build
```

Output in `dist/` — static files served by any web server.

### Docker

Built by root `docker-compose.yml` as `coordinator-portal`:

```bash
# From repo root — set VITE_API_BASE_URL in .env
docker compose --env-file .env up -d --build coordinator-portal
```

Default bind: `127.0.0.1:15002` → reverse-proxy via host nginx.

---

## Uploads & media

Profile photos and ID proofs upload to the backend via multipart forms. Images display from the API origin:

```
{VITE_API_BASE_URL origin}/uploads/<filename>
```

If uploads fail to load, verify `VITE_API_BASE_URL` and that the API serves `/uploads` with CORS for the portal origin.

---

## Security

- JWT stored in browser `localStorage` (access + refresh).
- Protected routes require `COORDINATOR` or `ADMIN` role.
- Admin routes require `ADMIN` only.
- **Never commit `.env`** — only `.env.example` belongs in git.

Full env & secrets guide: [`../README.md#environment-variables--secrets`](../README.md#environment-variables--secrets)
