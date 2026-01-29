import { ForecastDriver, SimulationResult, ForecastConfig } from '../types';

class ForecastService {
  /**
   * Runs Monte Carlo simulation (simplified for mobile)
   */
  async runSimulation(
    drivers: ForecastDriver[],
    iterations: number = 10000
  ): Promise<SimulationResult> {
    const results: number[] = [];

    for (let i = 0; i < iterations; i++) {
      let value = 1;

      for (const driver of drivers) {
        const sample = this.sampleFromDistribution(driver);
        value *= sample;
      }

      results.push(value);
    }

    results.sort((a, b) => a - b);

    const p10 = results[Math.floor(iterations * 0.1)];
    const p50 = results[Math.floor(iterations * 0.5)];
    const p90 = results[Math.floor(iterations * 0.9)];
    const mean = results.reduce((sum, v) => sum + v, 0) / iterations;
    const variance = results.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / iterations;
    const stdDev = Math.sqrt(variance);

    const histogram = this.createHistogram(results, 50);

    return {
      p10,
      p50,
      p90,
      mean,
      stdDev,
      probabilityAboveTarget: 0,
      histogram,
    };
  }

  private sampleFromDistribution(driver: ForecastDriver): number {
    switch (driver.distributionType) {
      case 'triangular':
        return this.sampleTriangular(
          driver.parameters.low!,
          driver.parameters.mode!,
          driver.parameters.high!
        );
      case 'normal':
        return this.sampleNormal(driver.parameters.mean!, driver.parameters.stdDev!);
      case 'uniform':
        return this.sampleUniform(driver.parameters.low!, driver.parameters.high!);
      case 'beta':
        return this.sampleBeta(driver.parameters.alpha!, driver.parameters.beta!);
      default:
        return driver.parameters.mean || 1;
    }
  }

  private sampleTriangular(low: number, mode: number, high: number): number {
    const u = Math.random();
    const f = (mode - low) / (high - low);

    if (u < f) {
      return low + Math.sqrt(u * (high - low) * (mode - low));
    } else {
      return high - Math.sqrt((1 - u) * (high - low) * (high - mode));
    }
  }

  private sampleNormal(mean: number, stdDev: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z0 * stdDev;
  }

  private sampleUniform(low: number, high: number): number {
    return low + Math.random() * (high - low);
  }

  private sampleBeta(alpha: number, beta: number): number {
    const samples = 12;
    let sum = 0;
    for (let i = 0; i < samples; i++) {
      sum += Math.random();
    }
    return sum / samples;
  }

  private createHistogram(data: number[], bins: number) {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const binWidth = (max - min) / bins;

    const histogram = Array(bins).fill(0);

    data.forEach((value) => {
      const binIndex = Math.min(Math.floor((value - min) / binWidth), bins - 1);
      histogram[binIndex]++;
    });

    return histogram.map((count, i) => ({
      value: min + (i + 0.5) * binWidth,
      count,
    }));
  }

  /**
   * Calculate Brier Score
   */
  calculateBrierScore(probability: number, outcome: boolean): number {
    const actualValue = outcome ? 1.0 : 0.0;
    return Math.pow(probability - actualValue, 2);
  }

  /**
   * Get example forecasts for demo
   */
  getExampleForecasts(): ForecastConfig[] {
    return [
      {
        ticker: 'ASTS',
        targetMetric: 'revenue',
        targetValue: 150,
        targetDate: '2026-12-31',
        drivers: [
          {
            name: 'Subscribers',
            description: 'Active subscribers by end of 2026',
            distributionType: 'triangular',
            parameters: { low: 100000, mode: 500000, high: 2000000 },
            unit: 'users',
          },
          {
            name: 'ARPU',
            description: 'Average revenue per user per month',
            distributionType: 'normal',
            parameters: { mean: 15, stdDev: 3 },
            unit: 'USD/month',
          },
          {
            name: 'Service Months',
            description: 'Average months of service in 2026',
            distributionType: 'uniform',
            parameters: { low: 6, high: 12 },
            unit: 'months',
          },
        ],
        baserate: {
          description: '20% of pre-revenue satellite companies meet 24-month projections',
          probability: 0.2,
          source: 'Space Capital Reports',
        },
        premortem: [
          { scenario: 'Technical', failureMode: 'Satellite deployment delays' },
          { scenario: 'Market', failureMode: 'Lower subscriber adoption' },
          { scenario: 'Regulatory', failureMode: 'Spectrum licensing issues' },
        ],
      },
      {
        ticker: 'RKLB',
        targetMetric: 'revenue',
        targetValue: 200,
        targetDate: '2026-12-31',
        drivers: [
          {
            name: 'Launch Cadence',
            description: 'Number of launches per year',
            distributionType: 'triangular',
            parameters: { low: 18, mode: 24, high: 30 },
            unit: 'launches/year',
          },
          {
            name: 'Avg Launch Price',
            description: 'Average revenue per launch',
            distributionType: 'normal',
            parameters: { mean: 7.5, stdDev: 1.2 },
            unit: 'M USD',
          },
          {
            name: 'Space Systems Revenue',
            description: 'Satellite manufacturing revenue',
            distributionType: 'triangular',
            parameters: { low: 50, mode: 80, high: 120 },
            unit: 'M USD',
          },
        ],
        baserate: {
          description: '40% of launch providers achieve revenue targets',
          probability: 0.4,
          source: 'Industry Analysis',
        },
        premortem: [
          { scenario: 'Competition', failureMode: 'SpaceX price pressure' },
          { scenario: 'Technical', failureMode: 'Neutron delays' },
          { scenario: 'Market', failureMode: 'Lower satellite demand' },
        ],
      },
    ];
  }
}

export const forecastService = new ForecastService();
