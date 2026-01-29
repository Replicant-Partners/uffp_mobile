export const GLOSSARY = {
  BRIER_SCORE: {
    term: "Brier Score",
    definition:
      "A measure of probabilistic forecast accuracy calculated as the mean squared difference between predicted probabilities and actual outcomes. Scores range from 0.0 (perfect) to 1.0 (worst possible). Lower scores indicate better calibrated predictions.",
    example:
      "If you forecast 70% probability that ASTS reaches $150M revenue and it does happen, your Brier score is (0.70 - 1.0)² = 0.09. If it doesn't happen, the score is (0.70 - 0.0)² = 0.49.",
  },

  CALIBRATION: {
    term: "Calibration",
    definition:
      "The alignment between stated confidence levels and actual outcomes. A well-calibrated forecaster's 70% predictions come true approximately 70% of the time. Calibration is independent of resolution (ability to discriminate between outcomes).",
    example:
      'If you make 100 predictions at "60% confident" and 61 come true, you are well-calibrated at that confidence level. If only 40 come true, you are overconfident.',
  },

  CALIBRATION_INDEX: {
    term: "Calibration Index",
    definition:
      "A single number (0-1) summarizing calibration quality across all confidence levels. Values above 0.85 indicate good calibration. Calculated by measuring the deviation between predicted and actual frequencies.",
    example:
      "A calibration index of 0.88 means your probability estimates align well with reality. Values below 0.75 suggest systematic over- or under-confidence.",
  },

  MONTE_CARLO: {
    term: "Monte Carlo Simulation",
    definition:
      "A computational method that runs thousands of iterations with random sampling from specified probability distributions. Each driver is sampled independently, then multiplied together to generate a revenue outcome. 10,000 iterations create a distribution of plausible futures.",
    example:
      "For a forecast with 3 drivers, we sample 10,000 times: [Users × ARPU × Conversion Rate]. This produces 10,000 revenue scenarios, from which we calculate P10/P50/P90 percentiles.",
  },

  P10_P50_P90: {
    term: "P10 / P50 / P90",
    definition:
      "Percentile markers in a probability distribution. P50 (median) is the most likely outcome. P10 is the pessimistic scenario (only 10% chance of worse). P90 is optimistic (only 10% chance of better). The spread shows uncertainty.",
    example:
      "P10: $80M, P50: $120M, P90: $180M means there's a 50% chance revenue falls between $80M and $180M, with $120M as the median expectation.",
  },

  BASE_RATE: {
    term: "Base Rate",
    definition:
      'The historical frequency of an outcome in a reference class. Part of the "outside view" in Tetlock methodology. Anchoring on base rates prevents overconfidence by grounding predictions in historical data before adjusting for specific factors.',
    example:
      "If 15% of late-stage tech startups reach $150M revenue within 3 years, that's the base rate. You start at 15% and adjust up or down based on company-specific factors.",
  },

  TETLOCK_METHOD: {
    term: "Tetlock Superforecasting",
    definition:
      "A forecasting methodology developed by Philip Tetlock emphasizing: (1) outside view/base rates, (2) probabilistic thinking, (3) systematic updates, (4) Fermi decomposition, (5) pre-mortem analysis. Tetlock's research showed these techniques improve accuracy significantly.",
    example:
      'Instead of saying "ASTS will succeed," a superforecaster says "65% probability ASTS reaches $150M revenue by 2027, based on 12% base rate for satellite communications companies, adjusted for strong technical team and regulatory tailwinds."',
  },

  TRIANGULAR_DISTRIBUTION: {
    term: "Triangular Distribution",
    definition:
      "A probability distribution defined by three parameters: low (pessimistic), mode (most likely), and high (optimistic). Forms a triangle shape. Use when you have expert judgment or qualitative evidence about min/max/most-likely but no detailed historical data. Allows asymmetric ranges (long tail on one side).",
    example:
      "User Growth: Low=50k (worst case from competitor analysis), Mode=120k (base case from sales pipeline), High=250k (best case if viral growth happens). The peak at 120k shows that's most likely, with gradual probability decline to 50k and 250k extremes.",
  },

  NORMAL_DISTRIBUTION: {
    term: "Normal Distribution",
    definition:
      "Bell curve distribution defined by mean (center) and standard deviation (spread). Symmetric around the mean. Use when you have historical data showing natural variation around a central value, or when central limit theorem applies (many independent factors averaging out).",
    example:
      "ARPU (Average Revenue Per User): Mean=$45/month (from 2 years of data), StdDev=$8 (observed variation). Use Normal when past data shows customers cluster around $45 with symmetric variation. 68% fall within ±$8, 95% within ±$16.",
  },

  UNIFORM_DISTRIBUTION: {
    term: "Uniform Distribution",
    definition:
      "Flat distribution where every value in a range is equally likely. No value is more probable than another. Use when you have genuine ignorance within bounds, or when outcomes are truly random/evenly distributed (rare in business forecasting).",
    example:
      'Market Entry Timing: Min=3 months, Max=9 months. Use Uniform only if you truly believe month 4, 5, 6, 7, 8 are all equally likely. Warning: This is often misused—most variables have a "most likely" value, making Triangular more appropriate.',
  },

  BETA_DISTRIBUTION: {
    term: "Beta Distribution",
    definition:
      "Flexible bounded distribution (0-1 or rescaled) with two shape parameters (alpha, beta). Can be symmetric, skewed, U-shaped, or J-shaped. Use for variables bounded by min/max with complex shapes, or for probabilities/percentages with evidence-based priors.",
    example:
      "Conversion Rate: Bounded 0-100%, historical data shows right-skewed shape (most outcomes 2-8%, rare spikes to 15%). Beta(2,8) creates appropriate right-skewed shape. More sophisticated than Triangular for bounded variables with data.",
  },

  FERMI_DECOMPOSITION: {
    term: "Fermi Decomposition",
    definition:
      "Breaking a complex forecast into independent components that multiply together. Named after physicist Enrico Fermi. Each component has its own probability distribution. The product of distributions yields the final forecast range.",
    example:
      "Revenue = Users × Conversion Rate × ARPU. Instead of guessing total revenue directly, estimate each driver independently, then multiply. This forces explicit reasoning about each assumption.",
  },

  SUCCESS_PROBABILITY: {
    term: "Success Probability",
    definition:
      'The proportion of Monte Carlo iterations where the outcome exceeds a specified target threshold. Calculated as: (number of iterations ≥ target) / total iterations. Provides a single-number answer to "will we hit the goal?"',
    example:
      "If 6,800 out of 10,000 iterations show revenue ≥ $150M, the success probability is 68%. This means roughly 2-in-3 chance of hitting the target.",
  },

  DISTRIBUTION_TYPE: {
    term: "Distribution Type",
    definition:
      "The shape of probability assigned to a variable. Normal (bell curve) for symmetric uncertainty, Triangular for expert judgment with min/mode/max, Uniform when all values in a range are equally likely, Beta for bounded variables with shape parameters.",
    example:
      "Use Normal for ARPU (customer spending varies symmetrically), Triangular for user growth (you have high/low/mode estimates), Uniform when you genuinely have no idea within a range.",
  },

  VARIANCE: {
    term: "Variance",
    definition:
      "The spread of a probability distribution, measuring uncertainty. Calculated as (P90 - P10) / P50 × 100%. Higher variance means wider range of plausible outcomes. Reflects epistemic uncertainty in your forecast drivers.",
    example:
      "Variance of 80% means P90 is 80% higher than P50, indicating high uncertainty. Variance of 30% suggests a tight, confident forecast. Early-stage companies typically have 100%+ variance.",
  },

  PREMORTEM: {
    term: "Pre-mortem Analysis",
    definition:
      "A technique where you imagine the forecast failed and work backwards to identify reasons why. Forces consideration of tail risks and hidden assumptions. Popularized by Gary Klein, integrated into Tetlock methodology.",
    example:
      "\"Imagine it's 2027 and ASTS didn't reach $150M. Why?\" Answers might include: regulatory delays, competitor success, technical failures, market contraction. Each becomes an adjustment factor in your forecast.",
  },
};
