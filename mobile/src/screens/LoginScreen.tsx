import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { API_BASE_URL } from "../api/config";
import { authApi } from "../api/services/auth";
import { peekAppError, toAppError } from "../api/http";
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
import { useAuth } from "../providers/AuthProvider";
import { consumeAuthNotice, normalizeAuthEmail, resolveDevLoginSeed } from "./screen-flow";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const seededCredentialsAppliedRef = useRef(false);
  const autoLoginAttemptedRef = useRef(false);
  const loginSeedEmail = process.env.EXPO_PUBLIC_LOGIN_SEED_EMAIL ?? process.env.EXPO_PUBLIC_DEV_LOGIN_EMAIL;
  const loginSeedPassword = process.env.EXPO_PUBLIC_LOGIN_SEED_PASSWORD ?? process.env.EXPO_PUBLIC_DEV_LOGIN_PASSWORD;
  const loginSeedAutoLogin = process.env.EXPO_PUBLIC_LOGIN_SEED_AUTO_LOGIN ?? process.env.EXPO_PUBLIC_DEV_AUTO_LOGIN;
  const allowNonDevSeed = Boolean(loginSeedEmail?.trim() && loginSeedPassword?.trim());

  const devLoginSeed = resolveDevLoginSeed({
    isDev: __DEV__,
    allowNonDevSeed,
    email: loginSeedEmail,
    password: loginSeedPassword,
    autoLogin: loginSeedAutoLogin,
  });

  const handleLogin = async (credentials?: { email?: string; password?: string }) => {
    const nextEmail = normalizeAuthEmail(credentials?.email ?? email);
    const nextPassword = credentials?.password ?? password;

    if (!nextEmail || !nextPassword.trim()) {
      setError("Email and password are required.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setNotice("");
      await login(nextEmail, nextPassword);
    } catch (rawError) {
      const appError = peekAppError(rawError);
      if (appError.message.toLowerCase().includes("not verified")) {
        try {
          const valid = await authApi.validateCredentials({
            email: nextEmail,
            password: nextPassword,
          });

          if (valid) {
            navigation.navigate("VerifyEmail", {
              email: nextEmail,
              flow: "activation",
            });
            return;
          }
        } catch (validationError) {
          setError(toAppError(validationError).message);
          return;
        }
      }

      setError(appError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const nextNotice = consumeAuthNotice();
    if (nextNotice) {
      setNotice(nextNotice);
    }
  }, []);

  useEffect(() => {
    if (!devLoginSeed || seededCredentialsAppliedRef.current) return;

    setEmail((current) => current || devLoginSeed.email);
    setPassword((current) => current || devLoginSeed.password);
    seededCredentialsAppliedRef.current = true;
  }, [devLoginSeed]);

  useEffect(() => {
    if (!devLoginSeed?.autoLogin || autoLoginAttemptedRef.current || loading) return;

    autoLoginAttemptedRef.current = true;
    void handleLogin(devLoginSeed);
  }, [devLoginSeed, loading]);

  return (
    <AuthScreenShell
      title="Welcome back"
      subtitle="Sign in to your Nexora account"
      footer={<AuthFooterLink label="Forgot password? Recover your account" onPress={() => navigation.navigate("ForgotPassword")} />}
    >
      <AuthFieldLabel>Email address</AuthFieldLabel>
      <AuthInputField
        autoCapitalize="none"
        autoCorrect={false}
        icon="email-outline"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="you@example.com"
        textContentType="username"
        value={email}
      />

      <View style={{ marginBottom: 14 }} />

      <AuthFieldLabel>Password</AuthFieldLabel>
      <AuthInputField
        autoCapitalize="none"
        autoCorrect={false}
        icon="lock-outline"
        inputStyle={{
          fontSize: showPassword ? 13 : 15,
          letterSpacing: showPassword ? 0 : 2,
        }}
        onChangeText={setPassword}
        placeholder="Enter your password"
        secureTextEntry={!showPassword}
        textContentType="password"
        value={password}
        rightAccessory={
          <Pressable
            accessibilityLabel={showPassword ? "Hide password" : "Show password"}
            hitSlop={10}
            onPress={() => setShowPassword((current) => !current)}
            style={{ minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 12, paddingVertical: 10 }}
          >
            <MaterialCommunityIcons
              color={authTheme.textLight}
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={17}
            />
          </Pressable>
        }
      />

      {notice ? <AuthStatusBanner message={notice} tone="success" /> : null}
      {error ? <AuthStatusBanner message={error} tone="error" /> : null}

      <AuthPrimaryButton
        disabled={!email.trim() || !password.trim()}
        label="Sign in"
        loading={loading}
        loadingLabel="Signing in..."
        onPress={() => void handleLogin()}
      />

      <Text style={{ color: authTheme.textLight, fontSize: 10, marginTop: 10, textAlign: "center" }}>
        Connected to {API_BASE_URL}
      </Text>
    </AuthScreenShell>
  );
}
