import axios from 'axios';
import { API_BASE_URL } from '@/lib/apiConfig';
import { getToken, setToken, clearAuthTokens } from '@/lib/tokenStorage';

const API_BASE = API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await getToken('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      const refreshToken = await getToken('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
          await setToken('accessToken', data.data.accessToken);
          await setToken('refreshToken', data.data.refreshToken);
          original.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(original);
        } catch {
          await clearAuthTokens();
        }
      }
    }
    return Promise.reject(error);
  },
);

export default api;
