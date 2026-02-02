import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from '../cors';
import { RESEARCH_PROMPT_TEMPLATES } from '../../lib/config';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  setCorsHeaders(res);
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    return res.status(200).json({
      prompts: RESEARCH_PROMPT_TEMPLATES,
    });
  } catch (error) {
    console.error('Error fetching prompts:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
