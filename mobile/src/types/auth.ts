import type { User } from '@/types/user';

export type AuthSession = {
  accessToken: string;
  user: User;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type VerifyEmailPayload = {
  email: string;
  code: string;
};

export type ResetPasswordPayload = {
  email: string;
  code: string;
  password: string;
  confirmPassword: string;
};

export type SetActivationPasswordPayload = {
  email: string;
  newPassword: string;
};
