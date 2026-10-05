import { useEffect, useRef } from "react";
import { View } from "react-native";

type Gis = { accounts: { id: { initialize(o: object): void; renderButton(el: HTMLElement, o: object): void } } };
let loading: Promise<Gis> | null = null;
function loadGis(): Promise<Gis> {
  const w = window as unknown as { google?: Gis };
  if (w.google?.accounts) return Promise.resolve(w.google);
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client"; s.async = true;
    s.onload = () => resolve((window as unknown as { google: Gis }).google);
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return loading;
}

/** Google's own "Continue with Google" button for the web app (Google Identity Services). */
export function GoogleWebButton({ onToken, width }: { onToken: (idToken: string) => void; width: number }) {
  const ref = useRef<View>(null);
  const cb = useRef(onToken);
  cb.current = onToken;
  useEffect(() => {
    const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    if (!clientId) return;
    let alive = true;
    loadGis().then((g) => {
      const el = ref.current as unknown as HTMLElement | null;
      if (!alive || !el) return;
      g.accounts.id.initialize({ client_id: clientId, callback: (r: { credential?: string }) => r.credential && cb.current(r.credential), ux_mode: "popup" });
      g.accounts.id.renderButton(el, { theme: "filled_black", size: "large", shape: "pill", text: "continue_with", logo_alignment: "center", width: Math.min(400, Math.round(width)) });
    }).catch(() => {});
    return () => { alive = false; };
  }, [width]);
  return <View ref={ref} style={{ alignItems: "center", minHeight: 44 }} />;
}
