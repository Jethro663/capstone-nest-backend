/**
 * Fired after a new user account is created in the database.
 * Listened by: UserEventsListener (sends OTP email + password email)
 */
export class UserCreatedEvent {
  static readonly eventName = 'user.created' as const;

  readonly userId: string;
  readonly email: string;
  readonly generatedPassword?: string;
  readonly requiresOTP: boolean;

  constructor(payload: {
    userId: string;
    email: string;
    generatedPassword?: string;
    requiresOTP?: boolean;
  }) {
    this.userId = payload.userId;
    this.email = payload.email;
    this.generatedPassword = payload.generatedPassword;
    this.requiresOTP = payload.requiresOTP ?? true;
  }
}
