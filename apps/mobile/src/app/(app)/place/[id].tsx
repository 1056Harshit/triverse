import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Image, Linking, Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Haptics } from "@/lib/haptics";
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSequence, withSpring } from "react-native-reanimated";
import { ScoreRing } from "@/components/cards/AgentCards";
import { Badge, useTheme } from "@/components/ui";
import { api } from "@/lib/api";
import { usePalette } from "@/lib/theme";
import { SkeletonCard } from "@/components/motion/Extras";

interface ListPlace {
  phone?: string; website?: string;
  id: string; name: string; address?: string; distanceKm?: number; priceLevel?: number; openNow?: boolean; photoUrl?: string;
  location: { lat: number; lng: number }; triScore: number; totalReviews?: number; highlights?: string[];
  sources: { source: "google" | "tripadvisor"; rating: number; reviews: number; url?: string }[];
}
interface Review { source: "google" | "tripadvisor"; author: string; authorPhoto?: string; authorUrl?: string; rating: number; text: string; when: string }
interface Details {
  name: string; address?: string; location?: { lat: number; lng: number }; phone?: string; website?: string; mapsUrl?: string;
  openNow?: boolean; hours?: string[]; summary?: string; priceLevel?: number; triScore: number;
  sources: ListPlace["sources"]; photos: { url: string; attribution?: string; source: string }[]; reviews: Review[];
  sample: boolean; saved: boolean;
}

const SRC = { google: "Google", tripadvisor: "Tripadvisor" } as const;
const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

