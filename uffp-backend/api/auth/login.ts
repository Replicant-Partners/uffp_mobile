import { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "@vercel/postgres";

/**
 * POST /api/auth/login
 * Login with email and password
 *
 * Body:
 * {
 *   email: string,
 *   password: string
 * }
 *
 * Returns:
 * {
 *   success: boolean,
 *   user?: { id, email, name, createdAt },
 *   token?: string,
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

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: "Email and password are required",
    });
  }

  try {
    // Find user
    const result = await sql`
      SELECT id, email, name, password_hash, password_salt, created_at
      FROM users
      WHERE email = ${email.toLowerCase()}
    `;

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    const user = result.rows[0];

    // Verify password
    const crypto = require("crypto");
    const hash = crypto
      .pbkdf2Sync(password, user.password_salt, 1000, 64, "sha512")
      .toString("hex");

    if (hash !== user.password_hash) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    // Generate token
    const token = Buffer.from(
      JSON.stringify({
        userId: user.id,
        email: user.email,
        exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
      }),
    ).toString("base64");

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.created_at,
      },
      token,
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      error: "Login failed",
    });
  }
}
