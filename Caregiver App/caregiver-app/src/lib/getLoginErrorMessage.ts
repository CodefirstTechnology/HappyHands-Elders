import axios from 'axios';
import i18n from '@/lib/i18n';
import { getApiBaseUrl } from '@/lib/apiConfig';

export function getLoginErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.message) {
      return String(error.response.data.message);
    }
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      const base = getApiBaseUrl();
      if (base.includes('localhost') || base.includes('127.0.0.1')) {
        return i18n.t('auth.networkLocalhost');
      }
      return i18n.t('auth.networkGeneric', { base });
    }
  }

  const err = error as { response?: { data?: { message?: string } }; message?: string };
  if (err.response?.data?.message) return err.response.data.message;
  if (err.message) return err.message;

  return i18n.t('auth.invalidCredentials');
}
