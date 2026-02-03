import type { VercelRequest, VercelResponse } from "@vercel/node";
import { setCorsHeaders } from "../cors";
import { coach } from "../../lib/coach";

/**
 * Chat with AI coach
 *
 * POST /api/coach/chat
 * Body: {
 *   stage: 'base_rate' | 'drivers' | 'quantify' | 'review',
 *   context: { question, domain, baseRate?, drivers?, ... },
 *   userMessage?: string,
 *   conversationHistory?: []
 * }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  setCorsHeaders(res);

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { stage, context, userMessage, conversationHistory } = req.body;

    if (!stage || !context) {
      return res.status(400).json({ error: "Missing stage or context" });
    }

    // Ensure conversationHistory is always an array
    const safeHistory = Array.isArray(conversationHistory)
      ? conversationHistory
      : [];

    let response;

    switch (stage) {
      case "base_rate":
        response = await coach.coachBaseRate({
          ...context,
          conversationHistory: safeHistory,
        });
        break;

      case "drivers":
        response = await coach.coachDriverDecomposition({
          ...context,
          userInput: userMessage,
          conversationHistory: safeHistory,
        });
        break;

      case "quantify":
        response = await coach.coachDriverQuantification({
          ...context,
          conversationHistory: safeHistory,
        });
        break;

      case "review":
        response = await coach.coachReview({
          ...context,
          conversationHistory: safeHistory,
        });
        break;

      default:
        return res.status(400).json({ error: `Invalid stage: ${stage}` });
    }

    return res.status(200).json({ success: true, response });
  } catch (error) {
    console.error("Coach chat error:", error);
    return res.status(500).json({
      error: "Coach AI failed",
      message: error instanceof Error ? error.message : "Internal server error",
      details: error instanceof Error ? error.toString() : String(error),
    });
  }
}
