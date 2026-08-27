import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  addActiveExtraction,
  loadActiveExtractions,
  removeActiveExtraction,
  setActiveExtractions,
} from "../teacher-extraction-jobs";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

beforeEach(() => jest.clearAllMocks());

it("stores unique active extraction ids per class", async () => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(["extract-1"]));

  await addActiveExtraction("class-1", "extract-2");

  expect(AsyncStorage.setItem).toHaveBeenCalledWith(
    "teacher-extractions:class-1:active",
    JSON.stringify(["extract-1", "extract-2"]),
  );
});

it("atomically replaces the active extraction set for a class", async () => {
  await setActiveExtractions("class-1", ["extract-1", "extract-2", "extract-1"]);

  expect(AsyncStorage.setItem).toHaveBeenCalledWith(
    "teacher-extractions:class-1:active",
    JSON.stringify(["extract-1", "extract-2"]),
  );
});

it("loads only valid ids and removes terminal ids", async () => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
    JSON.stringify(["extract-1", 2, "", "extract-1"]),
  );
  await expect(loadActiveExtractions("class-1")).resolves.toEqual(["extract-1"]);

  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
    JSON.stringify(["extract-1", "extract-2"]),
  );
  await removeActiveExtraction("class-1", "extract-1");
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(
    "teacher-extractions:class-1:active",
    JSON.stringify(["extract-2"]),
  );
});
