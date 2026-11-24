import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../env";
import { prisma } from "../lib/prisma";
import { verifyPassword } from "../lib/password";
import { asyncHandler, HttpError } from "../lib/http";
import { toPublicUser } from "../lib/user";
import { requireAuth } from "../middleware/auth";

export const authRouter = Router();

const loginBody = z.object({
  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .transform((email) => email.toLowerCase()),
  password: z.string().min(1, "Password is required"),
});

/**
 * Same error for an unknown email and a wrong password, so the endpoint
 * does not reveal which accounts exist.
 */
authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const body = loginBody.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });

    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      throw new HttpError(401, "Invalid email or password");
    }

    const token = jwt.sign({ sub: user.id }, env.jwtSecret, { expiresIn: env.tokenTtlSeconds });
    res.json({ token, user: toPublicUser(user) });
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: toPublicUser(req.user!) });
  }),
);
