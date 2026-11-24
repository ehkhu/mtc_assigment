import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
import { getRecords, listPatients, type RecordsPage } from "../apis/patients";
import { useSession } from "../auth/session";

/** The user id is part of the key so one account never reads another's cache. */
export function usePatients(query: string) {
  const { user } = useSession();
  return useSWR(user ? (["patients", user.id, query] as const) : null, ([, , value]) => listPatients(value));
}

/**
 * Pages of records for one patient.
 * The key is null when no patient is selected, so SWR does not fetch.
 */
export function useRecords(patientId: string | null) {
  const { user } = useSession();
  return useSWRInfinite(
    (pageIndex, previousPage: RecordsPage | null) => {
      if (!user || !patientId) return null;
      if (previousPage && !previousPage.nextCursor) return null;
      const cursor = pageIndex === 0 ? "" : (previousPage?.nextCursor ?? "");
      return ["records", user.id, patientId, cursor] as const;
    },
    ([, , id, cursor]) => getRecords(id, cursor || undefined),
  );
}
