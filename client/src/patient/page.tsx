import { useEffect, useState } from "react";
import type { Patient } from "../apis/patients";
import { useSession } from "../auth/session";
import { PatientForm } from "./components/form";
import { PatientList } from "./components/list";
import { Records } from "./components/records";

export function PatientsPage() {
  const { user } = useSession();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selected, setSelected] = useState<Patient | null>(null);
  const [creating, setCreating] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="split">
      <section className="stack">
        <header className="section-head">
          <div>
            <h1>Patients</h1>
            <p className="muted">
              {user?.role === "ADMIN" ? "All clinic patients." : "Patients assigned to you."}
            </p>
          </div>
          <button type="button" className="primary" onClick={() => setCreating((open) => !open)}>
            {creating ? "Close" : "New patient"}
          </button>
        </header>

        <input
          className="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name"
          aria-label="Search by name"
        />

        {creating ? (
          <PatientForm
            onCancel={() => setCreating(false)}
            onCreated={(patient) => {
              setSelected(patient);
              setDraftId(patient.id);
              setCreating(false);
            }}
          />
        ) : null}

        <PatientList query={debouncedQuery} selectedId={selected?.id ?? null} onSelect={setSelected} />
      </section>

      <Records
        patient={selected}
        draft={selected?.id === draftId}
        onAssigned={() => setDraftId(null)}
      />
    </div>
  );
}
