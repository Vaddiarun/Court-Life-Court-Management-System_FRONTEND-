import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { get, request, tokens } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const qc = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    if (!tokens.get()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      setUser(await get("/auth/me"));
    } catch {
      tokens.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
    const onLogout = () => {
      setUser(null);
      qc.clear();
    };
    window.addEventListener("courtlife:logout", onLogout);
    return () => window.removeEventListener("courtlife:logout", onLogout);
  }, [loadMe, qc]);

  const acceptTokens = (data) => {
    tokens.set({ access_token: data.access_token, refresh_token: data.refresh_token });
    qc.clear();
    setUser(data.user);
    return data.user;
  };

  const login = async (email, password) =>
    acceptTokens(await request("POST", "/auth/login", { body: { email, password }, auth: false }));

  const registerFirm = async (body) =>
    acceptTokens(await request("POST", "/auth/register-firm", { body, auth: false }));

  const requestOtp = (phone, purpose = "login") => request("POST", "/auth/otp/request", { body: { phone, purpose }, auth: false });

  const verifyOtp = async (phone, code) =>
    acceptTokens(await request("POST", "/auth/otp/verify", { body: { phone, code }, auth: false }));

  const logout = () => {
    tokens.clear();
    qc.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, registerFirm, requestOtp, verifyOtp, logout, reload: loadMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export const ROLE_LABEL = {
  super_admin: "Super Admin",
  firm_admin: "Firm Admin",
  lawyer: "Lawyer",
  junior_advocate: "Junior Advocate",
  client: "Client",
};

export const isManager = (u) => u && ["firm_admin", "lawyer"].includes(u.role);
export const isStaff = (u) => u && ["firm_admin", "lawyer", "junior_advocate"].includes(u.role);
