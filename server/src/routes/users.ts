import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/password";
import { asyncHandler } from "../lib/http";
import { publicUserSelect, toPublicUser } from "../lib/user";
import { requireAuth, requireRole } from "../middleware/auth";

export const usersRouter = Router();

usersRouter.use(requireAuth, requireRole("ADMIN"));

const createUserBody = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .max(200)
    .transform((email) => email.toLowerCase()),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters"),
  role: z.enum(["ADMIN", "DOCTOR"]),
});

/** Staff directory. Doctors never reach this router. */
usersRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      orderBy: { name: "asc" },
      select: publicUserSelect,
    });
    res.json({ users: users.map(toPublicUser) });
  }),
);

usersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = createUserBody.parse(req.body);
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        role: body.role,
        passwordHash: await hashPassword(body.password),
      },
      select: publicUserSelect,
    });
    res.status(201).json({ user: toPublicUser(user) });
  }),
);
