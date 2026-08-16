export type ThemeName = 'light' | 'dark';

export const themeTokens: Record<ThemeName, Record<string, string>> = {
  light: {
    background: '#f4f6fb',
    surface: '#ffffff',
    surfaceSecondary: '#f1f4f9',
    border: '#e2e8f0',
    textPrimary: '#1e293b',
    textSecondary: '#64748b',
    primary: '#6366f1',
    primaryHover: '#4f46e5',
    danger: '#dc2626',
    success: '#16a34a',
    warning: '#d97706',
    disabled: '#cbd5e1',
  },
  dark: {
    background: '#0f172a',
    surface: '#1e293b',
    surfaceSecondary: '#273449',
    border: '#334155',
    textPrimary: '#f1f5f9',
    textSecondary: '#94a3b8',
    primary: '#818cf8',
    primaryHover: '#a5b4fc',
    danger: '#f87171',
    success: '#4ade80',
    disabled: '#475569',
  },
};

export function applyTheme(theme: ThemeName) {
  const root = document.documentElement;
  const tokens = themeTokens[theme];
  Object.entries(tokens).forEach(([k, v]) => {
    root.style.setProperty(`--c-${k}`, v);
  });
  root.dataset.theme = theme;
}
