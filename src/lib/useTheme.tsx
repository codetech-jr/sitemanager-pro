import { useState, useEffect } from 'react';

export function useTheme() {
  // Leemos del localStorage o por defecto 'dark'
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('siteManager_theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    const root = window.document.body;
    // Quitamos la clase anterior y ponemos la nueva
    root.classList.remove('light-mode', 'dark-mode');
    
    if (theme === 'light') {
      root.classList.add('light-mode');
    } else {
      root.classList.add('dark-mode');
    }

    // Guardar preferencia
    localStorage.setItem('siteManager_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return { theme, toggleTheme };
}