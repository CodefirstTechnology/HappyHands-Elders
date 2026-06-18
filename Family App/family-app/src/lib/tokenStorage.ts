import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const isWeb = Platform.OS === 'web';

async function secureStoreAvailable(): Promise<boolean> {
  if (isWeb) return false;
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function getToken(key: string): Promise<string | null> {
  if (isWeb) {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  }
  if (!(await secureStoreAvailable())) return null;
  return SecureStore.getItemAsync(key);
}

export async function setToken(key: string, value: string): Promise<void> {
  if (isWeb) {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    return;
  }
  if (await secureStoreAvailable()) {
    await SecureStore.setItemAsync(key, value);
  }
}

export async function removeToken(key: string): Promise<void> {
  if (isWeb) {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    return;
  }
  if (!(await secureStoreAvailable())) return;
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    /* native module may be unavailable in dev / web */
  }
}

export async function clearAuthTokens(): Promise<void> {
  await Promise.all([removeToken('accessToken'), removeToken('refreshToken')]);
}
