import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  clearAllEditorRecovery,
  readEditorRecovery,
  recoveryKey,
  writeEditorRecovery,
} from "../recovery";
import { newEditor } from "../model";

jest.mock("@react-native-async-storage/async-storage", () => {
  const values = new Map<string, string>();
  return {
    setItem: jest.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
    getItem: jest.fn(async (key: string) => values.get(key) ?? null),
    getAllKeys: jest.fn(async () => [...values.keys()]),
    removeItem: jest.fn(async (key: string) => {
      values.delete(key);
    }),
    multiRemove: jest.fn(async (keys: string[]) => {
      keys.forEach((key) => values.delete(key));
    }),
  };
});

it("clears every known school-content cache without clearing reset recovery", async () => {
  const teacher = recoveryKey("teacher", undefined, "class");
  const other = recoveryKey("other", undefined, "class");
  const draft = {
    ...newEditor("class"),
    settings: { title: "Unfinished work" },
  };
  await writeEditorRecovery(teacher, draft);
  expect(await readEditorRecovery(other)).toBeNull();
  expect(await readEditorRecovery(teacher)).toEqual(draft);
  await AsyncStorage.setItem(
    "assignment-creation:v1:teacher:class",
    JSON.stringify({ questions: [{ prompt: "Old school content" }] }),
  );
  await AsyncStorage.setItem("teacher-ai-draft:class:active-job", "old-job");
  await AsyncStorage.setItem(
    "teacher-extractions:class:active",
    JSON.stringify(["old-extraction"]),
  );
  await AsyncStorage.setItem(
    "nexora.system-reset.operation",
    "709de236-c128-4f6a-a4e3-e193ce605f3c",
  );
  await AsyncStorage.setItem("unrelated-preference", "preserved");
  await clearAllEditorRecovery();
  expect(await readEditorRecovery(teacher)).toBeNull();
  expect(
    await AsyncStorage.getItem("assignment-creation:v1:teacher:class"),
  ).toBeNull();
  expect(
    await AsyncStorage.getItem("teacher-ai-draft:class:active-job"),
  ).toBeNull();
  expect(
    await AsyncStorage.getItem("teacher-extractions:class:active"),
  ).toBeNull();
  expect(await AsyncStorage.getItem("nexora.system-reset.operation")).toBe(
    "709de236-c128-4f6a-a4e3-e193ce605f3c",
  );
  expect(await AsyncStorage.getItem("unrelated-preference")).toBe("preserved");
});
