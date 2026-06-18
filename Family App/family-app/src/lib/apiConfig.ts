import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;

export function getApiBaseUrl(): string {
  return (
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    extra?.apiBaseUrl ||
    'http://localhost:5000/api/v1'
  );
}

export const API_BASE_URL = getApiBaseUrl();
