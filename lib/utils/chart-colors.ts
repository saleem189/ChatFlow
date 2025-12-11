// ================================
// Chart Colors Utility
// ================================
// Extract colors from CSS variables for chart libraries

/**
 * Get HSL color from CSS variable
 */
export function getCSSVariable(variable: string): string {
  if (typeof window === 'undefined') return '';
  
  const root = document.documentElement;
  const value = getComputedStyle(root).getPropertyValue(variable).trim();
  
  return value;
}

/**
 * Convert HSL string to hex color
 */
export function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Parse HSL string and convert to hex
 */
export function parseHSLToHex(hsl: string): string {
  const match = hsl.match(/(\d+\.?\d*)\s+(\d+\.?\d*)%?\s+(\d+\.?\d*)%?/);
  if (!match) return '#000000';
  
  const h = parseFloat(match[1]);
  const s = parseFloat(match[2]);
  const l = parseFloat(match[3]);
  
  return hslToHex(h, s, l);
}

/**
 * Get theme color as hex for charts
 */
export function getThemeColorHex(variable: string): string {
  const hsl = getCSSVariable(variable);
  if (!hsl) return '#000000';
  
  return parseHSLToHex(hsl);
}

/**
 * Get chart colors from current theme
 */
export function getChartColors() {
  return {
    primary: getThemeColorHex('--primary'),
    accent: getThemeColorHex('--accent'),
    muted: getThemeColorHex('--muted'),
    border: getThemeColorHex('--border'),
    foreground: getThemeColorHex('--foreground'),
    mutedForeground: getThemeColorHex('--muted-foreground'),
    destructive: getThemeColorHex('--destructive'),
  };
}

/**
 * Fallback chart colors (used when CSS variables are not available)
 */
export const FALLBACK_CHART_COLORS = {
  primary: '#3b82f6',
  accent: '#8b5cf6',
  muted: '#6b7280',
  border: '#e5e7eb',
  foreground: '#0f172a',
  mutedForeground: '#64748b',
  destructive: '#ef4444',
  success: '#10b981', // Semantic color for positive metrics
} as const;

/**
 * Get chart colors with fallback
 */
export function getChartColorsWithFallback() {
  if (typeof window === 'undefined') {
    return FALLBACK_CHART_COLORS;
  }
  
  try {
    const colors = getChartColors();
    // Validate that colors were extracted successfully
    if (colors.primary === '#000000') {
      return FALLBACK_CHART_COLORS;
    }
    return colors;
  } catch (error) {
    console.warn('Failed to extract theme colors, using fallback:', error);
    return FALLBACK_CHART_COLORS;
  }
}

