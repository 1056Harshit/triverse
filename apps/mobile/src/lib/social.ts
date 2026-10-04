import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as AppleAuthentication from "expo-apple-authentication";
import { api } from "./api";

type GoogleModule = typeof import("@react-native-google-signin/google-signin");

// Google Sign-In is a custom native module: it isn't in Expo Go, and its web build is sponsor-only.
// Load it lazily so the app still runs there with phone/email (and Apple) sign-in.
export const googleAvailable = Platform.OS !== "web" && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient
  && !!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

let google: GoogleModule | null = null;
function loadGoogle(): GoogleModule {
  if (!google) {
    google = require("@react-native-google-signin/google-signin") as GoogleModule;
    google.GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    });
  }
  return google;
}

export async function googleLogin() {
  const { GoogleSignin, isSuccessResponse } = loadGoogle();
  if (Platform.OS === "android") await GoogleSignin.hasPlayServices();
  const res = await GoogleSignin.signIn();
  if (!isSuccessResponse(res) || !res.data.idToken) return null;
  return api<any>("/auth/google", { body: { idToken: res.data.idToken } });
}

export async function appleLogin() {
  try {
    const c = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
    });
    if (!c.identityToken) return null;
    const fullName = [c.fullName?.givenName, c.fullName?.familyName].filter(Boolean).join(" ") || undefined;
    return api<any>("/auth/apple", { body: { identityToken: c.identityToken, fullName } });
  } catch (e) {
    if ((e as { code?: string }).code === "ERR_REQUEST_CANCELED") return null;
    throw e;
  }
}
