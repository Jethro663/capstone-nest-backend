import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { API_BASE_URL } from "../api/config";
import { toAppError } from "../api/http";
import type { AuthStackParamList } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";
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
    <LinearGradient colors={[colors.text, "#111827"]} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 12}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 20, paddingVertical: 30 }}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={{
              borderRadius: radii.header,
              padding: 18,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.14)",
              backgroundColor: "rgba(255,255,255,0.06)",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(255,255,255,0.14)",
                }}
              >
                <MaterialCommunityIcons name="school" size={24} color={colors.white} />
              </View>
              <View>
                <Text style={{ fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.8)" }}>GABHS digital campus</Text>
                <Text style={{ fontSize: 20, fontWeight: "900", color: colors.white }}>Nexora Portal</Text>
              </View>
            </View>
            <Text style={{ marginTop: 10, fontSize: 13, lineHeight: 20, color: "rgba(255,255,255,0.82)" }}>
              A faster student-first mobile workspace inspired by the live web landing experience.
            </Text>
          </View>

          <LinearGradient colors={gradients.profile} style={{ borderRadius: radii.header, padding: 20 }}>
            <View
              style={[
                {
                  borderRadius: radii.header,
                  backgroundColor: colors.white,
                  padding: 18,
                },
                shadow.card,
              ]}
            >
              <Text style={{ fontSize: 24, fontWeight: "900", color: colors.text }}>Sign in</Text>
              <Text style={{ marginTop: 4, fontSize: 13, lineHeight: 20, color: colors.textSecondary }}>
                Use your active LMS account to open student mobile.
              </Text>
              <Text style={{ marginTop: 6, fontSize: 11, color: colors.muted }}>API: {API_BASE_URL}</Text>

              <View style={{ marginTop: 16, gap: 12 }}>
                <View>
                  <Text style={{ marginBottom: 6, fontSize: 12, fontWeight: "800", color: colors.text }}>Email</Text>
                  <TextInput
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="student71@lms.local"
                    placeholderTextColor={colors.muted}
                    value={email}
                    onChangeText={setEmail}
                    style={{
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: colors.border,
                      paddingHorizontal: 14,
                      paddingVertical: 13,
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
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: colors.border,
                      paddingHorizontal: 14,
                      paddingVertical: 13,
                      color: colors.text,
                    }}
                  />
                </View>
              </View>

              {!!error ? (
                <View style={{ marginTop: 12, borderRadius: 12, backgroundColor: colors.paleRed, padding: 10 }}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: colors.red }}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                onPress={() => void handleLogin()}
                style={{
                  marginTop: 16,
                  borderRadius: 14,
                  backgroundColor: colors.text,
                  alignItems: "center",
                  paddingVertical: 14,
                  opacity: loading ? 0.74 : 1,
                }}
              >
                <Text style={{ color: colors.white, fontSize: 14, fontWeight: "800" }}>
                  {loading ? "Signing in..." : "Sign in"}
                </Text>
              </Pressable>
            </View>
          </LinearGradient>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
