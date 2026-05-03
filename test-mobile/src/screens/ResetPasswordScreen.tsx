import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { authApi } from "../api/services/auth";
import { toAppError } from "../api/http";
import {
  AuthFieldLabel,
  AuthFooterLink,
  AuthInputField,
  AuthPrimaryButton,
  AuthRulePills,
  AuthScreenShell,
  AuthStatusBanner,
  authTheme,
} from "../components/auth/MobileAuthPrimitives";
import type { AuthStackParamList } from "../navigation/types";
import {
  buildPasswordRuleStates,
  getConfirmPasswordMessage,
  getPasswordValidationMessage,
  isValidAuthEmail,
  isValidOtpCode,
  normalizeAuthEmail,
  normalizeOtpCode,
  pushAuthNotice,
} from "./screen-flow";

type Props = NativeStackScreenProps<AuthStackParamList, "ResetPassword">;

export function ResetPasswordScreen({ navigation, route }: Props) {
  const [email, setEmail] = useState(route.params?.email ?? "");
  const [code, setCode] = useState(route.params?.code ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordRules = useMemo(() => buildPasswordRuleStates(newPassword), [newPassword]);
  const normalizedEmail = normalizeAuthEmail(email);

  const handleSubmit = async () => {
    if (!isValidAuthEmail(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    const normalizedCode = normalizeOtpCode(code);
    if (!isValidOtpCode(normalizedCode)) {
      setError("Enter the 6-digit reset code.");
      return;
    }

    const passwordMessage = getPasswordValidationMessage(newPassword);
    if (passwordMessage) {
      setError(passwordMessage);
      return;
    }

    const confirmMessage = getConfirmPasswordMessage(newPassword, confirmPassword);
    if (confirmMessage) {
      setError(confirmMessage);
      return;
    }

    try {
      setLoading(true);
      setError("");
      await authApi.resetPassword({
        email: normalizedEmail,
        code: normalizedCode,
        newPassword,
        confirmPassword,
      });
      pushAuthNotice("Password reset complete. Sign in with your new password.");
      navigation.replace("Login");
    } catch (rawError) {
      setError(toAppError(rawError).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenShell
      title="Reset password"
      subtitle="Use the reset code from your email, then choose a new password."
      footer={<AuthFooterLink label="Back to sign in" onPress={() => navigation.replace("Login")} />}
    >
      <AuthFieldLabel>Email address</AuthFieldLabel>
      <AuthInputField
        autoCapitalize="none"
        autoCorrect={false}
        editable={!route.params?.email}
        icon="email-outline"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="you@example.com"
        textContentType="emailAddress"
        value={email}
      />

      <View style={{ marginBottom: 14 }} />

      <AuthFieldLabel>Reset code</AuthFieldLabel>
      <AuthInputField
        icon="shield-key-outline"
        keyboardType="number-pad"
        onChangeText={(value) => setCode(normalizeOtpCode(value))}
        placeholder="6-digit code"
        textContentType="oneTimeCode"
        value={code}
      />

      <View style={{ marginBottom: 14 }} />

      <AuthFieldLabel>New password</AuthFieldLabel>
      <AuthInputField
        autoCapitalize="none"
        autoCorrect={false}
        icon="lock-outline"
        inputStyle={{
          fontSize: showNewPassword ? 13 : 15,
          letterSpacing: showNewPassword ? 0 : 2,
        }}
        onChangeText={setNewPassword}
        placeholder="Create a strong password"
        secureTextEntry={!showNewPassword}
        textContentType="newPassword"
        value={newPassword}
        rightAccessory={
          <Pressable
            accessibilityLabel={showNewPassword ? "Hide password" : "Show password"}
            hitSlop={10}
            onPress={() => setShowNewPassword((current) => !current)}
            style={{ paddingHorizontal: 12, paddingVertical: 10 }}
          >
            <MaterialCommunityIcons color={authTheme.textLight} name={showNewPassword ? "eye-off-outline" : "eye-outline"} size={17} />
          </Pressable>
        }
      />
      <AuthRulePills rules={passwordRules} />

      <Text style={{ marginBottom: 14 }} />

      <AuthFieldLabel>Confirm password</AuthFieldLabel>
      <AuthInputField
        autoCapitalize="none"
        autoCorrect={false}
        icon="lock-check-outline"
        inputStyle={{
          fontSize: showConfirmPassword ? 13 : 15,
          letterSpacing: showConfirmPassword ? 0 : 2,
        }}
        onChangeText={setConfirmPassword}
        placeholder="Repeat new password"
        secureTextEntry={!showConfirmPassword}
        textContentType="newPassword"
        value={confirmPassword}
        rightAccessory={
          <Pressable
            accessibilityLabel={showConfirmPassword ? "Hide password" : "Show password"}
            hitSlop={10}
            onPress={() => setShowConfirmPassword((current) => !current)}
            style={{ paddingHorizontal: 12, paddingVertical: 10 }}
          >
            <MaterialCommunityIcons
              color={authTheme.textLight}
              name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
              size={17}
            />
          </Pressable>
        }
      />

      {error ? <AuthStatusBanner message={error} tone="error" /> : null}

      <AuthPrimaryButton
        disabled={!email.trim() || !code.trim() || !newPassword.trim() || !confirmPassword.trim()}
        label="Reset password"
        loading={loading}
        loadingLabel="Updating password..."
        onPress={() => void handleSubmit()}
      />
    </AuthScreenShell>
  );
}
