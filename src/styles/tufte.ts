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
  // Gruvbox dark theme
  background: "#282828", // bg0_h
  backgroundSecondary: "#3c3836", // bg1
  paper: "#504945", // bg2
  text: "#ebdbb2", // fg
  textSecondary: "#d5c4a1", // fg2
  textTertiary: "#bdae93", // fg3

  // Functional colors (gruvbox accents)
  dataLine: "#fabd2f", // bright yellow
  dataAccent: "#fe8019", // bright orange
  grid: "#504945", // bg2
  border: "#665c54", // bg3

  // Semantic colors
  success: "#b8bb26", // bright green
  warning: "#fabd2f", // bright yellow
  error: "#fb4934", // bright red

  // Chart colors (gruvbox palette)
  chart1: "#fabd2f", // bright yellow
  chart2: "#fe8019", // bright orange
  chart3: "#83a598", // bright blue
  chart4: "#d3869b", // bright purple
  chart5: "#8ec07c", // bright aqua
  chartEmphasis: "#fe8019", // bright orange
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

  // Data ink (gruvbox yellow)
  color: (opacity = 1) => `rgba(250, 189, 47, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(235, 219, 178, ${opacity})`,

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
    fill: "#ebdbb2",
  },

  // No fills, lines only
  fillShadowGradient: TufteColors.paper,
  fillShadowGradientOpacity: 0,

  // Emphasis
  propsForDots: {
    r: "0", // No dots by default
  },
};
