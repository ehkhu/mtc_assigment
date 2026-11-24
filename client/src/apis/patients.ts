import { api } from "./client";

export type Patient = {
  id: string;
  name: string;
  dateOfBirth: string;
  recordCount: number;
};

export type MedicalRecord = {
  id: string;
  diagnosis: string;
  treatment: string;
  createdAt: string;
  doctor: { id: string; name: string };
};

export type RecordsPage = {
  patient: { id: string; name: string; dateOfBirth: string };
  records: MedicalRecord[];
  nextCursor: string | null;
};

/** Patients the server allows this account to see. `query` matches the name. */
export function listPatients(query: string) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  const search = params.toString();
  return api<{ patients: Patient[] }>(`/patients${search ? `?${search}` : ""}`);
}

export function createPatient(input: { name: string; dateOfBirth: string }) {
  return api<{ patient: Patient }>("/patients", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** GET /patients/:id/records — doctors receive only their own rows. */
export function getRecords(patientId: string, cursor?: string) {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  const search = params.toString();
  return api<RecordsPage>(`/patients/${patientId}/records${search ? `?${search}` : ""}`);
}

export function createRecord(
  patientId: string,
  input: { diagnosis: string; treatment: string; doctorId?: string },
) {
  return api<{ record: MedicalRecord }>(`/patients/${patientId}/records`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
