import { useEffect, useMemo, useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import { Linking, Pressable, Text, View } from "react-native";
import {
  useDiscussionCreateThreadMutation,
  useDiscussionDeleteCommentMutation,
  useDiscussionReportCommentMutation,
  useDiscussionThread,
  useDiscussionThreadActionMutation,
  useDiscussionThreads,
} from "../../api/hooks";
import { peekAppError, toAppError } from "../../api/http";
import { discussionBoardApi } from "../../api/services/discussion-board";
import type {
  DiscussionAttachmentResource,
  DiscussionComment,
  DiscussionCommentReportReason,
  DiscussionThreadSummary,
} from "../../types/discussion";
import {
  TeacherActionButton,
  TeacherChip,
  TeacherEmpty,
  TeacherInlineField,
  TeacherPanel,
  TeacherSearch,
  stripRichText,
  teacherTheme as theme,
} from "./TeacherMobilePrimitives";

type ThreadStatusFilter = "all" | "draft" | "published" | "closed" | "archived";

type AttachmentDraft = {
  uri: string;
  name: string;
  type?: string | null;
};

type Props = {
  classId: string;
  registerRefetch?: (refetcher: () => Promise<unknown>) => void;
};

const THREAD_STATUS_FILTERS: ThreadStatusFilter[] = ["all", "published", "draft", "closed", "archived"];

const REPORT_REASON_OPTIONS: Array<{ value: DiscussionCommentReportReason; label: string }> = [
  { value: "inappropriate", label: "Inappropriate" },
  { value: "harassment", label: "Harassment" },
  { value: "spam", label: "Spam" },
  { value: "off_topic", label: "Off-topic" },
  { value: "academic_dishonesty", label: "Dishonesty" },
];

function formatDateTime(value?: string | null) {
  if (!value) return "No date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getAuthorName(author?: { firstName?: string; lastName?: string }) {
  const fullName = [author?.firstName || "", author?.lastName || ""].join(" ").trim();
  return fullName || "Unknown author";
}

function toPlainHtml(value: string) {
  const escaped = value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br />");
  return `<p>${escaped}</p>`;
}

function sortThreads(threads: DiscussionThreadSummary[]) {
  return [...threads].sort((left, right) => {
    if (left.isPinned !== right.isPinned) return left.isPinned ? -1 : 1;
    const leftTime = new Date(left.publishedAt || left.createdAt || 0).getTime();
    const rightTime = new Date(right.publishedAt || right.createdAt || 0).getTime();
    return rightTime - leftTime;
  });
}

function getThreadStatusStyle(status: DiscussionThreadSummary["status"]) {
  if (status === "published") {
    return { backgroundColor: theme.greenSoft, textColor: theme.green };
  }
  if (status === "draft") {
    return { backgroundColor: theme.amberSoft, textColor: theme.amber };
  }
  if (status === "closed") {
    return { backgroundColor: theme.purpleSoft, textColor: theme.purple };
  }
  return { backgroundColor: theme.redSoft, textColor: theme.red };
}

export function TeacherDiscussionBoard({ classId, registerRefetch }: Props) {
  const threadsQuery = useDiscussionThreads(classId);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const threadQuery = useDiscussionThread(classId, selectedThreadId ?? undefined);
  const createThreadMutation = useDiscussionCreateThreadMutation(classId);
  const threadActionMutation = useDiscussionThreadActionMutation(classId);
  const deleteCommentMutation = useDiscussionDeleteCommentMutation(classId, selectedThreadId ?? undefined);
  const reportCommentMutation = useDiscussionReportCommentMutation(classId, selectedThreadId ?? undefined);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ThreadStatusFilter>("all");
  const [showComposer, setShowComposer] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [commentLimit, setCommentLimit] = useState("1");
  const [allowComments, setAllowComments] = useState(true);
  const [isPinned, setIsPinned] = useState(false);
  const [linksText, setLinksText] = useState("");
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<DiscussionCommentReportReason>("off_topic");

  useEffect(() => {
    registerRefetch?.(async () => {
      const tasks: Array<Promise<unknown>> = [threadsQuery.refetch()];
      if (selectedThreadId) {
        tasks.push(threadQuery.refetch());
      }
      return Promise.all(tasks);
    });
  }, [registerRefetch, selectedThreadId, threadQuery, threadsQuery]);

  useEffect(() => {
    if (!selectedThreadId && (threadsQuery.data?.items?.length ?? 0) === 1) {
      setSelectedThreadId(threadsQuery.data?.items?.[0]?.id ?? null);
    }
  }, [selectedThreadId, threadsQuery.data?.items]);

  const threadItems = Array.isArray(threadsQuery.data?.items) ? threadsQuery.data.items : [];

  const filteredThreads = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return sortThreads(threadItems).filter((thread) => {
      if (statusFilter !== "all" && thread.status !== statusFilter) {
        return false;
      }
      if (!normalizedSearch) return true;
      const searchable = `${thread.title} ${stripRichText(thread.bodyHtml)} ${getAuthorName(thread.author)}`.toLowerCase();
      return searchable.includes(normalizedSearch);
    });
  }, [search, statusFilter, threadItems]);

  const selectedThread = threadQuery.data;
  const selectedThreadComments = Array.isArray(selectedThread?.comments) ? selectedThread.comments : [];
  const selectedThreadAttachments = Array.isArray(selectedThread?.attachments) ? selectedThread.attachments : [];

  const pickAttachments = async () => {
    try {
      setActionError(null);
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
        type: ["image/*", "application/pdf"],
      });
      if (result.canceled) return;
      setAttachments((current) => [
        ...current,
        ...result.assets.map((asset, index) => ({
          uri: asset.uri,
          name: asset.name || `thread-attachment-${current.length + index + 1}`,
          type: asset.mimeType,
        })),
      ]);
    } catch (error) {
      setActionError(toAppError(error).message);
    }
  };

  const resetComposer = () => {
    setTitle("");
    setBody("");
    setCommentLimit("1");
    setAllowComments(true);
    setIsPinned(false);
    setLinksText("");
    setAttachments([]);
    setActionError(null);
  };

  const createThread = async (publishAfterCreate: boolean) => {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle || !trimmedBody) {
      setActionError("Thread title and body are required.");
      return;
    }

    const parsedCommentLimit = Number.parseInt(commentLimit, 10);
    if (!Number.isFinite(parsedCommentLimit) || parsedCommentLimit < 1 || parsedCommentLimit > 20) {
      setActionError("Comment limit must be from 1 to 20.");
      return;
    }

    try {
      setActionError(null);
      const uploadedAttachmentIds = await Promise.all(
        attachments.map((file) => discussionBoardApi.uploadThreadAttachment(classId, file)),
      );
      const linkAttachments = linksText
        .split(/\r?\n/)
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((url) => ({ url }));

      const createdThread = await createThreadMutation.mutateAsync({
        title: trimmedTitle,
        bodyHtml: toPlainHtml(trimmedBody),
        commentLimitPerStudent: parsedCommentLimit,
        allowComments,
        isPinned,
        fileAttachmentIds: uploadedAttachmentIds.map((entry) => entry.id),
        linkAttachments,
      });

      if (publishAfterCreate) {
        await threadActionMutation.mutateAsync({ threadId: createdThread.id, action: "publish" });
      }

      resetComposer();
      setShowComposer(false);
      setSelectedThreadId(createdThread.id);
      await threadsQuery.refetch();
    } catch (error) {
      setActionError(toAppError(error).message);
    }
  };

  const handleThreadAction = async (
    threadId: string,
    action: "publish" | "close" | "reopen" | "archive",
  ) => {
    try {
      setActionError(null);
      await threadActionMutation.mutateAsync({ threadId, action });
      if (selectedThreadId === threadId) {
        if (action === "archive") {
          setSelectedThreadId(null);
        } else {
          await threadQuery.refetch();
        }
      }
    } catch (error) {
      setActionError(toAppError(error).message);
    }
  };

  const handleDeleteComment = async (comment: DiscussionComment) => {
    try {
      setActionError(null);
      await deleteCommentMutation.mutateAsync(comment.id);
      await threadQuery.refetch();
    } catch (error) {
      setActionError(toAppError(error).message);
    }
  };

  const handleReportComment = async (comment: DiscussionComment) => {
    try {
      setActionError(null);
      await reportCommentMutation.mutateAsync({
        commentId: comment.id,
        payload: { reasonCode: reportReason },
      });
    } catch (error) {
      setActionError(toAppError(error).message);
    }
  };

  const openAttachment = async (attachment: DiscussionAttachmentResource) => {
    try {
      setActionError(null);
      if (attachment.linkUrl) {
        await Linking.openURL(attachment.linkUrl);
        return;
      }
      const targetPath = attachment.inlineUrl || attachment.downloadUrl;
      if (!targetPath) return;
      await discussionBoardApi.openAttachment(
        targetPath,
        attachment.originalName || attachment.linkLabel || "discussion-attachment",
      );
    } catch (error) {
      setActionError(toAppError(error).message);
    }
  };

  const downloadAttachment = async (attachment: DiscussionAttachmentResource) => {
    try {
      setActionError(null);
      const targetPath = attachment.downloadUrl || attachment.inlineUrl;
      if (!targetPath) return;
      await discussionBoardApi.downloadAttachment(
        targetPath,
        attachment.originalName || attachment.linkLabel || "discussion-attachment",
      );
    } catch (error) {
      setActionError(toAppError(error).message);
    }
  };

  return (
    <View>
      <TeacherSearch value={search} onChangeText={setSearch} placeholder="Search threads, author, or content" />

      <View style={{ marginHorizontal: 16, marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {THREAD_STATUS_FILTERS.map((filterKey) => (
          <TeacherChip
            key={filterKey}
            label={filterKey === "all" ? "All" : filterKey[0].toUpperCase() + filterKey.slice(1)}
            active={statusFilter === filterKey}
            onPress={() => setStatusFilter(filterKey)}
          />
        ))}
      </View>

      <TeacherPanel
        title="Thread Composer"
        subtitle="Create a class discussion prompt and publish it when ready."
        action={
          <TeacherActionButton
            label={showComposer ? "Hide" : "New Thread"}
            icon={showComposer ? "chevron-up" : "plus"}
            tone={showComposer ? "neutral" : "red"}
            onPress={() => setShowComposer((current) => !current)}
          />
        }
      >
        {showComposer ? (
          <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
            <TeacherInlineField label="Thread title" value={title} onChangeText={setTitle} placeholder="Week 2 open forum" />
            <TeacherInlineField
              label="Discussion prompt"
              value={body}
              onChangeText={setBody}
              placeholder="Write thread details and class prompt"
              multiline
            />
            <TeacherInlineField
              label="Comment limit per student"
              value={commentLimit}
              onChangeText={setCommentLimit}
              placeholder="1 to 20"
            />
            <TeacherInlineField
              label="Optional links (one URL per line)"
              value={linksText}
              onChangeText={setLinksText}
              placeholder="https://example.com/reference"
              multiline
            />

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              <TeacherActionButton
                label={allowComments ? "Comments Open" : "Comments Closed"}
                icon="comment-check-outline"
                tone={allowComments ? "green" : "neutral"}
                onPress={() => setAllowComments((current) => !current)}
              />
              <TeacherActionButton
                label={isPinned ? "Pinned" : "Pin Thread"}
                icon="pin-outline"
                tone={isPinned ? "amber" : "neutral"}
                onPress={() => setIsPinned((current) => !current)}
              />
              <TeacherActionButton label="Add Files" icon="paperclip" tone="blue" onPress={() => void pickAttachments()} />
            </View>

            {attachments.length ? (
              <View style={{ marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {attachments.map((attachment, index) => (
                  <Pressable
                    key={`${attachment.uri}-${index}`}
                    onPress={() => setAttachments((current) => current.filter((entry) => entry.uri !== attachment.uri))}
                    style={{
                      borderRadius: 999,
                      backgroundColor: theme.blueSoft,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: "700", color: theme.blue }}>
                      {attachment.name} x
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              <TeacherActionButton
                label={createThreadMutation.isPending ? "Saving..." : "Save Draft"}
                icon="content-save-outline"
                tone="neutral"
                disabled={createThreadMutation.isPending || threadActionMutation.isPending}
                onPress={() => void createThread(false)}
              />
              <TeacherActionButton
                label={createThreadMutation.isPending || threadActionMutation.isPending ? "Publishing..." : "Publish"}
                icon="send-check-outline"
                tone="green"
                disabled={createThreadMutation.isPending || threadActionMutation.isPending}
                onPress={() => void createThread(true)}
              />
              <TeacherActionButton label="Reset" icon="refresh" tone="purple" onPress={resetComposer} />
            </View>
          </View>
        ) : null}
      </TeacherPanel>

      {actionError ? (
        <TeacherPanel title="Discussion Action Failed" subtitle={actionError}>
          <View />
        </TeacherPanel>
      ) : null}

      {threadsQuery.error ? (
        <TeacherPanel title="Thread list unavailable" subtitle={peekAppError(threadsQuery.error).message}>
          <View />
        </TeacherPanel>
      ) : null}

      <TeacherPanel
        title={`Thread List (${filteredThreads.length})`}
        subtitle="Open a thread to moderate comments, publish, close, reopen, or archive."
        action={
          <TeacherActionButton
            label={threadsQuery.isRefetching || threadQuery.isRefetching ? "Refreshing..." : "Refresh"}
            icon="refresh"
            tone="blue"
            disabled={threadsQuery.isRefetching || threadQuery.isRefetching}
            onPress={() => {
              void Promise.all([threadsQuery.refetch(), selectedThreadId ? threadQuery.refetch() : Promise.resolve()]);
            }}
          />
        }
      >
        {filteredThreads.length ? (
          filteredThreads.map((thread) => {
            const statusStyle = getThreadStatusStyle(thread.status);
            return (
              <View key={thread.id} style={{ borderTopWidth: 1, borderTopColor: theme.border, paddingHorizontal: 14, paddingVertical: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: theme.text }}>{thread.title}</Text>
                  <Text style={{ marginTop: 3, fontSize: 11, color: theme.muted }}>
                    {getAuthorName(thread.author)} - {formatDateTime(thread.publishedAt || thread.createdAt)}
                  </Text>
                </View>
                <View
                  style={{
                    borderRadius: 999,
                    backgroundColor: statusStyle.backgroundColor,
                    paddingHorizontal: 9,
                    paddingVertical: 5,
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: "700", color: statusStyle.textColor }}>
                    {thread.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text style={{ marginTop: 7, fontSize: 12, lineHeight: 18, color: "#B8B8B8" }} numberOfLines={3}>
                {stripRichText(thread.bodyHtml)}
              </Text>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                <TeacherActionButton
                  label={selectedThreadId === thread.id ? "Opened" : "Open"}
                  icon="eye-outline"
                  tone="blue"
                  onPress={() => setSelectedThreadId(thread.id)}
                />
                {thread.status === "draft" ? (
                  <TeacherActionButton
                    label="Publish"
                    icon="send"
                    tone="green"
                    disabled={threadActionMutation.isPending}
                    onPress={() => void handleThreadAction(thread.id, "publish")}
                  />
                ) : null}
                {thread.status === "published" ? (
                  <TeacherActionButton
                    label="Close"
                    icon="comment-off-outline"
                    tone="amber"
                    disabled={threadActionMutation.isPending}
                    onPress={() => void handleThreadAction(thread.id, "close")}
                  />
                ) : null}
                {thread.status === "closed" ? (
                  <TeacherActionButton
                    label="Reopen"
                    icon="comment-check-outline"
                    tone="purple"
                    disabled={threadActionMutation.isPending}
                    onPress={() => void handleThreadAction(thread.id, "reopen")}
                  />
                ) : null}
                <TeacherActionButton
                  label="Archive"
                  icon="archive-outline"
                  tone="neutral"
                  disabled={threadActionMutation.isPending}
                  onPress={() => void handleThreadAction(thread.id, "archive")}
                />
              </View>
              </View>
            );
          })
        ) : (
          <TeacherEmpty
            title="No discussion threads"
            subtitle="Create and publish a thread so students can start participating from web and mobile."
            icon="forum-outline"
          />
        )}
      </TeacherPanel>

      {selectedThreadId ? (
        <TeacherPanel
          title={selectedThread?.title || "Thread detail"}
          subtitle={
            selectedThread
              ? `${selectedThreadComments.length} comments - ${selectedThread.allowComments ? "Comments open" : "Comments disabled"}`
              : "Loading thread detail"
          }
          action={
            <TeacherActionButton
              label="Close"
              icon="close"
              tone="neutral"
              onPress={() => setSelectedThreadId(null)}
            />
          }
        >
          {threadQuery.error ? (
            <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
              <Text style={{ fontSize: 12, color: "#FF9CAA" }}>{peekAppError(threadQuery.error).message}</Text>
            </View>
          ) : null}

          {selectedThread ? (
            <>
              <View style={{ paddingHorizontal: 14, paddingBottom: 12, borderTopWidth: 1, borderTopColor: theme.border }}>
                <Text style={{ marginTop: 10, fontSize: 12, lineHeight: 18, color: "#C9C9C9" }}>
                  {stripRichText(selectedThread.bodyHtml)}
                </Text>

                {selectedThreadAttachments.map((attachment) => (
                  <View
                    key={attachment.id}
                    style={{
                      marginTop: 8,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor: theme.active,
                      paddingHorizontal: 11,
                      paddingVertical: 9,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "700", color: theme.text }}>
                      {attachment.originalName || attachment.linkLabel || "Attachment"}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                      <TeacherActionButton label="Open" icon="open-in-new" tone="blue" onPress={() => void openAttachment(attachment)} />
                      <TeacherActionButton label="Download" icon="download" tone="neutral" onPress={() => void downloadAttachment(attachment)} />
                    </View>
                  </View>
                ))}
              </View>

              <View style={{ paddingHorizontal: 14, paddingBottom: 10, borderTopWidth: 1, borderTopColor: theme.border }}>
                <Text style={{ marginTop: 10, fontSize: 10, fontWeight: "700", letterSpacing: 0.7, textTransform: "uppercase", color: theme.muted }}>
                  Report reason
                </Text>
                <View style={{ marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {REPORT_REASON_OPTIONS.map((option) => (
                    <TeacherChip
                      key={option.value}
                      label={option.label}
                      active={reportReason === option.value}
                      onPress={() => setReportReason(option.value)}
                    />
                  ))}
                </View>
              </View>

              {selectedThreadComments.length ? (
                selectedThreadComments.map((comment) => {
                  const commentAttachments = Array.isArray(comment.attachments) ? comment.attachments : [];
                  return (
                    <View
                      key={comment.id}
                      style={{
                        borderTopWidth: 1,
                        borderTopColor: theme.border,
                        paddingHorizontal: 14,
                        paddingVertical: 11,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "700", color: theme.text }}>
                        {getAuthorName(comment.author)} <Text style={{ fontWeight: "400", color: theme.muted }}>{formatDateTime(comment.createdAt)}</Text>
                      </Text>
                      <Text style={{ marginTop: 6, fontSize: 12, lineHeight: 18, color: "#C8C8C8" }}>
                        {stripRichText(comment.bodyHtml || "") || "No text body"}
                      </Text>

                      {commentAttachments.map((attachment) => (
                        <View
                          key={attachment.id}
                          style={{
                            marginTop: 8,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: theme.border,
                            backgroundColor: theme.active,
                            paddingHorizontal: 11,
                            paddingVertical: 9,
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: "700", color: theme.text }}>
                            {attachment.originalName || attachment.linkLabel || "Comment attachment"}
                          </Text>
                          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                            <TeacherActionButton label="Open" icon="open-in-new" tone="blue" onPress={() => void openAttachment(attachment)} />
                            <TeacherActionButton label="Download" icon="download" tone="neutral" onPress={() => void downloadAttachment(attachment)} />
                          </View>
                        </View>
                      ))}

                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                        {comment.canDelete ? (
                          <TeacherActionButton
                            label="Delete Comment"
                            icon="delete-outline"
                            tone="red"
                            disabled={deleteCommentMutation.isPending}
                            onPress={() => void handleDeleteComment(comment)}
                          />
                        ) : null}
                        <TeacherActionButton
                          label={`Report (${REPORT_REASON_OPTIONS.find((entry) => entry.value === reportReason)?.label || "Reason"})`}
                          icon="flag-outline"
                          tone="amber"
                          disabled={reportCommentMutation.isPending}
                          onPress={() => void handleReportComment(comment)}
                        />
                      </View>
                    </View>
                  );
                })
              ) : (
                <TeacherEmpty
                  title="No comments yet"
                  subtitle="Student replies for this thread will appear here for moderation."
                  icon="comment-alert-outline"
                />
              )}
            </>
          ) : (
            <View style={{ paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: theme.border }}>
              <Text style={{ marginTop: 10, fontSize: 12, color: theme.muted }}>Loading thread detail...</Text>
            </View>
          )}
        </TeacherPanel>
      ) : null}
    </View>
  );
}
