import type { Role } from "@prisma/client";

/** The signed-in staff member attached to a request after JWT checks. */
export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
