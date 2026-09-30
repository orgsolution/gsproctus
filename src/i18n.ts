import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './locales/fr.json';
import ht from './locales/ht.json';
import en from './locales/en.json';
import es from './locales/es.json';

const savedLanguage = typeof window !== 'undefined' ? localStorage.getItem('proctus_language') || 'fr' : 'fr';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      ht: { translation: ht },
      en: { translation: en },
      es: { translation: es },
    },
    lng: savedLanguage,
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
