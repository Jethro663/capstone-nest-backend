import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { authApi } from "../../api/services/auth";
import { toAppError } from "../../api/http";
import { validatePasswordChange, type PasswordChangeErrors } from "../../utils/accountSecurity";

const palette = { text: "#E5E7EB", muted: "#94A3B8", border: "#334155", field: "#111C30", action: "#1D4ED8", error: "#EF4444", success: "#22C55E" };

export function PasswordChangeForm() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<PasswordChangeErrors>({});
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const payload = { oldPassword, newPassword, confirmPassword };
    const nextErrors = validatePasswordChange(payload);
    setErrors(nextErrors);
    setStatus("");
    if (Object.keys(nextErrors).length) return;
    try {
      setSaving(true);
      await authApi.changePassword(payload);
      setErrors({});
      setStatus("Password changed successfully.");
    } catch (error) {
      const message = toAppError(error).message;
      setStatus(message);
      if (message.toLowerCase().includes("current password")) setErrors({ oldPassword: message });
    } finally {
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSaving(false);
    }
  };

  const fields = [
    { key: "oldPassword" as const, label: "Current password", value: oldPassword, setValue: setOldPassword },
    { key: "newPassword" as const, label: "New password", value: newPassword, setValue: setNewPassword },
    { key: "confirmPassword" as const, label: "Confirm new password", value: confirmPassword, setValue: setConfirmPassword },
  ];

  return (
    <View style={{ gap: 10 }}>
      {fields.map((field) => (
        <View key={field.key}>
          <Text style={{ color: palette.muted, fontSize: 10, fontWeight: "800", marginBottom: 5, textTransform: "uppercase" }}>{field.label}</Text>
          <TextInput accessibilityLabel={field.label} autoCapitalize="none" autoCorrect={false} secureTextEntry value={field.value} onChangeText={field.setValue} placeholder="Enter password" placeholderTextColor={palette.muted} style={{ borderWidth: 1, borderColor: errors[field.key] ? palette.error : palette.border, borderRadius: 10, backgroundColor: palette.field, color: palette.text, paddingHorizontal: 12, paddingVertical: 11 }} />
          {errors[field.key] ? <Text style={{ color: palette.error, fontSize: 11, marginTop: 4 }}>{errors[field.key]}</Text> : null}
        </View>
      ))}
      <Text style={{ color: palette.muted, fontSize: 10 }}>8+ characters with uppercase, lowercase, number, and special character.</Text>
      {status ? <Text accessibilityLiveRegion="polite" style={{ color: Object.keys(errors).length ? palette.error : palette.success, fontSize: 12 }}>{status}</Text> : null}
      <Pressable accessibilityRole="button" disabled={saving} onPress={() => void submit()} style={{ borderRadius: 10, backgroundColor: palette.action, alignItems: "center", paddingVertical: 12, opacity: saving ? 0.6 : 1 }}>
        <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>{saving ? "Updating..." : "Update Password"}</Text>
      </Pressable>
    </View>
  );
}
