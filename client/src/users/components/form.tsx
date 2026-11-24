import { useState, type FormEvent } from "react";
import { useSWRConfig } from "swr";
import { ApiError } from "../../apis/client";
import { createUser, type Role } from "../../apis/users";

export function UserForm() {
  const { mutate } = useSWRConfig();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("DOCTOR");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createUser({ name, email, password, role });
      setName("");
      setEmail("");
      setPassword("");
      setRole("DOCTOR");
      await mutate((key) => Array.isArray(key) && key[0] === "users");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add the user");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card form" onSubmit={onSubmit}>
      <h2>New user</h2>
      <div className="fields">
        <label>
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required />
        </label>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="off"
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>
        <label>
          Role
          <select value={role} onChange={(event) => setRole(event.target.value as Role)}>
            <option value="DOCTOR">Doctor</option>
            <option value="ADMIN">Admin</option>
          </select>
        </label>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="form-actions">
          <button type="submit" className="primary" disabled={saving}>
            {saving ? "Saving…" : "Save user"}
          </button>
        </div>
      </div>
    </form>
  );
}
