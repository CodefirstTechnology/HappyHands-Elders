# ChildCare Parent App

Expo mobile app for **parents** (house owners) to browse verified caregivers, create bookings, track live location during active care, verify work-start OTP, and leave reviews.

Part of the [HappyHands Elders](../../README.md) monorepo.

**Package name:** `childcare-parent-app`

---

## Stack

| Layer | Technology |
|-------|------------|
| Framework | Expo SDK 54 |
| Navigation | expo-router 6 (file-based) |
| UI | React Native 0.81, React 19 |
| State | TanStack Query + Zustand |
| HTTP | Axios |
| Maps | react-native-maps + Google Maps |
| i18n | i18next (English, Hindi, Marathi) |
| Secure storage | expo-secure-store (JWT tokens) |
| Location | expo-location |

---

## Quick start

```bash
cd "House Owner App/house-owner-app"
cp .env.example .env
npm install
npx expo install
npm start
```

Press **`a`** (Android emulator), **`i`** (iOS simulator), or scan QR with Expo Go / dev build.

### Environment (`.env`)

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
EXPO_PUBLIC_GOOGLE_MAP_ID=your_google_map_id
# EXPO_PUBLIC_USE_GOOGLE_MAP_ID=true
```

**Physical device:** replace `localhost` with your PC's LAN IP (`ipconfig` → IPv4). Phone and PC must be on the same Wi‑Fi.

After changing `.env`:

```bash
npx expo start -c
```

---

## NPM scripts

```bash
npm start                        # Expo dev server
npm run android                  # Open on Android emulator
npm run ios                      # Open on iOS simulator
npm run web                      # Web preview
npm run lint                     # ESLint
npm run eas:env:push             # Push .env to EAS preview
npm run eas:env:push:production  # Push .env to EAS production
npm run build:apk                # EAS Android APK (preview profile)
```

---

## App screens

| Tab / Screen | Route | Description |
|--------------|-------|-------------|
| Home | `(main)/home` | Dashboard, quick actions |
| Browse | `(main)/browse` | Search verified caregivers by skill |
| Caregiver detail | `(main)/browse/[id]` | Profile, rates, book |
| Bookings | `(main)/bookings` | Active and past bookings |
| New booking | `(main)/bookings/new` | Monthly contract or session slots |
| Open request | `(main)/bookings/request` | Broadcast to nearby caregivers |
| Booking detail | `(main)/bookings/[id]` | Status, live map, work-start OTP |
| Profile | `(main)/profile` | Account, home address, language |
| Notifications | `(main)/notifications` | In-app alerts |
| Login | `(auth)/login` | Sign in |
| Register | `(auth)/register` | Parent self-registration |

---

## Project layout

```
house-owner-app/
├── src/
│   ├── app/                 # expo-router screens
│   ├── components/          # UI components, maps, forms
│   ├── hooks/               # Data fetching hooks
│   ├── lib/                 # api.ts, geo, i18n, tokenStorage
│   ├── locales/             # en.json, hi.json, mr.json
│   ├── store/               # authStore, languageStore
│   └── theme/               # stitch.ts design tokens
├── assets/                  # Icons, splash, tab icons
├── app.config.js            # Expo config (reads .env)
├── app.json                 # Expo manifest
├── eas.json                 # EAS Build profiles
└── .env.example
```

---

## Authentication

Parents self-register via the app (`POST /api/v1/auth/register-parent`). JWT access + refresh tokens stored in `expo-secure-store`.

Login: email + password set during registration.

---

## Bookings

Two booking types:

| Type | Description |
|------|-------------|
| `MONTHLY` | Recurring childcare contract |
| `SESSION` | One-off time slots |

Two booking modes:

| Mode | Description |
|------|-------------|
| **Direct** | Pick a specific verified caregiver |
| **Open area** | Broadcast to caregivers in your area matching skill/zones |

During active care, view live caregiver GPS on the booking detail map. Work-start OTP is sent to your registered mobile — share with caregiver or verify in app.

---

## Maps setup

1. Create a Google Cloud project and enable **Maps SDK for Android/iOS**, **Places API**, **Geocoding API**.
2. Add the same key to this app's `.env` and `Backend/.env`.
3. Optionally create a **Map ID** for styled tiles.
4. Restrict the key by app bundle ID in production.

---

## Production release (EAS)

1. Configure `eas.json` and Expo project ID in `app.json`.
2. Set production API URL:

   ```bash
   EXPO_PUBLIC_API_BASE_URL=https://api.yourdomain.com/api/v1
   ```

3. Push env and build:

   ```bash
   npm run eas:env:push:production
   eas build -p android --profile production
   eas build -p ios --profile production
   ```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Can't reach API on phone | Use LAN IP in `.env`, same Wi‑Fi, firewall |
| Map tiles blank / 403 | Check Google Maps key + Map ID for mobile SDKs |
| No caregivers in browse | Backend needs verified caregivers; check Aadhaar gate setting |

Full troubleshooting: [`../../README.md#troubleshooting`](../../README.md#troubleshooting)

---

## Security

**Never commit `.env`** with real API keys. Only `.env.example` goes in git.
