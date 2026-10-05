import { Redirect } from "expo-router";

/** The app opens on the PvtFrnd home (logo + all your worlds). */
export default function Index() {
  return <Redirect href="/home" />;
}
