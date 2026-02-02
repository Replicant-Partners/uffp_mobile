/**
 * Fermi Estimation Context Service
 * Provides decomposition hints, calibration anchors, and sanity checks for drivers
 *
 * NOTE: Will integrate with AKP (Agent Knowledge Protocol) once deployed to:
 * - Learn from user decomposition patterns across all forecasts
 * - Suggest hints based on collective intelligence (what worked for similar questions)
 * - Personalize anchors and sanity bounds based on user's calibration history
 * - Recommend optimal agent collaborations (e.g., @research_analyst for market data)
 */

export interface FermiHint {
  driverPattern: RegExp;
  decomposition: string[];
  anchors: {
    metric: string;
    value: string;
    source?: string;
  }[];
  sanityBounds: {
    min: string;
    max: string;
    reasoning: string;
  };
  exampleCalculation?: string;
}

export const FERMI_HINTS: FermiHint[] = [
  // ===== GENERAL / CROSS-DOMAIN HINTS =====

  // Population / demographic estimates
  {
    driverPattern: /population|people|individuals|citizens|residents/i,
    decomposition: [
      "Start with total population of region/country",
      "× Percentage in relevant demographic (age, location, etc.)",
      "Adjust for specific criteria (occupation, behavior, etc.)",
      "Consider growth/decline trends",
    ],
    anchors: [
      { metric: "World population", value: "8.1B people" },
      { metric: "US population", value: "335M people" },
      { metric: "China population", value: "1.4B people" },
      { metric: "EU population", value: "450M people" },
      { metric: "Average city", value: "100K-500K people" },
      { metric: "Major metro area", value: "5M-20M people" },
    ],
    sanityBounds: {
      min: "1,000",
      max: "8B",
      reasoning:
        "Smaller than 1K is a tiny group; larger than 8B exceeds world population",
    },
    exampleCalculation:
      "US adults with college degrees: 335M × 65% (adults) × 38% (college) ≈ 83M",
  },

  // Event occurrence / frequency
  {
    driverPattern: /how often|frequency|occurrence|rate of|number of times/i,
    decomposition: [
      "Total population or system size",
      "× Individual probability or rate",
      "× Time period (daily, monthly, yearly)",
      "Consider seasonal or cyclical patterns",
    ],
    anchors: [
      { metric: "US births per year", value: "~3.6M" },
      { metric: "US deaths per year", value: "~3.3M" },
      { metric: "Global airline flights per day", value: "~100K" },
      { metric: "Earthquakes magnitude 5+ per year", value: "~1,500" },
      { metric: "US presidential elections", value: "Every 4 years" },
    ],
    sanityBounds: {
      min: "0.01/year",
      max: "1M/day",
      reasoning:
        "Events less than 0.01/year are extremely rare; more than 1M/day requires massive scale",
    },
    exampleCalculation:
      "Heart attacks in US per day: 335M people × 805K/year ÷ 365 ≈ 2,200/day",
  },

  // Time duration estimates
  {
    driverPattern: /how long|duration|time to|timeline|takes to/i,
    decomposition: [
      "Break into sequential stages or phases",
      "Estimate duration of each stage independently",
      "Add buffer for dependencies and unknowns (20-50%)",
      "Consider parallel vs sequential work",
    ],
    anchors: [
      { metric: "Human gestation", value: "9 months" },
      { metric: "K-12 education", value: "13 years" },
      { metric: "Bachelor's degree", value: "4 years" },
      { metric: "PhD completion", value: "5-7 years" },
      { metric: "Clinical trial (drug)", value: "6-10 years" },
      { metric: "Infrastructure project", value: "3-15 years" },
      { metric: "Social movement tipping point", value: "10-30 years" },
    ],
    sanityBounds: {
      min: "1 week",
      max: "50 years",
      reasoning:
        "Projects under 1 week are tactical; over 50 years involves generational change",
    },
  },

  // Distance / geographic scale
  {
    driverPattern: /distance|how far|miles|kilometers|travel|range/i,
    decomposition: [
      "Identify start and end points",
      "Consider direct vs actual path",
      "Account for terrain, obstacles, or route constraints",
      "Factor in transportation method limits",
    ],
    anchors: [
      { metric: "Marathon", value: "26.2 miles / 42 km" },
      { metric: "US coast to coast", value: "~3,000 miles / 4,800 km" },
      { metric: "Earth's circumference", value: "~25,000 miles / 40,000 km" },
      { metric: "Earth to Moon", value: "240,000 miles / 384,000 km" },
      { metric: "Daily walking range", value: "5-20 miles" },
      { metric: "Electric vehicle range", value: "200-400 miles" },
    ],
    sanityBounds: {
      min: "0.1 miles",
      max: "100M miles",
      reasoning:
        "Shorter than 0.1mi is local; beyond 100M mi is interplanetary",
    },
  },

  // Quantity / volume of physical items
  {
    driverPattern:
      /\bhow many\b|\bquantity of\b|\bvolume of\b|\bamount of\b|\bnumber of (items|objects|things|units)\b|\bcount of\b/i,
    decomposition: [
      "Define the unit clearly (items, people, events, etc.)",
      "Identify the containing system or population",
      "Calculate rate or density",
      "Multiply by relevant dimension (time, space, population)",
    ],
    anchors: [
      { metric: "Books in Library of Congress", value: "~17M books" },
      { metric: "Cars in US", value: "~280M vehicles" },
      { metric: "Trees on Earth", value: "~3 trillion" },
      { metric: "Neurons in human brain", value: "~86 billion" },
      { metric: "Stars in Milky Way", value: "~100 billion" },
      { metric: "Grains of sand on beach", value: "~10 quintillion" },
    ],
    sanityBounds: {
      min: "1",
      max: "10^25",
      reasoning:
        "Below 1 doesn't exist; above 10^25 exceeds atomic scale for Earth",
    },
  },

  // Success rate / effectiveness
  {
    driverPattern: /success rate|effectiveness|works|failure rate|accuracy/i,
    decomposition: [
      "Base rate: how often this works in general?",
      "Specific factors that improve success",
      "Specific factors that reduce success",
      "Adjust from base rate using those factors",
    ],
    anchors: [
      { metric: "Medical diagnosis accuracy (expert)", value: "80-95%" },
      { metric: "Weather forecast (1-day)", value: "~90% accurate" },
      { metric: "Weather forecast (7-day)", value: "~80% accurate" },
      {
        metric: "Cancer screening sensitivity",
        value: "70-95% depending on type",
      },
      { metric: "Lie detector accuracy", value: "~70% (controversial)" },
      { metric: "Expert forecaster calibration", value: "75-85%" },
    ],
    sanityBounds: {
      min: "5%",
      max: "99.9%",
      reasoning:
        "Below 5% is nearly useless; above 99.9% is near-perfect and rare in complex systems",
    },
  },

  // Energy / power consumption
  {
    driverPattern: /energy|power|electricity|consumption|watts|joules/i,
    decomposition: [
      "Power rating of device or system (watts)",
      "× Usage duration (hours per day/year)",
      "× Number of units",
      "Convert to desired unit (kWh, MWh, etc.)",
    ],
    anchors: [
      { metric: "LED bulb", value: "10 watts" },
      { metric: "Laptop", value: "50-100 watts" },
      { metric: "US home average", value: "900 kWh/month" },
      { metric: "Electric car battery", value: "60-100 kWh" },
      { metric: "Wind turbine (large)", value: "2-3 MW" },
      { metric: "Nuclear power plant", value: "~1,000 MW (1 GW)" },
    ],
    sanityBounds: {
      min: "1 watt",
      max: "1 TW",
      reasoning:
        "Below 1W is negligible; above 1TW is global-scale infrastructure",
    },
    exampleCalculation:
      "City lighting: 1M people × 2 lights/person × 10W × 12 hrs/day ÷ 1000 = 240 MWh/day",
  },

  // Information / data volume
  {
    driverPattern:
      /\bdata (volume|size|storage)\b|information storage|bytes|gigabytes|terabytes|files stored|documents stored|database size/i,
    decomposition: [
      "Number of items (files, photos, records)",
      "× Average size per item",
      "Consider compression and format efficiency",
      "Account for redundancy and backups",
    ],
    anchors: [
      { metric: "Text character", value: "1 byte" },
      { metric: "Digital photo (high-res)", value: "5-10 MB" },
      { metric: "Song (MP3)", value: "3-5 MB" },
      { metric: "Movie (HD)", value: "4-8 GB" },
      { metric: "Human genome", value: "~750 MB" },
      { metric: "Library of Congress (digitized)", value: "~20 TB" },
      { metric: "Internet total data (2024)", value: "~175 ZB" },
    ],
    sanityBounds: {
      min: "1 KB",
      max: "1 YB",
      reasoning:
        "Below 1KB is trivial; above 1 yottabyte exceeds all human data",
    },
  },

  // Speed / velocity
  {
    driverPattern: /speed|velocity|rate|pace|mph|kilometers per/i,
    decomposition: [
      "Distance to be covered",
      "÷ Time available or typical",
      "Consider acceleration and deceleration",
      "Account for obstacles, traffic, or medium (air, water)",
    ],
    anchors: [
      { metric: "Walking speed", value: "3 mph / 5 km/h" },
      { metric: "Running speed", value: "6-8 mph / 10-13 km/h" },
      { metric: "Cycling speed", value: "12-15 mph / 20-24 km/h" },
      { metric: "Car (highway)", value: "60-75 mph / 100-120 km/h" },
      { metric: "Commercial airplane", value: "500-600 mph / 800-965 km/h" },
      { metric: "Speed of sound", value: "767 mph / 1,235 km/h" },
      { metric: "Speed of light", value: "670M mph / 1.08B km/h" },
    ],
    sanityBounds: {
      min: "0.1 mph",
      max: "670M mph",
      reasoning:
        "Below 0.1mph is barely moving; above light speed violates physics",
    },
  },

  // ===== DOMAIN-SPECIFIC HINTS (FINANCIAL) =====

  // Market size / TAM estimation
  {
    driverPattern: /market size|tam|total addressable market|market potential/i,
    decomposition: [
      "Total population in target geography",
      "× Percentage who could use product (addressable)",
      "× Percentage likely to adopt (realistic penetration)",
      "× Average revenue per user/customer",
    ],
    anchors: [
      { metric: "US population", value: "330M people" },
      { metric: "US households", value: "130M households" },
      { metric: "Global internet users", value: "5.3B people" },
      { metric: "US smartphone users", value: "310M people" },
      { metric: "B2B companies (US)", value: "33M businesses" },
    ],
    sanityBounds: {
      min: "$10M",
      max: "$500B",
      reasoning:
        "Markets smaller than $10M are typically niche; larger than $500B are rare (only ~20 companies globally)",
    },
    exampleCalculation:
      "SaaS TAM example: 10M potential businesses × 5% adoption × $5K ACV = $2.5B TAM",
  },

  // Growth rate / CAGR
  {
    driverPattern: /growth rate|cagr|annual growth|expansion rate/i,
    decomposition: [
      "Current market size or base value",
      "Expected market size in target year",
      "Number of years between",
      "CAGR = (End/Start)^(1/years) - 1",
    ],
    anchors: [
      { metric: "GDP growth (US)", value: "2-3% annually" },
      { metric: "S&P 500 historical", value: "10% annually" },
      { metric: "Hyper-growth SaaS", value: "50-100% annually" },
      { metric: "Mature market", value: "3-7% annually" },
      { metric: "Declining market", value: "-5% to 0% annually" },
    ],
    sanityBounds: {
      min: "-20%",
      max: "+300%",
      reasoning:
        "Sustained growth >100% is rare; decline >20% suggests dying market",
    },
  },

  // Conversion rate
  {
    driverPattern: /conversion rate|conversion|signup rate|purchase rate/i,
    decomposition: [
      "Top of funnel (visitors, leads, trials)",
      "Quality of targeting/product-market fit",
      "Friction in conversion process",
      "Price point relative to value",
    ],
    anchors: [
      { metric: "E-commerce conversion", value: "2-3%" },
      { metric: "SaaS trial-to-paid", value: "15-25%" },
      { metric: "B2B demo-to-customer", value: "20-30%" },
      { metric: "Email click-through", value: "2-5%" },
      { metric: "Landing page conversion", value: "5-15%" },
    ],
    sanityBounds: {
      min: "0.1%",
      max: "60%",
      reasoning:
        "Conversion <0.1% suggests broken funnel; >60% suggests strong FOMO or very qualified audience",
    },
  },

  // User adoption / penetration
  {
    driverPattern: /adoption rate|penetration|market share|user growth/i,
    decomposition: [
      "Total addressable users/customers",
      "Early adopters (innovators + early adopters = ~16%)",
      "Early/late majority (~68% combined)",
      "Time to reach each stage (S-curve dynamics)",
    ],
    anchors: [
      { metric: "Smartphone adoption (10 years)", value: "85% of US adults" },
      { metric: "Social media penetration", value: "70% of US adults" },
      { metric: "Typical SaaS market leader", value: "10-30% market share" },
      { metric: "Dominant platform (network effects)", value: "50-80% share" },
    ],
    sanityBounds: {
      min: "0.1%",
      max: "95%",
      reasoning:
        "Penetration >95% is very rare (near-universal adoption); <0.1% is negligible",
    },
  },

  // Time to milestone
  {
    driverPattern: /time to|timeline|duration|how long|months to|years to/i,
    decomposition: [
      "Key milestones in sequence",
      "Dependencies between stages",
      "Typical duration for each stage",
      "Risk buffers for unknowns",
    ],
    anchors: [
      { metric: "MVP development", value: "3-6 months" },
      { metric: "Product-market fit", value: "12-24 months" },
      { metric: "FDA drug approval", value: "7-12 years" },
      { metric: "IPO from Series A", value: "6-10 years" },
      { metric: "Infrastructure project", value: "3-10 years" },
    ],
    sanityBounds: {
      min: "1 month",
      max: "20 years",
      reasoning:
        "Milestones <1 month are operational, not strategic; >20 years have too much uncertainty",
    },
  },

  // Revenue / sales
  {
    driverPattern: /revenue|sales|bookings|arr|mrr/i,
    decomposition: [
      "Number of customers",
      "× Average contract value (ACV) or price",
      "× Retention/renewal rate (for recurring)",
      "+ Upsell/expansion revenue",
    ],
    anchors: [
      { metric: "Series A SaaS ARR", value: "$1-3M" },
      { metric: "Series B SaaS ARR", value: "$10-20M" },
      { metric: "IPO-ready SaaS ARR", value: "$100M+" },
      { metric: "SMB SaaS ACV", value: "$5K-50K" },
      { metric: "Enterprise SaaS ACV", value: "$100K-$1M+" },
    ],
    sanityBounds: {
      min: "$10K",
      max: "$500B",
      reasoning:
        "Revenue <$10K isn't a business; >$500B is top-10 company globally",
    },
    exampleCalculation: "1,000 customers × $50K ACV × 90% renewal = $45M ARR",
  },

  // Cost / expense
  {
    driverPattern: /cost|expense|spending|budget|burn rate/i,
    decomposition: [
      "Fixed costs (rent, salaries, infrastructure)",
      "Variable costs (per unit/customer)",
      "One-time costs (setup, development)",
      "Hidden costs (maintenance, support)",
    ],
    anchors: [
      { metric: "Engineer salary (US)", value: "$150K-200K loaded" },
      { metric: "AWS for startup", value: "$1K-50K/month" },
      { metric: "Series A burn rate", value: "$500K-1M/month" },
      { metric: "Customer acquisition cost (CAC)", value: "$500-5K (SaaS)" },
    ],
    sanityBounds: {
      min: "$1K",
      max: "$100B",
      reasoning:
        "Costs <$1K are negligible for business; >$100B is mega-project scale",
    },
  },

  // Probability / likelihood
  {
    driverPattern: /probability|likelihood|chance|odds/i,
    decomposition: [
      "Base rate (how often does this happen historically?)",
      "Specific factors that increase likelihood",
      "Specific factors that decrease likelihood",
      "Update from base rate given those factors",
    ],
    anchors: [
      { metric: "Startup success (exit)", value: "10% survive to exit" },
      { metric: "Series A funding success", value: "10-15% of seed stage" },
      { metric: "FDA approval success", value: "12% of drugs entering trials" },
      { metric: "M&A offer accepted", value: "30-50% of serious offers" },
    ],
    sanityBounds: {
      min: "0.1%",
      max: "99.9%",
      reasoning:
        "Very few events are <0.1% or >99.9% certain within relevant timeframes",
    },
  },

  // Valuation
  {
    driverPattern: /valuation|market cap|worth|equity value/i,
    decomposition: [
      "Revenue or ARR",
      "× Revenue multiple (industry-specific)",
      "Or: Net income × P/E ratio",
      "Adjust for growth rate, margins, market position",
    ],
    anchors: [
      { metric: "Pre-seed valuation", value: "$5-10M" },
      { metric: "Series A valuation", value: "$20-50M" },
      { metric: "SaaS revenue multiple", value: "5-15x ARR" },
      { metric: "Public tech P/E ratio", value: "20-40x earnings" },
      { metric: "Mega-cap tech", value: "$1T-3T" },
    ],
    sanityBounds: {
      min: "$1M",
      max: "$5T",
      reasoning:
        "Valuation <$1M isn't venture-scale; >$5T exceeds largest companies",
    },
    exampleCalculation:
      "$100M ARR × 10x multiple × 80% growth discount = $800M valuation",
  },

  // User metrics (DAU/MAU)
  {
    driverPattern: /dau|mau|daily active|monthly active|user engagement/i,
    decomposition: [
      "Total registered users",
      "× Activation rate (completed onboarding)",
      "× Engagement rate (active in period)",
      "× Frequency (times used per period)",
    ],
    anchors: [
      { metric: "DAU/MAU ratio (good)", value: "20-30%" },
      { metric: "Social network DAU", value: "Millions to billions" },
      { metric: "SaaS product MAU", value: "Thousands to millions" },
      { metric: "Mobile game retention D1/D7/D30", value: "40%/20%/10%" },
    ],
    sanityBounds: {
      min: "100",
      max: "5B",
      reasoning:
        "DAU <100 is hobby-scale; >5B is unrealistic (only 5.3B internet users)",
    },
  },
];

