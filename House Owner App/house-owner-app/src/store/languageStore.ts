import { create } from 'zustand';
import i18n, { type AppLanguage, isSupportedLanguage } from '@/lib/i18n';
import { getStoredLanguage, setStoredLanguage } from '@/lib/languageStorage';
import api from '@/lib/api';

type LanguageState = {
  language: AppLanguage;
  isReady: boolean;
  init: () => Promise<void>;
  setLanguage: (lang: AppLanguage, options?: { syncProfile?: boolean }) => Promise<void>;
  syncFromUser: (preferredLanguage?: string | null) => Promise<void>;
};

export const useLanguageStore = create<LanguageState>((set, get) => ({
  language: 'en',
  isReady: false,

  init: async () => {
    try {
      const stored = await getStoredLanguage();
      const lang = isSupportedLanguage(stored) ? stored : 'en';
      await i18n.changeLanguage(lang);
      set({ language: lang, isReady: true });
    } catch {
      set({ language: 'en', isReady: true });
    }
  },

  setLanguage: async (lang, options = { syncProfile: true }) => {
    await i18n.changeLanguage(lang);
    try {
      await setStoredLanguage(lang);
    } catch {
      /* in-memory language still applies */
    }
    set({ language: lang });

    if (options.syncProfile) {
      try {
        const { data } = await api.patch('/auth/me/preferences', { preferredLanguage: lang });
        const user = data?.data?.user;
        if (user) {
          const { useAuthStore } = await import('@/store/authStore');
          useAuthStore.getState().setUser(user);
        }
      } catch {
        /* offline — local language still applies */
      }
    }
  },

  syncFromUser: async (preferredLanguage) => {
    if (!isSupportedLanguage(preferredLanguage)) return;
    if (get().language === preferredLanguage) return;
    await get().setLanguage(preferredLanguage, { syncProfile: false });
  },
}));
