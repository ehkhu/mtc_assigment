import { useState, type FormEvent } from "react";
import { useSWRConfig } from "swr";
import { ApiError } from "../../apis/client";
import { createPatient, type Patient } from "../../apis/patients";

export function PatientForm({
  onCreated,
  onCancel,
}: {
  onCreated: (patient: Patient) => void;
  onCancel: () => void;
}) {
  const { mutate } = useSWRConfig();
  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const result = await createPatient({ name, dateOfBirth });
      await mutate((key) => Array.isArray(key) && key[0] === "patients");
      onCreated(result.patient);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the patient");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card form" onSubmit={onSubmit}>
      <h2>New patient</h2>
      <div className="fields">
        <label>
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required />
        </label>
        <label>
          Date of birth
          <input
            type="date"
            value={dateOfBirth}
            onChange={(event) => setDateOfBirth(event.target.value)}
            required
          />
        </label>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="form-actions">
          <button type="button" className="ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={saving}>
            {saving ? "Saving…" : "Save patient"}
          </button>
        </div>
      </div>
    </form>
  );
}
