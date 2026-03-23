import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { API_BASE_URL } from "../api/config";
import { useAuth } from "../providers/AuthProvider";
import { toAppError } from "../api/http";
import type { AuthStackParamList } from "../navigation/types";
import { colors, gradients, radii, shadow } from "../theme/tokens";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen(_: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await login(email.trim(), password);
    } catch (rawError) {
      setError(toAppError(rawError).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <LinearGradient colors={gradients.profile} style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, justifyContent: "center", paddingHorizontal: 20 }}
        >
          <View
            style={{
              borderRadius: radii.header,
              backgroundColor: "rgba(255,255,255,0.14)",
              padding: 18,
              marginBottom: 18,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "800", color: "rgba(255,255,255,0.9)" }}>Student Portal</Text>
            <Text style={{ marginTop: 6, fontSize: 30, fontWeight: "900", color: colors.white }}>
              Learn with motion, focus, and real data.
            </Text>
            <Text style={{ marginTop: 8, fontSize: 14, lineHeight: 22, color: "rgba(255,255,255,0.82)" }}>
              test-mobile now signs into the current Nexora backend, restores sessions safely, and drives the
              student experience from live classes, lessons, assessments, and AI support.
            </Text>
          </View>

          <View
            style={[
              {
                borderRadius: radii.header,
                backgroundColor: colors.white,
                padding: 20,
              },
              shadow.card,
            ]}
          >
            <Text style={{ fontSize: 24, fontWeight: "900", color: colors.text }}>Sign in</Text>
            <Text style={{ marginTop: 4, fontSize: 13, lineHeight: 20, color: colors.textSecondary }}>
              Use your active student credentials from the main LMS.
            </Text>
            <Text style={{ marginTop: 8, fontSize: 11, lineHeight: 16, color: colors.muted }}>
              API: {API_BASE_URL}
            </Text>

            <View style={{ marginTop: 18, gap: 12 }}>
              <View>
                <Text style={{ marginBottom: 6, fontSize: 12, fontWeight: "800", color: colors.text }}>Email</Text>
                <TextInput
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="student@lms.local"
                  placeholderTextColor={colors.muted}
                  value={email}
                  onChangeText={setEmail}
                  style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    color: colors.text,
                  }}
                />
              </View>

              <View>
                <Text style={{ marginBottom: 6, fontSize: 12, fontWeight: "800", color: colors.text }}>Password</Text>
                <TextInput
                  secureTextEntry
                  placeholder="Enter your password"
                  placeholderTextColor={colors.muted}
                  value={password}
                  onChangeText={setPassword}
                  style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    color: colors.text,
                  }}
                />
              </View>
            </View>

            {!!error && (
              <View style={{ marginTop: 14, borderRadius: 18, backgroundColor: colors.paleRed, padding: 12 }}>
                <Text style={{ color: colors.red, fontSize: 12, fontWeight: "700" }}>{error}</Text>
              </View>
            )}

            <Pressable
              onPress={() => void handleLogin()}
              style={{
                marginTop: 18,
                borderRadius: 18,
                backgroundColor: colors.text,
                alignItems: "center",
                paddingVertical: 15,
                opacity: loading ? 0.7 : 1,
              }}
            >
              <Text style={{ color: colors.white, fontSize: 14, fontWeight: "800" }}>
                {loading ? "Signing In..." : "Sign In"}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
}
