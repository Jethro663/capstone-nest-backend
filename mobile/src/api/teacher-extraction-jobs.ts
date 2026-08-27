import AsyncStorage from "@react-native-async-storage/async-storage";

function activeExtractionKey(classId: string) {
  return `teacher-extractions:${classId}:active`;
}

export async function loadActiveExtractions(classId: string): Promise<string[]> {
  const raw = await AsyncStorage.getItem(activeExtractionKey(classId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return Array.from(
      new Set(parsed.filter((value): value is string => typeof value === "string" && value.trim().length > 0)),
    );
  } catch {
    return [];
  }
}

export async function addActiveExtraction(classId: string, extractionId: string): Promise<void> {
  const current = await loadActiveExtractions(classId);
  const next = Array.from(new Set([...current, extractionId]));
  await AsyncStorage.setItem(activeExtractionKey(classId), JSON.stringify(next));
}

export async function setActiveExtractions(classId: string, extractionIds: string[]): Promise<void> {
  const next = Array.from(new Set(extractionIds.filter((id) => id.trim().length > 0)));
  if (next.length === 0) {
    await AsyncStorage.removeItem(activeExtractionKey(classId));
    return;
  }
  await AsyncStorage.setItem(activeExtractionKey(classId), JSON.stringify(next));
}

export async function removeActiveExtraction(classId: string, extractionId: string): Promise<void> {
  const current = await loadActiveExtractions(classId);
  const next = current.filter((id) => id !== extractionId);
  if (next.length === 0) {
    await AsyncStorage.removeItem(activeExtractionKey(classId));
    return;
  }
  await AsyncStorage.setItem(activeExtractionKey(classId), JSON.stringify(next));
}
