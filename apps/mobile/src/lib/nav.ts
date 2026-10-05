import { router } from "expo-router";

/** Back to the PvtFrnd home: pop to it if it's underneath, otherwise open it. */
export function goHome() {
  if (router.canDismiss()) router.dismissTo("/home");
  else router.replace("/home");
}
