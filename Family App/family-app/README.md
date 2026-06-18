# ElderCare Family App

Expo mobile app for **family clients** to browse verified elder caregivers, create bookings, track live location during active care, verify work-start OTP, and leave reviews.

**Folder:** `Family App/family-app/`  
**Package name:** `eldercare-family-app`

## Features

- Self-registration (`POST /api/v1/auth/register-parent` — route unchanged)
- Browse caregivers with elder-age and certification filters (emergency response, dementia care, fall care)
- Profile: elders count, age range, mobility level, medical notes, home location
- Area broadcast booking requests with live GPS tracking
- Work-start OTP verification and post-visit reviews (including elder safety rating)
- English, Hindi, and Marathi (i18next)

## Setup

```bash
cd "Family App/family-app"
cp .env.example .env
npm install && npx expo install
npm start
```

Set `EXPO_PUBLIC_API_BASE_URL` to your backend (LAN IP on a physical device).

## Key paths

| Area | Path |
|------|------|
| Auth store | `src/store/authStore.ts` |
| Profile (elder details) | `src/app/(main)/profile/index.tsx` |
| Browse filters | `src/app/(main)/browse/index.tsx` |
| Locales | `src/locales/en.json`, `hi.json`, `mr.json` |

## Auth

Family clients self-register via the app (`POST /api/v1/auth/register-parent`). JWT access + refresh tokens stored in `expo-secure-store`. Role check accepts `FAMILY_CLIENT` or legacy `PARENT`.
