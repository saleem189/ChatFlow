// ================================
// Typography Design Tokens
// ================================
// Font families, sizes, weights, and line heights

export const fontFamily = {
    sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
    display: ['var(--font-cabinet)', 'system-ui', 'sans-serif'],
    mono: ['var(--font-geist-mono)', 'monospace'],
} as const;

export const fontSize = {
    xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px
    sm: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
    base: ['1rem', { lineHeight: '1.5rem' }],     // 16px
    lg: ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
    xl: ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
    '2xl': ['1.5rem', { lineHeight: '2rem' }],    // 24px
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],   // 36px
    '5xl': ['3rem', { lineHeight: '1' }],           // 48px
    '6xl': ['3.75rem', { lineHeight: '1' }],        // 60px
    '7xl': ['4.5rem', { lineHeight: '1' }],         // 72px
    '8xl': ['6rem', { lineHeight: '1' }],           // 96px
    '9xl': ['8rem', { lineHeight: '1' }],           // 128px
} as const;

export const fontWeight = {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
} as const;

export const letterSpacing = {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
} as const;

// Pre-defined text styles for common use cases
export const textStyles = {
    // Headings
    h1: {
        fontSize: fontSize['4xl'],
        fontWeight: fontWeight.bold,
        fontFamily: fontFamily.display,
        letterSpacing: letterSpacing.tight,
    },
    h2: {
        fontSize: fontSize['3xl'],
        fontWeight: fontWeight.semibold,
        fontFamily: fontFamily.display,
        letterSpacing: letterSpacing.tight,
    },
    h3: {
        fontSize: fontSize['2xl'],
        fontWeight: fontWeight.semibold,
        fontFamily: fontFamily.sans,
    },
    h4: {
        fontSize: fontSize.xl,
        fontWeight: fontWeight.medium,
        fontFamily: fontFamily.sans,
    },

    // Body text
    body: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.normal,
        fontFamily: fontFamily.sans,
    },
    bodySmall: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.normal,
        fontFamily: fontFamily.sans,
    },

    // UI elements
    button: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
        fontFamily: fontFamily.sans,
    },
    label: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
        fontFamily: fontFamily.sans,
    },
    caption: {
        fontSize: fontSize.xs,
        fontWeight: fontWeight.normal,
        fontFamily: fontFamily.sans,
    },
} as const;

export type FontSizeKey = keyof typeof fontSize;
export type FontWeightKey = keyof typeof fontWeight;
