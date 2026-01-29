# UFFP Mobile App

Universal Forecasting & Fermi Problems mobile application built with React Native and Expo.

## Overview

This mobile app implements probabilistic forecasting using the Tetlock methodology, allowing users to:
- Create and track forecasts with Monte Carlo simulations
- Build forecasts using triangular, normal, beta, and uniform distributions
- Calculate Brier scores for forecast accuracy
- View calibration and performance metrics
- Use research prompts and evidence management

## Features

- **Forecast Creation**: Build forecasts with multiple drivers and distribution types
- **Monte Carlo Simulation**: Run 10,000+ iterations for probabilistic outcomes
- **Evidence Manager**: Track research, data sources, and key findings
- **Calibration Tracking**: Monitor your forecasting accuracy over time
- **Brier Score Calculation**: Quantify forecast performance
- **Comparison Tools**: Compare forecasts side-by-side
- **Tufte-inspired Design**: Clean, information-dense visual design

## Tech Stack

- **Framework**: React Native 0.81.5
- **UI**: Expo 54.x
- **Navigation**: React Navigation 7.x
- **Charts**: react-native-chart-kit, react-native-svg
- **Language**: TypeScript 5.9

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on specific platform
npm run ios       # iOS simulator
npm run android   # Android emulator
npm run web       # Web browser
```

### Project Structure

```
├── src/
│   ├── components/       # Reusable UI components
│   ├── screens/          # Screen components
│   ├── services/         # Business logic (forecasting, simulation)
│   ├── types/            # TypeScript type definitions
│   ├── constants/        # Research prompts, glossary
│   ├── styles/           # Tufte-inspired styling
│   └── App.tsx           # Root component
├── assets/               # Images, fonts
├── App.tsx               # Entry point
└── package.json
```

## Key Components

### Screens
- **HomeScreen**: Main forecast list and leaderboard
- **CreateForecastScreen**: Build new forecasts with drivers
- **ForecastDetailScreen**: View simulation results
- **CompareScreen**: Compare multiple forecasts
- **CalibrationScreen**: Track forecasting accuracy
- **BrierScoreScreen**: Performance metrics

### Services
- **ForecastService**: Monte Carlo simulation engine
  - Triangular, normal, uniform, beta distributions
  - Histogram generation
  - Brier score calculation

## Documentation

- [Design Principles](DESIGN.md)
- [Quick Start Guide](QUICKSTART.md)
- [Agent Forecasting Guide](AGENT_FORECASTING_GUIDE.md)
- [Troubleshooting](TROUBLESHOOTING.md)

## Forecasting Methodology

This app implements:
- **Fermi Estimation**: Break down complex questions into estimatable components
- **Base Rates**: Ground forecasts in historical frequencies
- **Premortem Analysis**: Identify potential failure modes
- **Monte Carlo Simulation**: Probabilistic modeling with distribution parameters
- **Brier Scores**: Quantitative accuracy measurement

## Example Use Cases

- Forecasting company revenue (e.g., ASTS, RKLB)
- Market cap predictions
- Profitability milestones
- Any quantifiable future outcome

## Development

### Adding New Distribution Types

Edit `src/services/forecastService.ts` and add new sampling methods:

```typescript
private sampleCustomDistribution(params: CustomParams): number {
  // Implementation
}
```

### Customizing Research Prompts

Edit `src/constants/researchPrompts.ts` to add domain-specific prompts.

## Related Projects

- [UFFP Core](https://github.com/Replicant-Partners/uffp) - Core forecasting logic and plugin ecosystem
- [UFFP Plugin](https://github.com/Replicant-Partners/uffp/tree/main/packages/plugin-eliza) - ElizaOS integration

## License

MIT - See LICENSE file for details

## Contributing

Issues and PRs welcome at https://github.com/Replicant-Partners/uffp-mobile

## Support

For questions or issues, please open a GitHub issue.
