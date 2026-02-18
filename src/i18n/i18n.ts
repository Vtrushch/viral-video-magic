import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import es from "./locales/es.json";
import uk from "./locales/uk.json";

const STORAGE_KEY = "i18n_language";

// Detect browser language on first visit
const detectLanguage = (): string => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return saved;

  const browser = navigator.language.toLowerCase();
  if (browser.startsWith("es")) return "es";
  if (browser.startsWith("uk") || browser.startsWith("ua")) return "uk";
  return "en";
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      uk: { translation: uk },
    },
    lng: detectLanguage(),
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });

export const changeLanguage = (lang: string) => {
  localStorage.setItem(STORAGE_KEY, lang);
  i18n.changeLanguage(lang);
};

export const LANGUAGES = [
  { code: "en", label: "EN", flag: "🇺🇸", name: "English" },
  { code: "es", label: "ES", flag: "🇪🇸", name: "Español" },
  { code: "uk", label: "UK", flag: "🇺🇦", name: "Українська" },
];

export default i18n;
