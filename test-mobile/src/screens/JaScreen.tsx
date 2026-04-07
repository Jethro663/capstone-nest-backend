import { useEffect, useMemo, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Pressable, Text, TextInput, View } from "react-native";
import {
  Card,
  EmptyState,
  GradientHeader,
  Pill,
  Refreshable,
  ScreenScroll,
  SectionTitle,
} from "../components/ui/primitives";
import { toAppError } from "../api/http";
import { useJaHub, useLxpEligibility, useLxpPlaylist } from "../api/hooks";
import { jaApi } from "../api/services/ja";
import { useAuth } from "../providers/AuthProvider";
import type { MainTabParamList } from "../navigation/types";
import { colors, gradients, shadow } from "../theme/tokens";

type Props = BottomTabScreenProps<MainTabParamList, "JA">;
type JaMiniTab = "chatbot" | "lxp";

export function JaScreen(_: Props) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<JaMiniTab>("chatbot");
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>();
  const [threadId, setThreadId] = useState<string | undefined>();
  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; role: "student" | "assistant"; content: string }>>([]);
  const [showLxpLockedModal, setShowLxpLockedModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const jaHubQuery = useJaHub(selectedClassId);
  const eligibilityQuery = useLxpEligibility();
  const playlistQuery = useLxpPlaylist(selectedClassId);

  useEffect(() => {
    if (selectedClassId || !jaHubQuery.data?.classes.length) return;
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

  const eligibleClassIds = useMemo(
    () => new Set((eligibilityQuery.data?.eligibleClasses ?? []).map((entry) => entry.classId)),
    [eligibilityQuery.data?.eligibleClasses],
  );
  const lxpEnabled = Boolean(selectedClassId && eligibleClassIds.has(selectedClassId));

  const openLxpTab = () => {
    if (lxpEnabled) {
      setActiveTab("lxp");
      return;
    }
    setShowLxpLockedModal(true);
  };

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
      const sent = await jaApi.sendAskMessage(resolvedThreadId, message.trim());
      setChatMessages((current) => [
        ...current,
        { id: `local-${Date.now()}`, role: "student", content: message.trim() },
        sent.message,
      ]);
      setMessage("");
    } catch (error) {
      setChatError(toAppError(error).message);
    } finally {
      setSending(false);
    }
  };

  const refreshing = jaHubQuery.isRefetching || eligibilityQuery.isRefetching || playlistQuery.isRefetching;

  return (
    <ScreenScroll
      refreshControl={
        <Refreshable
          refreshing={refreshing}
          onRefresh={() => {
            void Promise.all([jaHubQuery.refetch(), eligibilityQuery.refetch(), playlistQuery.refetch()]);
          }}
        />
      }
    >
      <GradientHeader colors={gradients.ja} eyebrow={`Hi ${user?.firstName || "Student"} 👋`} title="JA">
        <Text style={{ marginTop: 10, color: "rgba(255,255,255,0.84)", fontSize: 12 }}>
          AI Chatbot and Learner Path now live in one mission control.
        </Text>
      </GradientHeader>

      <View style={{ paddingHorizontal: 20, marginTop: 20, gap: 14 }}>
        <Card>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={() => setActiveTab("chatbot")}
              style={{
                flex: 1,
                borderRadius: 999,
                alignItems: "center",
                paddingVertical: 10,
                backgroundColor: activeTab === "chatbot" ? colors.indigo : colors.paleIndigo,
              }}
            >
              <Text style={{ color: activeTab === "chatbot" ? colors.white : colors.indigo, fontSize: 12, fontWeight: "800" }}>
                AI Chatbot
              </Text>
            </Pressable>
            <Pressable
              onPress={openLxpTab}
              style={{
                flex: 1,
                borderRadius: 999,
                alignItems: "center",
                paddingVertical: 10,
                backgroundColor: activeTab === "lxp" ? colors.amber : colors.paleAmber,
                opacity: lxpEnabled || activeTab === "lxp" ? 1 : 0.82,
              }}
            >
              <Text style={{ color: activeTab === "lxp" ? colors.white : colors.orange, fontSize: 12, fontWeight: "800" }}>
                Learner Path (LXP)
              </Text>
            </Pressable>
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
          <EmptyState emoji="🤖" title="Loading JA classes" subtitle="Fetching your class context..." />
        )}

        {activeTab === "chatbot" ? (
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
                  <MaterialCommunityIcons name="robot-happy" size={24} color={colors.orange} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "900", color: "#92400E" }}>Class-safe AI chatbot</Text>
                  <Text style={{ marginTop: 4, fontSize: 12, color: "#92400E" }}>
                    Ask JA about lessons, weak topics, and review strategy based on your class context.
                  </Text>
                </View>
              </View>
              {jaHubQuery.data?.practice.recommendations?.[0] ? (
                <View style={{ marginTop: 10 }}>
                  <Pill label="Suggested focus" backgroundColor={colors.paleAmber} color={colors.orange} />
                  <Text style={{ marginTop: 8, fontSize: 12, color: colors.textSecondary }}>
                    {jaHubQuery.data.practice.recommendations[0].reason}
                  </Text>
                </View>
              ) : null}
            </Card>

            <Card>
              <SectionTitle title="Chat" />
              {chatMessages.length === 0 ? (
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  No thread yet. Ask JA to explain a topic in simpler terms or to generate quick practice prompts.
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
                  placeholder="Ask JA anything class-grounded..."
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
        ) : (
          <Card>
            <SectionTitle title="Learner Path" />
            {!lxpEnabled ? (
              <EmptyState
                emoji="🔒"
                title="Not unlocked yet"
                subtitle="Keep building momentum first. Learner Path opens once your class qualifies."
              />
            ) : (
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>Checkpoint progress</Text>
                  <Pill
                    label={`${playlistQuery.data?.progress.completionPercent ?? 0}%`}
                    backgroundColor={colors.paleIndigo}
                    color={colors.indigo}
                  />
                </View>
                {(playlistQuery.data?.checkpoints ?? []).length === 0 ? (
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    No checkpoints available for this class yet.
                  </Text>
                ) : (
                  playlistQuery.data?.checkpoints.map((checkpoint) => (
                    <View
                      key={checkpoint.id}
                      style={{
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: colors.border,
                        padding: 12,
                        backgroundColor: checkpoint.isCompleted ? colors.paleGreen : colors.white,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "800", color: colors.text }}>{checkpoint.label}</Text>
                      <Text style={{ marginTop: 4, fontSize: 11, color: colors.textSecondary }}>
                        {checkpoint.isCompleted ? "Completed" : `+${checkpoint.xpAwarded} XP waiting`}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            )}
          </Card>
        )}
      </View>

      {showLxpLockedModal ? (
        <View
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 24,
            backgroundColor: "rgba(15, 23, 42, 0.35)",
          }}
        >
          <View style={{ width: "100%", borderRadius: 20, backgroundColor: colors.white, padding: 20 }}>
            <Text style={{ fontSize: 22 }}>🤖</Text>
            <Text style={{ marginTop: 8, fontSize: 17, fontWeight: "900", color: colors.text }}>
              Learner Path is still locked
            </Text>
            <Text style={{ marginTop: 8, fontSize: 13, lineHeight: 20, color: colors.textSecondary }}>
              Not yet, champion. Keep learning and JA will unlock this mode when it matters most.
            </Text>
            <Pressable
              onPress={() => setShowLxpLockedModal(false)}
              style={{
                marginTop: 14,
                borderRadius: 14,
                backgroundColor: colors.text,
                alignItems: "center",
                paddingVertical: 12,
              }}
            >
              <Text style={{ color: colors.white, fontWeight: "800" }}>Got it</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </ScreenScroll>
  );
}
