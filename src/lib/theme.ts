export interface CustomTheme {
  id: string;
  name: string;
  primary: string;   // Primary canvas/background color
  secondary: string; // Secondary accent/glow color
  tertiary: string;  // Tertiary text/contrast color
}

export const PRESET_THEMES: CustomTheme[] = [
  { id: 'midnight', name: 'Midnight Navy', primary: '#051424', secondary: '#81FFEC', tertiary: '#D4E4FA' },
  { id: 'oled_black', name: 'Pitch Black', primary: '#050505', secondary: '#00FF99', tertiary: '#FFFFFF' },
  { id: 'cyber_violet', name: 'Cyber Violet', primary: '#0E091B', secondary: '#C084FC', tertiary: '#F3E8FF' },
  { id: 'neon_sunset', name: 'Neon Sunset', primary: '#18080C', secondary: '#FF5252', tertiary: '#FFE4E6' },
  { id: 'solar_amber', name: 'Solar Amber', primary: '#170E04', secondary: '#F59E0B', tertiary: '#FEF3C7' },
  { id: 'emerald', name: 'Emerald Forest', primary: '#041710', secondary: '#34D399', tertiary: '#D1FAE5' },
  { id: 'electric_blue', name: 'Electric Blue', primary: '#08132B', secondary: '#3B82F6', tertiary: '#EFF6FF' },
  { id: 'slate_light', name: 'Slate Light', primary: '#F1F5F9', secondary: '#0284C7', tertiary: '#0F172A' },
];

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  if (!hex) return { r: 5, g: 20, b: 36 };
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return { r: 5, g: 20, b: 36 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    '#' +
    [r, g, b]
      .map((x) => clamp(x).toString(16).padStart(2, '0'))
      .join('')
  );
}

export function adjustBrightness(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (r * 299 + g * 587 + b * 114) / 1000;
  const isLight = luminance > 128;
  const factor = isLight ? -percent : percent;
  const nr = r + (255 * factor) / 100;
  const ng = g + (255 * factor) / 100;
  const nb = b + (255 * factor) / 100;
  return rgbToHex(nr, ng, nb);
}

export function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getContrastTextColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#051424' : '#FFFFFF';
}

export function applyCustomTheme(theme: CustomTheme): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const primary = theme.primary || '#051424';
  const secondary = theme.secondary || '#81FFEC';
  const tertiary = theme.tertiary || '#D4E4FA';

  const { r, g, b } = hexToRgb(primary);
  const luminance = (r * 299 + g * 587 + b * 114) / 1000;
  const isLight = luminance > 128;

  if (isLight) {
    root.classList.add('light');
    root.classList.remove('dark');
  } else {
    root.classList.add('dark');
    root.classList.remove('light');
  }

  // Calculated dependent shades
  const primaryDark = adjustBrightness(primary, -12);
  const primarySurface = adjustBrightness(primary, 8);
  const primarySurfaceHigh = adjustBrightness(primary, 18);
  const primarySurfaceHighest = adjustBrightness(primary, 28);

  const secondaryGlow = hexToRgba(secondary, 0.35);
  const secondaryGlowFaint = hexToRgba(secondary, 0.15);
  const secondaryOnText = getContrastTextColor(secondary);

  const tertiaryMuted = hexToRgba(tertiary, 0.65);
  const tertiaryFaint = hexToRgba(tertiary, 0.15);

  // Set CSS custom properties
  root.style.setProperty('--c-primary-bg', primary);
  root.style.setProperty('--c-primary-dark', primaryDark);
  root.style.setProperty('--c-primary-surface', primarySurface);
  root.style.setProperty('--c-primary-surface-high', primarySurfaceHigh);
  root.style.setProperty('--c-primary-surface-highest', primarySurfaceHighest);

  root.style.setProperty('--c-secondary-accent', secondary);
  root.style.setProperty('--c-secondary-glow', secondaryGlow);
  root.style.setProperty('--c-secondary-glow-faint', secondaryGlowFaint);
  root.style.setProperty('--c-secondary-on-text', secondaryOnText);

  root.style.setProperty('--c-tertiary-text', tertiary);
  root.style.setProperty('--c-tertiary-muted', tertiaryMuted);
  root.style.setProperty('--c-tertiary-faint', tertiaryFaint);

  try {
    localStorage.setItem('fs_custom_theme', JSON.stringify(theme));
    window.dispatchEvent(new Event('themechange'));
  } catch {
    // fallback
  }
}

export function getStoredTheme(): CustomTheme {
  try {
    const stored = localStorage.getItem('fs_custom_theme');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.primary && parsed.secondary && parsed.tertiary) {
        return parsed;
      }
    }
  } catch {
    // fallback
  }
  return PRESET_THEMES[0];
}

export function initCustomTheme(): void {
  const theme = getStoredTheme();
  applyCustomTheme(theme);
}
