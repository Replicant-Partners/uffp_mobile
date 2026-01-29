# UFFP Mobile App - Design System

## Design Philosophy: Tufte-Tschichold Tradition

This app follows the principles of Edward Tufte (information design) and Jan Tschichold (typography), emphasizing:

1. **High data-ink ratio** - Maximize information, minimize decoration
2. **Clear hierarchy** - Typography establishes importance
3. **Functional minimalism** - Every element serves a purpose
4. **Rigorous presentation** - Academic quality, not consumer app

## Core Principles

### 1. Data-Ink Ratio

**Tufte's Definition:**
```
data-ink ratio = data-ink / total ink used
```

**Our Implementation:**
- Remove all non-data pixels
- No gradients, shadows, or decorative elements
- Borders only when functionally necessary
- White space is structural, not decorative

**Example:**
```
❌ Dark theme with gradient backgrounds
✅ White background with minimal borders
```

### 2. Chartjunk Elimination

**What We Removed:**
- Colored backgrounds on charts
- Drop shadows
- 3D effects
- Unnecessary grid lines
- Decorative icons
- Rounded corners (except subtle 2px)

**What We Kept:**
- Essential borders for structure
- Minimal grid lines for reference
- Functional color (crimson) for emphasis only

### 3. Small Multiples

**Tufte's Technique:**
Present multiple views of data in consistent, comparable format.

**Our Implementation:**
- Consistent table structure across components
- Repeating patterns for drivers
- Parallel layouts for comparisons

## Color Palette

### Neutral Foundation (Tschichold)

```typescript
background: '#FAFAFA'  // Off-white, reduces eye strain
paper: '#FFFFFF'       // Pure white for content
text: '#1A1A1A'        // Near-black for maximum contrast
textSecondary: '#666'  // Mid-gray for hierarchy
textTertiary: '#999'   // Light gray for meta-information
```

### Functional Color (Minimal Use)

```typescript
dataAccent: '#DC143C'  // Crimson - only for emphasis
```

**Usage Rules:**
- Use crimson sparingly (pre-mortem warnings, key emphasis)
- Never use color as sole information carrier
- Prefer typographic hierarchy over color

### Chart Colors

```typescript
dataLine: '#1A1A1A'   // Black for primary data
grid: '#E0E0E0'       // Very light gray for reference
border: '#CCCCCC'     // Subtle borders
```

## Typography

### Typeface System

```typescript
// Serif for body text (Tschichold tradition)
serif: 'Georgia, Palatino, Times New Roman'

// Sans-serif for labels/UI
sans: '-apple-system, BlinkMacSystemFont, Segoe UI'

// Monospace for tabular numbers
mono: 'Menlo, Consolas, Courier New'
```

### Type Scale (Modular)

```
Display: 36px  // Page titles only
XXL:     28px  // Section headers
XL:      21px  // Emphasis
LG:      17px  // Subheaders
Base:    15px  // Body text
SM:      13px  // Secondary text
XS:      11px  // Footnotes, labels
```

### Typographic Techniques

**Small Caps for Labels**
```typescript
textTransform: 'uppercase'
letterSpacing: 1
fontSize: 11px
```

**Tabular Numbers**
```typescript
fontVariant: ['tabular-nums']  // Align vertically
```

**Italics for Meta-Information**
```typescript
fontStyle: 'italic'  // Footnotes, sources, hints
```

## Layout System

### Grid (8-Point Base)

```typescript
xs: 4px
sm: 8px
md: 16px
lg: 24px
xl: 32px
xxl: 48px
```

**Usage:**
- All spacing is multiple of 8
- Consistent rhythm throughout
- Predictable vertical flow

### Margins

```typescript
horizontal: 20px  // Content inset
vertical: 32px    // Section spacing
```

**Generous Whitespace:**
- Don't fill every pixel
- Let content breathe
- Whitespace creates structure

### Max Width

```typescript
maxWidth: 680px  // 45-75 characters per line
```

**Readability:**
- Optimal line length for comprehension
- Prevents scanning fatigue
- Based on typographic research

## Component Patterns

### Tables (Primary Pattern)

**Structure:**
```
┌─────────────────────────────┐
│ Label        Value           │
├─────────────────────────────┤
│ P10          $50.3M          │
│ P50          $114.5M         │
│ P90          $228.9M         │
└─────────────────────────────┘
```

**Characteristics:**
- Left-aligned labels
- Right-aligned or tabular numbers
- Thin borders (0.5-1px)
- Alternating patterns for groups

### Marginal Notes

**Tufte Technique:**
Annotations in margins, not overlaid on data.

**Implementation:**
```typescript
label: {
  fontSize: 11,
  color: '#999',
  textTransform: 'uppercase',
  letterSpacing: 1,
  marginBottom: 8,
}
```

### Sparklines

**Tufte's Invention:**
Intense, word-sized graphics embedded in text.

**Our Use:**
- Distribution chart is sparkline-style
- No axes labels (context from text)
- High data density
- Minimal decoration

## Charts

### Bar Chart (Data First)

**Configuration:**
```typescript
{
  backgroundColor: white,
  color: black,
  gridLines: minimal,
  labels: yes,
  decoration: none,
}
```

**Features:**
- Data table above chart
- Values shown numerically
- Chart reinforces, not replaces data
- No fills, lines/bars only

### Line Chart (Sparkline)

