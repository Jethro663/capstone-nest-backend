import DateTimePicker from "@react-native-community/datetimepicker";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { assessmentsApi } from "../api/services/assessments";
import { normalizeApiError } from "../api/errors";
import { queryKeys } from "../api/hooks";
import { useAuth } from "../providers/AuthProvider";
import type { RootStackParamList } from "../navigation/types";
import type { AssignmentFormat } from "../types/assignment-creation";
import {
  buildAssignmentRequest,
  emptyAssignmentSetup,
  toManilaIso,
  type AssignmentSetup,
} from "../features/assignment-creation/model";
import {
  createAssignmentWithRecovery,
  getPendingAssignmentCreation,
} from "../features/assignment-creation/recovery";
import { teacherTheme as theme } from "../components/teacher/TeacherMobilePrimitives";

type Props = NativeStackScreenProps<
  RootStackParamList,
  "TeacherCreateAssessment"
>;
const STEP_NAMES = ["Format", "Class record", "Details"] as const;

function Button({
  label,
  onPress,
  disabled = false,
  quiet = false,
}: {
  label: string;
  onPress(): void;
  disabled?: boolean;
  quiet?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={{
        minHeight: 48,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: quiet ? theme.border : theme.red,
        backgroundColor: quiet ? "white" : theme.red,
        paddingHorizontal: 16,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <Text style={{ color: quiet ? theme.text : "white", fontWeight: "800" }}>
        {label}
      </Text>
    </Pressable>
  );
}

function Choice({
  label,
  description,
  selected,
  disabled = false,
  onPress,
}: {
  label: string;
  description?: string;
  selected: boolean;
  disabled?: boolean;
  onPress(): void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        minHeight: 52,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: selected ? theme.red : theme.border,
        backgroundColor: selected ? theme.redSoft : "white",
        padding: 13,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text style={{ color: theme.text, fontWeight: "800" }}>{label}</Text>
      {description ? (
        <Text style={{ color: theme.subtext, lineHeight: 19, marginTop: 5 }}>
          {description}
        </Text>
      ) : null}
    </Pressable>
  );
}

function errorMessage(cause: unknown) {
  if (cause instanceof Error && !("response" in cause)) return cause.message;
  return normalizeApiError(cause, { present: false }).message;
}

export function TeacherCreateAssessmentScreen({ navigation, route }: Props) {
  const classId = route.params.classId;
  const { user } = useAuth();
  const actorId = user?.userId || user?.id || "";
  const queryClient = useQueryClient();
  const [setup, setSetup] = useState<AssignmentSetup>(emptyAssignmentSetup);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] =
    useState<Awaited<ReturnType<typeof getPendingAssignmentCreation>>>(null);
  const [recoveryLoading, setRecoveryLoading] = useState(true);
  const [pickerMode, setPickerMode] = useState<"date" | "time" | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const progress = useRef(new Animated.Value(1)).current;
  const submitting = useRef(false);
  const context = useQuery({
    queryKey: ["assignment-creation-context", classId],
    queryFn: () => assessmentsApi.getCreationContext(classId),
  });

  useEffect(() => {
    if (!actorId) return;
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setReduceMotion(value);
    });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    let active = true;
    void getPendingAssignmentCreation(actorId, classId)
      .then((request) => active && setPending(request))
      .catch((cause) => active && setError(errorMessage(cause)))
      .finally(() => active && setRecoveryLoading(false));
    return () => {
      active = false;
    };
  }, [actorId, classId]);

  useEffect(() => {
    if (!context.data?.defaultPeriod) return;
    setSetup((current) => ({
      ...current,
      quarter: current.quarter ?? context.data.defaultPeriod,
    }));
  }, [context.data]);

  useEffect(() => {
    progress.setValue(reduceMotion ? 1 : 0);
    Animated.timing(progress, {
      toValue: 1,
      duration: reduceMotion ? 0 : 180,
      useNativeDriver: true,
    }).start();
  }, [direction, progress, reduceMotion, step]);

  const period = context.data?.periods.find(
    (entry) => entry.key === setup.quarter,
  );
  const category = context.data?.categories.find(
    (entry) => entry.key === setup.category,
  );
  const slots = useMemo(
    () =>
      period?.workbook?.categories.find((entry) => entry.key === setup.category)
        ?.slots ?? [],
    [period, setup.category],
  );
  const selectedSlot = setup.manualSlot
    ? slots.find((entry) => entry.itemId === setup.itemId && entry.isSelectable)
    : slots.find((entry) => entry.isSelectable);
  const placementValid = Boolean(
    period?.canPrepare && category && (!period.workbook || selectedSlot),
  );
  const destination =
    period && category
      ? `${period.label} → ${category.label} → ${selectedSlot ? `Slot ${selectedSlot.order}` : "first available slot"}`
      : "Choose where the score will appear";

  function change<K extends keyof AssignmentSetup>(
    key: K,
    value: AssignmentSetup[K],
  ) {
    setSetup((current) => ({ ...current, [key]: value }));
  }
  function go(next: number) {
    setDirection(next > step ? 1 : -1);
    setStep(next);
    setError("");
  }
  function chooseType(type: AssignmentFormat) {
    change("type", type);
    go(1);
  }
  async function submit(skip: boolean) {
    if (submitting.current || busy) return;
    if (!pending && (!context.data?.defaultPeriod || !setup.type)) return;
    if (!pending && !skip) {
      if (!placementValid) {
        go(1);
        setError("Choose an available class-record destination.");
        return;
      }
      if (!setup.title.trim()) {
        setError("Enter an assignment name.");
        return;
      }
      if (
        !setup.noDueDate &&
        (!setup.dueAt || Date.parse(toManilaIso(setup.dueAt)) <= Date.now())
      ) {
        setError("Choose a future due date and time, or keep No due date on.");
        return;
      }
      if (
        setup.type === "quiz" &&
        (!Number.isInteger(Number(setup.maxAttempts)) ||
          Number(setup.maxAttempts) < 1 ||
          Number(setup.maxAttempts) > 100)
      ) {
        setError("Maximum attempts must be a whole number from 1 to 100.");
        return;
      }
    }
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const request =
        pending ??
        buildAssignmentRequest(
          classId,
          Crypto.randomUUID(),
          { ...setup, itemId: selectedSlot?.itemId ?? null },
          context.data!.defaultPeriod!,
          skip,
        );
      const result = await createAssignmentWithRecovery(
        actorId,
        request,
        (body) => assessmentsApi.saveEditor(undefined, body),
      );
      setPending(null);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.assessments(classId),
      });
      navigation.replace("TeacherAssessmentEditor", {
        assessmentId: result.assessment.id,
        classId,
        created: true,
      });
    } catch (cause) {
      const failure = normalizeApiError(cause, { present: false });
      try {
        setPending(await getPendingAssignmentCreation(actorId, classId));
      } catch {
        // Preserve the original failure message.
      }
      if (
        failure.status === 409 ||
        failure.code === "ASSESSMENT_SLOT_UNAVAILABLE"
      ) {
        setSetup((current) => ({
          ...current,
          itemId: null,
          manualSlot: false,
        }));
        go(1);
        await context.refetch();
      }
      setError(errorMessage(cause));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  const loading = context.isLoading || recoveryLoading;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={{
            paddingHorizontal: 18,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderColor: theme.border,
            backgroundColor: "white",
            gap: 12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text
                style={{ color: theme.text, fontSize: 22, fontWeight: "900" }}
              >
                Create an assignment
              </Text>
              <Text
                style={{ color: theme.subtext, lineHeight: 19, marginTop: 4 }}
              >
                Set the essentials first. The new assignment stays a hidden
                draft.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => navigation.goBack()}
              style={{ minHeight: 44, justifyContent: "center", padding: 8 }}
            >
              <Text style={{ color: theme.red, fontWeight: "800" }}>
                Cancel
              </Text>
            </Pressable>
          </View>
          <View
            accessibilityLabel="Creation progress"
            style={{ flexDirection: "row", gap: 8 }}
          >
            {STEP_NAMES.map((name, index) => (
              <View key={name} style={{ flex: 1, gap: 5 }}>
                <View
                  style={{
                    height: 4,
                    borderRadius: 99,
                    backgroundColor: index <= step ? theme.red : theme.border,
                  }}
                />
                <Text
                  style={{
                    color: index === step ? theme.red : theme.muted,
                    fontSize: 11,
                    fontWeight: index === step ? "800" : "600",
                  }}
                >
                  {index + 1}. {name}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 18, paddingBottom: 30 }}
          keyboardShouldPersistTaps="handled"
        >
          {error ? (
            <View
              accessibilityRole="alert"
              style={{
                borderWidth: 1,
                borderColor: theme.redLine,
                backgroundColor: theme.redSoft,
                borderRadius: 10,
                padding: 12,
                marginBottom: 14,
              }}
            >
              <Text style={{ color: theme.red, lineHeight: 20 }}>{error}</Text>
            </View>
          ) : null}

          {pending ? (
            <View style={{ gap: 14 }}>
              <Text
                style={{ color: theme.text, fontSize: 20, fontWeight: "900" }}
              >
                Recover your assignment
              </Text>
              <Text style={{ color: theme.subtext, lineHeight: 21 }}>
                A previous creation could not be confirmed. Retry the exact same
                request before starting another assignment.
              </Text>
              <Text style={{ color: theme.text, fontWeight: "800" }}>
                {pending.settings.title || "Untitled assignment"} ·{" "}
                {pending.settings.type === "file_upload"
                  ? "File upload"
                  : "Questions"}
              </Text>
              <Button
                label={busy ? "Recovering…" : "Retry creation"}
                disabled={busy}
                onPress={() => void submit(false)}
              />
            </View>
          ) : loading ? (
            <Text
              accessibilityRole="progressbar"
              style={{ color: theme.subtext }}
            >
              Loading available class-record slots…
            </Text>
          ) : context.isError ? (
            <View style={{ gap: 12 }}>
              <Text style={{ color: theme.subtext }}>
                Assignment setup could not be loaded.
              </Text>
              <Button
                quiet
                label="Retry"
                onPress={() => void context.refetch()}
              />
            </View>
          ) : !context.data?.defaultPeriod ? (
            <Text style={{ color: theme.subtext, lineHeight: 21 }}>
              This class has no editable academic period. Reopen its class
              record before creating an assignment.
            </Text>
          ) : (
            <Animated.View
              style={{
                opacity: progress,
                transform: [
                  {
                    translateX: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [direction * 18, 0],
                    }),
                  },
                ],
              }}
            >
              <Text
                accessibilityRole="header"
                style={{ color: theme.text, fontSize: 20, fontWeight: "900" }}
              >
                {step === 0
                  ? "Choose an assignment format"
                  : step === 1
                    ? "Class record setup"
                    : "Name and schedule"}
              </Text>

              {step === 0 ? (
                <View
                  accessibilityRole="radiogroup"
                  style={{ gap: 12, marginTop: 16 }}
                >
                  <Choice
                    label="Question assignment"
                    description="Students answer inside Nexora. Use automatic or teacher grading, multiple attempts, timers, and question randomization. Best for quizzes, written responses, and practice."
                    selected={setup.type === "quiz"}
                    onPress={() => chooseType("quiz")}
                  />
                  <Choice
                    label="File upload assignment"
                    description="Students upload a document, image, or PDF. Review their latest submission, optionally use a rubric, and enter the score. Best for projects, portfolios, and performance outputs."
                    selected={setup.type === "file_upload"}
                    onPress={() => chooseType("file_upload")}
                  />
                  <Text style={{ color: theme.subtext, lineHeight: 20 }}>
                    Both formats sync scores to the class record. The format is
                    fixed after creation.
                  </Text>
                </View>
              ) : null}

              {step === 1 ? (
                <View style={{ gap: 16, marginTop: 16 }}>
                  <Text style={{ color: theme.subtext, lineHeight: 20 }}>
                    Choose exactly where this score will appear.
                  </Text>
                  <Text style={{ color: theme.text, fontWeight: "800" }}>
                    Academic period
                  </Text>
                  <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
                    {context.data.periods.map((entry) => (
                      <Choice
                        key={entry.key}
                        label={`${entry.label}${entry.canRelease ? " · active" : entry.canPrepare ? " · draft only" : ""}`}
                        description={
                          !entry.canPrepare
                            ? (entry.readOnlyReason ?? "Read only")
                            : undefined
                        }
                        selected={setup.quarter === entry.key}
                        disabled={!entry.canPrepare}
                        onPress={() =>
                          setSetup((current) => ({
                            ...current,
                            quarter: entry.key,
                            category: null,
                            itemId: null,
                            manualSlot: false,
                          }))
                        }
                      />
                    ))}
                  </View>
                  <Text style={{ color: theme.text, fontWeight: "800" }}>
                    Class-record category
                  </Text>
                  <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
                    {context.data.categories.map((entry) => (
                      <Choice
                        key={entry.key}
                        label={entry.label}
                        selected={setup.category === entry.key}
                        onPress={() =>
                          setSetup((current) => ({
                            ...current,
                            category: entry.key,
                            itemId: null,
                            manualSlot: false,
                          }))
                        }
                      />
                    ))}
                  </View>
                  {setup.category && period?.workbook ? (
                    <>
                      <Text style={{ color: theme.text, fontWeight: "800" }}>
                        Slot placement
                      </Text>
                      <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
                        <Choice
                          label="Next available slot (recommended)"
                          selected={!setup.manualSlot}
                          disabled={!slots.some((slot) => slot.isSelectable)}
                          onPress={() =>
                            setSetup((current) => ({
                              ...current,
                              manualSlot: false,
                              itemId: null,
                            }))
                          }
                        />
                        <Choice
                          label="Choose a specific slot"
                          selected={setup.manualSlot}
                          disabled={!slots.some((slot) => slot.isSelectable)}
                          onPress={() =>
                            setSetup((current) => ({
                              ...current,
                              manualSlot: true,
                              itemId: null,
                            }))
                          }
                        />
                      </View>
                      {setup.manualSlot ? (
                        <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
                          {slots.map((slot) => (
                            <Choice
                              key={slot.itemId}
                              label={`Slot ${slot.order} · ${slot.title}`}
                              description={
                                slot.isSelectable
                                  ? undefined
                                  : slot.assessmentTitle ||
                                    "Manual scores already recorded"
                              }
                              selected={setup.itemId === slot.itemId}
                              disabled={!slot.isSelectable}
                              onPress={() => change("itemId", slot.itemId)}
                            />
                          ))}
                        </View>
                      ) : null}
                      {!slots.some((slot) => slot.isSelectable) ? (
                        <Text style={{ color: theme.red, lineHeight: 20 }}>
                          This category is full. Choose another category or skip
                          setup.
                        </Text>
                      ) : null}
                    </>
                  ) : setup.category && period ? (
                    <Text style={{ color: theme.subtext, lineHeight: 20 }}>
                      A {period.label} class record will be created with this
                      draft and use the first available {category?.label} slot.
                    </Text>
                  ) : null}
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: 10,
                      padding: 12,
                    }}
                  >
                    <Text
                      style={{
                        color: placementValid ? theme.text : theme.subtext,
                      }}
                    >
                      {placementValid
                        ? destination
                        : "Select an available destination to continue."}
                    </Text>
                  </View>
                </View>
              ) : null}

              {step === 2 ? (
                <View style={{ gap: 18, marginTop: 16 }}>
                  <View style={{ gap: 7 }}>
                    <Text style={{ color: theme.text, fontWeight: "800" }}>
                      Assignment name
                    </Text>
                    <TextInput
                      accessibilityLabel="Assignment name"
                      value={setup.title}
                      maxLength={255}
                      onChangeText={(title) => change("title", title)}
                      placeholder="For example, Chapter 2 reflection"
                      style={{
                        minHeight: 50,
                        borderWidth: 1,
                        borderColor: theme.border,
                        borderRadius: 10,
                        backgroundColor: "white",
                        padding: 13,
                        color: theme.text,
                      }}
                    />
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      minHeight: 48,
                      gap: 12,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text, fontWeight: "800" }}>
                        No due date
                      </Text>
                      <Text style={{ color: theme.subtext, marginTop: 3 }}>
                        Keep the draft open until you schedule it later.
                      </Text>
                    </View>
                    <Switch
                      accessibilityLabel="No due date"
                      value={setup.noDueDate}
                      onValueChange={(value) => change("noDueDate", value)}
                    />
                  </View>
                  {!setup.noDueDate ? (
                    <View style={{ gap: 10 }}>
                      <Text style={{ color: theme.text, fontWeight: "800" }}>
                        Due date · Asia/Manila (UTC+8)
                      </Text>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <View style={{ flex: 1 }}>
                          <Button
                            quiet
                            label="Choose date"
                            onPress={() => setPickerMode("date")}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Button
                            quiet
                            label="Choose time"
                            onPress={() => setPickerMode("time")}
                          />
                        </View>
                      </View>
                      <Text style={{ color: theme.subtext }}>
                        {setup.dueAt
                          ? `${setup.dueAt.toLocaleDateString()} ${setup.dueAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · Manila time`
                          : "Choose a future date and time."}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          minHeight: 48,
                          gap: 12,
                        }}
                      >
                        <Text style={{ flex: 1, color: theme.text }}>
                          Close submissions when due
                        </Text>
                        <Switch
                          accessibilityLabel="Close submissions when due"
                          value={setup.closeWhenDue}
                          onValueChange={(value) =>
                            change("closeWhenDue", value)
                          }
                        />
                      </View>
                    </View>
                  ) : null}
                  {setup.type === "quiz" ? (
                    <View style={{ gap: 7 }}>
                      <Text style={{ color: theme.text, fontWeight: "800" }}>
                        Maximum attempts
                      </Text>
                      <TextInput
                        accessibilityLabel="Maximum attempts"
                        value={setup.maxAttempts}
                        keyboardType="number-pad"
                        onChangeText={(value) =>
                          change("maxAttempts", value.replace(/\D/g, ""))
                        }
                        style={{
                          minHeight: 50,
                          borderWidth: 1,
                          borderColor: theme.border,
                          borderRadius: 10,
                          backgroundColor: "white",
                          padding: 13,
                          color: theme.text,
                        }}
                      />
                      <Text style={{ color: theme.subtext }}>
                        A whole number from 1 to 100.
                      </Text>
                    </View>
                  ) : (
                    <Text style={{ color: theme.subtext, lineHeight: 20 }}>
                      Students can submit revisions while open. The latest
                      submission is graded.
                    </Text>
                  )}
                  <View
                    style={{
                      borderTopWidth: 1,
                      borderColor: theme.border,
                      paddingTop: 14,
                      gap: 5,
                    }}
                  >
                    <Text style={{ color: theme.text, fontWeight: "800" }}>
                      {setup.type === "quiz"
                        ? "Question assignment"
                        : "File upload assignment"}
                    </Text>
                    <Text style={{ color: theme.text }}>{destination}</Text>
                    <Text style={{ color: theme.subtext }}>
                      Draft · hidden from students
                    </Text>
                  </View>
                </View>
              ) : null}
            </Animated.View>
          )}
        </ScrollView>

        {!pending && context.data?.defaultPeriod && !loading ? (
          <View
            style={{
              borderTopWidth: 1,
              borderColor: theme.border,
              backgroundColor: "white",
              padding: 14,
              gap: 10,
            }}
          >
            <View style={{ flexDirection: "row", gap: 10 }}>
              {step > 0 ? (
                <View style={{ flex: 1 }}>
                  <Button
                    quiet
                    label="Back"
                    disabled={busy}
                    onPress={() => go(step - 1)}
                  />
                </View>
              ) : (
                <Text
                  style={{ flex: 1, alignSelf: "center", color: theme.subtext }}
                >
                  Choose a format to continue
                </Text>
              )}
              {step === 1 ? (
                <View style={{ flex: 1 }}>
                  <Button
                    label="Continue"
                    disabled={busy || !placementValid}
                    onPress={() => go(2)}
                  />
                </View>
              ) : null}
              {step === 2 ? (
                <View style={{ flex: 1 }}>
                  <Button
                    label={busy ? "Creating…" : "Create draft"}
                    disabled={busy}
                    onPress={() => void submit(false)}
                  />
                </View>
              ) : null}
            </View>
            {step > 0 ? (
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => void submit(true)}
                style={{ minHeight: 44, justifyContent: "center" }}
              >
                <Text
                  style={{
                    color: theme.red,
                    fontWeight: "800",
                    textAlign: "center",
                  }}
                >
                  Skip setup & start editing
                </Text>
                <Text
                  style={{
                    color: theme.subtext,
                    fontSize: 12,
                    textAlign: "center",
                    marginTop: 3,
                  }}
                >
                  Creates an unpublished, unplaced draft.
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {pickerMode ? (
          <DateTimePicker
            value={setup.dueAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000)}
            mode={pickerMode}
            onChange={(event, value) => {
              setPickerMode(null);
              if (event.type === "dismissed" || !value) return;
              const next = setup.dueAt
                ? new Date(setup.dueAt)
                : new Date(Date.now() + 24 * 60 * 60 * 1000);
              if (pickerMode === "date")
                next.setFullYear(
                  value.getFullYear(),
                  value.getMonth(),
                  value.getDate(),
                );
              else next.setHours(value.getHours(), value.getMinutes(), 0, 0);
              change("dueAt", next);
            }}
          />
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
