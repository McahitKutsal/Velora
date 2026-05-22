'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const AppSettingsContext = createContext(null);

export function AppSettingsProvider({ children }) {
  const [darkMode, setDarkMode] = useState(true);
  const [currency, setCurrency] = useState('TRY');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const savedDark = localStorage.getItem('velora_dark_mode');
    const savedCurrency = localStorage.getItem('velora_currency');
    if (savedDark !== null) setDarkMode(savedDark === '1');
    if (savedCurrency) setCurrency(savedCurrency);
    setHydrated(true);
  }, []);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem('velora_dark_mode', next ? '1' : '0');
      return next;
    });
  };

  const updateCurrency = (val) => {
    setCurrency(val);
    localStorage.setItem('velora_currency', val);
  };

  return (
    <AppSettingsContext.Provider
      value={{ darkMode, currency, toggleDarkMode, setCurrency: updateCurrency, hydrated }}
    >
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) throw new Error('useAppSettings must be used within AppSettingsProvider');
  return ctx;
}
