import Constants from "expo-constants";

const hostUri =
  Constants.expoConfig?.hostUri ||
  (Constants as typeof Constants & { manifest2?: { extra?: { expoClient?: { hostUri?: string } } } }).manifest2?.extra
    ?.expoClient?.hostUri ||
  "";

const inferredHost = hostUri.split(":")[0];
const fallbackApiUrl = inferredHost ? `http://${inferredHost}:3000/api` : "http://localhost:3000/api";

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.trim() || fallbackApiUrl;

export const AUTH_STORAGE_KEYS = {
  accessToken: "nexora.test-mobile.access-token",
  refreshToken: "nexora.test-mobile.refresh-token",
  session: "nexora.test-mobile.session",
} as const;
