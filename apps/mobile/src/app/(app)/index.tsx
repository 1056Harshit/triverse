import { Redirect } from "expo-router";

/** The app opens on the TriVerse home (logo + all your worlds). */
export default function Index() {
  return <Redirect href="/home" />;
}
