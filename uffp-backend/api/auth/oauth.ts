import { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@vercel/postgres";

/**
 * GET /api/auth/oauth?provider=google|github
 * Initiate OAuth flow - redirects to provider
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

  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { provider, code, state } = req.query;

  // If no code, this is the initial OAuth request - redirect to provider
  if (!code) {
    if (provider === "google") {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const redirectUri = `${process.env.APP_URL || "https://uffp-backend.vercel.app"}/api/auth/oauth`;
      const scope = "openid profile email";
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&state=google`;

      return res.redirect(authUrl);
    }

    if (provider === "github") {
      const clientId = process.env.GITHUB_CLIENT_ID;
      const redirectUri = `${process.env.APP_URL || "https://uffp-backend.vercel.app"}/api/auth/oauth`;
      const scope = "read:user user:email";
      const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=github`;

      return res.redirect(authUrl);
    }

    return res.status(400).json({ error: "Invalid provider" });
  }

  // Handle OAuth callback with code
  try {
    let userInfo;

    if (state === "google") {
      // Exchange code for token
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: code as string,
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: `${process.env.APP_URL || "https://uffp-backend.vercel.app"}/api/auth/oauth`,
          grant_type: "authorization_code",
        }),
      });

      const tokens = await tokenResponse.json();

      // Get user info
      const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      userInfo = await userResponse.json();
      userInfo.provider = "google";
    } else if (state === "github") {
      // Exchange code for token
      const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          code: code as string,
          client_id: process.env.GITHUB_CLIENT_ID!,
          client_secret: process.env.GITHUB_CLIENT_SECRET!,
          redirect_uri: `${process.env.APP_URL || "https://uffp-backend.vercel.app"}/api/auth/oauth`,
        }),
      });

      const tokens = await tokenResponse.json();

      // Get user info
      const userResponse = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          Accept: "application/json",
        },
      });

      userInfo = await userResponse.json();

      // Get email if not public
      if (!userInfo.email) {
        const emailResponse = await fetch("https://api.github.com/user/emails", {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
            Accept: "application/json",
          },
        });
        const emails = await emailResponse.json();
        userInfo.email = emails.find((e: any) => e.primary)?.email || emails[0]?.email;
      }

      userInfo.provider = "github";
    }

    // Create or find user in database
    const client = createClient();
    await client.connect();

    try {
      const email = userInfo.email.toLowerCase();

      // Check if user exists
      const existingUser = await client.sql`
        SELECT id, email, name, created_at FROM users
        WHERE email = ${email}
      `;

      let user;
      if (existingUser.rows.length > 0) {
        user = existingUser.rows[0];
      } else {
        // Create new user
        const result = await client.sql`
          INSERT INTO users (email, password_hash, password_salt, name, created_at)
          VALUES (
            ${email},
            '',
            '',
            ${userInfo.name || userInfo.login || email.split("@")[0]},
            NOW()
          )
          RETURNING id, email, name, created_at
        `;
        user = result.rows[0];
      }

      // Generate token
      const token = Buffer.from(
        JSON.stringify({
          userId: user.id,
          email: user.email,
          exp: Date.now() + 30 * 24 * 60 * 60 * 1000
        })
      ).toString("base64");

      // Return HTML that posts message to opener window
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Authentication Success</title>
          </head>
          <body>
            <h1>Authentication Successful</h1>
            <p>Completing sign in...</p>
            <script>
              window.opener.postMessage({
                type: 'oauth-success',
                user: ${JSON.stringify({
                  id: user.id,
                  email: user.email,
                  name: user.name,
                  createdAt: user.created_at,
                })},
                token: '${token}'
              }, '*');
              setTimeout(() => window.close(), 1000);
            </script>
          </body>
        </html>
      `;

      res.setHeader("Content-Type", "text/html");
      return res.status(200).send(html);

    } finally {
      await client.end();
    }
  } catch (error: any) {
    console.error("OAuth error:", error);
    return res.status(500).json({
      success: false,
      error: "OAuth authentication failed",
    });
  }
}
