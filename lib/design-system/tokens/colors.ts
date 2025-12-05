// ================================
// Color Design Tokens
// ================================
// Centralized color definitions for consistent theming

export const colors = {
    // Primary brand color (blue)
    primary: {
        50: '#f0f9ff',
        100: '#e0f2fe',
        200: '#bae6fd',
        300: '#7dd3fc',
        400: '#38bdf8',
        500: '#0ea5e9',
        600: '#0284c7',
        700: '#0369a1',
        800: '#075985',
        900: '#0c4a6e',
        950: '#082f49',
    },

    // Accent color (purple/fuchsia)
    accent: {
        50: '#fdf4ff',
        100: '#fae8ff',
        200: '#f5d0fe',
        300: '#f0abfc',
        400: '#e879f9',
        500: '#d946ef',
        600: '#c026d3',
        700: '#a21caf',
        800: '#86198f',
        900: '#701a75',
        950: '#4a044e',
    },

    // Surface colors (neutral gray)
    surface: {
        50: '#f8fafc',
        100: '#f1f5f9',
        200: '#e2e8f0',
        300: '#cbd5e1',
        400: '#94a3b8',
        500: '#64748b',
        600: '#475569',
        700: '#334155',
        800: '#1e293b',
        900: '#0f172a',
        950: '#020617',
    },

    // Semantic colors
    success: {
        50: '#f0fdf4',
        500: '#22c55e',
        600: '#16a34a',
    },
    warning: {
        50: '#fffbeb',
        500: '#f59e0b',
        600: '#d97706',
    },
    error: {
        50: '#fef2f2',
        500: '#ef4444',
        600: '#dc2626',
    },
    info: {
        50: '#eff6ff',
        500: '#3b82f6',
        600: '#2563eb',
    },
} as const;

// Generate CSS variable name from color key
export function getCSSVariable(colorKey: string): string {
    return `var(--${colorKey})`;
}

export type ColorKey = keyof typeof colors;
export type ColorShade = '50' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | '950';
