import { create } from 'zustand';
import api from '@/lib/api';
import { setSessionExpiredHandler } from '@/lib/authSession';
import { clearAuthTokens, getToken, setToken } from '@/lib/tokenStorage';
import { useLanguageStore } from '@/store/languageStore';
import i18n, { isSupportedLanguage } from '@/lib/i18n';

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  preferredLanguage?: string;
  caregiver?: { id: number; verificationStatus: string };
};

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  submitApplication: (data: Record<string, unknown>) => Promise<string>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  hydrate: async () => {
    try {
      const token = await getToken('accessToken');
      if (!token) return set({ isLoading: false });
      const { data } = await api.get('/auth/me');
      const user = data.data.user;
      set({ user, isAuthenticated: true, isLoading: false });
      if (isSupportedLanguage(user?.preferredLanguage)) {
        await useLanguageStore.getState().syncFromUser(user.preferredLanguage);
      }
    } catch {
      await clearAuthTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  submitApplication: async (payload) => {
    const body = payload as Record<string, string | number | string[] | undefined>;
    const lang = useLanguageStore.getState().language;
    const skills = Array.isArray(body.skills) ? body.skills : [];
    const lat = Number(body.latitude);
    const lng = Number(body.longitude);

    const res = await api.post('/auth/register-caregiver', {
      name: String(body.name ?? '').trim(),
      email: String(body.email).trim().toLowerCase(),
      phone: String(body.phone ?? '').replace(/\D/g, ''),
      address: String(body.address ?? '').trim(),
      skills,
      ...(body.city ? { city: String(body.city).trim() } : {}),
      ...(Number.isFinite(lat) ? { latitude: lat } : {}),
      ...(Number.isFinite(lng) ? { longitude: lng } : {}),
      preferredLanguage: lang,
    });
    const message = res.data?.data?.message;
    if (!res.data?.success) {
      throw { response: { data: { message: res.data?.message || 'Registration failed' } } };
    }
    return (message as string) || 'Submitted';
  },

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', {
      email: email.trim().toLowerCase(),
      password,
    });
    if (data.data.user.role !== 'CAREGIVER') {
      throw {
        response: {
          data: {
            message: i18n.t('auth.wrongRoleServant'),
          },
        },
      };
    }
    await setToken('accessToken', data.data.accessToken);
    await setToken('refreshToken', data.data.refreshToken);
    const user = data.data.user;
    set({ user, isAuthenticated: true });
    const lang = useLanguageStore.getState().language;
    void useLanguageStore.getState().setLanguage(lang, { syncProfile: true });
  },

  logout: async () => {
    await clearAuthTokens();
    set({ user: null, isAuthenticated: false });
  },

  refreshUser: async () => {
    try {
      const token = await getToken('accessToken');
      if (!token) return;
      const { data } = await api.get('/auth/me');
      const user = data.data.user;
      set({ user, isAuthenticated: true });
    } catch {
      /* keep existing session on transient errors */
    }
  },
}));

setSessionExpiredHandler(() => {
  useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false });
});
