import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { AuthSession } from "../types/auth";
import { AUTH_STORAGE_KEYS } from "./config";

async function setStoredValue(key: string, value: string | null) {
  const asyncOperation = value === null
    ? AsyncStorage.removeItem(key)
    : AsyncStorage.setItem(key, value);

  if (Platform.OS === "web") {
    await asyncOperation;
    return;
  }

  const secureOperation = value === null
    ? SecureStore.deleteItemAsync(key)
    : SecureStore.setItemAsync(key, value);

  await Promise.all([secureOperation, asyncOperation]);
}

async function getStoredValue(key: string) {
  if (Platform.OS === "web") {
    return AsyncStorage.getItem(key);
  }

  const secureValue = await SecureStore.getItemAsync(key);
  if (secureValue) {
    return secureValue;
  }

  return AsyncStorage.getItem(key);
}

export async function persistAccessToken(token: string | null) {
  await setStoredValue(AUTH_STORAGE_KEYS.accessToken, token);
}

export async function readAccessToken() {
  return getStoredValue(AUTH_STORAGE_KEYS.accessToken);
}

export async function persistRefreshToken(token: string | null) {
  await setStoredValue(AUTH_STORAGE_KEYS.refreshToken, token);
}

export async function readRefreshToken() {
  return getStoredValue(AUTH_STORAGE_KEYS.refreshToken);
}

export async function writeSessionSnapshot(session: AuthSession | null) {
  await setStoredValue(AUTH_STORAGE_KEYS.session, session ? JSON.stringify(session) : null);
}

export async function readSessionSnapshot(): Promise<AuthSession | null> {
  const value = await getStoredValue(AUTH_STORAGE_KEYS.session);
  if (!value) return null;

  try {
    return JSON.parse(value) as AuthSession;
  } catch {
    return null;
  }
}

export async function clearSecureSession() {
  await Promise.all([
    setStoredValue(AUTH_STORAGE_KEYS.accessToken, null),
    setStoredValue(AUTH_STORAGE_KEYS.refreshToken, null),
    setStoredValue(AUTH_STORAGE_KEYS.session, null),
  ]);
}
