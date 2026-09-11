import { useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import {
  adminChatbotApi,
  resolveAdminActionRoute,
} from "../api/services/admin-chatbot";
import { toAppError } from "../api/http";
import {
  AdminButton,
  AdminChip,
  AdminDataRow,
  AdminEmpty,
  AdminField,
  AdminNotice,
  AdminScreen,
  AdminSection,
  adminTheme as theme,
} from "../components/admin/AdminMobilePrimitives";
import type { MainTabParamList } from "../navigation/types";
import type {
  AdminAnalyticsSessionMessage,
  AdminAssistantTimeRange,
} from "../types/admin-chatbot";

type Props = BottomTabScreenProps<MainTabParamList, "AdminChatbot">;

export function AdminChatbotScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AdminAnalyticsSessionMessage[]>([]);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [timeRange, setTimeRange] =
    useState<AdminAssistantTimeRange>("current_period");
  const [busy, setBusy] = useState(false);
  const health = useQuery({
    queryKey: ["admin-ai-health"],
    queryFn: () => adminChatbotApi.getHealth(),
  });
  const history = useQuery({
    queryKey: ["admin-ai-history"],
    queryFn: () => adminChatbotApi.getHistory(),
  });
  const selectedSummary = useMemo(
    () => history.data?.find((entry) => entry.sessionId === sessionId),
    [history.data, sessionId],
  );
  const openSession = async (id: string) => {
    try {
      setBusy(true);
      const session = await adminChatbotApi.getSession(id);
      setSessionId(session.sessionId);
      setTitle(session.title);
      setMessages(session.messages);
    } catch (error) {
      Alert.alert("Conversation unavailable", toAppError(error).message);
    } finally {
      setBusy(false);
    }
  };
  const send = async (prompt = message) => {
    if (!prompt.trim()) return;
    const now = new Date().toISOString();
    const local: AdminAnalyticsSessionMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content: prompt.trim(),
      createdAt: now,
    };
    try {
      setBusy(true);
      setMessages((current) => [...current, local]);
      setMessage("");
      const response = await adminChatbotApi.sendMessage({
        message: prompt.trim(),
        sessionId,
        scope: { timeRange },
      });
      setSessionId(response.sessionId);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: response.reply,
          createdAt: new Date().toISOString(),
          chart: response.chart,
          sources: response.sources,
          dataView: response.dataView,
          suggestedPrompts: response.suggestedPrompts,
          action: response.action,
          scope: response.scope,
        },
      ]);
      await queryClient.invalidateQueries({ queryKey: ["admin-ai-history"] });
    } catch (error) {
      Alert.alert("AI response failed", toAppError(error).message);
    } finally {
      setBusy(false);
    }
  };
  const rename = async () => {
    if (!sessionId || !title.trim()) return;
    try {
      await adminChatbotApi.renameSession(sessionId, title.trim());
      await history.refetch();
    } catch (error) {
      Alert.alert("Rename failed", toAppError(error).message);
    }
  };
  const remove = () => {
    if (!sessionId) return;
    Alert.alert(
      "Delete conversation?",
      "This removes the selected AI conversation history.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            void adminChatbotApi
              .deleteSession(sessionId)
              .then(() => {
                setSessionId(null);
                setMessages([]);
                setTitle("");
                return history.refetch();
              })
              .catch((error) =>
                Alert.alert("Delete failed", toAppError(error).message),
              ),
        },
      ],
    );
  };
  const followAction = (target: string) => {
    const route = resolveAdminActionRoute(target);
    if (route) navigation.navigate(route as never);
  };
  return (
    <AdminScreen
      title="AI Chatbot"
      subtitle="Assistive analytics; suggested actions only navigate to governed workspaces"
      refreshing={health.isRefetching || history.isRefetching}
      onRefresh={() => void Promise.all([health.refetch(), history.refetch()])}
    >
      {!health.data?.online ? (
        <AdminNotice
          title="AI is offline"
          description="Administrative records remain available. Retry diagnostics before relying on generated analysis."
          tone="amber"
        />
      ) : (
        <AdminNotice
          title={`AI online · ${health.data.model}`}
          description="Answers cite backend sources and never mutate official records."
          tone="green"
        />
      )}
      <AdminSection
        title="Scope"
        subtitle="Choose the evidence window for new questions"
      >
        <View
          style={{
            padding: 16,
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {(
            [
              ["current_period", "Current period"],
              ["last_7_days", "7 days"],
              ["last_30_days", "30 days"],
              ["all_available", "All available"],
            ] as Array<[AdminAssistantTimeRange, string]>
          ).map(([key, label]) => (
            <AdminChip
              key={key}
              label={label}
              active={timeRange === key}
              onPress={() => setTimeRange(key)}
            />
          ))}
        </View>
      </AdminSection>
      <AdminSection
        title="Conversations"
        subtitle="Open, rename, or delete a backend-owned session"
      >
        {(history.data ?? []).map((entry) => (
          <AdminDataRow
            key={entry.sessionId}
            title={entry.title}
            subtitle={entry.preview}
            meta={`${new Date(entry.updatedAt).toLocaleString()}${entry.messageCount ? ` · ${entry.messageCount} messages` : ""}`}
            status={sessionId === entry.sessionId ? "Open" : undefined}
            statusTone="primary"
            onPress={() => void openSession(entry.sessionId)}
          />
        ))}
        {!history.isLoading && !history.data?.length ? (
          <AdminEmpty
            title="No AI conversations"
            subtitle="Ask a governed administrative question below."
          />
        ) : null}
      </AdminSection>
      {sessionId ? (
        <AdminSection
          title="Session controls"
          subtitle={
            selectedSummary?.updatedAt
              ? `Updated ${new Date(selectedSummary.updatedAt).toLocaleString()}`
              : sessionId
          }
        >
          <View style={{ padding: 16, gap: 8 }}>
            <AdminField
              label="Conversation title"
              value={title}
              onChangeText={setTitle}
            />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <AdminButton label="Rename" onPress={() => void rename()} />
              <AdminButton label="Delete" tone="red" onPress={remove} />
            </View>
          </View>
        </AdminSection>
      ) : null}
      <AdminSection
        title={sessionId ? "Conversation" : "New conversation"}
        subtitle="Source links and data views are evidence, not automatic actions"
      >
        {messages.map((entry) => (
          <View
            key={entry.id}
            style={{
              padding: 16,
              borderTopWidth: 1,
              borderTopColor: theme.border,
              backgroundColor:
                entry.role === "assistant" ? theme.surface : theme.primarySoft,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: "900",
                color: theme.muted,
                textTransform: "uppercase",
              }}
            >
              {entry.role}
            </Text>
            <Text
              selectable
              style={{
                marginTop: 6,
                color: theme.text,
                fontSize: 14,
                lineHeight: 21,
              }}
            >
              {entry.content}
            </Text>
            {entry.chart ? (
              <View style={{ marginTop: 10 }}>
                <Text style={{ fontWeight: "900", color: theme.text }}>
                  {entry.chart.title}
                </Text>
                {entry.chart.labels.map((label, index) => (
                  <Text
                    key={`${label}-${index}`}
                    style={{ color: theme.subtext, marginTop: 4 }}
                  >
                    {label}:{" "}
                    {entry.chart?.series
                      .map(
                        (series) => `${series.name} ${series.data[index] ?? 0}`,
                      )
                      .join(" · ")}
                  </Text>
                ))}
              </View>
            ) : null}
            {entry.dataView ? (
              <View style={{ marginTop: 10 }}>
                <Text style={{ fontWeight: "900", color: theme.text }}>
                  {entry.dataView.title}
                </Text>
                {entry.dataView.rows.map((row, index) => (
                  <Text
                    key={index}
                    style={{ color: theme.subtext, marginTop: 4 }}
                  >
                    {row.join(" · ")}
                  </Text>
                ))}
                {entry.dataView.truncated ? (
                  <Text style={{ color: theme.amber, marginTop: 6 }}>
                    Truncated: open the destination for complete records.
                  </Text>
                ) : null}
              </View>
            ) : null}
            {entry.sources?.map((source) => (
              <Text
                key={source.source}
                selectable
                style={{ marginTop: 8, color: theme.primary, fontSize: 12 }}
              >
                Source: {source.label ?? source.source}
                {source.truncated ? " · truncated" : ""}
              </Text>
            ))}
            {entry.action ? (
              <AdminButton
                label={entry.action.label}
                icon="arrow-right"
                variant="text"
                onPress={() => followAction(entry.action?.target ?? "")}
              />
            ) : null}
            {entry.suggestedPrompts?.map((prompt) => (
              <Pressable
                key={prompt}
                accessibilityRole="button"
                accessibilityLabel={`Ask ${prompt}`}
                onPress={() => void send(prompt)}
                style={{
                  minHeight: 48,
                  justifyContent: "center",
                  marginTop: 6,
                }}
              >
                <Text style={{ color: theme.primary, fontWeight: "800" }}>
                  {prompt}
                </Text>
              </Pressable>
            ))}
          </View>
        ))}
        <View style={{ padding: 16, gap: 10 }}>
          <AdminField
            label="Administrative question"
            value={message}
            onChangeText={setMessage}
            placeholder="Which classes need attention this period?"
            multiline
          />
          <AdminButton
            label={busy ? "Analyzing…" : "Send question"}
            icon="send"
            tone="green"
            disabled={busy || !message.trim()}
            onPress={() => void send()}
          />
        </View>
      </AdminSection>
    </AdminScreen>
  );
}
