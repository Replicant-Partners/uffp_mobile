import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from '../cors';
import { coach } from '../../lib/coach';

/**
 * Review forecast quality and get actionable insights
 *
 * POST /api/coach/review
 * Body: {
 *   forecastId: string,
 *   forecast: { question, drivers, probability? }
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
    const { forecastId, forecast } = req.body;

    if (!forecast || !forecast.question) {
      return res.status(400).json({ error: 'Missing forecast data' });
    }

    // Use existing coach.coachReview method
    const response = await coach.coachReview({
      question: forecast.question,
      drivers: forecast.drivers || [],
      probability: forecast.probability,
    });

    return res.status(200).json({ 
      success: true, 
      message: response,
      review: response 
    });
  } catch (error) {
    console.error('Review error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
