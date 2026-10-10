"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { isLanguage, translateText, type Language, type TranslationParams, LANGUAGE_LOCALES } from "@/lib/i18n";

export const LANGUAGE_STORAGE_KEY = "globalpay_language";
const defaultContext = {
  language: "my" as Language,
  locale: LANGUAGE_LOCALES.my,
  setLanguage: (_language: Language) => {},
  t: (key: string, params?: TranslationParams) => translateText(key, "my", params),
};
const LanguageContext = createContext(defaultContext);

/** Display preference only: never changes country, currency, or payroll snapshots. */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("my");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (isLanguage(saved)) setLanguageState(saved);
    } catch { /* Storage may be disabled; the in-memory preference still works. */ }
    const sync = (event: StorageEvent) => {
      if (event.key === LANGUAGE_STORAGE_KEY && isLanguage(event.newValue)) setLanguageState(event.newValue);
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  const setLanguage = useCallback((next: Language) => {
    if (!isLanguage(next)) return;
    setLanguageState(next);
    try { localStorage.setItem(LANGUAGE_STORAGE_KEY, next); } catch { /* Optional persistence. */ }
  }, []);
  const t = useCallback((key: string, params?: TranslationParams) => translateText(key, language, params), [language]);
  const value = useMemo(() => ({ language, locale: LANGUAGE_LOCALES[language], setLanguage, t }), [language, setLanguage, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);
