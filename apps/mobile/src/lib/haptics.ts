import * as H from "expo-haptics";

/** expo-haptics, but silent when the user turns haptics off in Settings. */
let enabled = true;
export const setHapticsEnabled = (on: boolean) => { enabled = on; };

export const Haptics = {
  ImpactFeedbackStyle: H.ImpactFeedbackStyle,
  NotificationFeedbackType: H.NotificationFeedbackType,
  selectionAsync: () => (enabled ? H.selectionAsync().catch(() => {}) : Promise.resolve()),
  impactAsync: (s?: H.ImpactFeedbackStyle) => (enabled ? H.impactAsync(s).catch(() => {}) : Promise.resolve()),
  notificationAsync: (t?: H.NotificationFeedbackType) => (enabled ? H.notificationAsync(t).catch(() => {}) : Promise.resolve()),
};
