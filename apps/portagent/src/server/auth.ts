/**
 * Authentication Module
 *
 * Simple password-based authentication with JWT tokens.
 * Single user mode for MVP.
 */

import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import * as jose from "jose";

const TOKEN_EXPIRY = "7d"; // 7 days
const DEFAULT_USER_ID = "default";

/**
 * Generate a random password
 */
export function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * Create JWT token
 */
async function createToken(secret: string, userId: string): Promise<string> {
  const secretKey = new TextEncoder().encode(secret);
  const token = await new jose.SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(secretKey);
  return token;
}

/**
 * Verify JWT token
 */
async function verifyToken(secret: string, token: string): Promise<{ userId: string } | null> {
  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jose.jwtVerify(token, secretKey);
    return { userId: payload.sub as string };
  } catch {
    return null;
  }
}

/**
 * Auth routes
 */
export function authRoutes(password: string, jwtSecret: string): Hono {
  const app = new Hono();

  // Login
  app.post("/login", async (c) => {
    const body = await c.req.json<{ password?: string }>();

    if (!body.password) {
      return c.json({ error: "Password required" }, 400);
    }

    if (body.password !== password) {
      return c.json({ error: "Invalid password" }, 401);
    }

    const token = await createToken(jwtSecret, DEFAULT_USER_ID);

    return c.json({
      token,
      userId: DEFAULT_USER_ID,
      expiresIn: TOKEN_EXPIRY,
    });
  });

  // Verify token
  app.get("/verify", async (c) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ valid: false }, 401);
    }

    const token = authHeader.slice(7);
    const result = await verifyToken(jwtSecret, token);

    if (!result) {
      return c.json({ valid: false }, 401);
    }

    return c.json({ valid: true, userId: result.userId });
  });

  // Logout (client-side only, just for API consistency)
  app.post("/logout", (c) => {
    return c.json({ success: true });
  });

  return app;
}

/**
 * Create auth middleware
 */
export function createAuthMiddleware(jwtSecret: string) {
  return createMiddleware(async (c, next) => {
    // Skip auth for SSE connections with token in query
    const url = new URL(c.req.url);
    const queryToken = url.searchParams.get("token");

    // Check Authorization header first
    const authHeader = c.req.header("Authorization");
    let token: string | null = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    } else if (queryToken) {
      // Allow token in query param for SSE (EventSource doesn't support headers)
      token = queryToken;
    }

    if (!token) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const result = await verifyToken(jwtSecret, token);
    if (!result) {
      return c.json({ error: "Invalid token" }, 401);
    }

    // Set user info in context
    c.set("userId", result.userId);

    await next();
  });
}
