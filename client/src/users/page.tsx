import { UserForm } from "./components/form";
import { UserList } from "./components/list";

export function UsersPage() {
  return (
    <div className="stack users-page">
      <header>
        <h1>Users</h1>
        <p className="muted">Admins can add doctors and other admins. Doctors cannot open this page.</p>
      </header>
      <div className="card">
        <UserList />
      </div>
      <UserForm />
    </div>
  );
}
