import i18n, { type BackendModule } from 'i18next';
import { initReactI18next } from 'react-i18next';
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

/** English is bundled (it is also the fallback); Bangla downloads the first time it is used. */
export const resources = {
  en: { translation: en },
} as const;

const lazyLocales: BackendModule = {
  type: 'backend',
  init: () => undefined,
  read: (language, _namespace, callback) => {
    if (language !== 'bn') {
      callback(null, {});
      return;
    }
    import('@/locales/bn.json')
      .then((module) => callback(null, module.default))
      .catch((error: Error) => callback(error, false));
  },
};

/** Resolves when the stored language is ready (main.tsx waits for it before rendering). */
export const i18nReady = i18n
  .use(lazyLocales)
  .use(initReactI18next)
  .init({
    resources,
    partialBundledLanguages: true,
    ns: ['translation'],
    lng: readStoredLanguage(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    returnNull: false,
    showSupportNotice: false,
  });

applyLanguage(i18n.language);
i18n.on('languageChanged', applyLanguage);

export default i18n;
