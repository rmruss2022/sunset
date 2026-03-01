import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-prod";
export const COOKIE_NAME = "ah_token";
export const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days ms

export function signToken(payload: { userId: string; isAdmin: boolean }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(
  token: string,
): { userId: string; isAdmin: boolean } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as {
      userId: string;
      isAdmin: boolean;
    };
  } catch {
    return null;
  }
}