/**
 * Get Fermi hints for a driver name
 */
export function getFermiHints(driverName: string): FermiHint | null {
  const normalized = driverName.toLowerCase().trim();

  for (const hint of FERMI_HINTS) {
    if (hint.driverPattern.test(normalized)) {
      return hint;
    }
  }

  return null;
}

/**
 * Generate contextual Fermi guidance for a driver
 */
export function generateFermiGuidance(
  driverName: string,
  driverType: string,
  currentConfig?: any,
): string {
  const hint = getFermiHints(driverName);

  if (!hint) {
    return `💡 Quick Guide:\n\n📊 Distribution Types:\n• Triangular: Best for most cases (min/likely/max)\n• Normal: Symmetric variation around average\n• Lognormal: Asymmetric, can't be negative, long tail\n\n📈 Direction:\n• increases: Higher values = better outcome\n• decreases: Lower values = better outcome\n\n💭 Think through: What factors matter? What's the realistic range?`;
  }

  let guidance = `💡 Coaching for: ${driverName}\n\n`;

  // Explain current configuration if provided
  if (currentConfig) {
    guidance += `📋 Current Setup:\n`;
    if (currentConfig.type === "continuous") {
      guidance += `• Type: Continuous (uses ${currentConfig.distribution || "triangular"} distribution)\n`;
      guidance += `• Values: p5=${currentConfig.p5}, p50=${currentConfig.p50}, p95=${currentConfig.p95}\n`;
      guidance += `  → Meaning: 5% chance below ${currentConfig.p5}, most likely ${currentConfig.p50}, 5% chance above ${currentConfig.p95}\n`;
    } else {
      guidance += `• Type: Binary (yes/no outcome)\n`;
      guidance += `• Probability: ${currentConfig.probability}%\n`;
    }
    guidance += `• Direction: ${currentConfig.direction || "not set"} (${currentConfig.direction === "increases" ? "higher = better" : "lower = better"})\n\n`;
  }

  // Distribution recommendation
  guidance += `📊 Which Distribution?\n`;
  guidance += `• TRIANGULAR (default): Best for estimates with clear min/max\n`;
  guidance += `• NORMAL: Symmetric clustering (rare in forecasting)\n`;
  guidance += `• LOGNORMAL: Can't be negative, has long tail\n\n`;

  // Show decomposition
  guidance += `🔍 Break It Down:\n`;
  hint.decomposition.forEach((step, i) => {
    guidance += `${i + 1}. ${step}\n`;
  });

  // Show anchors with context
  if (hint.anchors.length > 0) {
    guidance += `\n📊 Reference Points (use to calibrate!):\n`;
    hint.anchors.forEach((anchor) => {
      guidance += `• ${anchor.metric}: ${anchor.value}\n`;
    });
  }

  // Show sanity bounds
  guidance += `\n✓ Sanity Check:\n`;
  guidance += `• Range: ${hint.sanityBounds.min} to ${hint.sanityBounds.max}\n`;
  guidance += `• Why: ${hint.sanityBounds.reasoning}\n`;

  // Show example if available
  if (hint.exampleCalculation) {
    guidance += `\n📝 Example:\n${hint.exampleCalculation}\n`;
  }

  // Direction guidance
  guidance += `\n📈 Direction:\n`;
  guidance += `• "increases": Higher → MORE likely outcome\n`;
  guidance += `• "decreases": Higher → LESS likely outcome\n`;

  // Commands reminder
  guidance += `\n⌨️ Commands: /p 10 50 90 | /dist triangular | /direction increases | /save\n`;

  return guidance;
}

