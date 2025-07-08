
"use client";

import React, { createContext, useState, useContext, useCallback, useMemo } from 'react';
import { en } from '@/locales/en';
import { dbg } from '@/locales/dbg';
import { ua } from '@/locales/ua';
import type { Locale } from '@/locales/en';

const locales: { [key: string]: Locale } = { en, dbg, ua };

export type LocaleKey = keyof typeof locales;

interface I18nContextType {
  locale: LocaleKey;
  setLocale: (locale: LocaleKey) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

function getValueFromPath(obj: any, path: string): string | undefined {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  const [locale, setLocale] = useState<LocaleKey>('en');

  const t = useCallback((key: string, values?: Record<string, string | number>): string => {
    const languageStrings = locales[locale] || locales['en'];
    let translation = getValueFromPath(languageStrings, key) || key;

    if (values) {
      Object.keys(values).forEach(valueKey => {
        const regex = new RegExp(`\\{${valueKey}\\}`, 'g');
        translation = translation.replace(regex, String(values[valueKey]));
      });
    }

    return translation;
  }, [locale]);
  
  const value = useMemo(() => ({
    locale,
    setLocale,
    t,
  }), [locale, t]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
};
