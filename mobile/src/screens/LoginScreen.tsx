import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { authApi } from "../api/services/auth";
import { peekAppError, toAppError } from "../api/http";
import { MobileCampusLogin } from "../components/auth/MobileCampusLogin";
import { MobileLoginStatusModal } from "../components/auth/MobileLoginStatusModal";
import {
  AuthFieldLabel,
  AuthFooterLink,
  AuthInputField,
  AuthPrimaryButton,
  AuthStatusBanner,
} from "../components/auth/MobileAuthPrimitives";
import { campusColors } from "../components/auth/campus-login-theme";
import {
  resolveLoginStatusTone,
  resolveLoginVersionStatus,
} from "../components/auth/login-status-model";
import type { AuthStackParamList } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";
import { useUpdate } from "../providers/UpdateProvider";
import {
  checkLoginServerStatus,
  describeApiTarget,
} from "../services/system-status/login-server-status";
import type { LoginServerStatus } from "../services/system-status/login-server-status";
import { getClientVersionInfo } from "../services/update/update.service";
import { consumeAuthNotice, normalizeAuthEmail, resolveDevLoginSeed } from "./screen-flow";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const { checkForUpdates, state: updateState } = useUpdate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [statusVisible, setStatusVisible] = useState(false);
  const [checkingServer, setCheckingServer] = useState(true);
  const initialTarget = useMemo(() => describeApiTarget(), []);
  const [serverStatus, setServerStatus] = useState<LoginServerStatus>({
    ...initialTarget,
    kind: "checking",
    headline: "Checking connection",
    detail: "Confirming that the Nexora campus is reachable.",
    checkedAt: null,
  });
  const installedVersion = useMemo(() => getClientVersionInfo(), []);
  const versionStatus = useMemo(
    () => resolveLoginVersionStatus(updateState, installedVersion),
    [installedVersion, updateState],
  );
  const statusTone = resolveLoginStatusTone(
    serverStatus.kind,
    versionStatus.kind,
  );
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

  const checkServer = useCallback(async () => {
    setCheckingServer(true);
    setServerStatus((current) => ({
      ...current,
      kind: "checking",
      headline: "Checking connection",
      detail: "Confirming that the Nexora campus is reachable.",
    }));
    const nextStatus = await checkLoginServerStatus();
    setServerStatus(nextStatus);
    setCheckingServer(false);
  }, []);

  const refreshStatus = useCallback(async () => {
    await Promise.all([checkServer(), checkForUpdates()]);
  }, [checkForUpdates, checkServer]);

  const reviewUpdate = useCallback(async () => {
    setStatusVisible(false);
    await checkForUpdates();
  }, [checkForUpdates]);

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
    let active = true;
    const loadServerStatus = async () => {
      const nextStatus = await checkLoginServerStatus();
      if (!active) return;
      setServerStatus(nextStatus);
      setCheckingServer(false);
    };
    void loadServerStatus();
    return () => {
      active = false;
    };
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
    <>
      <MobileCampusLogin
        footer={
          <AuthFooterLink
            color={campusColors.red}
            label="Forgot password? Recover your account"
            onPress={() => navigation.navigate("ForgotPassword")}
          />
        }
        onOpenStatus={() => setStatusVisible(true)}
        statusTone={statusTone}
      >
        <Text
          style={{
            color: campusColors.ink,
            fontSize: 29,
            fontWeight: "900",
            letterSpacing: -0.5,
            lineHeight: 35,
          }}
        >
          Welcome to Nexora
        </Text>
        <Text
          style={{
            color: campusColors.muted,
            fontSize: 13,
            lineHeight: 19,
            marginBottom: 25,
            marginTop: 6,
          }}
        >
          Use your school account to continue
        </Text>

        <AuthFieldLabel>Email address</AuthFieldLabel>
        <AuthInputField
          autoCapitalize="none"
          autoCorrect={false}
          containerStyle={{
            backgroundColor: "#FFF8F4",
            borderColor: "#E9D5CE",
          }}
          icon="email-outline"
          iconColor={campusColors.red}
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
          containerStyle={{
            backgroundColor: "#FFF8F4",
            borderColor: "#E9D5CE",
          }}
          icon="lock-outline"
          iconColor={campusColors.red}
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
              style={{
                alignItems: "center",
                justifyContent: "center",
                minHeight: 44,
                minWidth: 44,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              <MaterialCommunityIcons
                color={campusColors.muted}
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
          gradientColors={[campusColors.deepRed, campusColors.rose]}
          label="Sign in"
          loading={loading}
          loadingLabel="Signing in..."
          onPress={() => void handleLogin()}
        />
      </MobileCampusLogin>

      <MobileLoginStatusModal
        checking={checkingServer || updateState.status === "checking"}
        onCheckAgain={refreshStatus}
        onClose={() => setStatusVisible(false)}
        onReviewUpdate={reviewUpdate}
        server={serverStatus}
        version={versionStatus}
        visible={statusVisible}
      />
    </>
  );
}
