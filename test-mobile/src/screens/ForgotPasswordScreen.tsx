import { useEffect, useRef, useState } from "react";
import { Text } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { authApi } from "../api/services/auth";
import { toAppError } from "../api/http";
import {
  AuthFieldLabel,
  AuthFooterLink,
  AuthInputField,
  AuthPrimaryButton,
  AuthScreenShell,
  AuthStatusBanner,
  authTheme,
} from "../components/auth/MobileAuthPrimitives";
import type { AuthStackParamList } from "../navigation/types";
import { isValidAuthEmail, normalizeAuthEmail } from "./screen-flow";

type Props = NativeStackScreenProps<AuthStackParamList, "ForgotPassword">;

export function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const handleSubmit = async () => {
    const normalizedEmail = normalizeAuthEmail(email);
    if (!isValidAuthEmail(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await authApi.forgotPassword({ email: normalizedEmail });
      setSuccess("Recovery code sent. Continue to reset your password.");
      redirectTimerRef.current = setTimeout(() => {
        navigation.replace("ResetPassword", { email: normalizedEmail });
      }, 450);
    } catch (rawError) {
      setError(toAppError(rawError).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenShell
      title="Recover account"
      subtitle="Enter your school email and we will send a reset code."
      footer={<AuthFooterLink label="Back to sign in" onPress={() => navigation.replace("Login")} />}
    >
      <AuthFieldLabel>Email address</AuthFieldLabel>
      <AuthInputField
        autoCapitalize="none"
        autoCorrect={false}
        icon="email-outline"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="you@example.com"
        textContentType="emailAddress"
        value={email}
      />

      {success ? <AuthStatusBanner message={success} tone="success" /> : null}
      {error ? <AuthStatusBanner message={error} tone="error" /> : null}

      <AuthPrimaryButton
        disabled={!email.trim()}
        label="Send reset code"
        loading={loading}
        loadingLabel="Sending reset code..."
        onPress={() => void handleSubmit()}
      />

      <Text style={{ color: authTheme.textMid, fontSize: 11, lineHeight: 17, marginTop: 12, textAlign: "center" }}>
        Use the same email linked to your Nexora account so the reset code reaches the right inbox.
      </Text>
    </AuthScreenShell>
  );
}
