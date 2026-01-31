import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from './cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    console.log('Testing Claude API call...');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 500,
        temperature: 0.7,
        messages: [{
          role: 'user',
          content: 'Estimate the US satellite-to-phone communication market size in 2026. Keep response under 200 words.',
        }],
      }),
    });

    console.log('Claude API response status:', response.status);

    if (!response.ok) {
      const error = await response.text();
      console.error('Claude API error:', error);
      return res.status(500).json({ error: `Claude error: ${response.status}`, details: error });
    }

    const data = await response.json() as any;
    console.log('Success! Response length:', data.content[0].text.length);

    return res.status(200).json({
      success: true,
      content: data.content[0].text,
      usage: data.usage,
    });
  } catch (error) {
    console.error('Test error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
