import React, { createContext, useContext, useEffect } from 'react';
import { useLocalStorage } from '../services/storage';

export type ThemeMode = 'light' | 'dark' | 'system' | 'custom';
export type FontSize = 'compact' | 'normal' | 'large';

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useLocalStorage<ThemeMode>('proctus_theme_mode', 'light');
  const [accentColor, setAccentColor] = useLocalStorage<string>('proctus_accent_color', '#C9A227');
  const [fontSize, setFontSize] = useLocalStorage<FontSize>('proctus_font_size', 'normal');
  const [isDark, setIsDark] = React.useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const checkSystemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;
    let shouldBeDark = false;

    if (mode === 'dark') {
      shouldBeDark = true;
    } else if (mode === 'light') {
      shouldBeDark = false;
    } else if (mode === 'system') {
      shouldBeDark = checkSystemDark();
    } else if (mode === 'custom') {
      shouldBeDark = false;
    }

    setIsDark(shouldBeDark);

    if (shouldBeDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Apply custom accent color
    if (accentColor) {
      root.style.setProperty('--color-gold', accentColor);
    }

    // Apply font size class
    root.classList.remove('text-sm', 'text-base', 'text-lg');
    if (fontSize === 'compact') {
      root.style.fontSize = '14px';
    } else if (fontSize === 'large') {
      root.style.fontSize = '17px';
    } else {
      root.style.fontSize = '15.5px';
    }
  }, [mode, accentColor, fontSize]);

  return (
    <ThemeContext.Provider
      value={{
        mode,
        setMode,
        accentColor,
        setAccentColor,
        fontSize,
        setFontSize,
        isDark,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
