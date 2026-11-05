import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";

import { ApiError, apiRaw, readAuthCookie, setSessionEndedHandler } from "@/api/client";
import { Session, type SessionUser } from "@/api/session";
import { clearScheduledReminders } from "@/notifications/reminders";

type Status = "loading" | "signedOut" | "signedIn";

interface AuthValue {
  status: Status;
  user: SessionUser | null;
  /** Shown once on the login screen after the server ended the session */
  endedNotice: string;
  clearEndedNotice: () => void;
  /** Resolves when signed in; throws an Error whose message is fit to show */
  signIn: (identifier: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Merge fresh profile fields (name, avatar) into the signed-in user */
  updateUser: (patch: Partial<SessionUser>) => void;
}

const AuthContext = createContext<AuthValue | null>(null);

const WRONG_PORTAL = "This app is for students and teachers. Staff and admin accounts sign in on the website: app.fajracademy.io";

interface LoginReply {
  success?: boolean;
  message?: string;
  user?: Record<string, unknown> & { _id?: unknown; role?: string; fullName?: string };
}

function toSessionUser(raw: NonNullable<LoginReply["user"]>): SessionUser {
  return { ...raw, _id: String(raw._id ?? ""), role: raw.role as SessionUser["role"], fullName: String(raw.fullName ?? "") };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [endedNotice, setEndedNotice] = useState("");
  const signedIn = useRef(false);

  const dropSession = useCallback(async (notice: string) => {
    if (!signedIn.current) return;
    signedIn.current = false;
    await Session.clear();
    await clearScheduledReminders();
    setUser(null);
    setEndedNotice(notice);
    setStatus("signedOut");
  }, []);

  // Start-up: a stored session opens the app straight away; the server confirms it in the background
  useEffect(() => {
    let alive = true;
    (async () => {
      const stored = await Session.load().catch(() => ({ mode: null, user: null }));
      if (!alive) return;
      if (!stored.mode || !stored.user || (stored.user.role !== "student" && stored.user.role !== "teacher")) {
        await Session.clear();
        setStatus("signedOut");
        return;
      }
      signedIn.current = true;
      setUser(stored.user);
      setStatus("signedIn");
      try {
        // A 401 here goes through the session-ended handler below
        const reply = await apiRaw<LoginReply>("/api/auth/me");
        if (alive && reply.ok && reply.data?.user && signedIn.current) {
          const fresh = toSessionUser(reply.data.user);
          if (fresh.role === "student" || fresh.role === "teacher") {
            setUser(fresh);
            void Session.saveUser(fresh);
          }
        }
      } catch {
        // Offline: keep the stored session; screens show their own "no connection" state
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    setSessionEndedHandler(() => {
      void dropSession("Your session has ended. Please sign in again.");
    });
    return () => setSessionEndedHandler(null);
  }, [dropSession]);

  const signIn = useCallback(async (identifier: string, password: string) => {
    const credentials = { email: identifier.trim(), password };
    let reply;
    try {
      reply = await apiRaw<LoginReply>("/api/auth/login", { method: "POST", body: credentials, keepSessionOn401: true });
    } catch (error) {
      throw new Error(error instanceof ApiError ? error.message : "Network error. Please check your connection and try again.");
    }
    if (!reply.ok || !reply.data?.success || !reply.data.user) {
      throw new Error(reply.data?.message || "Login failed. Please try again.");
    }

    const role = reply.data.user.role;
    if (role !== "student" && role !== "teacher") {
      // Nothing was stored on the phone; just leave the server session to lapse
      throw new Error(WRONG_PORTAL);
    }
    const nextUser = toSessionUser(reply.data.user);

    const token = Platform.OS === "web" ? null : readAuthCookie(reply.headers);
    if (token) {
      await Session.startWithToken(token, nextUser);
    } else if (Platform.OS === "web") {
      await Session.startWithJar(nextUser);
    } else {
      // This phone did not expose the login cookie: sign in again through the system cookie store instead
      const viaJar = await apiRaw<LoginReply>("/api/auth/login", { method: "POST", body: credentials, keepSessionOn401: true, useCookieJar: true });
      if (!viaJar.ok || !viaJar.data?.success) throw new Error(viaJar.data?.message || "Login failed. Please try again.");
      await Session.startWithJar(nextUser);
      const check = await apiRaw("/api/auth/me", { keepSessionOn401: true });
      if (!check.ok) {
        await Session.clear();
        throw new Error("Signed in, but this phone could not keep the session. Please update the app or contact support.");
      }
    }

    await Session.rememberIdentifier(credentials.email).catch(() => {});
    signedIn.current = true;
    setEndedNotice("");
    setUser(nextUser);
    setStatus("signedIn");
  }, []);

  const signOut = useCallback(async () => {
    if (!signedIn.current) return;
    try {
      await apiRaw("/api/auth/logout", { method: "POST", body: {}, keepSessionOn401: true, timeoutMs: 8000 });
    } catch {
      // Offline: the token is removed from the phone below, which is what matters
    }
    signedIn.current = false;
    await Session.clear();
    await clearScheduledReminders();
    setUser(null);
    setStatus("signedOut");
  }, []);

  const updateUser = useCallback((patch: Partial<SessionUser>) => {
    setUser((current) => {
      if (!current) return current;
      const next = { ...current, ...patch } as SessionUser;
      void Session.saveUser(next);
      return next;
    });
  }, []);

  const clearEndedNotice = useCallback(() => setEndedNotice(""), []);

  const value = useMemo<AuthValue>(
    () => ({ status, user, endedNotice, clearEndedNotice, signIn, signOut, updateUser }),
    [status, user, endedNotice, clearEndedNotice, signIn, signOut, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
