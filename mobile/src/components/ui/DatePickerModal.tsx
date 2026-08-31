import { useEffect, useMemo, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Alert, Modal, Pressable, Text, TextInput, View } from "react-native";
import { TeacherChip, TeacherActionButton, teacherTheme as theme } from "../teacher/TeacherMobilePrimitives";
export function DatePickerModal({
  visible,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean;
  value: string;
  onSelect: (dateStr: string) => void;
  onClose: () => void;
}) {
  const initialDate = useMemo(() => {
    if (!value) return new Date();
    const parsed = new Date(
      value.includes("T") ? value : value.replace(" ", "T"),
    );
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [value]);

  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [selectedDay, setSelectedDay] = useState(initialDate.getDate());
  const [selectedHour, setSelectedHour] = useState(
    `${initialDate.getHours()}`.padStart(2, "0"),
  );
  const [selectedMinute, setSelectedMinute] = useState(
    `${initialDate.getMinutes()}`.padStart(2, "0"),
  );

  useEffect(() => {
    if (visible) {
      const d = !value
        ? new Date()
        : new Date(value.includes("T") ? value : value.replace(" ", "T"));
      const valid = !Number.isNaN(d.getTime()) ? d : new Date();
      setCurrentMonth(valid.getMonth());
      setCurrentYear(valid.getFullYear());
      setSelectedDay(valid.getDate());
      setSelectedHour(`${valid.getHours()}`.padStart(2, "0"));
      setSelectedMinute(`${valid.getMinutes()}`.padStart(2, "0"));
    }
  }, [visible, value]);

  const daysInMonth = useMemo(
    () => new Date(currentYear, currentMonth + 1, 0).getDate(),
    [currentYear, currentMonth],
  );
  const startDayOfWeek = useMemo(
    () => new Date(currentYear, currentMonth, 1).getDay(),
    [currentYear, currentMonth],
  );
  const monthName = useMemo(
    () =>
      new Date(currentYear, currentMonth, 1).toLocaleDateString("en-US", {
        month: "long",
      }),
    [currentYear, currentMonth],
  );

  const handleApply = () => {
    const y = currentYear;
    const m = `${currentMonth + 1}`.padStart(2, "0");
    const d = `${selectedDay}`.padStart(2, "0");
    const formatted = `${y}-${m}-${d} ${selectedHour}:${selectedMinute}`;
    const parsedDate = new Date(
      `${y}-${m}-${d}T${selectedHour}:${selectedMinute}`,
    );
    if (
      !Number.isNaN(parsedDate.getTime()) &&
      parsedDate.getTime() < Date.now()
    ) {
      Alert.alert(
        "Invalid Due Date",
        "Assessment due date cannot be earlier than the present date and time.",
      );
      return;
    }
    onSelect(formatted);
    onClose();
  };

  const handleQuickPreset = (daysOffset: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysOffset);
    setCurrentYear(target.getFullYear());
    setCurrentMonth(target.getMonth());
    setSelectedDay(target.getDate());
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.6)",
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 380,
            backgroundColor: theme.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 18,
            gap: 14,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text
              style={{ fontSize: 16, fontWeight: "800", color: theme.text }}
            >
              Select Due Date
            </Text>
            <Pressable onPress={onClose} style={{ padding: 4 }}>
              <MaterialCommunityIcons
                name="close"
                size={20}
                color={theme.muted}
              />
            </Pressable>
          </View>

          {/* Quick Presets */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            <TeacherChip
              label="Today"
              active={false}
              onPress={() => handleQuickPreset(0)}
            />
            <TeacherChip
              label="Tomorrow"
              active={false}
              onPress={() => handleQuickPreset(1)}
            />
            <TeacherChip
              label="+7 Days"
              active={false}
              onPress={() => handleQuickPreset(7)}
            />
            <TeacherChip
              label="+30 Days"
              active={false}
              onPress={() => handleQuickPreset(30)}
            />
            <TeacherChip
              label="Clear"
              active={false}
              onPress={() => {
                onSelect("");
                onClose();
              }}
            />
          </View>

          {/* Month Header */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: theme.active,
              padding: 10,
              borderRadius: 10,
            }}
          >
            <Pressable
              onPress={() => {
                if (currentMonth === 0) {
                  setCurrentMonth(11);
                  setCurrentYear((y) => y - 1);
                } else {
                  setCurrentMonth((m) => m - 1);
                }
              }}
            >
              <MaterialCommunityIcons
                name="chevron-left"
                size={22}
                color={theme.text}
              />
            </Pressable>
            <Text
              style={{ fontSize: 14, fontWeight: "700", color: theme.text }}
            >
              {monthName} {currentYear}
            </Text>
            <Pressable
              onPress={() => {
                if (currentMonth === 11) {
                  setCurrentMonth(0);
                  setCurrentYear((y) => y + 1);
                } else {
                  setCurrentMonth((m) => m + 1);
                }
              }}
            >
              <MaterialCommunityIcons
                name="chevron-right"
                size={22}
                color={theme.text}
              />
            </Pressable>
          </View>

          {/* Day Grid Header */}
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => (
              <Text
                key={idx}
                style={{
                  width: 36,
                  textAlign: "center",
                  fontSize: 11,
                  fontWeight: "700",
                  color: theme.muted,
                }}
              >
                {day}
              </Text>
            ))}
          </View>

          {/* Calendar Days */}
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {Array.from({ length: startDayOfWeek }).map((_, idx) => (
              <View
                key={`blank-${idx}`}
                style={{ width: "14.28%", height: 36 }}
              />
            ))}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const isSelected = dayNum === selectedDay;
              return (
                <Pressable
                  key={`day-${dayNum}`}
                  onPress={() => setSelectedDay(dayNum)}
                  style={{
                    width: "14.28%",
                    height: 36,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <View
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      backgroundColor: isSelected ? theme.blue : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: isSelected ? "800" : "600",
                        color: isSelected ? "#ffffff" : theme.text,
                      }}
                    >
                      {dayNum}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Time Selector */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: 8,
              borderTopWidth: 1,
              borderTopColor: theme.border,
            }}
          >
            <Text
              style={{ fontSize: 12, fontWeight: "700", color: theme.text }}
            >
              Time (HH:mm)
            </Text>
            <View
              style={{ flexDirection: "row", gap: 6, alignItems: "center" }}
            >
              <TextInput
                value={selectedHour}
                onChangeText={(val) => {
                  const cleaned = val.replace(/[^0-9]/g, "");
                  if (cleaned.length <= 2) {
                    const num = parseInt(cleaned || "0", 10);
                    setSelectedHour(`${Math.min(23, num)}`.padStart(2, "0"));
                  }
                }}
                keyboardType="number-pad"
                maxLength={2}
                style={{
                  width: 44,
                  height: 36,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.active,
                  color: theme.text,
                  textAlign: "center",
                  fontSize: 13,
                  fontWeight: "700",
                }}
              />
              <Text
                style={{ fontSize: 14, fontWeight: "800", color: theme.text }}
              >
                :
              </Text>
              <TextInput
                value={selectedMinute}
                onChangeText={(val) => {
                  const cleaned = val.replace(/[^0-9]/g, "");
                  if (cleaned.length <= 2) {
                    const num = parseInt(cleaned || "0", 10);
                    setSelectedMinute(`${Math.min(59, num)}`.padStart(2, "0"));
                  }
                }}
                keyboardType="number-pad"
                maxLength={2}
                style={{
                  width: 44,
                  height: 36,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.active,
                  color: theme.text,
                  textAlign: "center",
                  fontSize: 13,
                  fontWeight: "700",
                }}
              />
            </View>
          </View>

          {/* Action Buttons */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 4,
            }}
          >
            <TeacherActionButton
              label="Cancel"
              tone="neutral"
              onPress={onClose}
            />
            <TeacherActionButton
              label="Apply Date"
              tone="blue"
              onPress={handleApply}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
