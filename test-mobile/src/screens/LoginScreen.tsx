import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { API_BASE_URL } from "../api/config";
import { toAppError } from "../api/http";
import type { AuthStackParamList } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";
import { resolveDevLoginSeed } from "./screen-flow";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;
type BackgroundBlob = {
  color: string;
  width: number;
  height: number;
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
};

const loginTheme = {
  background: "#0f1117",
  backgroundAlt: "#151922",
  card: "#f2f2f0",
  cardInner: "#ffffff",
  textDark: "#12141a",
  textMid: "#5a5e6e",
  textLight: "#9498a8",
  border: "rgba(0,0,0,0.09)",
  badgeBorder: "rgba(255,255,255,0.12)",
  badgeFill: "rgba(255,255,255,0.08)",
  badgeIconFill: "rgba(255,255,255,0.1)",
  badgeIconBorder: "rgba(255,255,255,0.15)",
  errorFill: "rgba(232,41,78,0.1)",
  errorBorder: "rgba(232,41,78,0.18)",
  white: "#ffffff",
  red: "#e8294e",
  orange: "#f97316",
  blue: "#4a8cf7",
  purple: "#4a3080",
  navy: "#1a3060",
} as const;

const cardGradient = [loginTheme.orange, loginTheme.red] as const;
const loadingGradient = ["#c85a58", loginTheme.red, loginTheme.orange] as const;
const titleFontFamily = Platform.select({
  ios: "Georgia",
  android: "serif",
  default: undefined,
});

const backgroundBlobs: BackgroundBlob[] = [
  {
    color: "rgba(232,41,78,0.32)",
    height: 220,
    left: -72,
    top: -64,
    width: 220,
  },
  {
    color: "rgba(249,115,22,0.24)",
    height: 200,
    right: -56,
    top: -28,
    width: 200,
  },
  {
    color: "rgba(74,48,128,0.24)",
    bottom: 160,
    height: 190,
    left: -58,
    width: 190,
  },
  {
    color: "rgba(26,48,96,0.26)",
    bottom: 68,
    height: 150,
    right: -34,
    width: 150,
  },
];

