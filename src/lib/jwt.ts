import jwt from "jsonwebtoken";
import { config } from "../config";

export interface TokenPayload {
  sub: string;
  type: "access" | "refresh";
}

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId, type: "access" }, config.JWT_ACCESS_SECRET, {
    expiresIn: `${config.ACCESS_TOKEN_EXPIRE_MINUTES}m`,
  });
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId, type: "refresh" }, config.JWT_REFRESH_SECRET, {
    expiresIn: `${config.REFRESH_TOKEN_EXPIRE_DAYS}d`,
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  const payload = jwt.verify(token, config.JWT_ACCESS_SECRET) as TokenPayload;
  if (payload.type !== "access") throw new Error("Not an access token");
  return payload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  const payload = jwt.verify(token, config.JWT_REFRESH_SECRET) as TokenPayload;
  if (payload.type !== "refresh") throw new Error("Not a refresh token");
  return payload;
}

export function issueTokenPair(userId: string) {
  return {
    accessToken: signAccessToken(userId),
    refreshToken: signRefreshToken(userId),
    tokenType: "Bearer" as const,
  };
}
