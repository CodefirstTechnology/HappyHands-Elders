import { create } from 'zustand';
import api from '@/lib/api';
import { clearAuthTokens, getToken, setToken } from '@/lib/tokenStorage';
import { useLanguageStore } from '@/store/languageStore';
import i18n, { isSupportedLanguage } from '@/lib/i18n';

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  preferredLanguage?: string;
  parent?: {
    id: number;
    city?: string;
    address?: string;
    flatNo?: string;
    building?: string;
    area?: string;
    latitude?: number;
    longitude?: number;
    numberOfChildren?: number;
    childrenAges?: number[];
    specialRequirements?: string;
  };
};

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: Record<string, unknown>) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  setUser: (user: User | null) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  hydrate: async () => {
    try {
      const token = await getToken('accessToken');
      if (!token) {
        set({ isLoading: false });
        return;
      }
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

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', {
      email: email.trim().toLowerCase(),
      password,
    });
    if (data.data.user.role !== 'PARENT') {
      throw {
        response: {
          data: {
            message: i18n.t('auth.wrongRole'),
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

  register: async (payload) => {
    const body = payload as Record<string, string | number | undefined>;
    const lang = useLanguageStore.getState().language;
    const { data } = await api.post('/auth/register-parent', {
      ...body,
      email: String(body.email).trim().toLowerCase(),
      preferredLanguage: lang,
    });
    await setToken('accessToken', data.data.accessToken);
    await setToken('refreshToken', data.data.refreshToken);
    const user = data.data.user;
    set({ user, isAuthenticated: true });
    void useLanguageStore.getState().setLanguage(lang, { syncProfile: true });
  },

  logout: async () => {
    try {
      const refreshToken = await getToken('refreshToken');
      await api.post('/auth/logout', { refreshToken });
    } catch {
      /* ignore */
    }
    await clearAuthTokens();
    set({ user: null, isAuthenticated: false });
  },

  setUser: (user) => set({ user, isAuthenticated: !!user }),
}));
