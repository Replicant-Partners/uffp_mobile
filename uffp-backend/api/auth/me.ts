import { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "@vercel/postgres";

/**
 * GET /api/auth/me
 * Get current user info from token
 *
 * Headers:
 * Authorization: Bearer <token>
 *
 * Returns:
 * {
 *   success: boolean,
 *   user?: { id, email, name, createdAt, stats },
 *   error?: string
 * }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: "No authorization token provided",
    });
  }

  const token = authHeader.substring(7);

  try {
    // Decode token
    const decoded = JSON.parse(Buffer.from(token, "base64").toString());

    // Check expiration
    if (decoded.exp < Date.now()) {
      return res.status(401).json({
        success: false,
        error: "Token expired",
      });
    }

    try {
      // Get user with stats
      const userResult = await sql`
        SELECT id, email, name, created_at
        FROM users
        WHERE id = ${decoded.userId}
      `;

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      const user = userResult.rows[0];

      // Get user stats
      const statsResult = await sql`
        SELECT
          COUNT(*)::int as forecast_count,
          AVG(brier_score)::float as avg_brier_score,
          COUNT(CASE WHEN resolved = true THEN 1 END)::int as resolved_count
        FROM forecasts
        WHERE user_id = ${decoded.userId}
      `;

      const stats = statsResult.rows[0] || {
        forecast_count: 0,
        avg_brier_score: null,
        resolved_count: 0,
      };

      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.created_at,
          stats: {
            forecastCount: stats.forecast_count,
            avgBrierScore: stats.avg_brier_score,
            resolvedCount: stats.resolved_count,
            calibrationScore: stats.avg_brier_score
              ? Math.max(0, 100 - stats.avg_brier_score * 100)
              : null,
          },
        },
      });
    } catch (error: any) {
    console.error("Get user error:", error);
    return res.status(401).json({
      success: false,
      error: "Invalid token",
    });
  }
}
