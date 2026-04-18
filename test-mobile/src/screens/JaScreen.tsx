import { useEffect, useMemo, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, TextInput, View } from "react-native";
import { toAppError } from "../api/http";
import { useJaHub } from "../api/hooks";
import { jaApi } from "../api/services/ja";
import { Card, EmptyState, GradientHeader, Pill, Refreshable, ScreenScroll, SectionTitle } from "../components/ui/primitives";
import { useAuth } from "../providers/AuthProvider";
import { colors, gradients, shadow } from "../theme/tokens";

type Props = {
  navigation: {
    navigate: (routeName: never, params?: never) => void;
  };
};
type JaMiniTab = "practice" | "ask" | "review";

export function JaScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<JaMiniTab>("ask");
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>();
  const [threadId, setThreadId] = useState<string | undefined>();
  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; role: "student" | "assistant"; content: string }>>([]);
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const jaHubQuery = useJaHub(selectedClassId);

  useEffect(() => {
    if (selectedClassId || !jaHubQuery.data?.classes.length) {
      return;
    }

    setSelectedClassId(jaHubQuery.data.selectedClassId || jaHubQuery.data.classes[0].id);
  }, [jaHubQuery.data, selectedClassId]);

  useEffect(() => {
    if (!threadId) {
      setChatMessages([]);
      return;
    }

    void (async () => {
      try {
        const thread = await jaApi.getAskThread(threadId);
        setChatMessages(thread.messages);
      } catch (error) {
        setChatError(toAppError(error).message);
      }
    })();
  }, [threadId]);

  useEffect(() => {
    setThreadId(jaHubQuery.data?.ask.threads[0]?.id);
    setChatMessages([]);
    setChatError(null);
  }, [selectedClassId, jaHubQuery.data?.ask.threads]);

  const practiceRecommendations = jaHubQuery.data?.practice.recommendations ?? [];
  const practiceSessions = jaHubQuery.data?.practice.sessions ?? [];
  const reviewSessions = jaHubQuery.data?.review.sessions ?? [];
  const askThreads = jaHubQuery.data?.ask.threads ?? [];

  const headlineRecommendation = useMemo(
    () => practiceRecommendations[0],
    [practiceRecommendations],
  );

  const sendChatMessage = async () => {
    if (!selectedClassId || !message.trim()) return;

    try {
      setSending(true);
      setChatError(null);

      let resolvedThreadId = threadId;
      if (!resolvedThreadId) {
        const created = await jaApi.createAskThread({ classId: selectedClassId });
        resolvedThreadId = created.thread.id;
        setThreadId(resolvedThreadId);
      }

      const trimmedMessage = message.trim();
      const sent = await jaApi.sendAskMessage(resolvedThreadId, trimmedMessage);
      setChatMessages((current) => [
        ...current,
        { id: `local-${Date.now()}`, role: "student", content: trimmedMessage },
        sent.message,
      ]);
      setMessage("");
    } catch (error) {
      setChatError(toAppError(error).message);
    } finally {
      setSending(false);
    }
  };

  const openTutor = () => {
    navigation.navigate("AiTutor" as never, (selectedClassId ? { classId: selectedClassId } : undefined) as never);
  };

  const openAssessmentHistory = () => {
    navigation.navigate(
      "AssessmentHistory" as never,
      (selectedClassId ? { classId: selectedClassId } : undefined) as never,
    );
  };

  return (
    <ScreenScroll
      refreshControl={
        <Refreshable
          refreshing={jaHubQuery.isRefetching}
          onRefresh={() => {
            void jaHubQuery.refetch();
          }}
        />
      }
    >
      <GradientHeader colors={gradients.ja} eyebrow={`Hi ${user?.firstName || "Student"} 👋`} title="JA Hub">
        <Text style={{ marginTop: 10, color: "rgba(255,255,255,0.84)", fontSize: 12 }}>
          Practice, ask questions, and revisit weak areas with class-grounded AI support.
        </Text>
      </GradientHeader>

      <View style={{ paddingHorizontal: 20, marginTop: 20, gap: 14 }}>
        <Card>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {([
              { key: "practice", label: "Practice", activeColor: colors.orange, idleColor: colors.paleAmber },
              { key: "ask", label: "Ask", activeColor: colors.indigo, idleColor: colors.paleIndigo },
              { key: "review", label: "Review", activeColor: colors.green, idleColor: colors.paleGreen },
            ] as const).map((tab) => (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={{
                  flex: 1,
                  borderRadius: 999,
                  alignItems: "center",
                  paddingVertical: 10,
                  backgroundColor: activeTab === tab.key ? tab.activeColor : tab.idleColor,
                }}
              >
                <Text
                  style={{
                    color: activeTab === tab.key ? colors.white : colors.text,
                    fontSize: 12,
                    fontWeight: "800",
                  }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>

        <Card>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Pill label={`${practiceRecommendations.length} recommendations`} backgroundColor={colors.paleAmber} color={colors.orange} />
            <Pill label={`${askThreads.length} ask threads`} backgroundColor={colors.paleIndigo} color={colors.indigo} />
            <Pill label={`${reviewSessions.length} review sessions`} backgroundColor={colors.paleGreen} color={colors.green} />
          </View>
        </Card>

        {jaHubQuery.data?.classes.length ? (
          <Card>
            <SectionTitle title="Class Context" />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {jaHubQuery.data.classes.map((classItem) => (
                <Pressable
                  key={classItem.id}
                  onPress={() => setSelectedClassId(classItem.id)}
                  style={{
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: classItem.id === selectedClassId ? colors.indigo : colors.border,
                    backgroundColor: classItem.id === selectedClassId ? colors.paleIndigo : colors.white,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: "800", color: colors.text }}>
                    {classItem.subjectName} ({classItem.subjectCode})
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>
        ) : (
          <EmptyState emoji="🤖" title="Loading JA classes" subtitle="Fetching your class-grounded JA hub..." />
        )}

        {activeTab === "practice" ? (
          <>
            <Card style={{ backgroundColor: "#FFF8E7" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 999,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#FDE68A",
                  }}
                >
                  <MaterialCommunityIcons name="sword-cross" size={24} color={colors.orange} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "900", color: "#92400E" }}>Practice missions</Text>
                  <Text style={{ marginTop: 4, fontSize: 12, color: "#92400E" }}>
                    {headlineRecommendation?.reason || "JA uses your class context to surface grounded practice priorities."}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={openTutor}
                style={{
                  marginTop: 14,
                  alignSelf: "flex-start",
                  borderRadius: 999,
                  backgroundColor: colors.orange,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <MaterialCommunityIcons name="rocket-launch" size={14} color={colors.white} />
                <Text style={{ color: colors.white, fontSize: 13, fontWeight: "800" }}>Open tutor practice</Text>
              </Pressable>
            </Card>

            {practiceRecommendations.length === 0 ? (
              <EmptyState
                emoji="🎯"
                title="No practice recommendations yet"
                subtitle="JA will show practice missions here once the backend has enough signal for your selected class."
              />
            ) : (
              <View style={{ gap: 10 }}>
                {practiceRecommendations.map((recommendation) => (
                  <Card key={recommendation.id}>
                    <Text style={{ fontSize: 13, fontWeight: "900", color: colors.text }}>{recommendation.title}</Text>
                    <Text style={{ marginTop: 6, fontSize: 12, lineHeight: 18, color: colors.textSecondary }}>
                      {recommendation.reason}
                    </Text>
                    <Text style={{ marginTop: 6, fontSize: 11, fontWeight: "800", color: colors.orange }}>
                      Focus: {recommendation.focusText}
                    </Text>
                  </Card>
                ))}
              </View>
            )}

            <Card>
              <SectionTitle title="Session history" />
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                {practiceSessions.length
                  ? `${practiceSessions.length} practice session${practiceSessions.length === 1 ? "" : "s"} recorded for this class.`
                  : "No practice sessions have been recorded for this class yet."}
              </Text>
            </Card>
          </>
        ) : null}

        {activeTab === "ask" ? (
          <>
            <Card style={{ backgroundColor: "#EEF2FF" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 999,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#C7D2FE",
                  }}
                >
                  <MaterialCommunityIcons name="robot-happy" size={24} color={colors.indigo} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "900", color: colors.indigo }}>Ask Nexora</Text>
                  <Text style={{ marginTop: 4, fontSize: 12, color: colors.indigo }}>
                    Ask class-safe questions about lessons, weak topics, and study strategy for the selected class.
                  </Text>
                </View>
              </View>
            </Card>

            {askThreads.length ? (
              <Card>
                <SectionTitle title="Recent threads" />
                <View style={{ gap: 8 }}>
                  {askThreads.map((thread) => (
                    <Pressable
                      key={thread.id}
                      onPress={() => setThreadId(thread.id)}
                      style={{
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: thread.id === threadId ? colors.indigo : colors.border,
                        backgroundColor: thread.id === threadId ? colors.paleIndigo : colors.white,
                        padding: 12,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "800", color: colors.text }}>
                        {thread.title || "Untitled ask thread"}
                      </Text>
                      <Text style={{ marginTop: 4, fontSize: 11, color: colors.textSecondary }}>
                        {new Date(thread.updatedAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </Card>
            ) : null}

            <Card>
              <SectionTitle title="Chat" />
              {chatMessages.length === 0 ? (
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  No thread yet. Ask a question about your lesson or the topic you want to review.
                </Text>
              ) : (
                <View style={{ gap: 8 }}>
                  {chatMessages.slice(-8).map((entry) => (
                    <View
                      key={entry.id}
                      style={{
                        alignSelf: entry.role === "student" ? "flex-end" : "flex-start",
                        maxWidth: "90%",
                        borderRadius: 14,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        backgroundColor: entry.role === "student" ? colors.paleIndigo : colors.white,
                        borderWidth: entry.role === "student" ? 0 : 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Text style={{ fontSize: 12, color: colors.text }}>{entry.content}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={{ marginTop: 12, flexDirection: "row", gap: 8 }}>
                <TextInput
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Ask a question about your lesson"
                  placeholderTextColor={colors.muted}
                  style={{
                    flex: 1,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    color: colors.text,
                  }}
                />
                <Pressable
                  onPress={() => void sendChatMessage()}
                  style={[
                    {
                      width: 46,
                      height: 46,
                      borderRadius: 14,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: colors.indigo,
                    },
                    shadow.card,
                  ]}
                >
                  <MaterialCommunityIcons name="send" size={16} color={colors.white} />
                </Pressable>
              </View>
              {sending ? <Text style={{ marginTop: 8, fontSize: 11, color: colors.textSecondary }}>JA is thinking...</Text> : null}
              {chatError ? <Text style={{ marginTop: 8, fontSize: 11, color: colors.red }}>{chatError}</Text> : null}
            </Card>
          </>
        ) : null}

        {activeTab === "review" ? (
          <>
            <Card style={{ backgroundColor: "#ECFDF3" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 999,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#BBF7D0",
                  }}
                >
                  <MaterialCommunityIcons name="history" size={24} color={colors.green} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "900", color: colors.green }}>Review weak areas</Text>
                  <Text style={{ marginTop: 4, fontSize: 12, color: colors.green }}>
                    Revisit past assessment attempts and recent JA review sessions for this class.
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={openAssessmentHistory}
                style={{
                  marginTop: 14,
                  alignSelf: "flex-start",
                  borderRadius: 999,
                  backgroundColor: colors.green,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <MaterialCommunityIcons name="clipboard-search" size={14} color={colors.white} />
                <Text style={{ color: colors.white, fontSize: 13, fontWeight: "800" }}>Open assessment history</Text>
              </Pressable>
            </Card>

            <Card>
              <SectionTitle title="Review session history" />
              {reviewSessions.length === 0 ? (
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  No JA review sessions have been recorded for this class yet.
                </Text>
              ) : (
                <View style={{ gap: 8 }}>
                  {reviewSessions.map((session, index) => (
                    <View
                      key={`${session.id}-${index}`}
                      style={{
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: colors.border,
                        padding: 12,
                        backgroundColor: colors.white,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "800", color: colors.text }}>
                        Review session {index + 1}
                      </Text>
                      <Text style={{ marginTop: 4, fontSize: 11, color: colors.textSecondary }}>
                        Session ID: {session.id}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          </>
        ) : null}
      </View>
    </ScreenScroll>
  );
}
