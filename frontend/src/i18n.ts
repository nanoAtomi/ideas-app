import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import de from './locales/de.json';
import en from './locales/en.json';
import { cookieDomain, LANG_COOKIE } from './prefs';

export const LANGUAGES = ['en', 'de'] as const;
export type Language = (typeof LANGUAGES)[number];

// The platform-wide choice (cookie on the parent domain, shared with the portal and
// every app), else the browser language.
void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, de: { translation: de } },
    supportedLngs: LANGUAGES,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: {
      order: ['cookie', 'navigator'],
      lookupCookie: LANG_COOKIE,
      caches: ['cookie'],
      cookieOptions: { path: '/', sameSite: 'lax', domain: cookieDomain() },
    },
  });

export default i18n;
