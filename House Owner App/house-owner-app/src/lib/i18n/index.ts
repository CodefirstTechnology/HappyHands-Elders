/**
 * i18n setup — use t('key') for all user-visible strings in new screens.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/locales/en.json';
import hi from '@/locales/hi.json';
import mr from '@/locales/mr.json';

export const SUPPORTED_LANGUAGES = ['en', 'hi', 'mr'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export function isSupportedLanguage(lang: string | null | undefined): lang is AppLanguage {
  return !!lang && (SUPPORTED_LANGUAGES as readonly string[]).includes(lang);
}

const INTL_LOCALE: Record<AppLanguage, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'mr-IN',
};

export function getIntlLocale(lang?: string): string {
  const code = isSupportedLanguage(lang) ? lang : isSupportedLanguage(i18n.language) ? i18n.language : 'en';
  return INTL_LOCALE[code];
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
    mr: { translation: mr },
  },
  lng: 'en',
  fallbackLng: 'en',
  compatibilityJSON: 'v4',
  interpolation: { escapeValue: false },
});

export function translateStatus(status: string): string {
  const key = `status.${status}`;
  return i18n.exists(key) ? i18n.t(key) : status;
}

export function translateVerification(status: string): string {
  const map: Record<string, string> = {
    VERIFIED: 'verification.verifiedHelper',
    PENDING: 'verification.pending',
    UNDER_REVIEW: 'verification.underReview',
    REJECTED: 'verification.rejected',
  };
  const key = map[status];
  return key && i18n.exists(key) ? i18n.t(key) : status;
}

export default i18n;
