import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from '../cors';
import { executeResearch } from '../../lib/agents';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  setCorsHeaders(res);

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { agentId, promptId, variables } = req.body;

    if (!agentId || !promptId || !variables) {
      return res.status(400).json({
        error: 'Missing required fields: agentId, promptId, variables',
      });
    }

    // Execute research using real LLM
    const result = await executeResearch({
      agentId,
      promptId,
      variables,
    });

    // TODO: Save to database (saveResearchResult function needs to be implemented)
    // Database save skipped for now

    return res.status(200).json({ success: true, result });
  } catch (error) {
    console.error('Agent execution error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
