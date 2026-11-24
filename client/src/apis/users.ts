import { api } from "./client";

export type Role = "ADMIN" | "DOCTOR";

export type StaffUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export function listUsers() {
  return api<{ users: StaffUser[] }>("/users");
}

export function createUser(input: { name: string; email: string; password: string; role: Role }) {
  return api<{ user: StaffUser }>("/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
