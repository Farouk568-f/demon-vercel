import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { translations, TranslationKey } from '../translations';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, options?: Record<string, string | number>) => string;
  dir: 'ltr' | 'rtl';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const getInitialLanguage = (): Language => {
    const storedLang = localStorage.getItem('cineStreamLanguage');
    return (storedLang === 'en' || storedLang === 'ar') ? storedLang : 'en';
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<Language>(getInitialLanguage);

    useEffect(() => {
        const dir = language === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = language;
        document.documentElement.dir = dir;
        const newFont = language === 'ar' ? "'Tajawal', 'Inter', sans-serif" : "'Inter', 'Tajawal', sans-serif";
        document.body.style.fontFamily = newFont;
    }, [language]);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('cineStreamLanguage', lang);
        window.location.reload(); 
    };

    const t = useCallback((key: TranslationKey, options?: Record<string, string | number>): string => {
        let translation = translations[language][key] || translations['en'][key] || key;
        if (options) {
            Object.keys(options).forEach(optionKey => {
                translation = translation.replace(`{${optionKey}}`, String(options[optionKey]));
            });
        }
        return translation;
    }, [language]);

    const dir = language === 'ar' ? 'rtl' : 'ltr';

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useTranslation = (): LanguageContextType => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useTranslation must be used within a LanguageProvider');
    }
    return context;
};