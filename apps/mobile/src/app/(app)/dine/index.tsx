import { useCallback, useEffect, useState } from "react";
import { Image, Text, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { ScoreRing } from "@/components/cards/AgentCards";
import { Badge, Card, Chip, H, P, Row, Screen, useTheme } from "@/components/ui";
import { api } from "@/lib/api";
import { useHere } from "@/lib/location";
import { ServiceGate } from "@/components/ServiceGate";
import { AskFab } from "@/components/AskFab";
import { HeroScene } from "@/components/motion/HeroScene";
import { Stagger } from "@/components/motion/Stagger";
import { SkeletonCard } from "@/components/motion/Extras";

interface Place {
  id: string; name: string; address: string; distanceKm: number; location: { lat: number; lng: number }; priceLevel?: number; openNow?: boolean; photoUrl?: string;
  sources: { source: "google" | "tripadvisor"; rating: number; reviews: number; url?: string }[]; triScore: number; totalReviews: number; highlights: string[];
}
const KINDS = [["restaurant", "🍛 Food"], ["cafe", "☕ Cafés"], ["lodging", "🏨 Stays"], ["saved", "♥ Saved"]] as const;
interface Favorite { placeId: string; name: string; address: string | null; lat: number | null; lng: number | null; triScore: number | null; photoUrl: string | null }
const openPlace = (p: Pick<Place, "id"> & Partial<Place>) => router.push({ pathname: "/place/[id]", params: { id: p.id, service: "dine", data: JSON.stringify(p) } });
const SRC = { google: "Google", tripadvisor: "Tripadvisor" };
const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

export default function DineScreen() {
  return <ServiceGate service="dine"><View style={{ flex: 1 }}><Dine /><AskFab /></View></ServiceGate>;
}

function Dine() {
  const t = useTheme();
  const { here, denied } = useHere();
  const [kind, setKind] = useState<(typeof KINDS)[number][0]>("restaurant");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<{ key: string; places: Place[] } | null>(null);
  const [favs, setFavs] = useState<Favorite[] | null>(null);
  // Refresh saved places whenever the screen regains focus (e.g. after saving one in the detail view).
  useFocusEffect(useCallback(() => { api<Favorite[]>("/favorites").then(setFavs).catch(() => setFavs([])); }, []));
  const key = here && kind !== "saved" ? new URLSearchParams({ kind, lat: String(here.lat), lng: String(here.lng), ...(query ? { q: query } : {}) }).toString() : null;
  const places = result && result.key === key ? result.places : null;

  useEffect(() => {
    if (!key) return;
    api<Place[]>(`/places?${key}`).then((p) => setResult({ key, places: p })).catch(() => setResult({ key, places: [] }));
  }, [key]);

  return (
    <Screen fab>
      <HeroScene service="dine" title="Eat & stay, honestly ranked" subtitle={here?.label ? `Best near ${here.label}` : "The best-rated places near you"} />
      <TextInput value={q} onChangeText={setQ} onSubmitEditing={() => setQuery(q.trim())} returnKeyType="search" placeholder="Veg thali, rooftop, family hotel…" placeholderTextColor={t.subtle}
        style={{ backgroundColor: t.card, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 13, fontSize: 16, color: t.text, borderWidth: 1, borderColor: t.border }} />
      <Row gap={2} style={{ flexWrap: "wrap" }}>{KINDS.map(([id, label]) => <Chip key={id} label={id === "saved" && favs?.length ? `${label} (${favs.length})` : label} selected={kind === id} onPress={() => setKind(id)} />)}</Row>

      <Card tinted onPress={() => router.push({ pathname: "/chat/[agent]", params: { agent: "dine" } })}>
        <Text style={{ fontWeight: "800", color: t.deep }}>💬 Ask Swad Guide</Text>
        <P small>"Best momos within 2 km that are open now?"</P>
      </Card>

      {kind === "saved" && (favs?.length ? favs.map((f, i) => (
        <Stagger key={f.placeId} index={i}><Card onPress={() => openPlace({ id: f.placeId, name: f.name, address: f.address ?? undefined, location: { lat: f.lat ?? 0, lng: f.lng ?? 0 }, triScore: f.triScore ?? 0, photoUrl: f.photoUrl ?? undefined, sources: [] })}>
          <Row>
            {f.photoUrl ? <Image source={{ uri: f.photoUrl }} style={{ width: 64, height: 64, borderRadius: 14 }} /> : <View style={{ width: 64, height: 64, borderRadius: 14, backgroundColor: t.tint, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 28 }}>🍽</Text></View>}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "800", color: t.text }}>{f.name}</Text>
              {f.address && <P small muted>{f.address}</P>}
            </View>
            <Text style={{ fontSize: 20, color: "#EF4444" }}>♥</Text>
          </Row>
        </Card></Stagger>
      )) : <Card><P center muted>No saved places yet. Tap ♡ Save on any place to keep it here.</P></Card>)}

      {denied && kind !== "saved" && <P muted>Allow location to find places near you.</P>}
      {kind !== "saved" && !places && here && <><SkeletonCard /><SkeletonCard /></>}
      {kind !== "saved" && places?.map((p, i) => (
        <Stagger key={p.id} index={i}><Card onPress={() => openPlace(p)}>
          {p.photoUrl && <Image source={{ uri: p.photoUrl }} style={{ height: 140, borderRadius: 12, marginBottom: 4 }} />}
          <Row style={{ alignItems: "flex-start" }}>
            <ScoreRing score={p.triScore} />
            <View style={{ flex: 1, gap: 2 }}>
              <Row gap={2}>{i === 0 && p.triScore > 0 && <Badge label="🏆 Top pick" />}{p.openNow && <Badge label="Open now" tone="success" />}</Row>
              <Text style={{ fontSize: 17, fontWeight: "800", color: t.text }}>{p.name}</Text>
              <P small muted>{p.distanceKm} km{p.priceLevel ? ` · ${"₹".repeat(p.priceLevel)}` : ""} · {p.totalReviews ? `${k(p.totalReviews)} reviews` : p.highlights[0] ?? "Not rated yet"}</P>
            </View>
          </Row>
          <Row gap={2} style={{ flexWrap: "wrap" }}>
            {p.sources.map((s) => <Badge key={s.source} label={`${SRC[s.source]} ${s.rating}★ (${k(s.reviews)})`} tone="muted" />)}
            {favs?.some((f) => f.placeId === p.id) && <Badge label="♥ Saved" tone="warning" />}
          </Row>
          {p.highlights[0] && p.triScore > 0 && <P small>“{p.highlights[0]}”</P>}
        </Card></Stagger>
      ))}
      {places?.length && places.every((p) => !p.triScore)
        ? <P small muted center>Places from OpenStreetMap. Ratings, photos and reviews appear once Google Maps is connected.</P>
        : <P small muted center>TriScore blends ratings across sites, weighted by review count, so a handful of 5★ reviews can't game the ranking.</P>}
    </Screen>
  );
}
