/** Native builds use the in-app Google button; this browser-only button lives in GoogleWebButton.web.tsx. */
export function GoogleWebButton(_: { onToken: (idToken: string) => void; width: number }) {
  return null;
}