export function LoginScreen(_: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const seededCredentialsAppliedRef = useRef(false);
  const autoLoginAttemptedRef = useRef(false);

  const devLoginSeed = resolveDevLoginSeed({
    isDev: __DEV__,
    email: process.env.EXPO_PUBLIC_DEV_LOGIN_EMAIL,
    password: process.env.EXPO_PUBLIC_DEV_LOGIN_PASSWORD,
    autoLogin: process.env.EXPO_PUBLIC_DEV_AUTO_LOGIN,
  });

  const handleLogin = async (credentials?: { email?: string; password?: string }) => {
    const nextEmail = credentials?.email ?? email;
    const nextPassword = credentials?.password ?? password;

    if (!nextEmail.trim() || !nextPassword.trim()) {
      setError("Email and password are required.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await login(nextEmail.trim(), nextPassword);
    } catch (rawError) {
      setError(toAppError(rawError).message);
    } finally {
      setLoading(false);
    }
  };

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
    <LinearGradient colors={[loginTheme.background, loginTheme.backgroundAlt, loginTheme.background]} style={{ flex: 1 }}>
      <View pointerEvents="none" style={{ bottom: 0, left: 0, position: "absolute", right: 0, top: 0 }}>
        {backgroundBlobs.map((blob, index) => (
          <View
            key={`blob-${index}`}
            style={{
              backgroundColor: blob.color,
              borderRadius: 999,
              bottom: blob.bottom,
              height: blob.height,
              left: blob.left,
              opacity: 0.95,
              position: "absolute",
              right: blob.right,
              top: blob.top,
              width: blob.width,
            }}
          />
        ))}
        <View
          style={{
            backgroundColor: "rgba(255,255,255,0.02)",
            bottom: 0,
            left: 0,
            position: "absolute",
            right: 0,
            top: 0,
          }}
        />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 12}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: 26,
            paddingVertical: 34,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ alignItems: "center" }}>
            <View
              style={{
                alignItems: "center",
                backgroundColor: loginTheme.badgeFill,
                borderColor: loginTheme.badgeBorder,
                borderRadius: 14,
                borderWidth: 1,
                flexDirection: "row",
                gap: 10,
                marginBottom: 24,
                paddingBottom: 8,
                paddingLeft: 8,
                paddingRight: 14,
                paddingTop: 8,
              }}
            >
              <View
                style={{
                  alignItems: "center",
                  backgroundColor: loginTheme.badgeIconFill,
                  borderColor: loginTheme.badgeIconBorder,
                  borderRadius: 10,
                  borderWidth: 1,
                  height: 38,
                  justifyContent: "center",
                  width: 38,
                }}
              >
                <MaterialCommunityIcons color={loginTheme.white} name="school-outline" size={18} />
              </View>
              <View>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    fontSize: 9,
                    fontWeight: "700",
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                  }}
                >
                  GABHS Digital Campus
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.92)", fontSize: 14, fontWeight: "700", marginTop: 2 }}>
                  Nexora Portal
                </Text>
              </View>
            </View>

            <View
              style={{
                backgroundColor: loginTheme.card,
                borderRadius: 22,
                overflow: "hidden",
                shadowColor: "#000000",
                shadowOffset: { width: 0, height: 18 },
                shadowOpacity: 0.42,
                shadowRadius: 28,
                width: "100%",
              }}
            >
              <LinearGradient colors={cardGradient} end={{ x: 1, y: 0 }} start={{ x: 0, y: 0 }} style={{ height: 4 }} />

              <View style={{ paddingBottom: 20, paddingHorizontal: 24, paddingTop: 24 }}>
                <Text
                  style={{
                    color: loginTheme.textDark,
                    fontFamily: titleFontFamily,
                    fontSize: 29,
                    fontWeight: "400",
                    lineHeight: 34,
                  }}
                >
                  Welcome back
                </Text>
                <Text
                  style={{
                    color: loginTheme.textMid,
                    fontSize: 12,
                    lineHeight: 18,
                    marginBottom: 22,
                    marginTop: 5,
                  }}
                >
                  Sign in to your Nexora account
                </Text>

                <View style={{ gap: 14 }}>
                  <View>
                    <Text
                      style={{
                        color: loginTheme.textDark,
                        fontSize: 11,
                        fontWeight: "700",
                        marginBottom: 7,
                      }}
                    >
                      Email address
                    </Text>
                    <View
                      style={{
                        alignItems: "center",
                        backgroundColor: loginTheme.cardInner,
                        borderColor: loginTheme.border,
                        borderRadius: 11,
                        borderWidth: 1.5,
                        flexDirection: "row",
                        paddingLeft: 12,
                      }}
                    >
                      <MaterialCommunityIcons color={loginTheme.textLight} name="email-outline" size={16} />
                      <TextInput
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardAppearance="dark"
                        keyboardType="email-address"
                        onChangeText={setEmail}
                        placeholder="you@example.com"
                        placeholderTextColor={loginTheme.textLight}
                        style={{
                          color: loginTheme.textDark,
                          flex: 1,
                          fontSize: 13,
                          paddingHorizontal: 10,
                          paddingVertical: 12,
                        }}
                        textContentType="username"
                        value={email}
                      />
                    </View>
                  </View>

                  <View>
                    <Text
                      style={{
                        color: loginTheme.textDark,
                        fontSize: 11,
                        fontWeight: "700",
                        marginBottom: 7,
                      }}
                    >
                      Password
                    </Text>
                    <View
                      style={{
                        alignItems: "center",
                        backgroundColor: loginTheme.cardInner,
                        borderColor: loginTheme.border,
                        borderRadius: 11,
                        borderWidth: 1.5,
                        flexDirection: "row",
                        paddingLeft: 12,
                      }}
                    >
                      <MaterialCommunityIcons color={loginTheme.textLight} name="lock-outline" size={16} />
                      <TextInput
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardAppearance="dark"
                        onChangeText={setPassword}
                        placeholder="Enter your password"
                        placeholderTextColor={loginTheme.textLight}
                        secureTextEntry={!showPassword}
                        style={{
                          color: loginTheme.textDark,
                          flex: 1,
                          fontSize: showPassword ? 13 : 15,
                          letterSpacing: showPassword ? 0 : 2,
                          paddingHorizontal: 10,
                          paddingVertical: 12,
                        }}
                        textContentType="password"
                        value={password}
                      />
                      <Pressable
                        accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                        hitSlop={10}
                        onPress={() => setShowPassword((current) => !current)}
                        style={{ paddingHorizontal: 12, paddingVertical: 10 }}
                      >
                        <MaterialCommunityIcons
                          color={loginTheme.textLight}
                          name={showPassword ? "eye-off-outline" : "eye-outline"}
                          size={17}
                        />
                      </Pressable>
                    </View>
                  </View>
                </View>

                {!!error ? (
                  <View
                    style={{
                      backgroundColor: loginTheme.errorFill,
                      borderColor: loginTheme.errorBorder,
                      borderRadius: 12,
                      borderWidth: 1,
                      marginTop: 14,
                      paddingHorizontal: 12,
                      paddingVertical: 11,
                    }}
                  >
                    <Text style={{ color: loginTheme.red, fontSize: 12, fontWeight: "700" }}>{error}</Text>
                  </View>
                ) : null}

                <Pressable disabled={loading} onPress={() => void handleLogin()} style={{ marginTop: 18 }}>
                  <LinearGradient
                    colors={loading ? loadingGradient : cardGradient}
                    end={{ x: 1, y: 0 }}
                    start={{ x: 0, y: 0 }}
                    style={{
                      alignItems: "center",
                      borderRadius: 11,
                      flexDirection: "row",
                      justifyContent: "center",
                      paddingVertical: 13,
                      shadowColor: loginTheme.red,
                      shadowOffset: { width: 0, height: 8 },
                      shadowOpacity: 0.24,
                      shadowRadius: 18,
                    }}
                  >
                    {loading ? (
                      <MaterialCommunityIcons color={loginTheme.white} name="loading" size={16} style={{ marginRight: 8 }} />
                    ) : null}
                    <Text style={{ color: loginTheme.white, fontSize: 14, fontWeight: "700", letterSpacing: 0.3 }}>
                      {loading ? "Signing in..." : "Sign in"}
                    </Text>
                  </LinearGradient>
                </Pressable>

                <Text style={{ color: loginTheme.textLight, fontSize: 10, marginTop: 10, textAlign: "center" }}>
                  Connected to {API_BASE_URL}
                </Text>
              </View>

              <View
                style={{
                  borderTopColor: "rgba(0,0,0,0.06)",
                  borderTopWidth: 1,
                  paddingBottom: 18,
                  paddingHorizontal: 24,
                  paddingTop: 12,
                }}
              >
                <Text style={{ color: loginTheme.textMid, fontSize: 11, textAlign: "center" }}>
                  Forgot password? Contact your administrator
                </Text>
              </View>
            </View>

            <Text
              style={{
                color: "rgba(255,255,255,0.25)",
                fontSize: 10,
                letterSpacing: 0.3,
                marginTop: 20,
                textAlign: "center",
              }}
            >
              Copyright 2026 Nexora. All rights reserved.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
