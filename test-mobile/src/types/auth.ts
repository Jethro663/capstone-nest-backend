import type { User } from "./user";

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: User;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type AuthVerificationFlow = "activation" | "verification";

export type ValidateCredentialsPayload = {
  email: string;
  password: string;
};

export type VerifyOtpPayload = {
  email: string;
  code: string;
};

export type ResendOtpPayload = {
  email: string;
};

export type ForgotPasswordPayload = {
  email: string;
};

export type ResetPasswordPayload = {
  email: string;
  code: string;
  newPassword: string;
  confirmPassword: string;
};

export type SetActivationPasswordPayload = {
  email: string;
  newPassword: string;
};
