// src/contexts/ThemeContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(
    () => localStorage.getItem('patrimonio_theme') || 'light'
  );

  const setTheme = (t) => {
    setThemeState(t);
    localStorage.setItem('patrimonio_theme', t);
    document.documentElement.setAttribute('data-theme', t);
  };

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  // Sincronizar con el atributo DOM en cada cambio de estado
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
