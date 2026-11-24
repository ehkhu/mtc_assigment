import type { Role } from "@prisma/client";

export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
} as const;

/** Fields safe to send to the browser. The password hash stays in the database. */
export function toPublicUser(user: { id: string; name: string; email: string; role: Role }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}
