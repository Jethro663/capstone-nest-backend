import AsyncStorage from "@react-native-async-storage/async-storage";
import type { EditorDocument } from "./model";

const PREFIX = "assessment-editor:v1:";
const SCHOOL_CONTENT_PREFIXES = [
  PREFIX,
  "assignment-creation:v1:",
  "teacher-ai-draft:",
  "teacher-extractions:",
] as const;
export const recoveryKey = (
  userId: string,
  assessmentId: string | undefined,
  classId: string,
) => `${PREFIX}${userId}:${assessmentId ?? `new:${classId}`}`;
export async function writeEditorRecovery(
  key: string,
  document: EditorDocument,
) {
  await AsyncStorage.setItem(
    key,
    JSON.stringify({ version: 1, savedAt: new Date().toISOString(), document }),
  );
}
export async function readEditorRecovery(
  key: string,
): Promise<EditorDocument | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    return value.version === 1 &&
      value.document &&
      typeof value.document.classId === "string" &&
      Array.isArray(value.document.questions) &&
      typeof value.document.settings === "object"
      ? value.document
      : null;
  } catch {
    return null;
  }
}
export const clearEditorRecovery = (key: string) =>
  AsyncStorage.removeItem(key);
export async function clearAllSchoolDataRecovery() {
  const keys = (await AsyncStorage.getAllKeys()).filter((key) =>
    SCHOOL_CONTENT_PREFIXES.some((prefix) => key.startsWith(prefix)),
  );
  if (keys.length) await AsyncStorage.multiRemove(keys);
}

/** Existing logout callers also clear every account-owned workflow recovery key. */
export const clearAllEditorRecovery = clearAllSchoolDataRecovery;
