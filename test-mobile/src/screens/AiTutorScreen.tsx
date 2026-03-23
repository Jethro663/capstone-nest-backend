import { useEffect, useMemo, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { aiApi } from "../api/services/ai";
import { useTutorBootstrap, useTutorSession } from "../api/hooks";
import { toAppError } from "../api/http";
import { Card, GradientHeader, Pill, ScreenScroll, SectionTitle } from "../components/ui/primitives";
import type { RootStackParamList } from "../navigation/types";
import { colors, gradients } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "AiTutor">;

export function AiTutorScreen({ route, navigation }: Props) {
  const initialClassId = route.params?.classId;
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>(initialClassId);
  const bootstrapQuery = useTutorBootstrap(selectedClassId);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>();
  const sessionQuery = useTutorSession(activeSessionId);
  const [message, setMessage] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedClassId) {
      setSelectedClassId(bootstrapQuery.data?.selectedClassId || bootstrapQuery.data?.classes[0]?.id);
    }
  }, [bootstrapQuery.data?.classes, bootstrapQuery.data?.selectedClassId, selectedClassId]);

  const recommendations = bootstrapQuery.data?.recommendations ?? [];
  const sessionState = sessionQuery.data?.state;
  const questionList = sessionState?.questions ?? [];

  const handleStartSession = async (recommendation: (typeof recommendations)[number]) => {
    if (!selectedClassId) return;

    try {
      setWorking(true);
      setError("");
      const started = await aiApi.startTutorSession({
        classId: selectedClassId,
        recommendation,
      });
      setActiveSessionId(started.sessionId);
    } catch (rawError) {
      setError(toAppError(rawError).message);
    } finally {
      setWorking(false);
    }
  };

  const handleSendMessage = async () => {
    if (!activeSessionId || !message.trim()) return;

    try {
      setWorking(true);
      setError("");
      await aiApi.sendTutorMessage(activeSessionId, message.trim());
      setMessage("");
      await sessionQuery.refetch();
    } catch (rawError) {
      setError(toAppError(rawError).message);
    } finally {
      setWorking(false);
    }
  };

  const handleSubmitAnswers = async () => {
    if (!activeSessionId || questionList.length === 0) return;

    try {
      setWorking(true);
      setError("");
      await aiApi.submitTutorAnswers(
        activeSessionId,
        questionList.map((question) => answers[question.id] || ""),
      );
      await sessionQuery.refetch();
    } catch (rawError) {
      setError(toAppError(rawError).message);
    } finally {
      setWorking(false);
    }
  };

  const activeHistory = useMemo(() => bootstrapQuery.data?.history ?? [], [bootstrapQuery.data?.history]);

  return (
    <ScreenScroll>
      <GradientHeader colors={gradients.lxp} eyebrow="Grounded AI Tutor" title="J.A.K.I.P.I.R.">
        <Pressable
          onPress={() => navigation.goBack()}
          style={{
            marginTop: 10,
            width: 36,
            height: 36,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255,255,255,0.2)",
          }}
        >
          <MaterialCommunityIcons name="chevron-left" size={22} color={colors.white} />
        </Pressable>
        <Text style={{ marginTop: 12, color: "rgba(255,255,255,0.86)", fontSize: 12 }}>
          Recommendations and tutor sessions are grounded on your current classes and weak areas.
        </Text>
      </GradientHeader>

      <View style={{ paddingHorizontal: 20, marginTop: 20, gap: 16 }}>
        <Card>
          <SectionTitle title="Choose a class" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {(bootstrapQuery.data?.classes ?? []).map((classItem) => (
              <Pressable
                key={classItem.id}
                onPress={() => setSelectedClassId(classItem.id)}
                style={{
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: classItem.id === selectedClassId ? colors.indigo : colors.border,
                  backgroundColor: classItem.id === selectedClassId ? colors.paleIndigo : colors.white,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "800", color: colors.text }}>{classItem.subjectName}</Text>
                <Text style={{ marginTop: 4, fontSize: 11, color: colors.textSecondary }}>{classItem.subjectCode}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Card>

        <Card>
          <SectionTitle title="Recommended starting points" />
          <View style={{ gap: 10 }}>
            {recommendations.map((recommendation) => (
              <Pressable
                key={recommendation.id}
                onPress={() => void handleStartSession(recommendation)}
                style={{
                  borderRadius: 18,
                  backgroundColor: colors.paleAmber,
                  padding: 14,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "900", color: colors.text }}>{recommendation.title}</Text>
                <Text style={{ marginTop: 4, fontSize: 12, color: colors.textSecondary }}>{recommendation.reason}</Text>
                <Text style={{ marginTop: 4, fontSize: 11, fontWeight: "700", color: colors.orange }}>
                  Focus: {recommendation.focusText}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {activeHistory.length > 0 ? (
          <Card>
            <SectionTitle title="Recent tutor sessions" />
            <View style={{ gap: 8 }}>
              {activeHistory.map((historyItem) => (
                <Pressable key={historyItem.sessionId} onPress={() => setActiveSessionId(historyItem.sessionId)}>
                  <Text style={{ fontSize: 12, fontWeight: "800", color: colors.text }}>{historyItem.title}</Text>
                  <Text style={{ marginTop: 2, fontSize: 11, color: colors.textSecondary }}>{historyItem.preview}</Text>
                </Pressable>
              ))}
            </View>
          </Card>
        ) : null}

        {sessionState ? (
          <>
            <Card>
              <SectionTitle title="Lesson packet" />
              <Text style={{ fontSize: 14, fontWeight: "900", color: colors.text }}>
                {sessionState.recommendation?.title || "Current focus"}
              </Text>
              <Text style={{ marginTop: 8, fontSize: 13, lineHeight: 20, color: colors.textSecondary }}>
                {sessionState.lessonBody || "The tutor will place the grounded lesson body here."}
              </Text>
              {!!sessionState.lessonPlan?.length && (
                <View style={{ marginTop: 12, gap: 8 }}>
                  {sessionState.lessonPlan.map((step) => (
                    <View key={step} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                      <MaterialCommunityIcons name="check-circle-outline" size={16} color={colors.indigo} />
                      <Text style={{ flex: 1, fontSize: 12, color: colors.textSecondary }}>{step}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>

            {!!questionList.length && (
              <Card>
                <SectionTitle title="Practice round" />
                <View style={{ gap: 12 }}>
                  {questionList.map((question, index) => (
                    <View key={question.id}>
                      <Pill label={`Question ${index + 1}`} backgroundColor={colors.paleBlue} color={colors.blueDeep} />
                      <Text style={{ marginTop: 8, fontSize: 13, fontWeight: "800", color: colors.text }}>
                        {question.question}
                      </Text>
                      <TextInput
                        multiline
                        value={answers[question.id] || ""}
                        onChangeText={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))}
                        placeholder={question.hint || "Type your answer"}
                        placeholderTextColor={colors.muted}
                        style={{
                          minHeight: 86,
                          marginTop: 10,
                          borderRadius: 14,
                          borderWidth: 1,
                          borderColor: colors.border,
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          color: colors.text,
                          textAlignVertical: "top",
                        }}
                      />
                    </View>
                  ))}
                </View>
                <Pressable
                  onPress={() => void handleSubmitAnswers()}
                  style={{
                    marginTop: 14,
                    borderRadius: 16,
                    backgroundColor: colors.indigo,
                    alignItems: "center",
                    paddingVertical: 12,
                  }}
                >
                  <Text style={{ color: colors.white, fontWeight: "800" }}>{working ? "Checking..." : "Check Answers"}</Text>
                </Pressable>
              </Card>
            )}

            <Card>
              <SectionTitle title="Tutor conversation" />
              <View style={{ gap: 10 }}>
                {(sessionQuery.data?.messages ?? []).map((messageItem) => (
                  <View key={messageItem.id} style={{ gap: 6 }}>
                    {messageItem.userText ? (
                      <View style={{ alignSelf: "flex-end", maxWidth: "86%", borderRadius: 16, backgroundColor: colors.paleIndigo, padding: 12 }}>
                        <Text style={{ color: colors.text }}>{messageItem.userText}</Text>
                      </View>
                    ) : null}
                    {messageItem.assistantText ? (
                      <View style={{ maxWidth: "92%", borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, padding: 12 }}>
                        <Text style={{ color: colors.textSecondary, lineHeight: 19 }}>{messageItem.assistantText}</Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
              <View style={{ marginTop: 14, flexDirection: "row", gap: 10 }}>
                <TextInput
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Ask a follow-up question"
                  placeholderTextColor={colors.muted}
                  style={{
                    flex: 1,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    color: colors.text,
                  }}
                />
                <Pressable
                  onPress={() => void handleSendMessage()}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    backgroundColor: colors.text,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MaterialCommunityIcons name="send" size={18} color={colors.white} />
                </Pressable>
              </View>
            </Card>
          </>
        ) : null}

        {!!error && (
          <Card style={{ backgroundColor: colors.paleRed }}>
            <Text style={{ color: colors.red, fontWeight: "700" }}>{error}</Text>
          </Card>
        )}
      </View>
    </ScreenScroll>
  );
}
