import { readFileSync } from 'fs';
import path from 'path';

const appJson = JSON.parse(
  readFileSync(path.join(__dirname, 'app.json'), 'utf8'),
);

const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
const googleMapId = process.env.EXPO_PUBLIC_GOOGLE_MAP_ID || '';
const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1';

export default ({ config }) => ({
  ...appJson.expo,
  ...config,
  android: {
    ...appJson.expo.android,
    config: {
      ...appJson.expo.android?.config,
      googleMaps: {
        apiKey: googleMapsApiKey,
      },
    },
  },
  ios: {
    ...appJson.expo.ios,
    config: {
      ...appJson.expo.ios?.config,
      googleMapsApiKey,
    },
  },
  plugins: [
    ...(appJson.expo.plugins || []),
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'ChildCare uses your location to mark your service zones and care addresses.',
        isAndroidBackgroundLocationEnabled: false,
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/images/icon.png',
        color: '#1B6CA8',
        sounds: [],
      },
    ],
  ],
  extra: {
    ...appJson.expo.extra,
    apiBaseUrl,
    googleMapsApiKey,
    googleMapId,
    eas: {
      ...(appJson.expo.extra?.eas || {}),
    },
  },
});
