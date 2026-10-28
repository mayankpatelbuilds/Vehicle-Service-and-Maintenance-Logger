import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../utils/api.js";
import { AuthContext } from "./AuthContext.js";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    let active = true;
    api
      .getCurrentUser()
      .then(({ user: currentUser }) => {
        if (active) setUser(currentUser);
      })
      .catch((error) => {
        if (active && error.status !== 401) {
          setAuthError(`Could not verify your session. ${error.message}`);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const handleExpired = () => setUser(null);
    window.addEventListener("auth:expired", handleExpired);
    return () => {
      active = false;
      window.removeEventListener("auth:expired", handleExpired);
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const result = await api.login(credentials);
    setAuthError("");
    setUser(result.user);
    return result.user;
  }, []);

  const register = useCallback(async (details) => {
    const result = await api.register(details);
    setAuthError("");
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, authError, login, register, logout }),
    [user, loading, authError, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