/**
 * Get suggested bounds based on Fermi analysis
 */
export function suggestBounds(
  driverName: string,
): { p5: number; p50: number; p95: number } | null {
  const hint = getFermiHints(driverName);

  if (!hint) {
    return null;
  }

  // Parse sanity bounds to suggest initial values
  // This is a simplified heuristic - users should override
  const minStr = hint.sanityBounds.min;
  const maxStr = hint.sanityBounds.max;

  // Extract numbers (simplified parsing)
  const minMatch = minStr.match(/[\d.]+/);
  const maxMatch = maxStr.match(/[\d.]+/);

  if (!minMatch || !maxMatch) {
    return null;
  }

  const min = parseFloat(minMatch[0]);
  const max = parseFloat(maxMatch[0]);

  // Suggest log-scale distribution for wide ranges
  if (max / min > 100) {
    const logMin = Math.log10(min);
    const logMax = Math.log10(max);
    const logMid = (logMin + logMax) / 2;

    return {
      p5: Math.round(min * 2), // 2x minimum
      p50: Math.round(Math.pow(10, logMid)),
      p95: Math.round(max / 2), // Half of maximum
    };
  }

  // Linear distribution for narrower ranges
  return {
    p5: Math.round(min + (max - min) * 0.15),
    p50: Math.round((min + max) / 2),
    p95: Math.round(min + (max - min) * 0.85),
  };
}
