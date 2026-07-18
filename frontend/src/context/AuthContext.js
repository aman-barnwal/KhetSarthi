import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import { useI18n } from "../lib/i18n";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null=checking, false=guest, object=logged in
  const { setLang } = useI18n();

  useEffect(() => {
    api.get("/auth/me")
      .then(({ data }) => {
        setUser(data);
        if (data.language) setLang(data.language);
      })
      .catch(() => setUser(false));
  }, [setLang]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setUser(data);
    if (data.language) setLang(data.language);
    return data;
  }, [setLang]);

  const register = useCallback(async (name, email, password) => {
    const { data } = await api.post("/auth/register", { name, email, password });
    setUser(data);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post("/auth/logout"); } catch (e) { /* ignore */ }
    setUser(false);
  }, []);

  const updateProfile = useCallback(async (patch) => {
    const { data } = await api.put("/profile", patch);
    setUser(data);
    return data;
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
