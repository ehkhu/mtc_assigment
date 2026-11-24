import useSWR from "swr";
import { listUsers } from "../apis/users";
import { useSession } from "../auth/session";

/** Admin staff list. Keyed by user id so a doctor never sees a cached admin response. */
export function useUsers() {
  const { user } = useSession();
  return useSWR(user?.role === "ADMIN" ? (["users", user.id] as const) : null, listUsers);
}
