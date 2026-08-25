export type PhPhoneValidationStatus =
  | "EMPTY"
  | "INVALID_PREFIX"
  | "INCOMPLETE"
  | "EXCEEDS_LENGTH"
  | "VALID";

export type PhPhoneValidationResult = {
  raw: string;
  clean: string;
  isValid: boolean;
  status: PhPhoneValidationStatus;
  message: string;
  formattedDisplay: string;
  normalizedE164: string | null;
  normalizedLocal: string | null;
  telecomCarrier?: string;
  digitCount: number;
};

const GLOBE_TM_PREFIXES = new Set([
  "0905", "0906", "0915", "0916", "0917", "0925", "0926", "0927", "0935",
  "0936", "0937", "0945", "0953", "0954", "0955", "0956", "0965", "0966",
  "0967", "0975", "0976", "0977", "0978", "0979", "0995", "0997"
]);

const SMART_TNT_SUN_PREFIXES = new Set([
  "0907", "0908", "0909", "0910", "0911", "0912", "0918", "0919", "0920",
  "0921", "0928", "0929", "0930", "0938", "0939", "0946", "0947", "0948",
  "0949", "0950", "0951", "0961", "0963", "0968", "0969", "0970", "0981",
  "0989", "0998", "0999", "0813"
]);

const DITO_PREFIXES = new Set([
  "0991", "0992", "0993", "0994", "0895", "0896", "0897", "0898"
]);

export function detectPhTelecomCarrier(phoneLocal: string): string | undefined {
  if (phoneLocal.length < 4) return undefined;
  const prefix = phoneLocal.slice(0, 4);

  if (GLOBE_TM_PREFIXES.has(prefix)) return "Globe / TM";
  if (SMART_TNT_SUN_PREFIXES.has(prefix)) return "Smart / TNT / Sun";
  if (DITO_PREFIXES.has(prefix)) return "DITO";

  // General 09 prefix fallback if operator prefix is new/unregistered
  if (prefix.startsWith("09") || prefix.startsWith("08")) return "PH Mobile";
  return undefined;
}

/**
 * Format raw text into spaced groups:
 * - 0917 123 4567 (local mode)
 * - +63 917 123 4567 (international mode)
 */
export function formatPhPhoneInput(
  rawInput: string,
  mode: "local" | "international" = "local"
): string {
  const trimmed = rawInput.trim();
  if (!trimmed) return "";

  const isIntl = trimmed.startsWith("+") || mode === "international";
  const digitsOnly = trimmed.replace(/\D/g, "");

  if (!digitsOnly) return isIntl ? "+" : "";

  // Convert starting 639 to 09 or extract mobile 10-digit payload
  let mobileDigits = digitsOnly;

  if (digitsOnly.startsWith("63")) {
    mobileDigits = digitsOnly.slice(2);
  } else if (digitsOnly.startsWith("0")) {
    mobileDigits = digitsOnly.slice(1);
  }

  // Cap mobile payload at 10 digits (9XXXXXXXXX)
  const truncatedMobile = mobileDigits.slice(0, 10);

  if (isIntl) {
    if (truncatedMobile.length === 0) return "+63 ";
    const p1 = truncatedMobile.slice(0, 3);
    const p2 = truncatedMobile.slice(3, 6);
    const p3 = truncatedMobile.slice(6, 10);

    const parts = [p1, p2, p3].filter(Boolean);
    return `+63 ${parts.join(" ")}`;
  } else {
    const localDigits = `0${truncatedMobile}`;
    const p1 = localDigits.slice(0, 4);
    const p2 = localDigits.slice(4, 7);
    const p3 = localDigits.slice(7, 11);

    const parts = [p1, p2, p3].filter(Boolean);
    return parts.join(" ");
  }
}

/**
 * Real-time hyper-validation of Philippine mobile phone numbers.
 */
