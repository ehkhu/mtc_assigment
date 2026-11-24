import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../apis/client";
import { useSession } from "./session";

const DEMOS = [
  {
    role: "Admin",
    email: "admin@clinic.test",
    note: "Every patient, including Noah Berg, who has no doctor yet.",
  },
  {
    role: "Doctor",
    email: "helen.chen@clinic.test",
    note: "Maya Chen, and her own notes on Amira Hassan.",
  },
  {
    role: "Doctor",
    email: "samuel.okonkwo@clinic.test",
    note: "Luis Ortega, and his own notes on Amira Hassan.",
  },
];

export function LoginPage() {
  const { user, ready, login } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/patients";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!ready) return <p className="status">Loading…</p>;
  if (user) return <Navigate to="/patients" replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not sign in");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-card">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            H
          </span>
          <div>
            <strong>Mini Clinic</strong>
            <span>Medical records</span>
          </div>
        </div>

        <h1>Sign in</h1>
        <p className="muted">Use a staff account. Doctors only see patients assigned to them.</p>

        <form className="fields" onSubmit={onSubmit}>
          <label>
            Email
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : null}
          <button className="primary" type="submit" disabled={saving}>
            {saving ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="demo-list">
          <p className="muted">Demo accounts. Password for each is password123.</p>
          {DEMOS.map((demo) => (
            <button
              key={demo.email}
              type="button"
              className="demo"
              onClick={() => {
                setEmail(demo.email);
                setPassword("password123");
                setError(null);
              }}
            >
              <strong>
                {demo.role} · {demo.email}
              </strong>
              <span className="muted">{demo.note}</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
