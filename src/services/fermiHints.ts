/**
 * Fermi Estimation Context Service
 * Provides decomposition hints, calibration anchors, and sanity checks for drivers
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
      reasoning: "Markets smaller than $10M are typically niche; larger than $500B are rare (only ~20 companies globally)",
    },
    exampleCalculation: "SaaS TAM example: 10M potential businesses × 5% adoption × $5K ACV = $2.5B TAM",
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
      reasoning: "Sustained growth >100% is rare; decline >20% suggests dying market",
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
      reasoning: "Conversion <0.1% suggests broken funnel; >60% suggests strong FOMO or very qualified audience",
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
      reasoning: "Penetration >95% is very rare (near-universal adoption); <0.1% is negligible",
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
      reasoning: "Milestones <1 month are operational, not strategic; >20 years have too much uncertainty",
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
      reasoning: "Revenue <$10K isn't a business; >$500B is top-10 company globally",
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
      reasoning: "Costs <$1K are negligible for business; >$100B is mega-project scale",
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
      reasoning: "Very few events are <0.1% or >99.9% certain within relevant timeframes",
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
      reasoning: "Valuation <$1M isn't venture-scale; >$5T exceeds largest companies",
    },
    exampleCalculation: "$100M ARR × 10x multiple × 80% growth discount = $800M valuation",
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
      reasoning: "DAU <100 is hobby-scale; >5B is unrealistic (only 5.3B internet users)",
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
export function generateFermiGuidance(driverName: string, driverType: string): string {
  const hint = getFermiHints(driverName);

  if (!hint) {
    return `Think through: What are the key factors? What historical data exists? What's a reasonable range?`;
  }

  let guidance = `💡 Fermi Decomposition:\n\n`;

  // Show decomposition
  guidance += `Break it down:\n`;
  hint.decomposition.forEach((step, i) => {
    guidance += `${i + 1}. ${step}\n`;
  });

  // Show anchors
  if (hint.anchors.length > 0) {
    guidance += `\n📊 Calibration Anchors:\n`;
    hint.anchors.forEach(anchor => {
      guidance += `• ${anchor.metric}: ${anchor.value}\n`;
    });
  }

  // Show sanity bounds
  guidance += `\n✓ Sanity Check:\n`;
  guidance += `Realistic range: ${hint.sanityBounds.min} to ${hint.sanityBounds.max}\n`;
  guidance += `Why: ${hint.sanityBounds.reasoning}\n`;

  // Show example if available
  if (hint.exampleCalculation) {
    guidance += `\n📝 Example:\n${hint.exampleCalculation}\n`;
  }

  return guidance;
}

/**
 * Get suggested bounds based on Fermi analysis
 */
export function suggestBounds(driverName: string): { p5: number; p50: number; p95: number } | null {
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
