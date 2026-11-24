import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useSWRConfig } from "swr";
import { api, authToken, setAuthToken } from "../apis/client";
import type { StaffUser } from "../apis/users";

type SessionValue = {
  user: StaffUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const SessionContext = createContext<SessionValue | null>(null);

/**
 * Keeps the signed-in user for the page tree.
 * The access token sits in localStorage; the server still checks the role.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [ready, setReady] = useState(false);
  const { mutate } = useSWRConfig();

  useEffect(() => {
    if (!authToken()) {
      setReady(true);
      return;
    }

    let active = true;
    api<{ user: StaffUser }>("/auth/me")
      .then((result) => {
        if (active) setUser(result.user);
      })
      .catch(() => {
        if (active) setAuthToken(null);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  async function login(email: string, password: string) {
    const result = await api<{ token: string; user: StaffUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(result.token);
    await mutate(() => true, undefined, { revalidate: false });
    setUser(result.user);
  }

  function logout() {
    setAuthToken(null);
    setUser(null);
    void mutate(() => true, undefined, { revalidate: false });
  }

  return (
    <SessionContext.Provider value={{ user, ready, login, logout }}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}
