import { useState, type FormEvent } from "react";
import useSWR, { useSWRConfig } from "swr";
import { ApiError } from "../../apis/client";
import { createRecord, type Patient } from "../../apis/patients";
import { listUsers } from "../../apis/users";
import { useSession } from "../../auth/session";
import { formatWhen } from "../../format";
import { useRecords } from "../actions";

/**
 * Shows the records returned for one patient.
 * The server has already applied the role filter. A doctor never receives
 * another doctor's rows in `data`.
 */
export function Records({
  patient,
  draft,
  onAssigned,
}: {
  patient: Patient | null;
  /** Set when this user just created the patient and still needs to write the first record. */
  draft: boolean;
  onAssigned: () => void;
}) {
  const { user } = useSession();
  const { mutate: mutateAll } = useSWRConfig();
  const { data, error, isLoading, size, setSize, mutate } = useRecords(patient?.id ?? null);
  const doctors = useSWR(user?.role === "ADMIN" ? (["users", user.id] as const) : null, listUsers);

  if (!patient) {
    return (
      <section className="card detail">
        <p className="empty">Select a patient to view records.</p>
      </section>
    );
  }

  const denied = error instanceof ApiError && error.status === 403;
  const pages = data ?? [];
  const records = pages.flatMap((page) => page.records);
  const loadedPatient = pages[0]?.patient;
  const nextCursor = pages.length > 0 ? pages[pages.length - 1].nextCursor : null;
  const showForm = !error || (denied && draft);

  return (
    <section className="card detail stack">
      <header>
        <h2>{loadedPatient?.name ?? patient.name}</h2>
        <p className="muted">Born {loadedPatient?.dateOfBirth ?? patient.dateOfBirth}</p>
        {!denied ? (
          <p className="muted">
            {user?.role === "ADMIN"
              ? "Every record for this patient."
              : "Records you created for this patient."}
          </p>
        ) : null}
      </header>

      {isLoading ? <p className="muted">Loading records…</p> : null}
      {error && !(denied && draft) ? (
        <p className="error" role="alert">
          {error.message}
        </p>
      ) : null}
      {denied && draft ? (
        <p className="muted">Add the first record to assign this patient to you.</p>
      ) : null}

      {!isLoading && !error && records.length === 0 ? <p className="muted">No records yet.</p> : null}

      {records.map((record) => (
        <article key={record.id} className="record">
          <p className="record-meta">
            {record.doctor.name} · {formatWhen(record.createdAt)}
          </p>
          <h3>{record.diagnosis}</h3>
          <p>{record.treatment}</p>
        </article>
      ))}

      {nextCursor ? (
        <button type="button" className="ghost" onClick={() => setSize(size + 1)}>
          Load more
        </button>
      ) : null}

      {showForm ? (
        <RecordForm
          patientId={patient.id}
          doctors={doctors.data?.users.filter((person) => person.role === "DOCTOR") ?? []}
          isAdmin={user?.role === "ADMIN"}
          onCreated={async () => {
            await mutate();
            await mutateAll((key) => Array.isArray(key) && key[0] === "patients");
            onAssigned();
          }}
        />
      ) : null}
    </section>
  );
}

function RecordForm({
  patientId,
  doctors,
  isAdmin,
  onCreated,
}: {
  patientId: string;
  doctors: { id: string; name: string }[];
  isAdmin: boolean;
  onCreated: () => Promise<void>;
}) {
  const [diagnosis, setDiagnosis] = useState("");
  const [treatment, setTreatment] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createRecord(patientId, {
        diagnosis,
        treatment,
        ...(isAdmin ? { doctorId } : {}),
      });
      setDiagnosis("");
      setTreatment("");
      await onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the record");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="fields record-form" onSubmit={onSubmit}>
      <h3>Add a record</h3>
      {isAdmin ? (
        <label>
          Doctor
          <select value={doctorId} onChange={(event) => setDoctorId(event.target.value)} required>
            <option value="">Choose a doctor</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label>
        Diagnosis
        <input value={diagnosis} onChange={(event) => setDiagnosis(event.target.value)} maxLength={2000} required />
      </label>
      <label>
        Treatment
        <textarea
          value={treatment}
          onChange={(event) => setTreatment(event.target.value)}
          maxLength={4000}
          required
        />
      </label>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="form-actions">
        <button type="submit" className="primary" disabled={saving}>
          {saving ? "Saving…" : "Save record"}
        </button>
      </div>
    </form>
  );
}
