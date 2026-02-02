import { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@vercel/postgres";

/**
 * POST /api/auth/register
 * Register a new user
 *
 * Body:
 * {
 *   email: string,
 *   password: string,
 *   name?: string
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
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, password, name } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: "Email and password are required",
    });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: "Invalid email format",
    });
  }

  // Password length check
  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      error: "Password must be at least 8 characters",
    });
  }

  const client = createClient();
  await client.connect();

  try {
    // Check if user already exists
    const existingUser = await client.sql`
      SELECT id FROM users WHERE email = ${email.toLowerCase()}
    `;

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: "Email already registered",
      });
    }

    // Hash password (simple for now - in production use bcrypt)
    const crypto = require("crypto");
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto
      .pbkdf2Sync(password, salt, 1000, 64, "sha512")
      .toString("hex");

    // Create user
    const result = await client.sql`
      INSERT INTO users (email, password_hash, password_salt, name, created_at)
      VALUES (
        ${email.toLowerCase()},
        ${hash},
        ${salt},
        ${name || email.split("@")[0]},
        NOW()
      )
      RETURNING id, email, name, created_at
    `;

    const user = result.rows[0];

    // Generate simple JWT-style token (in production use proper JWT library)
    const token = Buffer.from(
      JSON.stringify({ userId: user.id, email: user.email, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 })
    ).toString("base64");

    return res.status(201).json({
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
    console.error("Registration error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to register user",
    });
  } finally {
    await client.end();
  }
}
