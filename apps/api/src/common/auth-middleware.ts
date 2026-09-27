import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { HttpError } from "./httpError";

export interface AuthPayload {
  sub: string;
  role: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

// Verifies the bearer token and attaches its payload to req.auth. Route
// handlers must derive identity from req.auth, never from the request
// body — that's what keeps one driver from touching another's resources.
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new HttpError(401, "Missing or invalid authorization header");
  }

  const token = header.slice("Bearer ".length);
  try {
    req.auth = jwt.verify(token, config.JWT_SECRET) as AuthPayload;
    next();
  } catch {
    throw new HttpError(401, "Invalid or expired token");
  }
}

export function requireRole(role: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.auth?.role !== role) {
      throw new HttpError(403, "Forbidden");
    }
    next();
  };
}
