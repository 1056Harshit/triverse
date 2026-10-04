import { useEffect, useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import type { RideSummary } from "@triverse/shared";
import { RideCard } from "@/components/cards/AgentCards";
import { Button, Card, H, P, Screen, useTheme } from "@/components/ui";
import type { Place } from "@/components/PlaceInput";
import { api } from "@/lib/api";
import { SkeletonCard } from "@/components/motion/Extras";
import { Stagger } from "@/components/motion/Stagger";

export default function Results() {
  const t = useTheme();
  const p = useLocalSearchParams<{ from: string; to: string; date: string; seats: string; womenOnly: string }>();
  const from = JSON.parse(p.from) as Place, to = JSON.parse(p.to) as Place;
  const [rides, setRides] = useState<RideSummary[] | null>(null);
  const [error, setError] = useState<string>();

  const query = new URLSearchParams({ oLat: String(from.lat), oLng: String(from.lng), dLat: String(to.lat), dLng: String(to.lng), date: p.date, seats: p.seats, ...(p.womenOnly === "1" ? { womenOnly: "true" } : {}) }).toString();
  useEffect(() => {
    api<RideSummary[]>(`/rides/search?${query}`).then(setRides).catch((e) => setError(e.message));
  }, [query]);

  return (
    <Screen>
      <H>{from.name} → {to.name}</H>
      <P muted>{new Date(p.date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })} · {p.seats} seat{p.seats === "1" ? "" : "s"}</P>
      {!rides && !error && <><SkeletonCard image={false} /><SkeletonCard image={false} /><SkeletonCard image={false} /></>}
      {error && <P>{error}</P>}
      {rides?.map((r, i) => <Stagger key={r.id} index={i}><RideCard ride={r} /></Stagger>)}
      {!!rides?.length && <P small muted center>* Volvo fares are estimates and not confirmed.</P>}
      {rides?.length === 0 && (
        <Card>
          <H level="h3">No rides yet</H>
          <P muted>Rides on this route often appear the evening before. Set an alert and we'll notify you the moment one is published.</P>
          <Button label="🔔 Alert me" variant="secondary" onPress={() => router.push({ pathname: "/chat/[agent]", params: { agent: "ride", prompt: `Create a ride alert from ${from.name} to ${to.name} on ${p.date}` } })} />
        </Card>
      )}
      <View style={{ height: 20 }} />
    </Screen>
  );
}