export function analyzePhPhone(input: string): PhPhoneValidationResult {
  const raw = input;
  const trimmed = input.trim();

  if (!trimmed) {
    return {
      raw,
      clean: "",
      isValid: false,
      status: "EMPTY",
      message: "Phone number is required",
      formattedDisplay: "",
      normalizedE164: null,
      normalizedLocal: null,
      digitCount: 0,
    };
  }

  // Extract clean digits and check for leading +
  const hasPlus = trimmed.startsWith("+");
  const cleanDigits = trimmed.replace(/\D/g, "");

  // Determine standard 10-digit mobile body (starts with 9)
  let mobilePayload = "";
  let isIntlPrefix = false;
  let isLocalPrefix = false;

  if (hasPlus) {
    if (!trimmed.startsWith("+63")) {
      return {
        raw,
        clean: trimmed,
        isValid: false,
        status: "INVALID_PREFIX",
        message: "❌ Invalid country code. PH numbers must use +63 or start with 09.",
        formattedDisplay: trimmed,
        normalizedE164: null,
        normalizedLocal: null,
        digitCount: cleanDigits.length,
      };
    }
    isIntlPrefix = true;
    mobilePayload = cleanDigits.slice(2); // Remove '63'
  } else if (cleanDigits.startsWith("63")) {
    isIntlPrefix = true;
    mobilePayload = cleanDigits.slice(2);
  } else if (cleanDigits.startsWith("0")) {
    isLocalPrefix = true;
    mobilePayload = cleanDigits.slice(1);
  } else if (cleanDigits.startsWith("9")) {
    // User directly typed starting with 9 (e.g. 9171234567)
    isLocalPrefix = true;
    mobilePayload = cleanDigits;
  } else {
    // User typed invalid starting digit (e.g. 4, 1, 2, 5, 7, 8...)
    return {
      raw,
      clean: cleanDigits,
      isValid: false,
      status: "INVALID_PREFIX",
      message: "❌ Invalid PH number. PH mobile numbers must start with 09 or +639.",
      formattedDisplay: trimmed,
      normalizedE164: null,
      normalizedLocal: null,
      digitCount: cleanDigits.length,
    };
  }

  // Check if first digit of mobile payload is 9
  if (mobilePayload.length > 0 && !mobilePayload.startsWith("9")) {
    return {
      raw,
      clean: cleanDigits,
      isValid: false,
      status: "INVALID_PREFIX",
      message: "❌ Invalid PH mobile prefix. PH numbers must start with 09 or +639.",
      formattedDisplay: trimmed,
      normalizedE164: null,
      normalizedLocal: null,
      digitCount: cleanDigits.length,
    };
  }

  const fullLocalNumber = `0${mobilePayload}`;
  const carrier = detectPhTelecomCarrier(fullLocalNumber);
  const totalMobileDigits = mobilePayload.length;
  const isComplete = totalMobileDigits === 10;
  const isOverLength = totalMobileDigits > 10;

  const normalizedE164 = isComplete ? `+63${mobilePayload}` : null;
  const normalizedLocal = isComplete ? `0${mobilePayload}` : null;

  if (isOverLength) {
    return {
      raw,
      clean: cleanDigits,
      isValid: false,
      status: "EXCEEDS_LENGTH",
      message: `❌ Too long (${totalMobileDigits}/10 digits after 0). PH mobile numbers have 11 digits total.`,
      formattedDisplay: formatPhPhoneInput(trimmed, isIntlPrefix ? "international" : "local"),
      normalizedE164: null,
      normalizedLocal: null,
      telecomCarrier: carrier,
      digitCount: totalMobileDigits + 1,
    };
  }

  if (!isComplete) {
    const digitsNeeded = 10 - totalMobileDigits;
    const carrierText = carrier ? ` • ${carrier}` : "";
    return {
      raw,
      clean: cleanDigits,
      isValid: false,
      status: "INCOMPLETE",
      message: `Enter complete 11-digit PH number (${totalMobileDigits + 1}/11 digits${carrierText})`,
      formattedDisplay: formatPhPhoneInput(trimmed, isIntlPrefix ? "international" : "local"),
      normalizedE164: null,
      normalizedLocal: null,
      telecomCarrier: carrier,
      digitCount: totalMobileDigits + 1,
    };
  }

  // Exactly 10 mobile digits starting with 9!
  return {
    raw,
    clean: cleanDigits,
    isValid: true,
    status: "VALID",
    message: `✓ Valid PH Mobile ${carrier ? `(${carrier})` : ""}`,
    formattedDisplay: formatPhPhoneInput(trimmed, isIntlPrefix ? "international" : "local"),
    normalizedE164,
    normalizedLocal,
    telecomCarrier: carrier,
    digitCount: 11,
  };
}
