import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from './cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('Step 1: Importing executeResearch...');
    const { executeResearch } = await import('../lib/agents');
    console.log('Step 2: Import successful');

    console.log('Step 3: Calling executeResearch...');
    const result = await executeResearch({
      agentId: 'research_analyst',
      promptId: 'market_tam_sizing',
      variables: {
        MARKET_SEGMENT: 'satellite communications',
        GEOGRAPHY: 'United States',
      },
    });
    console.log('Step 4: Execution complete');

    return res.status(200).json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Test agent error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}
