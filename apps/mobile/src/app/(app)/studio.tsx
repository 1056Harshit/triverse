import { Redirect } from "expo-router";

export default function Studio() {
  return <Redirect href={{ pathname: "/chat/[agent]", params: { agent: "promo" } }} />;
}
