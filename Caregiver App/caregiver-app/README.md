# ElderCare Caregiver App

Expo mobile app for **caregivers** to view open booking requests, accept jobs, share live GPS, clock in/out, manage service zones, and update elder-care certifications.

**Folder:** `Caregiver App/caregiver-app/`  
**Package name:** `eldercare-caregiver-app`

## Features

- Coordinator-provisioned login (no self-signup by default)
- Schedule, time entries, and earnings views
- Profile certification toggles: emergency response, dementia care, fall care
- Service zone management with map
- Push notifications for open jobs and booking updates
- English, Hindi, and Marathi (i18next)

## Setup

```bash
cd "Caregiver App/caregiver-app"
cp .env.example .env
npm install && npx expo install
npm start
```

Set `EXPO_PUBLIC_API_BASE_URL` to your backend (LAN IP on a physical device).

## Key paths

| Area | Path |
|------|------|
| Profile & cert toggles | `src/app/(main)/profile/index.tsx` |
| Home / open requests | `src/app/(main)/home/index.tsx` |
| Locales | `src/locales/en.json`, `hi.json`, `mr.json` |

## Auth

Caregivers sign in with credentials set by a coordinator during onboarding. Role must be `CAREGIVER`.
