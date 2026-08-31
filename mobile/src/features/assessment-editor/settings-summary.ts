import type { AiAssessmentSettings } from "../../types/assessment";
export function assessmentSettingsSummary(
  settings: AiAssessmentSettings,
): string {
  const yesNo = (value: boolean | undefined) => (value ? "On" : "Off");
  const description = (settings.description ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return [
    `Type: ${settings.type ?? "quiz"}; period: ${settings.quarter ?? "unassigned"}; category: ${settings.classRecordCategory ?? "automatic"}; placement: ${settings.classRecordItemId ? "selected class record item" : "automatic"}.`,
    `Description: ${description || "none"}.`,
    `Due: ${settings.dueDate ? new Date(settings.dueDate).toLocaleString() : "none"}; close when due: ${yesNo(settings.closeWhenDue)}; attempts: ${settings.maxAttempts ?? 1}.`,
    `Assessment timer: ${settings.timeLimitMinutes ? settings.timeLimitMinutes + " min" : "off"}; question timer: ${settings.timedQuestionsEnabled ? (settings.questionTimeLimitSeconds ?? "unset") + " sec" : "off"}.`,
    `Randomize: ${yesNo(settings.randomizeQuestions)}; strict mode: ${yesNo(settings.strictMode)}.`,
    `Passing score: ${settings.passingScore ?? 60}%; feedback: ${settings.feedbackLevel ?? "standard"}; feedback delay: ${settings.feedbackDelayHours ?? 24} hours.`,
  ].join("\n");
}
