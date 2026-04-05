import Constants from "expo-constants";
import { Platform } from "react-native";

const hostUri =
  Constants.expoConfig?.hostUri ||
  (Constants as typeof Constants & { manifest2?: { extra?: { expoClient?: { hostUri?: string } } } }).manifest2?.extra
    ?.expoClient?.hostUri ||
  "";

const inferredHost = hostUri.split(":")[0];
const inferredApiUrl =
  inferredHost && inferredHost !== "localhost" && inferredHost !== "127.0.0.1"
    ? `http://${inferredHost}:3000/api`
    : "";

const localFallbackApiUrl = Platform.OS === "android" ? "http://10.0.2.2:3000/api" : "http://localhost:3000/api";

// Use EXPO_PUBLIC_API_URL for physical-device testing, e.g. http://192.168.1.10:3000/api.
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.trim() ||
  inferredApiUrl ||
  localFallbackApiUrl;

export const AUTH_STORAGE_KEYS = {
  accessToken: "nexora.test-mobile.access-token",
  refreshToken: "nexora.test-mobile.refresh-token",
  session: "nexora.test-mobile.session",
} as const;
