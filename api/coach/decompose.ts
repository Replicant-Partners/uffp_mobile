import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from '../cors';
import { coach } from '../../lib/coach';

/**
 * Break down complex questions using Fermi strategies
 *
 * POST /api/coach/decompose
 * Body: {
 *   question: string,
 *   domain?: string,
 *   forecastId?: string,
 *   existingDrivers?: any[]
 * }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { question, domain, forecastId, existingDrivers } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Missing question' });
    }

    // Use existing coach.coachDriverDecomposition method
    const response = await coach.coachDriverDecomposition({
      question,
      domain: domain || 'general',
      userInput: 'Help me decompose this forecast question',
    });

    return res.status(200).json({
      success: true,
      message: response.message,
      suggestions: response.suggestions || [],
      nextStage: response.nextStage
    });
  } catch (error) {
    console.error('Decompose error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
