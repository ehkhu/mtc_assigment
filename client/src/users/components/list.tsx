import { useUsers } from "../actions";

/** Staff returned by the admin-only users API. */
export function UserList() {
  const { data, error, isLoading } = useUsers();

  if (isLoading) return <p className="muted">Loading users…</p>;
  if (error) return <p className="error">{error.message}</p>;

  const users = data?.users ?? [];

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Role</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user.id}>
            <td>{user.name}</td>
            <td>{user.email}</td>
            <td>{user.role === "ADMIN" ? "Admin" : "Doctor"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
