import { NavLink, Outlet } from "react-router-dom";
import { useSession } from "../auth/session";

export function Layout() {
  const { user, logout } = useSession();
  if (!user) return null;

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            MC
          </span>
          <div>
            <strong>Mini Clinic</strong>
            <span>Medical records</span>
          </div>
        </div>
        <nav>
          <NavLink to="/patients">Patients</NavLink>
          {user.role === "ADMIN" ? <NavLink to="/users">Users</NavLink> : null}
        </nav>
        <div className="who">
          <span>{user.name}</span>
          <span className="role">{user.role === "ADMIN" ? "Admin" : "Doctor"}</span>
          <button type="button" onClick={logout}>
            Log out
          </button>
        </div>
      </header>
      <main className="shell">
        <Outlet />
      </main>
    </>
  );
}
