import { useState, useMemo } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { studentDarkTheme } from "../../theme/studentDark";
import {
  analyzePhPhone,
  formatPhPhoneInput,
  type PhPhoneValidationResult,
} from "../../utils/phPhoneValidation";

type PhPhoneInputFieldProps = {
  label: string;
  required?: boolean;
  value: string;
  onChangeText: (nextRaw: string, analysis: PhPhoneValidationResult) => void;
  placeholder?: string;
  disabled?: boolean;
};

const theme = studentDarkTheme;

export function PhPhoneInputField({
  label,
  required = false,
  value,
  onChangeText,
  placeholder = "0917...",
  disabled = false,
}: PhPhoneInputFieldProps) {
  const [mode, setMode] = useState<"local" | "international">("local");

  const analysis = useMemo(() => analyzePhPhone(value), [value]);

  const handleInputChange = (input: string) => {
    // Detect if user typed + or international prefix
    if (input.trim().startsWith("+") && mode !== "international") {
      setMode("international");
    }

    const nextAnalysis = analyzePhPhone(input);
    onChangeText(input, nextAnalysis);
  };

  const toggleMode = () => {
    const nextMode = mode === "local" ? "international" : "local";
    setMode(nextMode);

    if (value.trim()) {
      const formatted = formatPhPhoneInput(value, nextMode);
      const nextAnalysis = analyzePhPhone(formatted);
      onChangeText(formatted, nextAnalysis);
    }
  };

  // Determine status color and icon based on real-time analysis
  let borderColor: string = theme.border;
  let statusColor: string = theme.muted;
  let iconName: "check-circle" | "alert-circle" | "circle-outline" | "numeric" = "circle-outline";

  if (value.trim().length > 0) {
    if (analysis.isValid) {
      borderColor = theme.green;
      statusColor = theme.green;
      iconName = "check-circle";
    } else if (analysis.status === "INVALID_PREFIX" || analysis.status === "EXCEEDS_LENGTH") {
      borderColor = theme.red;
      statusColor = theme.red;
      iconName = "alert-circle";
    } else {
      borderColor = theme.blue;
      statusColor = theme.blue;
      iconName = "circle-outline";
    }
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Label and Carrier Badge Header */}
      <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
        <View style={{ alignItems: "center", flexDirection: "row" }}>
          {required ? (
            <View
              style={{
                backgroundColor: theme.red,
                borderRadius: 999,
                height: 5,
                marginRight: 5,
                width: 5,
              }}
            />
          ) : null}
          <Text
            style={{
              color: theme.muted,
              fontSize: 9,
              fontWeight: "600",
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            {label}
          </Text>
        </View>

        {analysis.telecomCarrier ? (
          <View
            style={{
              backgroundColor: theme.blueSoft,
              borderRadius: 4,
              paddingHorizontal: 6,
              paddingVertical: 1,
            }}
          >
            <Text style={{ color: theme.blue, fontSize: 8, fontWeight: "700" }}>
              {analysis.telecomCarrier}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Input Row Container */}
      <View
        style={{
          alignItems: "center",
          backgroundColor: theme.active,
          borderColor: borderColor,
          borderRadius: 8,
          borderWidth: 1,
          flexDirection: "row",
          paddingHorizontal: 8,
          paddingVertical: 4,
        }}
      >
        {/* Interactive Country / Format Chip */}
        <Pressable
          onPress={toggleMode}
          style={{
            alignItems: "center",
            backgroundColor: theme.surface,
            borderColor: theme.border,
            borderRadius: 6,
            borderWidth: 1,
            flexDirection: "row",
            marginRight: 8,
            paddingHorizontal: 7,
            paddingVertical: 4,
          }}
        >
          <Text style={{ fontSize: 10, marginRight: 3 }}>🇵🇭</Text>
          <Text style={{ color: theme.text, fontSize: 10, fontWeight: "700" }}>
            {mode === "local" ? "09" : "+63"}
          </Text>
          <MaterialCommunityIcons color={theme.muted} name="chevron-down" size={12} style={{ marginLeft: 2 }} />
        </Pressable>

        {/* Text Input */}
        <TextInput
          editable={!disabled}
          keyboardType="phone-pad"
          maxLength={mode === "international" ? 17 : 13}
          onChangeText={handleInputChange}
          placeholder={mode === "local" ? "0917 123 4567" : "+63 917 123 4567"}
          placeholderTextColor={theme.dim}
          selectionColor={theme.red}
          style={{
            color: theme.text,
            flex: 1,
            fontSize: 13,
            minHeight: 28,
            paddingVertical: 0,
          }}
          value={value}
        />

        {/* Status Indicator Icon */}
        {value.trim().length > 0 ? (
          <MaterialCommunityIcons color={statusColor} name={iconName} size={15} style={{ marginLeft: 6 }} />
        ) : null}
      </View>

      {/* Live Validation Guidance Message */}
      {value.trim().length > 0 ? (
        <Text
          style={{
            color: statusColor,
            fontSize: 10,
            lineHeight: 14,
            marginTop: 4,
          }}
        >
          {analysis.message}
        </Text>
      ) : null}
    </View>
  );
}
