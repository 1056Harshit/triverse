import { Redirect } from "expo-router";
import { useAuth } from "@/lib/auth";

export default function Home() {
  const { user } = useAuth();
  return <Redirect href={`/${user?.activeService ?? "farm"}`} />;
}
