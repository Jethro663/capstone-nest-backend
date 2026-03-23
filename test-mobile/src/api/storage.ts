import * as SecureStore from "expo-secure-store";
import type { AuthSession } from "../types/auth";
import { AUTH_STORAGE_KEYS } from "./config";

export async function persistAccessToken(token: string | null) {
  if (!token) {
    await SecureStore.deleteItemAsync(AUTH_STORAGE_KEYS.accessToken);
    return;
  }

  await SecureStore.setItemAsync(AUTH_STORAGE_KEYS.accessToken, token);
}

export async function readAccessToken() {
  return SecureStore.getItemAsync(AUTH_STORAGE_KEYS.accessToken);
}

export async function persistRefreshToken(token: string | null) {
  if (!token) {
    await SecureStore.deleteItemAsync(AUTH_STORAGE_KEYS.refreshToken);
    return;
  }

  await SecureStore.setItemAsync(AUTH_STORAGE_KEYS.refreshToken, token);
}

export async function readRefreshToken() {
  return SecureStore.getItemAsync(AUTH_STORAGE_KEYS.refreshToken);
}

export async function writeSessionSnapshot(session: AuthSession | null) {
  if (!session) {
    await SecureStore.deleteItemAsync(AUTH_STORAGE_KEYS.session);
    return;
  }

  await SecureStore.setItemAsync(AUTH_STORAGE_KEYS.session, JSON.stringify(session));
}

export async function readSessionSnapshot(): Promise<AuthSession | null> {
  const value = await SecureStore.getItemAsync(AUTH_STORAGE_KEYS.session);
  if (!value) return null;

  try {
    return JSON.parse(value) as AuthSession;
  } catch {
    return null;
  }
}

export async function clearSecureSession() {
  await Promise.all([
    SecureStore.deleteItemAsync(AUTH_STORAGE_KEYS.accessToken),
    SecureStore.deleteItemAsync(AUTH_STORAGE_KEYS.refreshToken),
    SecureStore.deleteItemAsync(AUTH_STORAGE_KEYS.session),
  ]);
}
