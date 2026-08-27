import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  clearTeacherAiDraftJobId,
  clearTeacherAiDraftJobIdIfMatches,
  readTeacherAiDraftJobId,
  writeTeacherAiDraftJobId,
} from "../teacher-ai-draft-jobs";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

it("clears the stored job only when it matches the deleted job", async () => {
  (AsyncStorage.getItem as jest.Mock)
    .mockResolvedValueOnce("job-1")
    .mockResolvedValueOnce("job-2");

  await clearTeacherAiDraftJobIdIfMatches("class-1", "job-1");
  await clearTeacherAiDraftJobIdIfMatches("class-1", "job-1");

  expect(AsyncStorage.removeItem).toHaveBeenCalledTimes(1);
  expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
    "teacher-ai-draft:class-1:active-job",
  );
});

it("persists, reads, and clears a job by class", async () => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue("job-1");

  await writeTeacherAiDraftJobId("class-1", "job-1");
  await expect(readTeacherAiDraftJobId("class-1")).resolves.toBe("job-1");
  await clearTeacherAiDraftJobId("class-1");

  expect(AsyncStorage.setItem).toHaveBeenCalledWith(
    "teacher-ai-draft:class-1:active-job",
    "job-1",
  );
  expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
    "teacher-ai-draft:class-1:active-job",
  );
});
