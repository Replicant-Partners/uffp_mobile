# UFFP Backend

Lightweight backend for UFFP Mobile research agents.

## Environment Variables

Required environment variables for deployment:

```bash
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key
KV_URL=your_vercel_kv_url
KV_REST_API_URL=your_vercel_kv_rest_url
KV_REST_API_TOKEN=your_vercel_kv_token
KV_REST_API_READ_ONLY_TOKEN=your_vercel_kv_read_only_token
```

## Deployment

1. Install dependencies:

```bash
npm install
```

2. Deploy to Vercel:

```bash
vercel --prod
```

## API Endpoints

- `POST /api/agents/execute` - Execute research agent
- `GET /api/prompts/templates` - Get available prompt templates
- `POST /api/research/schedule` - Schedule research
- `GET /api/research/schedule` - Get scheduled research
- `GET /api/research/results` - Get research results

## Usage Example

```bash
curl -X POST https://uffp-backend.vercel.app/api/agents/execute \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "research_analyst",
    "promptId": "market_tam_sizing",
    "variables": {
      "MARKET_SEGMENT": "Cloud Infrastructure",
      "GEOGRAPHY": "United States"
    }
  }'
```
# Trigger redeploy
