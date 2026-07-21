import { getSettings } from './storage';

export function applyTheme(theme: 'light' | 'dark' | 'system') {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'light') {
    root.classList.remove('dark');
  } else {
    // System theme fallback
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (systemDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
}

export function initTheme() {
  getSettings().then(settings => {
    applyTheme(settings.theme);
  });
  
  // Listen to system changes if system theme is selected
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    getSettings().then(settings => {
      if (settings.theme === 'system') {
        applyTheme('system');
      }
    });
  });
}
