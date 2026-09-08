import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  AssessmentEditorResult,
  SaveAssessmentEditorInput,
} from "../../types/assessment";

export function assignmentCreationRecoveryKey(
  actorId: string,
  classId: string,
) {
  if (!actorId.trim() || !classId.trim()) {
    throw new Error("Teacher and class identity are required for recovery");
  }
  return `assignment-creation:v1:${actorId}:${classId}`;
}

export async function getPendingAssignmentCreation(
  actorId: string,
  classId: string,
): Promise<SaveAssessmentEditorInput | null> {
  const raw = await AsyncStorage.getItem(
    assignmentCreationRecoveryKey(actorId, classId),
  );
  if (!raw) return null;
  const request = JSON.parse(raw) as SaveAssessmentEditorInput;
  if (
    request.classId !== classId ||
    request.action !== "save" ||
    !request.mutationId ||
    !request.settings
  ) {
    throw new Error(
      "Saved assignment setup could not be read. Contact support before creating another draft.",
    );
  }
  return request;
}

export async function createAssignmentWithRecovery(
  actorId: string,
  request: SaveAssessmentEditorInput,
  save: (request: SaveAssessmentEditorInput) => Promise<AssessmentEditorResult>,
): Promise<AssessmentEditorResult> {
  if (!request.classId) throw new Error("Class is required");
  const key = assignmentCreationRecoveryKey(actorId, request.classId);
  const pending = await getPendingAssignmentCreation(actorId, request.classId);
  if (pending && JSON.stringify(pending) !== JSON.stringify(request)) {
    throw new Error(
      "Resolve the previous creation request before starting another assignment.",
    );
  }
  await AsyncStorage.setItem(key, JSON.stringify(request));
  try {
    const result = await save(request);
    await AsyncStorage.removeItem(key);
    return result;
  } catch (error) {
    const status = (error as { response?: { status?: number } }).response
      ?.status;
    if (status && status >= 400 && status < 500) {
      await AsyncStorage.removeItem(key);
    }
    throw error;
  }
}
