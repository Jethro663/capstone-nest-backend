import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import { Platform } from "react-native";
import { getInstalledNativeVersionInfo } from "../services/update/version-identity";
import {
  getAndroidAdmission,
  isAppUpdateError,
  reportUpdatePolicyFailure,
} from "../services/update/update-admission";
import { API_BASE_URL } from "./config";
import {
  clearSecureSession,
  persistAccessToken,
  persistRefreshToken,
  readAccessToken,
  readRefreshToken,
} from "./storage";

let accessToken: string | null = null;
let refreshToken: string | null = null;
let refreshPromise: Promise<{
  accessToken: string;
  refreshToken: string;
} | null> | null = null;

export function getAccessToken() {
  return accessToken;
}

export function getRefreshToken() {
  return refreshToken;
}

async function hydrateTokens() {
  if (!accessToken) {
    accessToken = await readAccessToken();
  }

  if (!refreshToken) {
    refreshToken = await readRefreshToken();
  }
}

export async function persistAuthTokens(tokens: {
  accessToken: string | null;
  refreshToken: string | null;
}) {
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;
  await Promise.all([
    persistAccessToken(tokens.accessToken),
    persistRefreshToken(tokens.refreshToken),
  ]);
}

export const publicClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});
publicClient.interceptors.request.use(addVersionHeaders);
publicClient.interceptors.response.use(
  (response) => response,
  reportPolicyError,
);

function reportPolicyError(error: unknown): Promise<never> {
  if (
    Platform.OS === "android" &&
    axios.isAxiosError(error) &&
    ["APP_UPDATE_REQUIRED", "APP_UPDATE_CHECK_FAILED"].includes(
      error.response?.data?.code,
    )
  ) {
    reportUpdatePolicyFailure();
  }
  return Promise.reject(error);
}

function addVersionHeaders(config: InternalAxiosRequestConfig) {
  if (Platform.OS === "android" || Platform.OS === "ios") {
    config.headers.set("X-App-Platform", Platform.OS);
    config.headers.set(
      "X-App-Version-Code",
      String(getInstalledNativeVersionInfo().currentVersionCode),
    );
  }
  return config;
}

export const apiClient = createApiClient();

function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
  });

  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      addVersionHeaders(config);
      if (
        Platform.OS === "android" &&
        getAndroidAdmission() !== "allowed" &&
        !String(config.url).includes("/auth/mobile/logout")
      ) {
        throw new axios.AxiosError(
          "Verify your app version before continuing.",
          "APP_UPDATE_CHECK_PENDING",
          config,
        );
      }
      await hydrateTokens();
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
      return config;
    },
  );

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config as
        | (InternalAxiosRequestConfig & { _retry?: boolean })
        | null;

      if (
        Platform.OS === "android" &&
        ["APP_UPDATE_REQUIRED", "APP_UPDATE_CHECK_FAILED"].includes(
          error.response?.data?.code,
        )
      ) {
        return reportPolicyError(error);
      }

      if (
        error.response?.status === 401 &&
        originalRequest &&
        !originalRequest._retry &&
        !String(originalRequest.url ?? "").includes("/auth/mobile/refresh")
      ) {
        originalRequest._retry = true;
        const failedToken = accessToken;

        if (!refreshPromise) {
          refreshPromise = refreshSession().finally(() => {
            refreshPromise = null;
          });
        }

        try {
          const nextTokens = await refreshPromise;

          if (nextTokens?.accessToken) {
            originalRequest.headers.Authorization = `Bearer ${nextTokens.accessToken}`;
            return client(originalRequest);
          }

          // Only clear if no concurrent refresh set a newer token
          if (!accessToken || accessToken === failedToken) {
            await clearAuthSession();
          }
        } catch (error) {
          if (isAppUpdateError(error)) throw error;
          if (!accessToken || accessToken === failedToken) {
            await clearAuthSession();
          }
        }
      }

      return Promise.reject(error);
    },
  );

  return client;
}

export async function refreshSession() {
  await hydrateTokens();
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await publicClient.post("/auth/mobile/refresh", {
      refreshToken,
    });
    const nextAccessToken = response.data?.data?.accessToken ?? null;
    const nextRefreshToken = response.data?.data?.refreshToken ?? null;

    if (!nextAccessToken || !nextRefreshToken) {
      return null;
    }

    await persistAuthTokens({
      accessToken: nextAccessToken,
      refreshToken: nextRefreshToken,
    });

    return {
      accessToken: nextAccessToken,
      refreshToken: nextRefreshToken,
    };
  } catch (err: any) {
    if (isAppUpdateError(err)) throw err;
    // Only wipe session on definitive auth rejection, not transient errors
    if (err?.response?.status === 401 || err?.response?.status === 403) {
      await clearAuthSession();
    }
    return null;
  }
}

export async function clearAuthSession() {
  accessToken = null;
  refreshToken = null;
  await clearSecureSession();
}
