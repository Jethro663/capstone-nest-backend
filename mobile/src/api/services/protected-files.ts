import * as FileSystem from "expo-file-system/legacy";
import { Linking, Platform } from "react-native";
import { getAccessToken, refreshSession } from "../client";
import { API_BASE_URL } from "../config";

function getDownloadFilename(contentDisposition: string | undefined, fallback: string) {
  if (!contentDisposition) return fallback;
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }
  const plainMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  return plainMatch?.[1] ?? fallback;
}

function normalizeHeaders(headers: Record<string, string> | undefined) {
  return Object.fromEntries(
    Object.entries(headers ?? {}).map(([key, value]) => [key.toLowerCase(), value]),
  );
}

function sanitizeFilename(value: string) {
  return value.trim().replace(/[^\w.\-() ]+/g, "_") || "attachment";
}

function getApiOrigin() {
  return API_BASE_URL.replace(/\/api\/?$/, "");
}

export function buildProtectedUrl(pathname: string) {
  if (/^https?:\/\//i.test(pathname)) {
    return pathname;
  }

  if (pathname.startsWith("/api/")) {
    return `${getApiOrigin()}${pathname}`;
  }

  const normalizedBase = API_BASE_URL.replace(/\/$/, "");
  return `${normalizedBase}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

function buildDownloadTarget(filename: string, persistent: boolean) {
  const baseDirectory =
    (persistent ? FileSystem.documentDirectory : FileSystem.cacheDirectory) ||
    FileSystem.cacheDirectory ||
    FileSystem.documentDirectory;

  if (!baseDirectory) {
    throw new Error("File downloads are unavailable on this device.");
  }

  return `${baseDirectory}${Date.now()}-${sanitizeFilename(filename)}`;
}

export async function openLocalFile(uri: string) {
  const targetUri =
    Platform.OS === "android" && typeof FileSystem.getContentUriAsync === "function"
      ? await FileSystem.getContentUriAsync(uri)
      : uri;

  const supported = await Linking.canOpenURL(targetUri).catch(() => true);
  if (supported === false) {
    throw new Error("No app is available to open this file.");
  }

  await Linking.openURL(targetUri);
}

export async function downloadProtectedFile(options: {
  pathname: string;
  fallbackName: string;
  persistent?: boolean;
  openAfterDownload?: boolean;
}) {
  const targetUri = buildDownloadTarget(options.fallbackName, Boolean(options.persistent));
  const url = buildProtectedUrl(options.pathname);

  const attemptDownload = async (token: string | null) => {
    const result = await FileSystem.downloadAsync(url, targetUri, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (result.status >= 400) {
      throw Object.assign(new Error(`Download failed with status ${result.status}`), {
        status: result.status,
      });
    }

    const headers = normalizeHeaders(result.headers);
    const filename = getDownloadFilename(headers["content-disposition"], options.fallbackName);
    const download = {
      filename,
      headers,
      uri: result.uri,
    };

    if (options.openAfterDownload) {
      await openLocalFile(download.uri);
    }

    return download;
  };

  try {
    return await attemptDownload(getAccessToken());
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 401) {
      const refreshed = await refreshSession();
      return attemptDownload(refreshed?.accessToken ?? null);
    }
    throw error;
  }
}

export function buildProtectedImageSource(pathname?: string | null) {
  if (!pathname) return undefined;

  const token = getAccessToken();
  return {
    uri: buildProtectedUrl(pathname),
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  };
}
