import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from './cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(200).json({
    success: true,
    message: 'Test endpoint working',
    timestamp: new Date().toISOString(),
    env: {
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
      keyPrefix: process.env.ANTHROPIC_API_KEY?.substring(0, 15) + '...'
    }
  });
}
