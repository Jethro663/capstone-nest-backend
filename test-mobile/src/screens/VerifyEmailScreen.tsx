import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { authApi } from "../api/services/auth";
import { toAppError } from "../api/http";
import {
  AuthFooterLink,
  AuthPrimaryButton,
  AuthScreenShell,
  AuthSecondaryButton,
  AuthStatusBanner,
  authTheme,
} from "../components/auth/MobileAuthPrimitives";
import type { AuthStackParamList } from "../navigation/types";
import { normalizeAuthEmail, normalizeOtpCode, pushAuthNotice } from "./screen-flow";

type Props = NativeStackScreenProps<AuthStackParamList, "VerifyEmail">;

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export function VerifyEmailScreen({ navigation, route }: Props) {
  const email = normalizeAuthEmail(route.params.email);
  const flow = route.params.flow ?? "verification";
  const [digits, setDigits] = useState<string[]>(Array.from({ length: OTP_LENGTH }, () => ""));
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(RESEND_SECONDS);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  const code = useMemo(() => digits.join(""), [digits]);

  useEffect(() => {
    if (secondsRemaining <= 0) return undefined;

    const timer = setInterval(() => {
      setSecondsRemaining((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsRemaining]);

  const handleDigitChange = (index: number, value: string) => {
    const sanitized = normalizeOtpCode(value);
    setError("");

    if (!sanitized) {
      setDigits((current) => {
        const next = [...current];
        next[index] = "";
        return next;
      });
      return;
    }

    setDigits((current) => {
      const next = [...current];
      sanitized.split("").forEach((digit, offset) => {
        const nextIndex = index + offset;
        if (nextIndex < OTP_LENGTH) {
          next[nextIndex] = digit;
        }
      });
      return next;
    });

    const focusIndex = Math.min(index + sanitized.length, OTP_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus?.();
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key !== "Backspace") return;

    setDigits((current) => {
      const next = [...current];
      if (next[index]) {
        next[index] = "";
      } else if (index > 0) {
        next[index - 1] = "";
        inputRefs.current[index - 1]?.focus?.();
      }
      return next;
    });
  };

  const handleVerify = async () => {
    if (code.length !== OTP_LENGTH) {
      setError("Enter the 6-digit verification code.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");
      await authApi.verifyEmail({ email, code });
      setSuccess("Verification code accepted.");

      if (flow === "activation") {
        navigation.replace("SetInitialPassword", { email });
        return;
      }

      pushAuthNotice("Email verified. Sign in to continue.");
      navigation.replace("Login");
    } catch (rawError) {
      setError(toAppError(rawError).message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setResending(true);
      setError("");
      await authApi.resendOtp({ email });
      setSuccess("A new verification code was sent to your email.");
      setSecondsRemaining(RESEND_SECONDS);
    } catch (rawError) {
      setError(toAppError(rawError).message);
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthScreenShell
      title="Verify email"
      subtitle={`Enter the 6-digit code sent to ${email}`}
      footer={<AuthFooterLink label="Back to sign in" onPress={() => navigation.replace("Login")} />}
    >
      <View style={{ flexDirection: "row", gap: 8, justifyContent: "space-between" }}>
        {digits.map((digit, index) => (
          <TextInput
            key={`otp-${index}`}
            ref={(node) => {
              inputRefs.current[index] = node;
            }}
            keyboardAppearance="dark"
            keyboardType="number-pad"
            maxLength={index === 0 ? OTP_LENGTH : 1}
            onChangeText={(value) => handleDigitChange(index, value)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
            placeholder="0"
            placeholderTextColor={authTheme.textLight}
            style={{
              backgroundColor: authTheme.cardInner,
              borderColor: authTheme.border,
              borderRadius: 11,
              borderWidth: 1.5,
              color: authTheme.textDark,
              flex: 1,
              fontSize: 18,
              fontWeight: "700",
              paddingVertical: 14,
              textAlign: "center",
            }}
            textContentType="oneTimeCode"
            value={digit}
          />
        ))}
      </View>

      {success ? <AuthStatusBanner message={success} tone="success" /> : null}
      {error ? <AuthStatusBanner message={error} tone="error" /> : null}

      <AuthPrimaryButton
        disabled={code.length !== OTP_LENGTH}
        label="Verify email"
        loading={loading}
        loadingLabel="Verifying..."
        onPress={() => void handleVerify()}
      />

      <AuthSecondaryButton
        disabled={secondsRemaining > 0 || resending}
        label={
          resending
            ? "Sending new code..."
            : secondsRemaining > 0
              ? `Resend code in ${secondsRemaining}s`
              : "Resend code"
        }
        onPress={() => void handleResend()}
      />

      <Text style={{ color: authTheme.textMid, fontSize: 11, lineHeight: 17, marginTop: 12, textAlign: "center" }}>
        Use the code from your inbox. If you enter a new code, only the latest one will work.
      </Text>
    </AuthScreenShell>
  );
}
