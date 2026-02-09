/**
 * Password Generator Utility
 * Generates random passwords that meet the validation requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character (@$!%*?&#)
 */

export class PasswordGenerator {
  private static readonly UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  private static readonly LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
  private static readonly NUMBERS = '0123456789';
  private static readonly SPECIAL = '@$!%*?&#';

  /**
   * Generate a random password that meets all validation requirements
   * @param length - Password length (default: 14, minimum: 8)
   * @returns Random password string
   */
  static generate(length: number = 14): string {
    if (length < 8) {
      throw new Error('Password length must be at least 8 characters');
    }

    // Ensure we have all required character types
    const requiredChars = [
      this.getRandomChar(this.UPPERCASE),
      this.getRandomChar(this.LOWERCASE),
      this.getRandomChar(this.NUMBERS),
      this.getRandomChar(this.SPECIAL),
    ];

    // Fill remaining characters with random characters from all sets
    const allChars = this.UPPERCASE + this.LOWERCASE + this.NUMBERS + this.SPECIAL;
    for (let i = requiredChars.length; i < length; i++) {
      requiredChars.push(this.getRandomChar(allChars));
    }

    // Shuffle the array to randomize position of required characters
    return this.shuffle(requiredChars).join('');
  }

  /**
   * Validate if a password meets all requirements
   * @param password - Password to validate
   * @returns true if valid, false otherwise
   */
  static validate(password: string): boolean {
    if (!password || password.length < 8) return false;
    if (!/[A-Z]/.test(password)) return false;
    if (!/[a-z]/.test(password)) return false;
    if (!/\d/.test(password)) return false;
    if (!/[@$!%*?&#]/.test(password)) return false;
    return true;
  }

  /**
   * Get a random character from a string
   */
  private static getRandomChar(chars: string): string {
    return chars.charAt(Math.floor(Math.random() * chars.length));
  }

  /**
   * Fisher-Yates shuffle algorithm for array randomization
   */
  private static shuffle(array: string[]): string[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
