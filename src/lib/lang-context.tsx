'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { i18n, Lang, I18nKey } from './i18n';

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (key: I18nKey) => string }>({
  lang: 'en', setLang: () => {}, t: (k) => k,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');
  useEffect(() => {
    if (navigator.language.startsWith('zh')) setLang('zh');
  }, []);
  const t = (key: I18nKey) => i18n[lang][key] || i18n.en[key] || key;
  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
