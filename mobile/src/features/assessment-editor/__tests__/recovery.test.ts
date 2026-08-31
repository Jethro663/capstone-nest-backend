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

it("scopes recovery to an account and clears only editor copies on logout", async () => {
  const teacher = recoveryKey("teacher", undefined, "class");
  const other = recoveryKey("other", undefined, "class");
  const draft = {
    ...newEditor("class"),
    settings: { title: "Unfinished work" },
  };
  await writeEditorRecovery(teacher, draft);
  expect(await readEditorRecovery(other)).toBeNull();
  expect(await readEditorRecovery(teacher)).toEqual(draft);
  await AsyncStorage.setItem("unrelated-preference", "preserved");
  await clearAllEditorRecovery();
  expect(await readEditorRecovery(teacher)).toBeNull();
  expect(await AsyncStorage.getItem("unrelated-preference")).toBe("preserved");
});
