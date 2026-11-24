import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { useSession } from "./auth/session";
import { LoginPage } from "./auth/login-page";
import { Layout } from "./components/layout";
import { PatientsPage } from "./patient/page";
import { UsersPage } from "./users/page";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/patients" replace />} />
          <Route path="/patients" element={<PatientsPage />} />
          <Route element={<RequireAdmin />}>
            <Route path="/users" element={<UsersPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/patients" replace />} />
    </Routes>
  );
}

function RequireAuth() {
  const { user, ready } = useSession();
  const location = useLocation();

  if (!ready) return <p className="status">Loading…</p>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

function RequireAdmin() {
  const { user } = useSession();
  if (user?.role !== "ADMIN") return <Navigate to="/patients" replace />;
  return <Outlet />;
}
