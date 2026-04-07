export type JaMode = "practice" | "ask" | "review";

export interface JaClassSummary {
  id: string;
  subjectName: string;
  subjectCode: string;
}

export interface JaRecommendation {
  id: string;
  title: string;
  reason: string;
  focusText: string;
}

export interface JaHubThread {
  id: string;
  title?: string;
  status: string;
  updatedAt: string;
}

export interface JaHubResponse {
  classes: JaClassSummary[];
  selectedClassId?: string | null;
  practice: {
    recommendations: JaRecommendation[];
    sessions: Array<{ id: string }>;
  };
  ask: {
    threads: JaHubThread[];
  };
  review: {
    sessions?: Array<{ id: string }>;
  };
}

export interface JaAskMessage {
  id: string;
  role: "student" | "assistant";
  content: string;
  blocked?: boolean;
}

export interface JaAskThreadResponse {
  thread: {
    id: string;
    classId: string;
    title?: string;
    status: string;
    updatedAt: string;
  };
  messages: JaAskMessage[];
}

export interface JaAskSendResponse {
  message: JaAskMessage;
  blocked?: boolean;
}
