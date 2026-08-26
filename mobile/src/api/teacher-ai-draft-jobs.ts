import AsyncStorage from "@react-native-async-storage/async-storage";

function activeJobKey(classId: string) {
  return `teacher-ai-draft:${classId}:active-job`;
}

export function readTeacherAiDraftJobId(classId: string) {
  return AsyncStorage.getItem(activeJobKey(classId));
}

export function writeTeacherAiDraftJobId(classId: string, jobId: string) {
  return AsyncStorage.setItem(activeJobKey(classId), jobId);
}

export function clearTeacherAiDraftJobId(classId: string) {
  return AsyncStorage.removeItem(activeJobKey(classId));
}
