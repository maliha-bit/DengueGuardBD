import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import bn from '@/locales/bn.json';
import en from '@/locales/en.json';

export const SUPPORTED_LANGUAGES = ['en', 'bn'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

const STORAGE_KEY = 'dg.lang';

function readStoredLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'bn') return stored;
  } catch {
    // storage unavailable (private mode) — fall back to English
  }
  return 'en';
}

function applyLanguage(lng: string) {
  document.documentElement.lang = lng;
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    // ignore
  }
}

export const resources = {
  en: { translation: en },
  bn: { translation: bn },
} as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: readStoredLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
  showSupportNotice: false,
});

applyLanguage(i18n.language);
i18n.on('languageChanged', applyLanguage);

export default i18n;
