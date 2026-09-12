const LOCAL_CONTENT_KEYS = [
  (key: string) => key.startsWith("assignment-creation:v1:"),
  (key: string) => key.startsWith("assessment-create-pending:"),
  (key: string) =>
    key.startsWith("class-template-editor:") && key.endsWith(":draft"),
  (key: string) => key.startsWith("teacher-ai-draft-jobs:"),
  (key: string) => key.startsWith("teacher-extraction-jobs:"),
  (key: string) => key.startsWith("nexora:notification-surface:v1:"),
];

const SESSION_CONTENT_KEYS = [
  (key: string) => key === "nexora.student.announcement-board.dismissed",
  (key: string) =>
    key.startsWith("nexora.teacherPendingInterventionCount:"),
];

function clearMatchingKeys(
  storage: Storage,
  matches: ReadonlyArray<(key: string) => boolean>,
) {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key && matches.some((match) => match(key))) keys.push(key);
  }

  let failed = false;
  for (const key of keys) {
    try {
      storage.removeItem(key);
      if (storage.getItem(key) !== null) failed = true;
    } catch {
      failed = true;
    }
  }
  if (failed) throw new Error("Reset client state could not be cleared");
}

export function clearSystemResetClientState() {
  if (typeof window === "undefined") return;
  let failed = false;
  try {
    clearMatchingKeys(window.localStorage, LOCAL_CONTENT_KEYS);
  } catch {
    failed = true;
  }
  try {
    clearMatchingKeys(window.sessionStorage, SESSION_CONTENT_KEYS);
  } catch {
    failed = true;
  }
  if (failed) throw new Error("Reset client state could not be cleared");
}
