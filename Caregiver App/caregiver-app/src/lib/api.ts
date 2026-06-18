import axios, { type InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '@/lib/apiConfig';
import { getToken, setToken, clearAuthTokens } from '@/lib/tokenStorage';
import { notifySessionExpired } from '@/lib/authSession';

const API_BASE = API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

let refreshPromise: Promise<string | null> | null = null;

function isAuthRoute(config?: InternalAxiosRequestConfig) {
  const url = config?.url ?? '';
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/register-caregiver') ||
    url.includes('/auth/register-parent') ||
    url.includes('/auth/register')
  );
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = await getToken('refreshToken');
    if (!refreshToken) return null;

    try {
      const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
      const accessToken = data.data.accessToken as string;
      const newRefresh = data.data.refreshToken as string;
      await setToken('accessToken', accessToken);
      await setToken('refreshToken', newRefresh);
      return accessToken;
    } catch {
      await clearAuthTokens();
      notifySessionExpired();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

api.interceptors.request.use(async (config) => {
  const token = await getToken('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (
      error.response?.status !== 401 ||
      !original ||
      original._retry ||
      isAuthRoute(original)
    ) {
      return Promise.reject(error);
    }

    original._retry = true;
    const accessToken = await refreshAccessToken();
    if (!accessToken) return Promise.reject(error);

    original.headers.Authorization = `Bearer ${accessToken}`;
    return api(original);
  },
);

export default api;
