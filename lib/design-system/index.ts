// ================================
// Design System - Main Export
// ================================
// Centralized design tokens for consistent styling

// Token exports
export * from './tokens/colors';
export * from './tokens/spacing';
export * from './tokens/typography';

// Re-export commonly used types
export type { ColorKey, ColorShade } from './tokens/colors';
export type { SpacingKey } from './tokens/spacing';
export type { FontSizeKey, FontWeightKey } from './tokens/typography';

// Utility function to access design tokens
export const tokens = {
    colors: require('./tokens/colors').colors,
    spacing: require('./tokens/spacing').spacing,
    typography: {
        fontFamily: require('./tokens/typography').fontFamily,
        fontSize: require('./tokens/typography').fontSize,
        fontWeight: require('./tokens/typography').fontWeight,
    },
} as const;
