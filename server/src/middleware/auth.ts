import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
import jwt from "jsonwebtoken";
import { env } from "../env";
import { prisma } from "../lib/prisma";
import { asyncHandler, HttpError } from "../lib/http";
import { publicUserSelect } from "../lib/user";

/**
 * Requires `Authorization: Bearer <jwt>`.
 * The token only proves who signed in (`sub`). The role is read from the
 * database on every request, so a changed role or a removed account takes
 * effect immediately and cannot be forged inside the token.
 */
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const header = req.header("authorization") ?? "";
  const match = /^Bearer (.+)$/.exec(header);
  if (!match) throw new HttpError(401, "Missing or invalid token");

  let userId: string;
  try {
    const decoded = jwt.verify(match[1], env.jwtSecret);
    if (typeof decoded === "string" || typeof decoded.sub !== "string") {
      throw new HttpError(401, "Invalid or expired token");
    }
    userId = decoded.sub;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(401, "Invalid or expired token");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: publicUserSelect,
  });
  if (!user) throw new HttpError(401, "Invalid or expired token");

  req.user = user;
  next();
});

/** Use after requireAuth. Admin-only routes pass `requireRole("ADMIN")`. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(new HttpError(403, "You do not have access to this action"));
      return;
    }
    next();
  };
}