export default function PlaceDetail() {
  const { service: svc = "dine" } = useLocalSearchParams<{ service?: "dine" | "health" | "travel" }>();
  const t = usePalette(svc);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { id, data, service = "dine" } = useLocalSearchParams<{ id: string; data: string; service?: "dine" | "health" | "travel" }>();
  const placeholderEmoji = service === "health" ? "🏥" : service === "travel" ? "🏔" : "🍽";
  const base = JSON.parse(data) as ListPlace;
  const [d, setD] = useState<Details | null>(null);
  const [failed, setFailed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [page, setPage] = useState(0);
  const [viewer, setViewer] = useState<number | null>(null);
  const [showHours, setShowHours] = useState(false);
  const heart = useSharedValue(1);
  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: heart.get() }] }));

  useEffect(() => {
    api<Details>(`/places/${encodeURIComponent(id)}`).then((r) => { setD(r); setSaved(r.saved); }).catch(() => setFailed(true));
  }, [id]);

  const name = d?.name || base.name;
  const loc = d?.location ?? base.location;
  const sources = d?.sources.length ? d.sources : base.sources;
  const score = d?.sources.length ? d.triScore : base.triScore;
  const photos = d?.photos.length ? d.photos : base.photoUrl ? [{ url: base.photoUrl, source: "google" }] : [];
  const openNow = d?.openNow ?? base.openNow;
  const price = d?.priceLevel ?? base.priceLevel;

  const directions = () => {
    const placeId = id.startsWith("g:") ? `&destination_place_id=${encodeURIComponent(id.slice(2))}` : "";
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}${placeId}&travelmode=driving`);
  };

  const toggleSave = async () => {
    const next = !saved;
    setSaved(next);
    heart.set(withSequence(withSpring(1.35, { damping: 6 }), withSpring(1)));
    Haptics.notificationAsync(next ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
    try {
      if (next) await api(`/favorites/${encodeURIComponent(id)}`, { method: "PUT", body: { name, address: d?.address ?? base.address, lat: loc.lat, lng: loc.lng, triScore: score, photoUrl: photos[0]?.url, kind: service === "dine" ? "restaurant" : service } });
      else await api(`/favorites/${encodeURIComponent(id)}`, { method: "DELETE" });
    } catch {
      setSaved(!next); // roll back if the server didn't take it
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }} showsVerticalScrollIndicator={false}>
        {/* Photo gallery */}
        <View style={{ height: 320 }}>
          {photos.length ? (
            <FlatList
              data={photos} horizontal pagingEnabled showsHorizontalScrollIndicator={false} keyExtractor={(p, i) => p.url + i}
              onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
              renderItem={({ item, index }) => (
                <Pressable onPress={() => setViewer(index)}>
                  <Image source={{ uri: item.url }} style={{ width, height: 320 }} resizeMode="cover" />
                </Pressable>
              )}
            />
          ) : (
            <LinearGradient colors={[t.primary, t.deep]} style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Text style={{ fontSize: 64 }}>{placeholderEmoji}</Text>
              <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: "600", textAlign: "center", paddingHorizontal: 40 }}>
                {d?.sample || id.startsWith("osm:") ? "Photos appear when Google Maps is connected" : "No photos yet"}
              </Text>
            </LinearGradient>
          )}
          <LinearGradient pointerEvents="none" colors={["rgba(0,0,0,0.45)", "transparent"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 110 }} />
          <View style={{ position: "absolute", top: insets.top + 8, left: 16, right: 16, flexDirection: "row", justifyContent: "space-between" }}>
            <RoundBtn label="‹" onPress={() => router.back()} big />
            <Animated.View style={heartStyle}><RoundBtn label={saved ? "♥" : "♡"} color={saved ? "#EF4444" : "#111"} onPress={toggleSave} /></Animated.View>
          </View>
          {photos.length > 1 && (
            <View style={{ position: "absolute", bottom: 40, alignSelf: "center", flexDirection: "row", gap: 6 }}>
              {photos.slice(0, 10).map((_, i) => <View key={i} style={{ width: i === page ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === page ? "#fff" : "rgba(255,255,255,0.55)" }} />)}
            </View>
          )}
          {photos.length > 0 && (
            <View style={{ position: "absolute", bottom: 36, right: 16, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>📷 {page + 1}/{photos.length}</Text>
            </View>
          )}
        </View>

        {/* Info sheet overlapping the photos */}
        <View style={{ marginTop: -24, backgroundColor: t.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, gap: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 14 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ fontSize: 26, fontWeight: "800", color: t.text, letterSpacing: -0.5 }}>{name}</Text>
              <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                {openNow !== undefined && <Badge label={openNow ? "● Open now" : "● Closed"} tone={openNow ? "success" : "warning"} />}
                {!!price && <Badge label={"₹".repeat(price)} tone="muted" />}
                {base.distanceKm !== undefined && <Badge label={`${base.distanceKm} km away`} tone="muted" />}
              </View>
            </View>
            {score > 0 && (
              <View style={{ alignItems: "center", gap: 2 }}>
                <ScoreRing score={score} size={60} />
                <Text style={{ fontSize: 10, color: t.muted, fontWeight: "800", letterSpacing: 1 }}>{sources.length > 1 ? "TRISCORE" : "RATING"}</Text>
              </View>
            )}
          </View>

          {d?.sample && (
            <View style={{ backgroundColor: "#FEF3C7", borderRadius: 14, padding: 12 }}>
              <Text style={{ color: "#92400E", fontSize: 13 }}>🧪 Demo place. Add GOOGLE_MAPS_API_KEY on the server to see real places, photos and reviews.</Text>
            </View>
          )}

          <View style={{ flexDirection: "row", gap: 10 }}>
            {sources.map((s) => (
              <Pressable key={s.source} onPress={() => s.url && Linking.openURL(s.url)} style={{ flex: 1, backgroundColor: t.card, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: t.border }}>
                <Text style={{ color: t.muted, fontSize: 12, fontWeight: "700" }}>{SRC[s.source]}</Text>
                <Text style={{ color: t.text, fontSize: 20, fontWeight: "800" }}>{s.rating.toFixed(1)} <Text style={{ fontSize: 14, color: "#F59E0B" }}>★</Text></Text>
                <Text style={{ color: t.muted, fontSize: 12 }}>{k(s.reviews)} reviews</Text>
              </Pressable>
            ))}
          </View>

          {(d?.summary || base.highlights?.[0]) && <Text style={{ color: t.text, fontSize: 15, lineHeight: 22 }}>{d?.summary ?? base.highlights?.[0]}</Text>}

          {(d?.address || base.address) && <InfoRow icon="📍" text={d?.address ?? base.address!} />}
          {d?.hours?.length ? (
            <Pressable onPress={() => setShowHours(!showHours)}>
              <InfoRow icon="🕒" text={showHours ? d.hours.join("\n") : `${d.hours[(new Date().getDay() + 6) % 7]}  ▾`} />
            </Pressable>
          ) : null}
          <View style={{ flexDirection: "row", gap: 10 }}>
            {(d?.phone ?? base.phone) && <Chip label="📞 Call" onPress={() => Linking.openURL(`tel:${(d?.phone ?? base.phone)!.split(/[;,]/)[0].trim()}`)} />}
            {(d?.website ?? base.website) && <Chip label={(d?.website ?? base.website)!.includes("wikipedia.org") ? "📖 Wikipedia" : "🌐 Website"} onPress={() => Linking.openURL((d?.website ?? base.website)!)} />}
            {d?.mapsUrl && <Chip label="🗺 On Google Maps" onPress={() => Linking.openURL(d.mapsUrl!)} />}
          </View>

          {/* Reviews (restaurants, hotels and Google places) */}
          {(service === "dine" || id.startsWith("g:") || id.startsWith("demo:")) && <>
          <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 6 }}>
            <Text style={{ fontSize: 20, fontWeight: "800", color: t.text }}>Reviews</Text>
            {d && <Text style={{ color: t.muted, fontSize: 12 }}>{d.reviews.length} shown{d.reviews.some((r) => r.source === "google") && !d.sample ? " · from Google" : ""}</Text>}
          </View>
          {!d && !failed && <><SkeletonCard image={false} /><SkeletonCard image={false} /></>}
          {failed && <Text style={{ color: t.muted }}>Couldn't load reviews right now.</Text>}
          {d?.reviews.map((r, i) => <ReviewCard key={i} r={r} index={i} sample={d.sample} />)}
          </>}
          {service === "health" && (
            <Pressable onPress={() => Linking.openURL("tel:108")} style={{ backgroundColor: "#FEF2F2", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#FCA5A5" }}>
              <Text style={{ color: "#991B1B", fontWeight: "800" }}>🚑 Emergency? Call 108 for an ambulance</Text>
              <Text style={{ color: "#991B1B", fontSize: 12 }}>Call the hospital before visiting to confirm doctors and timings.</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      {/* Sticky actions */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12) + 4, backgroundColor: t.card, borderTopWidth: 1, borderColor: t.border }}>
        <Pressable onPress={directions} style={({ pressed }) => ({ flex: 1.4, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingVertical: 15, borderRadius: 999, backgroundColor: t.primary, opacity: pressed ? 0.85 : 1 })}>
          <Text style={{ fontSize: 18 }}>🧭</Text>
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>Directions</Text>
        </Pressable>
        <Pressable onPress={toggleSave} style={({ pressed }) => ({ flex: 1, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingVertical: 15, borderRadius: 999, borderWidth: 2, borderColor: saved ? "#EF4444" : t.border, backgroundColor: saved ? "#FEF2F2" : t.card, opacity: pressed ? 0.85 : 1 })}>
          <Animated.Text style={[{ fontSize: 18, color: "#EF4444" }, heartStyle]}>{saved ? "♥" : "♡"}</Animated.Text>
          <Text style={{ color: saved ? "#B91C1C" : t.text, fontWeight: "800", fontSize: 16 }}>{saved ? "Saved" : "Save"}</Text>
        </Pressable>
      </View>

      {/* Full-screen photo viewer */}
      <Modal visible={viewer !== null} transparent={false} animationType="fade" onRequestClose={() => setViewer(null)}>
        <PhotoViewer photos={photos} start={viewer ?? 0} onClose={() => setViewer(null)} />
      </Modal>
    </View>
  );
}

function PhotoViewer({ photos, start, onClose }: { photos: Details["photos"]; start: number; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [i, setI] = useState(start);
  const list = useRef<FlatList>(null);
  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <FlatList
        ref={list} data={photos} horizontal pagingEnabled initialScrollIndex={start} showsHorizontalScrollIndicator={false}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })} keyExtractor={(p, n) => p.url + n}
        onMomentumScrollEnd={(e) => setI(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => <Image source={{ uri: item.url }} style={{ width, height }} resizeMode="contain" />}
      />
      <View style={{ position: "absolute", top: insets.top + 8, left: 16, right: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <RoundBtn label="✕" onPress={onClose} />
        <Text style={{ color: "#fff", fontWeight: "700" }}>{i + 1} / {photos.length}</Text>
      </View>
      {photos[i]?.attribution && (
        <Text style={{ position: "absolute", bottom: insets.bottom + 20, alignSelf: "center", color: "rgba(255,255,255,0.8)", fontSize: 12 }}>
          📷 {photos[i].attribution} · {photos[i].source === "google" ? "Google" : "Tripadvisor"}
        </Text>
      )}
    </View>
  );
}

function ReviewCard({ r, index, sample }: { r: Review; index: number; sample: boolean }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const long = r.text.length > 220;
  return (
    <Animated.View entering={FadeInDown.delay(index * 60)} style={{ backgroundColor: t.card, borderRadius: 18, padding: 14, gap: 8, borderWidth: 1, borderColor: t.border }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {r.authorPhoto
          ? <Image source={{ uri: r.authorPhoto }} style={{ width: 38, height: 38, borderRadius: 19 }} />
          : <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.tint, alignItems: "center", justifyContent: "center" }}><Text style={{ color: t.deep, fontWeight: "800" }}>{r.author[0]?.toUpperCase()}</Text></View>}
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.text, fontWeight: "700" }} onPress={r.authorUrl ? () => Linking.openURL(r.authorUrl!) : undefined}>{r.author}</Text>
          <Text style={{ color: t.muted, fontSize: 12 }}>
            <Text style={{ color: "#F59E0B" }}>{"★".repeat(Math.round(r.rating))}</Text>
            <Text style={{ color: t.border }}>{"★".repeat(5 - Math.round(r.rating))}</Text>  ·  {r.when}
          </Text>
        </View>
        <Badge label={sample ? "Sample" : SRC[r.source]} tone="muted" />
      </View>
      <Text style={{ color: t.text, fontSize: 14, lineHeight: 21 }} numberOfLines={open || !long ? undefined : 5}>{r.text}</Text>
      {long && <Text onPress={() => setOpen(!open)} style={{ color: t.primary, fontWeight: "700" }}>{open ? "Show less" : "Read more"}</Text>}
    </Animated.View>
  );
}

function InfoRow({ icon, text }: { icon: string; text: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      <Text style={{ fontSize: 16 }}>{icon}</Text>
      <Text style={{ flex: 1, color: t.text, fontSize: 14, lineHeight: 21 }}>{text}</Text>
    </View>
  );
}

function Chip({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} style={{ paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999, backgroundColor: t.tint }}>
      <Text style={{ color: t.deep, fontWeight: "700", fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

function RoundBtn({ label, onPress, color = "#111", big }: { label: string; onPress: () => void; color?: string; big?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center", opacity: pressed ? 0.8 : 1 })}>
      <Text style={{ fontSize: big ? 28 : 20, color, marginTop: big ? -3 : 0, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}