**Configuration:**
```typescript
{
  strokeWidth: 1.5,
  withDots: false,
  withInnerLines: false,
  withLabels: false,
  fillShadowGradientOpacity: 0.05,
}
```

**Principles:**
- Clean, undecorated line
- Minimal fill (5% opacity)
- Context from surrounding text
- Focus on shape, not individual points

## Information Hierarchy

### Primary Information
- Large numbers (48-36px)
- Bold or medium weight
- Black (#1A1A1A)
- Top of visual hierarchy

**Example:**
```
Success Probability: 65.3%
```

### Secondary Information
- Medium text (15-17px)
- Normal weight
- Dark gray (#666)
- Supporting details

**Example:**
```
P50 (Base Case): $114.5M
```

### Tertiary Information
- Small text (11-13px)
- Light gray (#999)
- Footnotes, sources, meta

**Example:**
```
Source: Historical satellite industry data
```

## Interaction Design

### Buttons (Minimal)

```typescript
{
  borderWidth: 1,
  borderColor: black,
  backgroundColor: transparent,
  paddingVertical: 16,
  paddingHorizontal: 24,
}
```

**Characteristics:**
- Border, not fill
- Black on white
- Generous padding
- Typography-first

### Touch Targets

```
Minimum: 44x44px (iOS HIG)
Preferred: 48x48px
```

### States

- **Default:** Black border
- **Pressed:** Reduce opacity to 0.7
- **Disabled:** Gray (#CCC)

No animations, no color changes, no shadows.

## Accessibility

### Contrast Ratios

```
Text on Background:
- Primary (#1A1A1A on #FAFAFA): 13.6:1 ✓ WCAG AAA
- Secondary (#666 on #FFF): 5.7:1 ✓ WCAG AA
- Tertiary (#999 on #FFF): 2.8:1 (Large text only)
```

### Font Sizes

```
Minimum body text: 15px
Minimum label text: 11px (all caps, high contrast)
```

### Touch Targets

All interactive elements minimum 44x44px.

## Data Presentation Rules

### Numbers

**Always Use:**
1. Tabular numbers (`fontVariant: ['tabular-nums']`)
2. Appropriate precision (1 decimal for millions)
3. Units with values ($150M, not just 150)
4. Consistent formatting

**Example:**
```
❌ P10: 50.34567M
✅ P10: $50.3M
```

### Tables

**Structure:**
1. Left-align text
2. Right-align or tabular-align numbers
3. Thin borders (0.5px)
4. Generous padding (8px vertical)

### Charts

**Always Include:**
1. Data table with exact values
2. Source citation
3. Methodology note
4. Context in surrounding text

## Density vs Clarity

**Tufte's Directive:**
"Clutter and confusion are not attributes of information; they are failures of design."

**Our Balance:**
- Dense information (many numbers per screen)
- Clear hierarchy (typography separates levels)
- Generous spacing (whitespace structures)
- Consistent patterns (predictable layout)

**Example:**
Forecast detail screen shows:
- Probability
- 3 percentile values
- Mean and standard deviation
- Full histogram
- 3-5 driver configurations
- Base rate analysis
- Pre-mortem scenarios
- Methodology

All on one scrollable screen, completely legible.

## Anti-Patterns (What We Avoid)

### ❌ Consumer App Aesthetic

```typescript
// Don't
{
  background: gradient,
  borderRadius: 20,
  shadow: large,
  colors: rainbow,
  animations: bouncy,
}
```

### ❌ Skeuomorphism

No fake textures, shadows, or 3D effects.

### ❌ Chartjunk

No:
- Decorative backgrounds
- Unnecessary colors
- 3D bars
- Ornamental borders
- Cute icons

### ❌ Hidden Information

No:
- Tooltips only (show data directly)
- Color as sole indicator
- Vague terms ("likely" vs "65%")

## Inspiration Sources

### Books
- Edward Tufte: *The Visual Display of Quantitative Information* (1983)
- Edward Tufte: *Envisioning Information* (1990)
- Jan Tschichold: *The New Typography* (1928)

### Examples
- Scientific journals (Nature, Science)
- Financial tables (WSJ)
- Statistical reports (R graphics)
- Academic papers (LaTeX)

## Implementation Notes

### React Native Limitations

**Serif Fonts:**
React Native defaults to sans-serif. For serif:
```typescript
fontFamily: 'Georgia' // Widely supported
```

**Tabular Numbers:**
```typescript
fontVariant: ['tabular-nums'] // iOS 9+, Android 5+
```

**Small Caps:**
Approximated with:
```typescript
textTransform: 'uppercase'
fontSize: smaller
letterSpacing: 1
```

### Web vs Native

Design system works identically on:
- Web (React Native Web)
- iOS (native)
- Android (native)

No platform-specific variations needed.

## Future Enhancements

**Possible Additions:**
1. PDF export (for print)
2. LaTeX-style equations (for formulas)
3. Citation system (for sources)
4. Version history (for forecast updates)

**Not Planned:**
- Dark mode (reduces contrast)
- Themes (dilutes consistency)
- Animations (unnecessary)
- Emoji (unprofessional)

---

## Summary

**Three Words:**
Clear. Dense. Functional.

**Core Belief:**
Good design makes information accessible. Great design makes information compelling.

**Result:**
An app that looks like a scientific paper, not a social media feed. As it should be for serious forecasting.
