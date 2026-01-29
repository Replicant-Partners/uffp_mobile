/**
 * Tufte-Tschichold Design System
 *
 * Principles:
 * 1. Maximize data-ink ratio
 * 2. Erase non-data-ink
 * 3. Erase redundant data-ink
 * 4. Use clear, legible typography
 * 5. Employ functional minimalism
 */

export const TufteColors = {
  // Dark charcoal/brown palette
  background: "#2B2520", // Dark charcoal brown
  backgroundSecondary: "#332D28", // Slightly lighter
  paper: "#3A342E", // Paper surface
  text: "#F5EFE7", // Soft cream
  textSecondary: "#D4C4B0", // Muted cream
  textTertiary: "#A89B8C", // Darker muted cream

  // Functional colors (muted yellow/orange)
  dataLine: "#E8B87E", // Muted gold
  dataAccent: "#D89B5A", // Burnt orange
  grid: "#4A4238", // Subtle grid
  border: "#5A4F45", // Muted border

  // Semantic colors (muted tones)
  success: "#9CAF88", // Muted olive green
  warning: "#D89B5A", // Burnt orange
  error: "#B87E6C", // Muted terracotta

  // Chart colors (muted yellow/orange palette)
  chart1: "#E8B87E", // Muted gold
  chart2: "#D89B5A", // Burnt orange
  chart3: "#C9894B", // Deep orange
  chart4: "#A89B8C", // Taupe
  chart5: "#F5D9A8", // Pale gold
  chartEmphasis: "#D89B5A", // Burnt orange emphasis
};

export const TufteTypography = {
  // Serif for body text (Tschichold preference)
  fontFamily: {
    serif: 'Georgia, Palatino, "Times New Roman", serif',
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: 'Menlo, Consolas, Monaco, "Courier New", monospace',
  },

  // Typographic scale (modular)
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    lg: 17,
    xl: 21,
    xxl: 28,
    display: 36,
  },

  // Line height for readability
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.65,
  },

  // Font weights (minimal palette)
  fontWeight: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
};

export const TufteSpacing = {
  // 8-point grid system
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const TufteLayout = {
  // Max width for optimal line length (45-75 chars)
  maxWidth: 680,

  // Margins (generous whitespace)
  marginHorizontal: 20,
  marginVertical: 32,

  // Border radius (subtle)
  borderRadius: 2,

  // Shadows (minimal)
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
};

export const TufteChartConfig = {
  // Remove chartjunk
  backgroundColor: TufteColors.paper,
  backgroundGradientFrom: TufteColors.paper,
  backgroundGradientTo: TufteColors.paper,

  // Data ink (muted gold)
  color: (opacity = 1) => `rgba(232, 184, 126, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(245, 239, 231, ${opacity})`,

  // Minimal decoration
  decimalPlaces: 1,
  propsForBackgroundLines: {
    strokeDasharray: "", // Solid, not dashed
    stroke: TufteColors.grid,
    strokeWidth: 0.5,
  },
  propsForLabels: {
    fontSize: 11,
    fontFamily: TufteTypography.fontFamily.sans,
    fill: "#F5EFE7",
  },

  // No fills, lines only
  fillShadowGradient: TufteColors.paper,
  fillShadowGradientOpacity: 0,

  // Emphasis
  propsForDots: {
    r: "0", // No dots by default
  },
};
