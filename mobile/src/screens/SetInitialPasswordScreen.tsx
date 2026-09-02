import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
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
  AuthSecondaryButton,
  AuthStatusBanner,
  authTheme,
} from "../components/auth/MobileAuthPrimitives";
import type { AuthStackParamList } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";
import {
  buildPasswordRuleStates,
  getConfirmPasswordMessage,
  getPasswordValidationMessage,
  normalizeAuthEmail,
  pushAuthNotice,
} from "./screen-flow";

type Props = NativeStackScreenProps<AuthStackParamList, "SetInitialPassword">;

export function SetInitialPasswordScreen({ navigation, route }: Props) {
  const { login } = useAuth();
  const email = normalizeAuthEmail(route.params.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const passwordRules = useMemo(
    () => buildPasswordRuleStates(newPassword),
    [newPassword],
  );

  const finishToLogin = (message: string) => {
    pushAuthNotice(message);
    navigation.replace("Login");
  };

  const handleSubmit = async () => {
    if (!currentPassword) {
      setError(
        "Enter your temporary password to confirm this is your account.",
      );
      return;
    }
    const passwordMessage = getPasswordValidationMessage(newPassword);
    if (passwordMessage) {
      setError(passwordMessage);
      return;
    }

    const confirmMessage = getConfirmPasswordMessage(
      newPassword,
      confirmPassword,
    );
    if (confirmMessage) {
      setError(confirmMessage);
      return;
    }

    try {
      setLoading(true);
      setError("");
      await authApi.setActivationPassword({
        email,
        currentPassword,
        newPassword,
      });
      await login(email, newPassword);
    } catch (rawError) {
      setError(toAppError(rawError).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenShell
      title="Set initial password"
      subtitle="Your email is verified. Choose a strong password before signing in."
      footer={
        <AuthFooterLink
          label="Back to sign in"
          onPress={() =>
            finishToLogin("Account activated. Sign in to continue.")
          }
        />
      }
    >
      <AuthFieldLabel>Email address</AuthFieldLabel>
      <AuthInputField
        autoCapitalize="none"
        autoCorrect={false}
        editable={false}
        icon="email-outline"
        keyboardType="email-address"
        placeholder="you@example.com"
        textContentType="emailAddress"
        value={email}
      />

      <View style={{ marginBottom: 14 }} />

      <AuthFieldLabel>Temporary password</AuthFieldLabel>
      <AuthInputField
        autoCapitalize="none"
        autoCorrect={false}
        icon="lock-outline"
        onChangeText={setCurrentPassword}
        placeholder="Enter your temporary password"
        secureTextEntry
        textContentType="password"
        value={currentPassword}
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
            accessibilityLabel={
              showNewPassword ? "Hide password" : "Show password"
            }
            hitSlop={10}
            onPress={() => setShowNewPassword((current) => !current)}
            style={{
              minHeight: 44,
              minWidth: 44,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          >
            <MaterialCommunityIcons
              color={authTheme.textLight}
              name={showNewPassword ? "eye-off-outline" : "eye-outline"}
              size={17}
            />
          </Pressable>
        }
      />
      <AuthRulePills rules={passwordRules} />

      <View style={{ marginBottom: 14 }} />

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
            accessibilityLabel={
              showConfirmPassword ? "Hide password" : "Show password"
            }
            hitSlop={10}
            onPress={() => setShowConfirmPassword((current) => !current)}
            style={{
              minHeight: 44,
              minWidth: 44,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
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
        disabled={
          !currentPassword || !newPassword.trim() || !confirmPassword.trim()
        }
        label="Set password"
        loading={loading}
        loadingLabel="Saving password..."
        onPress={() => void handleSubmit()}
      />

      <AuthSecondaryButton
        label="Skip for now"
        onPress={() => finishToLogin("Account activated. Sign in to continue.")}
      />
    </AuthScreenShell>
  );
}
