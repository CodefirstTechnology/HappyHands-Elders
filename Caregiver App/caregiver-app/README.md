# ChildCare Caregiver App

Expo mobile app for **caregivers** to view schedules, accept open area booking requests, track time, share live GPS location, verify Aadhaar KYC, and view earnings.

Part of the [HappyHands Elders](../../README.md) monorepo.

**Package name:** `childcare-caregiver-app`

> Folder is named `Servant/servant-app` for legacy reasons; the product role is **Caregiver**.

---

## Stack

| Layer | Technology |
|-------|------------|
| Framework | Expo SDK 54 |
| Navigation | expo-router 6 |
| UI | React Native 0.81, React 19 |
| State | TanStack Query + Zustand |
| HTTP | Axios |
| Maps | react-native-maps + Google Maps |
| i18n | i18next (EN / HI / MR) |
| Notifications | expo-notifications |
| Haptics | expo-haptics (pending request alerts) |
| Documents | expo-document-picker (Aadhaar ZIP) |
| Secure storage | expo-secure-store |

---

## Quick start

```bash
cd Servant/servant-app
cp .env.example .env
npm install
npx expo install
npm start
```

### Important: account must exist first

Caregivers **cannot use the app until a coordinator creates their account** in the coordinator portal and sets a login password. Share the email + password with the caregiver after onboarding.

Default password in coordinator form: `Caregiver@123` (unless changed).

### Environment (`.env`)

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
EXPO_PUBLIC_GOOGLE_MAP_ID=your_google_map_id
```

On a physical device, use your PC's LAN IP instead of `localhost`. Restart with `npx expo start -c` after changes.

---

## NPM scripts

```bash
npm start                        # Expo dev server
npm run android                  # Native Android (expo run:android)
npm run ios                      # Native iOS (expo run:ios)
npm run web                      # Web preview
npm run lint                     # ESLint
npm run eas:env:push             # Push .env to EAS preview
npm run eas:env:push:production  # Push .env to EAS production
npm run build:apk                # EAS Android APK (preview profile)
```

For maps on Android, use a **development build** (`npm run android`), not Expo Go.

---

## App screens

| Tab / Screen | Route | Description |
|--------------|-------|-------------|
| Home | `(main)/home` | Today's overview, open requests |
| Schedule | `(main)/schedule` | Upcoming and active bookings |
| Booking detail | `(main)/schedule/[id]` | Accept/reject, navigate, arrived, OTP |
| Time | `(main)/time` | Clock in/out for active booking |
| Time history | `(main)/time/history` | Past time entries |
| Earnings | `(main)/earnings` | Income summary |
| Profile | `(main)/profile` | Rates, availability, bank details |
| Zones | `(main)/zones` | Service area management |
| Notifications | `(main)/notifications` | Job alerts |
| Login | `(auth)/login` | Caregiver login |
| Register | `(auth)/register` | Optional self-registration (pending review) |

---

## Project layout

```
servant-app/
├── src/
│   ├── app/                 # expo-router screens
│   ├── components/          # UI, maps, WorkStartOtpPanel
│   ├── hooks/               # Notifications, location reporter, skills
│   ├── lib/                 # api.ts, earnings, geo, tokenStorage
│   ├── locales/             # en.json, hi.json, mr.json
│   ├── store/               # authStore, languageStore
│   └── theme/               # stitch.ts design tokens
├── assets/
├── app.config.js
├── app.json
├── eas.json
└── .env.example
```

---

## Key workflows

### Accept a booking

1. View request on **Home** or **Schedule**.
2. Open booking detail → **Confirm** or **Reject**.
3. On visit day → mark **Arrived at home**.
4. Enter **work-start OTP** (SMS sent to parent).
5. **Clock in** on Time tab → work → **Clock out**.
6. Booking marked **Completed** → parent can review.

### Open area requests

When a parent broadcasts an open request in your zones/skills:

- App polls for new requests.
- **Vibration + notification** when a match arrives.
- Race to accept before another caregiver confirms.

### Live location

During active bookings, GPS updates are pushed to the API so parents can track arrival and care session on their map.

### Aadhaar verification

Upload UIDAI offline e-KYC XML (ZIP) from profile. Required when backend has `REQUIRE_AADHAAR_VERIFICATION=true` for browse visibility.

---

## Maps setup

Same Google Maps key as backend and parent app. Enable **Maps SDK for Android/iOS** in Google Cloud Console.

Native build required for full map support:

```bash
npm run android
```

---

## Production release (EAS)

```bash
EXPO_PUBLIC_API_BASE_URL=https://api.yourdomain.com/api/v1
npm run eas:env:push:production
eas build -p android --profile production
```

Configure push notification credentials in Expo dashboard for booking alerts.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Invalid credentials on login | Account must be created in coordinator portal first |
| No open requests | Check zones/skills match; booking must be in your area |
| Maps not loading | Use dev build; verify Google Maps key |
| Not visible to parents | Status must be `VERIFIED`; check Aadhaar gate |

Full troubleshooting: [`../../README.md#troubleshooting`](../../README.md#troubleshooting)

---

## Security

**Never commit `.env`** with real API keys. Only `.env.example` belongs in git.

Login credentials are set by coordinators — do not share via unsecured channels.
