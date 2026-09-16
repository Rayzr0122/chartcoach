"use client";

// This file keeps track of "who is logged in" for the whole app.
// Any page can ask this context: is someone logged in, and who are they?
//
// The login token itself lives only in an httpOnly cookie set by the
// backend — this file never sees or stores it. That is deliberate: it
// means an XSS bug in this frontend cannot be used to steal the token,
// since client-side JavaScript has no access to it at all.

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { fetchCurrentUser, logoutUser, User } from "@/lib/api";

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Listen for unauthorized session broadcast events
  useEffect(() => {
    function onUnauthorized() {
      setUser(null);
    }
    window.addEventListener("chartcoach:unauthorized", onUnauthorized);
    return () => window.removeEventListener("chartcoach:unauthorized", onUnauthorized);
  }, []);

  // On first load, ask the backend who we are. The browser sends the login
  // cookie automatically if there is one — no cookie means we get a 401 and
  // just show the logged-out state.
  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const currentUser = await fetchCurrentUser(true);
        if (!cancelled) setUser(currentUser);
      } catch {
        // No valid session — that's fine, the user just isn't logged in yet
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  async function login() {
    // Called right after loginUser()/faceLogin() already set the cookie —
    // this just fetches the profile that goes with it.
    const currentUser = await fetchCurrentUser();
    setUser(currentUser);
  }

  async function logout() {
    await logoutUser();
    setUser(null);
  }

  async function refreshUser() {
    // Re-fetches the user's profile (used after enrolling or removing a face)
    const currentUser = await fetchCurrentUser();
    setUser(currentUser);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return context;
}
