import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_SETTINGS, type ServiceId, type UserProfile, type UserSettings } from "@triverse/shared";
import { setHapticsEnabled } from "./haptics";
import { api, loadSession, saveSession, setSignedOutHandler, type Session } from "./api";

interface AuthResult extends Session { user: UserProfile; isNew: boolean }

interface AuthState {
  ready: boolean;
  user: UserProfile | null;
  /** Called with the result of any login endpoint (OTP, Google, Apple). */
  signIn: (r: AuthResult) => Promise<void>;
  signOut: () => Promise<void>;
  setServices: (services: ServiceId[], active?: ServiceId) => Promise<void>;
  switchService: (s: ServiceId) => Promise<void>;
  refreshUser: () => Promise<void>;
  settings: UserSettings;
  updateSettings: (patch: Partial<Omit<UserSettings, "banners">>) => Promise<void>;
  uploadBanner: (service: ServiceId, base64: string) => Promise<void>;
  removeBanner: (service: ServiceId) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    setSignedOutHandler(() => setUser(null));
    (async () => {
      try { if (await loadSession()) setUser(await api<UserProfile>("/me")); } catch { await saveSession(null); }
      setReady(true);
    })();
  }, []);

  const signIn = useCallback(async (r: AuthResult) => {
    await saveSession({ accessToken: r.accessToken, refreshToken: r.refreshToken });
    setUser(r.user);
  }, []);

  const signOut = useCallback(async () => {
    const s = await loadSession();
    if (s) api("/auth/logout", { body: { refreshToken: s.refreshToken } }).catch(() => {});
    await saveSession(null);
    setUser(null);
  }, []);

  const setServices = useCallback(async (services: ServiceId[], active?: ServiceId) => {
    setUser(await api<UserProfile>("/me/services", { method: "PUT", body: { services, active } }));
  }, []);

  const switchService = useCallback(async (service: ServiceId) => {
    setUser((u) => (u ? { ...u, activeService: service, services: u.services.includes(service) ? u.services : [...u.services, service] } : u));
    setUser(await api<UserProfile>("/me/active", { method: "PUT", body: { service } }));
  }, []);

  const refreshUser = useCallback(async () => setUser(await api<UserProfile>("/me")), []);

  const settings = useMemo<UserSettings>(() => ({ ...DEFAULT_SETTINGS, ...(user?.settings ?? {}) }), [user?.settings]);
  useEffect(() => { setHapticsEnabled(settings.haptics); }, [settings.haptics]);

  const updateSettings = useCallback(async (patch: Partial<Omit<UserSettings, "banners">>) => {
    // Apply instantly, then save; roll back if the server refuses.
    setUser((u) => (u ? { ...u, settings: { ...DEFAULT_SETTINGS, ...u.settings, ...patch } } : u));
    try { setUser(await api<UserProfile>("/me/settings", { method: "PATCH", body: patch })); } catch { await refreshUser().catch(() => {}); }
  }, [refreshUser]);
  const uploadBanner = useCallback(async (service: ServiceId, data: string) => {
    setUser(await api<UserProfile>("/me/banner", { body: { service, data } }));
  }, []);
  const removeBanner = useCallback(async (service: ServiceId) => {
    setUser(await api<UserProfile>(`/me/banner/${service}`, { method: "DELETE" }));
  }, []);
  const deleteAccount = useCallback(async () => {
    await api("/me", { method: "DELETE" });
    await saveSession(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ ready, user, signIn, signOut, setServices, switchService, refreshUser, settings, updateSettings, uploadBanner, removeBanner, deleteAccount }),
    [ready, user, signIn, signOut, setServices, switchService, refreshUser, settings, updateSettings, uploadBanner, removeBanner, deleteAccount]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
}

/** The active service for theming; falls back to brand blue before onboarding. */
export function useActiveService(): ServiceId | "brand" {
  const { user } = useAuth();
  return user?.services.length ? user.activeService : "brand";
}
