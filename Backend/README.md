# ElderCare Backend API

Node.js REST API for the HappyHands Elders platform. Handles authentication, caregiver onboarding, bookings, GPS tracking, Aadhaar KYC, notifications, and file uploads.

**Full monorepo docs:** [`../README.md`](../README.md)

---

## Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20+ |
| Framework | Express 5 |
| ORM | Prisma 5 + PostgreSQL 16 |
| Cache / queues | Redis 7 + BullMQ |
| Auth | JWT (access + refresh), bcrypt |
| Validation | Zod |
| Uploads | Multer → local `uploads/` directory |
| KYC | UIDAI Aadhaar offline XML (`xml-crypto`) |
| SMS | MSG91 / Twilio / log (dev) |

---

## Project layout

```
Backend/
├── prisma/
│   ├── schema.prisma          # Database models
│   ├── migrations/            # SQL migrations
│   ├── seed.js                # Admin, coordinator, skills
│   └── seed-servants.js       # Optional test caregivers
├── src/
│   ├── server.js              # Entry point
│   ├── app.js                 # Express app setup
│   ├── config/                # Prisma client
│   ├── controllers/           # Route handlers
│   ├── routes/                # Route definitions
│   ├── services/              # Business logic
│   ├── middleware/            # Auth, upload, validation
│   ├── validators/            # Zod schemas
│   └── utils/                 # JWT, logger, errors
├── certs/                     # UIDAI public certificates
├── uploads/                   # Runtime uploads (gitignored)
├── Dockerfile                 # Production container
└── .env.example               # Environment template
```

---

## Quick start

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Redis 7+

### Setup

```bash
cd Backend
cp .env.example .env
# Edit .env — at minimum: DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, REDIS_URL

npm install
npx prisma db push
npx prisma generate
node prisma/seed.js
npm run dev
```

| Endpoint | URL |
|----------|-----|
| Health | `GET http://localhost:5000/health` |
| API root | `GET http://localhost:5000/` |
| API base | `http://localhost:5000/api/v1` |

### Default seeded accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@eldercare.com` | `ElderCare@123` |
| Coordinator | `coordinator@eldercare.com` | `ElderCare@123` |

---

## NPM scripts

```bash
npm run dev            # Development with nodemon
npm start              # Production mode
npm run seed           # Seed roles, admin, coordinator, skills
npm run seed:caregivers # Additional caregiver test data
```

---

## Environment variables

Copy `.env.example` → `.env`. **Never commit `.env`.**

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Min 32 characters |
| `JWT_REFRESH_SECRET` | Yes | Min 32 characters |
| `REDIS_URL` | Yes | e.g. `redis://localhost:6379` |
| `PORT` | No | Default `5000` |
| `CLIENT_URL` | Dev | CORS origins (comma-separated) |
| `GOOGLE_MAPS_API_KEY` | Maps | Places, geocoding |
| `GOOGLE_MAP_ID` | Optional | Styled maps |
| `UPLOAD_DIR` | No | Default `uploads` |
| `SMS_PROVIDER` | OTP | `log` \| `msg91` \| `twilio` |
| `SMS_ALLOW_DEV_OTP` | Dev | `true` = OTP in API response when SMS is `log` |
| `REQUIRE_AADHAAR_VERIFICATION` | No | Default `true` |
| `CAREGIVER_COORDINATOR_RADIUS_KM` | No | Default `3` |
| `UIDAI_OFFLINE_CERT_PATH` | KYC | e.g. `certs/uidai_offline_publickey.cer` |
| `MSG91_AUTH_KEY` | Prod SMS | MSG91 API key |
| `FCM_SERVER_KEY` | Optional | Push notifications |
| `SMTP_*` | Optional | Password reset email |

---

## API overview

Base path: `/api/v1`

| Prefix | Purpose |
|--------|---------|
| `/auth` | Login, register, refresh, profile |
| `/caregivers` | Browse, profile, schedule |
| `/bookings` | Create, confirm, track, OTP, review |
| `/coordinator` | Onboard & verify caregivers |
| `/admin` | Platform administration |
| `/skills` | Skill catalog (public read) |
| `/time` | Clock in/out |
| `/zones` | Service zones |
| `/geo` | Places, geocoding, map preview |
| `/kyc` | Aadhaar XML verification |
| `/notifications` | In-app notifications |

Static uploads: `GET /uploads/<filename>`

Full route tables: [`../README.md#backend-api`](../README.md#backend-api)

---

## Database

```bash
npx prisma studio          # GUI browser
npx prisma migrate dev     # Create migration (dev)
npx prisma db push         # Apply schema without migration file
npx prisma generate        # Regenerate client after schema change
```

Schema: `prisma/schema.prisma`

Key models: `User`, `Caregiver`, `Parent`, `Coordinator`, `Booking`, `TimeEntry`, `Review`, `Zone`, `Skill`, `Notification`.

---

## Aadhaar KYC

1. Download UIDAI offline public certificate → `certs/` (see `certs/README.md`).
2. Set `UIDAI_OFFLINE_CERT_PATH` in `.env`.
3. Caregivers upload offline XML via mobile app or API `POST /kyc/aadhaar-xml`.
4. When `REQUIRE_AADHAAR_VERIFICATION=true`, unverified caregivers are hidden from parent browse.

---

## Docker (production)

Built by root `docker-compose.yml` as the `api` service.

```bash
# From repo root
cp .env.production.example .env
docker compose --env-file .env up -d --build api
docker compose --env-file .env exec api node prisma/seed.js
```

---

## Security notes

- Passwords hashed with bcrypt (12 rounds).
- Rate limiting via `express-rate-limit`.
- Helmet, CORS, XSS clean, HPP middleware enabled.
- JWT access tokens expire in 15 minutes; refresh tokens in 7 days.
- Real secrets only in `.env` (gitignored). Use `.env.example` as template.
