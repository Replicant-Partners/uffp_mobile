# Agent Workflow Guide

## Complete Agent Addition Flow

The agent system is fully functional. Here's the correct workflow:

### 1. Create a Forecast
```
/question Will Tesla reach 5M deliveries in 2025?
```

### 2. Add a Driver
```
/driver Production capacity
```
This enters driver configuration mode.

### 3. Configure Driver Parameters
```
/type continuous
/p 3000000 4500000 6000000
/dist triangular
/direction increases
```

### 4. Add an Agent to the Driver
While still in driver config, mention an agent:
```
@research_analyst
```

This enters agent configuration mode.

### 5. Configure the Agent
```
/query What is Tesla's current production capacity and expansion plans?
/schedule daily
/save
```

The agent is now attached to the driver.

### 6. Add More Agents (Optional)
```
@competitive_intel
/query Track Tesla competitors' production capacity
/schedule weekly  
/save
```

### 7. Save the Driver
```
/save
```

### 8. Run Agent Research
You can run agent research at any time:
```
/run @research_analyst
```

## Available Commands

### In Agent Configuration Mode
- `/query <text>` - Set what the agent should research
- `/schedule <daily|weekly|on-demand>` - Set update frequency
- `/save` - Save agent to current driver
- `/cancel` - Cancel agent configuration
- `/run @agent_name` - Execute agent research immediately

### Agent List
Use `/agent-list` to see all 11 available agents:
- @research_analyst - Deep research with citations
- @sentiment_monitor - Social sentiment scoring
- @competitive_intel - Competitor tracking
- @financial_analyst - Financial analysis
- @market_researcher - Market sizing
- @expert_synthesizer - Synthesize expert opinions
- @regulatory_monitor - Policy changes
- @growth_signals - User adoption metrics
- @hiring_tracker - Hiring trends
- @pricing_intel - Pricing trends
- @technology_validator - Tech feasibility

## Key Points

1. **Context Matters**: Agents can only be added while configuring a driver
2. **@fermi is Special**: @fermi works anywhere for AI coaching
3. **Multiple Agents**: You can add multiple agents to one driver
4. **Execute Anytime**: Use `/run @agent_name` to execute research

## Troubleshooting

### "Agents can only be attached to drivers"
You tried to use @agent outside of driver configuration. 
Solution: First use `/driver <name>` to enter driver config mode.

### "@fermi not working"
@fermi should always work. Make sure you're typing it correctly.

### "Agent not found"
Check agent name with `/agent-list`. Names use underscores like `@research_analyst`.

## Example Complete Flow

```bash
# Start
/question Will Apple Vision Pro sell 1M units in 2024?

# Add driver
/driver Consumer adoption rate

# Configure driver
/p 100000 500000 1000000
/dist lognormal
/direction increases

# Add research agent
@market_researcher
/query What is the current VR/AR market size and adoption trends?
/schedule weekly
/save

# Add another agent
@sentiment_monitor
/query Track social media sentiment about Vision Pro
/schedule daily
/save

# Save driver
/save

# Run research
/run @market_researcher
```

The workflow is complete and functional!
