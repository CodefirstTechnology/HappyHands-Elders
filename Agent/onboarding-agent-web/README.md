# ElderCare Coordinator Portal

React + Vite web app for **coordinators and admins** to onboard caregivers, verify documents, manage service zones, and oversee bookings.

**Folder:** `Agent/onboarding-agent-web/`  
**Package name:** `eldercare-coordinator-portal`

## Features

- Multi-step caregiver onboarding with elder-care certifications (emergency response, dementia care, fall care)
- Aadhaar verification, bank details, service zones
- Admin dashboard: family clients, caregivers, bookings, skills
- Coordinator pipeline for app self-registrations

## Setup

```bash
cd Agent/onboarding-agent-web
cp .env.example .env   # VITE_API_BASE_URL=http://localhost:5000/api/v1
npm install
npm run dev            # http://localhost:5173
```

## Default login (after seed)

- Coordinator: `coordinator@eldercare.com` / `ElderCare@123`
- Admin: `admin@eldercare.com` / `ElderCare@123`

## Branding

Portal title: **ElderCare Coordinator Portal**. UI labels use **Family Client** instead of Parent and **ElderCare** instead of ChildCare.

## Key paths

| Area | Path |
|------|------|
| Onboard caregiver | `src/pages/OnboardServant.jsx` |
| Caregiver detail | `src/pages/ServantDetail.jsx` |
| Admin users | `src/pages/admin/AdminUsers.jsx` |
| Layout / branding | `src/components/DashboardLayout.jsx` |
