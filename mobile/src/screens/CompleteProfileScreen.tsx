import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { toAppError } from "../api/http";
import { ScreenScroll } from "../components/ui/primitives";
import { useAuth } from "../providers/AuthProvider";
import { colors } from "../theme/tokens";

const namePattern = /^[\p{L}\s'-]+$/u;

export function CompleteProfileScreen() {
  const { user, updateProfile, logout } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [middleName, setMiddleName] = useState(user?.middleName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const first = firstName.trim();
    const middle = middleName.trim();
    const last = lastName.trim();
    if (!first || !last) {
      setError("First name and last name are required.");
      return;
    }
    if (![first, last, ...(middle ? [middle] : [])].every((value) => value.length <= 30 && namePattern.test(value))) {
      setError("Use letters, spaces, hyphens, or apostrophes only (30 characters maximum).");
      return;
    }
    try {
      setSaving(true);
      setError("");
      await updateProfile({ firstName: first, middleName: middle || undefined, lastName: last });
    } catch (cause) {
      setError(toAppError(cause).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenScroll backgroundColor={colors.surface}>
      <View style={{ paddingHorizontal: 22, paddingTop: 64, paddingBottom: 40 }}>
        <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "900", letterSpacing: 1.2 }}>ACCOUNT SETUP</Text>
        <Text style={{ marginTop: 8, color: colors.text, fontSize: 29, fontWeight: "900" }}>Complete your profile</Text>
        <Text style={{ marginTop: 8, color: colors.textSecondary, lineHeight: 21 }}>
          Add your name before entering Nexora. This is the same required account gate used by the web app.
        </Text>

        <View style={{ marginTop: 24, borderRadius: 22, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 14 }}>
          {[
            { label: "First name", value: firstName, setter: setFirstName, required: true },
            { label: "Middle name", value: middleName, setter: setMiddleName, required: false },
            { label: "Last name", value: lastName, setter: setLastName, required: true },
          ].map((field) => (
            <View key={field.label}>
              <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: "800", marginBottom: 6 }}>{field.label}{field.required ? " *" : ""}</Text>
              <TextInput accessibilityLabel={field.label} autoCapitalize="words" value={field.value} onChangeText={field.setter} maxLength={30} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, color: colors.text, paddingHorizontal: 12, paddingVertical: 11 }} />
            </View>
          ))}
          {error ? <Text accessibilityLiveRegion="polite" style={{ color: colors.red, fontSize: 12 }}>{error}</Text> : null}
          <Pressable disabled={saving} onPress={() => void save()} style={{ borderRadius: 13, backgroundColor: colors.primary, alignItems: "center", paddingVertical: 14, opacity: saving ? 0.65 : 1 }}>
            {saving ? <ActivityIndicator color={colors.white} /> : <Text style={{ color: colors.white, fontWeight: "900" }}>Save and continue</Text>}
          </Pressable>
        </View>

        <Pressable onPress={() => void logout()} style={{ marginTop: 18, alignItems: "center", paddingVertical: 12 }}>
          <Text style={{ color: colors.red, fontWeight: "800" }}>Sign out</Text>
        </Pressable>
      </View>
    </ScreenScroll>
  );
}
