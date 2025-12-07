/**
 * Authentication Module
 *
 * Multi-user authentication with JWT tokens.
 * Supports user registration and login.
 */

import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import * as jose from "jose";
import type { AgentX } from "agentxjs";
import type { UserRepository } from "./user/UserRepository";
import type { UserInfo } from "./user/types";

const TOKEN_EXPIRY = "7d"; // 7 days

/**
 * Validate invite code
 * Valid code is the Unix timestamp (in seconds) of today's 00:00:01
 */
function isValidInviteCode(code: string): boolean {
  const timestamp = parseInt(code, 10);
  if (isNaN(timestamp)) return false;

  // Get today's 00:00:01 in local timezone
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 1);
  const expectedTimestamp = Math.floor(todayStart.getTime() / 1000);

  return timestamp === expectedTimestamp;
}

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
 * Convert UserRecord to safe UserInfo (remove password hash)
 */
function toUserInfo(user: {
  userId: string;
  username: string;
  email: string;
  containerId: string;
  displayName?: string;
  avatar?: string;
  createdAt: number;
}): UserInfo {
  return {
    userId: user.userId,
    username: user.username,
    email: user.email,
    containerId: user.containerId,
    displayName: user.displayName,
    avatar: user.avatar,
    createdAt: user.createdAt,
  };
}

/**
 * Auth configuration
 */
export interface AuthConfig {
  inviteCodeRequired?: boolean;
}

/**
 * Auth routes
 */
export function authRoutes(
  userRepository: UserRepository,
  jwtSecret: string,
  agentx: AgentX,
  config: AuthConfig = {}
): Hono {
  const app = new Hono();
  const { inviteCodeRequired = true } = config;

  // Config endpoint (public, for frontend to know requirements)
  app.get("/config", (c) => {
    return c.json({ inviteCodeRequired });
  });

  // Register
  app.post("/register", async (c) => {
    try {
      const body = await c.req.json<{
        username?: string;
        email?: string;
        password?: string;
        displayName?: string;
        avatar?: string;
        inviteCode?: string;
      }>();

      // Validation
      if (!body.username || !body.password) {
        return c.json({ error: "Username and password are required" }, 400);
      }

      // Validate invite code (only if required)
      if (inviteCodeRequired && (!body.inviteCode || !isValidInviteCode(body.inviteCode))) {
        return c.json({ error: "Invalid invite code" }, 400);
      }

      // Basic validation
      if (body.username.length < 3) {
        return c.json({ error: "Username must be at least 3 characters" }, 400);
      }

      if (body.password.length < 6) {
        return c.json({ error: "Password must be at least 6 characters" }, 400);
      }

      // Email format validation (only if provided)
      if (body.email && !body.email.includes("@")) {
        return c.json({ error: "Invalid email format" }, 400);
      }

      // Create Container for the user first
      // Generate a unique container ID for the user
      const containerId = `user-${crypto.randomUUID()}`;
      const containerRes = await agentx.request("container_create_request", { containerId });
      if (containerRes.data.error) {
        return c.json({ error: "Failed to create user container" }, 500);
      }

      // Create user with the container ID
      const user = await userRepository.createUser({
        username: body.username,
        email: body.email,
        password: body.password,
        containerId,
        displayName: body.displayName,
        avatar: body.avatar,
      });

      // Generate token
      const token = await createToken(jwtSecret, user.userId);

      return c.json(
        {
          token,
          user: toUserInfo(user),
          expiresIn: TOKEN_EXPIRY,
        },
        201
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Registration failed";
      return c.json({ error: message }, 400);
    }
  });

  // Login
  app.post("/login", async (c) => {
    try {
      const body = await c.req.json<{
        usernameOrEmail?: string;
        password?: string;
      }>();

      if (!body.usernameOrEmail || !body.password) {
        return c.json({ error: "Username/email and password are required" }, 400);
      }

      // Verify credentials
      const user = await userRepository.verifyPassword(body.usernameOrEmail, body.password);

      if (!user) {
        return c.json({ error: "Invalid credentials" }, 401);
      }

      // Generate token
      const token = await createToken(jwtSecret, user.userId);

      return c.json({
        token,
        user: toUserInfo(user),
        expiresIn: TOKEN_EXPIRY,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      return c.json({ error: message }, 500);
    }
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

    // Get user info
    const user = await userRepository.findUserById(result.userId);
    if (!user || !user.isActive) {
      return c.json({ valid: false }, 401);
    }

    return c.json({ valid: true, user: toUserInfo(user) });
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

    // Also set as custom header for downstream handlers
    c.header("X-User-Id", result.userId);

    await next();
  });
}
