export type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data: T;
  count?: number;
};

export type FieldErrorMap = Record<string, string[]>;

export type AppError = {
  status?: number;
  code?: string;
  title: string;
  message: string;
  details?: string[];
  fieldErrors?: FieldErrorMap;
  isNetworkError?: boolean;
  shouldShowModal?: boolean;
};

export type ErrorPresentationPayload = {
  title: string;
  message: string;
  details?: string[];
};
