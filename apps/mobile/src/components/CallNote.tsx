import { Text, View } from "react-native";
import { useTheme } from "@/components/ui";

/** 2Factor often delivers the code as an automated voice call rather than an SMS. */
export function CallNote() {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: t.tint, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: t.border }}>
      <Text style={{ fontSize: 24 }}>📞</Text>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: t.deep, fontWeight: "800", fontSize: 14 }}>Pick up the call</Text>
        <Text style={{ color: t.text, fontSize: 13, lineHeight: 18 }}>Your code may come as an automated phone call instead of an SMS. Answer it and listen for the 6 digits.</Text>
      </View>
    </View>
  );
}
