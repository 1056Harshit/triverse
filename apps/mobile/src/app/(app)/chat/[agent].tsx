import { Stack, useLocalSearchParams } from "expo-router";
import { SERVICES, type AgentId } from "@triverse/shared";
import { AgentChat } from "@/components/AgentChat";
import { ServiceGate } from "@/components/ServiceGate";

const SUGGESTIONS: Record<AgentId, string[]> = {
  farm: [
    "मेरे सेब के पत्तों पर भूरे धब्बे हैं, क्या करूँ?",
    "Best time to spray fungicide this week?",
    "Mancozeb 75% WP price online and how to use it safely",
    "Which crops should I sow in October in Himachal?",
  ],
  ride: ["Shimla to Chandigarh tomorrow morning", "How much should I charge per seat to Delhi?", "Women-only rides to Manali this weekend"],
  dine: ["Best veg thali near me under ₹300", "Family hotel with parking near the Mall Road", "Top-rated cafés open now"],
  promo: ["Diwali campaign for Ride: home for the festival, shared and safe", "Rabi sowing campaign for Farm", "Weekend café trail for Dine in Shimla"],
  health: ["मुझे दो दिन से बुखार है, क्या करूँ?", "Nearest government hospital with emergency", "Remind me to take BP medicine at 8 AM and 8 PM", "Explain my blood test report (send a photo)"],
  travel: ["Plan a 3-day Manali trip for 2 from Shimla", "Best places to see near me today", "Is it safe to go to Spiti next week? Weather?", "Weekend in Dharamshala under ₹6,000"],
  triverse: ["Weekend in Manali for 2: ride, stay and food", "My apples are ready, where should I sell them?", "मेरी कमर में दर्द है, पास में डॉक्टर कहाँ है?", "Cab to Solan tomorrow morning"],
};

export default function Chat() {
  const { agent, prompt, scan, voice } = useLocalSearchParams<{ agent: AgentId; prompt?: string; scan?: string; voice?: string }>();
  const title = agent === "promo" ? "Campaign Studio" : agent === "triverse" ? "Ask TriVerse" : SERVICES[agent]?.agentName;
  return (
    <>
      <Stack.Screen options={{ title }} />
      {agent === "promo" || agent === "triverse"
        ? <AgentChat agent={agent} suggestions={SUGGESTIONS[agent]} initialPrompt={prompt} autoVoice={voice === "1"} />
        : <ServiceGate service={agent}><AgentChat agent={agent} suggestions={SUGGESTIONS[agent] ?? []} initialPrompt={prompt} autoCamera={scan === "1"} /></ServiceGate>}
    </>
  );
}
