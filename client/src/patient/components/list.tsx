import { recordLabel } from "../../format";
import type { Patient } from "../../apis/patients";
import { usePatients } from "../actions";

/**
 * Renders the patient list the server already filtered for this account.
 * This component does not decide who is assigned to whom.
 */
export function PatientList({
  query,
  selectedId,
  onSelect,
}: {
  query: string;
  selectedId: string | null;
  onSelect: (patient: Patient) => void;
}) {
  const { data, error, isLoading } = usePatients(query);

  if (isLoading) return <p className="muted">Loading patients…</p>;
  if (error) return <p className="error">{error.message}</p>;

  const patients = data?.patients ?? [];
  if (patients.length === 0) {
    return <p className="empty">No patients match that search.</p>;
  }

  return (
    <div className="patient-list">
      {patients.map((patient) => (
        <button
          key={patient.id}
          type="button"
          className={patient.id === selectedId ? "patient-row selected" : "patient-row"}
          onClick={() => onSelect(patient)}
          aria-pressed={patient.id === selectedId}
        >
          <span className="patient-name">{patient.name}</span>
          <span className="count">{recordLabel(patient.recordCount)}</span>
          <span className="muted">{patient.dateOfBirth}</span>
        </button>
      ))}
    </div>
  );
}
