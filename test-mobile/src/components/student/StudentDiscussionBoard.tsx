import { useEffect, useMemo, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image, Linking, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import {
  useDiscussionCommentMutation,
  useDiscussionDeleteCommentMutation,
  useDiscussionReactionMutation,
  useDiscussionThread,
  useDiscussionThreads,
} from "../../api/hooks";
import { discussionBoardApi } from "../../api/services/discussion-board";
import { buildProtectedImageSource } from "../../api/services/protected-files";
import { peekAppError, toAppError } from "../../api/http";
import { studentDarkTheme as theme, stripRichText } from "../../theme/studentDark";
import type {
  DiscussionAttachmentResource,
  DiscussionComment,
  DiscussionReactionType,
} from "../../types/discussion";

type AttachmentDraft = {
  uri: string;
  name: string;
  type?: string | null;
};

type Props = {
  classId: string;
  registerRefetch?: (refetcher: () => Promise<unknown>) => void;
};

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

function buildInitials(firstName?: string, lastName?: string) {
  const initials = [firstName, lastName]
    .filter(Boolean)
    .map((value) => value?.trim()[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return initials || "ST";
}

function toPlainHtml(value: string) {
  const escaped = value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br />");
  return `<p>${escaped}</p>`;
}

function ToneTag({ label, tone }: { label: string; tone: "red" | "blue" | "green" | "amber" | "purple" }) {
  const toneStyle = {
    red: { backgroundColor: theme.redSoft, color: theme.red },
    blue: { backgroundColor: theme.blueSoft, color: theme.blue },
    green: { backgroundColor: theme.greenSoft, color: theme.green },
    amber: { backgroundColor: theme.amberSoft, color: theme.amber },
    purple: { backgroundColor: theme.purpleSoft, color: theme.purple },
  }[tone];

  return (
    <View style={{ borderRadius: 4, backgroundColor: toneStyle.backgroundColor, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ fontSize: 10, fontWeight: "600", color: toneStyle.color }}>{label}</Text>
    </View>
  );
}

function DiscussionAttachmentPreview({
  attachment,
  onOpen,
  onDownload,
}: {
  attachment: DiscussionAttachmentResource;
  onOpen: () => void;
  onDownload: () => void;
}) {
  const imageSource = buildProtectedImageSource(attachment.inlineUrl || attachment.downloadUrl);
  const isImage = attachment.type === "image" || attachment.mimeType?.startsWith("image/");

  return (
    <View
      style={{
        marginTop: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.active,
        overflow: "hidden",
      }}
    >
      {isImage && imageSource ? (
        <Pressable onPress={onOpen}>
          <Image
            source={imageSource}
            resizeMode="cover"
            style={{ width: "100%", height: 160, backgroundColor: theme.active }}
          />
        </Pressable>
      ) : null}

      <View style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
        <Text style={{ fontSize: 12, fontWeight: "600", color: theme.text }}>
          {attachment.originalName || attachment.linkLabel || "Attachment"}
        </Text>
        {attachment.mimeType ? (
          <Text style={{ marginTop: 3, fontSize: 10, color: theme.muted }}>{attachment.mimeType}</Text>
        ) : null}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
          <Pressable
            onPress={onOpen}
            style={{
              borderRadius: 999,
              backgroundColor: theme.blueSoft,
              paddingHorizontal: 11,
              paddingVertical: 7,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: "700", color: theme.blue }}>Open</Text>
          </Pressable>
          <Pressable
            onPress={onDownload}
            style={{
              borderRadius: 999,
              backgroundColor: theme.surface,
              borderWidth: 1,
              borderColor: theme.border,
              paddingHorizontal: 11,
              paddingVertical: 7,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: "700", color: theme.text }}>Download</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function ReactionButton({
  label,
  active,
  count,
  onPress,
}: {
  label: string;
  active: boolean;
  count: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? theme.blueLine : theme.border,
        backgroundColor: active ? theme.blueSoft : theme.surface,
        paddingHorizontal: 10,
        paddingVertical: 6,
      }}
    >
      <Text style={{ fontSize: 10, fontWeight: "700", color: active ? theme.blue : theme.muted }}>
        {label} {count}
      </Text>
    </Pressable>
  );
}

function CommentCard({
  comment,
  onDelete,
  onReaction,
  onOpenAttachment,
  onDownloadAttachment,
}: {
  comment: DiscussionComment;
  onDelete: () => void;
  onReaction: (reaction: DiscussionReactionType) => void;
  onOpenAttachment: (attachment: DiscussionAttachmentResource) => void;
  onDownloadAttachment: (attachment: DiscussionAttachmentResource) => void;
}) {
  const commentAttachments = Array.isArray(comment.attachments) ? comment.attachments : [];
  const reactions = comment.reactions ?? {
    like: 0,
    heart: 0,
    wow: 0,
    total: 0,
    userReaction: null,
  };

  return (
    <View
      style={{
        marginTop: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.surface,
        paddingHorizontal: 12,
        paddingVertical: 12,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.red,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#FFFFFF" }}>
            {buildInitials(comment.author?.firstName, comment.author?.lastName)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: theme.text }}>
            {[comment.author?.firstName || "Student", comment.author?.lastName || ""].join(" ").trim()}
          </Text>
          <Text style={{ fontSize: 10, color: theme.muted }}>{formatDateTime(comment.createdAt)}</Text>
        </View>
        {comment.canDelete ? (
          <Pressable onPress={onDelete} style={{ paddingHorizontal: 6, paddingVertical: 4 }}>
            <Text style={{ fontSize: 10, fontWeight: "700", color: theme.red }}>Delete</Text>
          </Pressable>
        ) : null}
      </View>

      {comment.bodyHtml ? (
        <Text style={{ marginTop: 10, fontSize: 12, lineHeight: 18, color: "#C9C9C9" }}>
          {stripRichText(comment.bodyHtml)}
        </Text>
      ) : null}

      {commentAttachments.map((attachment) => (
        <DiscussionAttachmentPreview
          key={attachment.id}
          attachment={attachment}
          onOpen={() => onOpenAttachment(attachment)}
          onDownload={() => onDownloadAttachment(attachment)}
        />
      ))}

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
        <ReactionButton
          label="Like"
          active={reactions.userReaction === "like"}
          count={reactions.like}
          onPress={() => onReaction("like")}
        />
        <ReactionButton
          label="Heart"
          active={reactions.userReaction === "heart"}
          count={reactions.heart}
          onPress={() => onReaction("heart")}
        />
        <ReactionButton
          label="Wow"
          active={reactions.userReaction === "wow"}
          count={reactions.wow}
          onPress={() => onReaction("wow")}
        />
      </View>
    </View>
  );
}

export function StudentDiscussionBoard({ classId, registerRefetch }: Props) {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);

  const threadsQuery = useDiscussionThreads(classId);
  const threads = Array.isArray(threadsQuery.data?.items) ? threadsQuery.data.items : [];
  const threadQuery = useDiscussionThread(classId, selectedThreadId ?? undefined);
  const selectedThread = threadQuery.data;
  const selectedThreadComments = Array.isArray(selectedThread?.comments) ? selectedThread.comments : [];
  const selectedThreadAttachments = Array.isArray(selectedThread?.attachments) ? selectedThread.attachments : [];
  const commentMutation = useDiscussionCommentMutation(classId, selectedThreadId ?? undefined);
  const deleteCommentMutation = useDiscussionDeleteCommentMutation(classId, selectedThreadId ?? undefined);
  const reactionMutation = useDiscussionReactionMutation(classId, selectedThreadId ?? undefined);

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
    if (!selectedThreadId && threads.length === 1) {
      setSelectedThreadId(threads[0].id);
    }
  }, [selectedThreadId, threads]);

  const sortedThreads = useMemo(
    () =>
      [...threads].sort((left, right) => {
        if (left.isPinned !== right.isPinned) return left.isPinned ? -1 : 1;
        const leftTime = new Date(left.publishedAt || left.createdAt || 0).getTime();
        const rightTime = new Date(right.publishedAt || right.createdAt || 0).getTime();
        return rightTime - leftTime;
      }),
    [threads],
  );

  const pickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setActionError("Gallery permission is required to attach discussion images.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });

    if (result.canceled || !result.assets?.length) return;

    setAttachments((current) => [
      ...current,
      ...result.assets.map((asset, index) => ({
        uri: asset.uri,
        name: asset.fileName || `discussion-image-${current.length + index + 1}.jpg`,
        type: asset.mimeType || "image/jpeg",
      })),
    ]);
  };

  const submitComment = async () => {
    if (!selectedThreadId) return;

    const trimmed = draft.trim();
    if (!trimmed && attachments.length === 0) return;

    try {
      setActionError(null);
      const uploads = await Promise.all(
        attachments.map((file) => discussionBoardApi.uploadCommentImage(classId, selectedThreadId, file)),
      );
      await commentMutation.mutateAsync({
        bodyHtml: trimmed ? toPlainHtml(trimmed) : undefined,
        attachmentFileIds: uploads.map((entry) => entry.id),
      });
      setDraft("");
      setAttachments([]);
    } catch (error) {
      setActionError(toAppError(error).message);
    }
  };

  const handleReaction = async (comment: DiscussionComment, reactionType: DiscussionReactionType) => {
    try {
      setActionError(null);
      await reactionMutation.mutateAsync({
        commentId: comment.id,
        reactionType: comment.reactions.userReaction === reactionType ? null : reactionType,
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
      if (!targetPath) {
        throw new Error("Attachment is unavailable.");
      }
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
      if (!targetPath) {
        throw new Error("Attachment is unavailable.");
      }
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
      <View
        style={{
          marginHorizontal: 16,
          marginTop: 18,
          marginBottom: 6,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ fontSize: 10, fontWeight: "600", letterSpacing: 0.7, textTransform: "uppercase", color: theme.muted }}>
          Discussion Board
        </Text>
        <Text style={{ fontSize: 11, fontWeight: "600", color: theme.purple }}>
          {selectedThreadId ? "Thread detail" : `${sortedThreads.length} thread${sortedThreads.length === 1 ? "" : "s"}`}
        </Text>
      </View>

      {actionError ? (
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 8,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.surface,
            paddingHorizontal: 14,
            paddingVertical: 12,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "700", color: theme.red }}>Discussion action unavailable</Text>
          <Text style={{ marginTop: 5, fontSize: 12, lineHeight: 18, color: theme.muted }}>{actionError}</Text>
        </View>
      ) : null}

      {!selectedThreadId ? (
        <>
          {threadsQuery.error ? (
            <View
              style={{
                marginHorizontal: 16,
                marginTop: 8,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.surface,
                paddingHorizontal: 14,
                paddingVertical: 12,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: theme.text }}>Discussion data is partially unavailable</Text>
              <Text style={{ marginTop: 5, fontSize: 12, lineHeight: 18, color: theme.muted }}>
                {peekAppError(threadsQuery.error).message}
              </Text>
            </View>
          ) : null}

          {sortedThreads.length === 0 && !threadsQuery.error ? (
            <View
              style={{
                marginHorizontal: 16,
                marginTop: 8,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.surface,
                paddingHorizontal: 14,
                paddingVertical: 18,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: theme.text }}>No discussion threads yet</Text>
              <Text style={{ marginTop: 5, fontSize: 12, lineHeight: 18, color: theme.muted }}>
                Teacher discussion prompts will appear here once they are published for this class.
              </Text>
            </View>
          ) : null}

          {sortedThreads.map((thread, index) => (
            <Pressable
              key={thread.id}
              onPress={() => setSelectedThreadId(thread.id)}
              style={{
                marginHorizontal: 16,
                marginTop: index === 0 ? 8 : 10,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.surface,
                paddingHorizontal: 14,
                paddingVertical: 13,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: theme.purpleSoft,
                  }}
                >
                  <MaterialCommunityIcons name="message-text-outline" size={18} color={theme.purple} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <Text numberOfLines={1} style={{ flex: 1, fontSize: 13, fontWeight: "700", color: theme.text }}>
                      {thread.title}
                    </Text>
                    {thread.isPinned ? <ToneTag label="Pinned" tone="amber" /> : null}
                    {thread.status !== "published" ? (
                      <ToneTag label={thread.status.replace(/^\w/, (value) => value.toUpperCase())} tone="red" />
                    ) : null}
                  </View>
                  <Text style={{ marginTop: 4, fontSize: 11, color: theme.muted }}>
                    {[thread.author?.firstName || "Teacher", thread.author?.lastName || ""].join(" ").trim()} - {formatDateTime(thread.publishedAt || thread.createdAt)}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={16} color={theme.dim} />
              </View>

              <Text style={{ marginTop: 10, fontSize: 12, lineHeight: 18, color: theme.subtext }} numberOfLines={3}>
                {stripRichText(thread.bodyHtml)}
              </Text>

              <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                <ToneTag label={`${thread.commentCount} comments`} tone="blue" />
                {(thread.attachments?.length ?? 0) > 0 ? (
                  <ToneTag label={`${thread.attachments?.length ?? 0} files`} tone="green" />
                ) : null}
              </View>
            </Pressable>
          ))}
        </>
      ) : (
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 8,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.surface,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              paddingHorizontal: 14,
              paddingTop: 12,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            }}
          >
            <Pressable onPress={() => setSelectedThreadId(null)} style={{ padding: 2 }}>
              <MaterialCommunityIcons name="chevron-left" size={18} color={theme.text} />
            </Pressable>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: "700", color: theme.text }}>
                {selectedThread?.title || "Discussion thread"}
              </Text>
              <Text style={{ marginTop: 2, fontSize: 10, color: theme.muted }}>
                {selectedThread ? formatDateTime(selectedThread.publishedAt || selectedThread.createdAt) : "Loading thread"}
              </Text>
            </View>
          </View>

          {threadQuery.error ? (
            <View style={{ paddingHorizontal: 14, paddingVertical: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: theme.text }}>Thread unavailable</Text>
              <Text style={{ marginTop: 5, fontSize: 12, lineHeight: 18, color: theme.muted }}>
                {peekAppError(threadQuery.error).message}
              </Text>
            </View>
          ) : selectedThread ? (
            <>
              <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 14 }}>
                <View
                  style={{
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: theme.active,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                  }}
                >
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {selectedThread.isPinned ? <ToneTag label="Pinned" tone="amber" /> : null}
                    {selectedThread.allowComments ? <ToneTag label="Comments open" tone="green" /> : <ToneTag label="Comments off" tone="red" />}
                    {selectedThread.status !== "published" ? <ToneTag label={selectedThread.status} tone="purple" /> : null}
                  </View>
                  <Text style={{ marginTop: 10, fontSize: 12, lineHeight: 19, color: "#C9C9C9" }}>
                    {stripRichText(selectedThread.bodyHtml)}
                  </Text>
                  {selectedThreadAttachments.map((attachment) => (
                    <DiscussionAttachmentPreview
                      key={attachment.id}
                      attachment={attachment}
                      onOpen={() => void openAttachment(attachment)}
                      onDownload={() => void downloadAttachment(attachment)}
                    />
                  ))}
                </View>

                <View style={{ marginTop: 14 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: theme.muted, textTransform: "uppercase" }}>
                    Replies
                  </Text>
                  {selectedThreadComments.length === 0 ? (
                    <View
                      style={{
                        marginTop: 8,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: theme.border,
                        backgroundColor: theme.active,
                        paddingHorizontal: 12,
                        paddingVertical: 14,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "700", color: theme.text }}>No replies yet</Text>
                      <Text style={{ marginTop: 4, fontSize: 12, lineHeight: 18, color: theme.muted }}>
                        Start the discussion with a clear class-related response.
                      </Text>
                    </View>
                  ) : (
                    selectedThreadComments.map((comment) => (
                      <CommentCard
                        key={comment.id}
                        comment={comment}
                        onDelete={() => {
                          void deleteCommentMutation.mutateAsync(comment.id).catch((error) => {
                            setActionError(toAppError(error).message);
                          });
                        }}
                        onReaction={(reaction) => {
                          void handleReaction(comment, reaction);
                        }}
                        onOpenAttachment={(attachment) => {
                          void openAttachment(attachment);
                        }}
                        onDownloadAttachment={(attachment) => {
                          void downloadAttachment(attachment);
                        }}
                      />
                    ))
                  )}
                </View>
              </ScrollView>

              <View style={{ borderTopWidth: 1, borderTopColor: theme.border, paddingHorizontal: 14, paddingVertical: 12 }}>
                {selectedThread.allowComments && selectedThread.status === "published" ? (
                  <>
                    <TextInput
                      multiline
                      value={draft}
                      onChangeText={setDraft}
                      placeholder="Write a class-related reply"
                      placeholderTextColor={theme.dim}
                      style={{
                        minHeight: 92,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: theme.border,
                        backgroundColor: theme.active,
                        color: theme.text,
                        paddingHorizontal: 12,
                        paddingVertical: 12,
                        textAlignVertical: "top",
                        fontSize: 13,
                      }}
                    />

                    {attachments.length > 0 ? (
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                        {attachments.map((attachment, index) => (
                          <Pressable
                            key={`${attachment.uri}-${index}`}
                            onPress={() =>
                              setAttachments((current) => current.filter((entry) => entry.uri !== attachment.uri))
                            }
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

                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, marginTop: 12 }}>
                      <Pressable
                        onPress={() => void pickImages()}
                        style={{
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: theme.border,
                          backgroundColor: theme.surface,
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 7,
                        }}
                      >
                        <MaterialCommunityIcons name="image-plus" size={15} color={theme.text} />
                        <Text style={{ fontSize: 11, fontWeight: "700", color: theme.text }}>Add image</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => void submitComment()}
                        disabled={commentMutation.isPending}
                        style={{
                          borderRadius: 999,
                          backgroundColor: commentMutation.isPending ? theme.dim : theme.red,
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: "800", color: "#FFFFFF" }}>
                          {commentMutation.isPending ? "Posting..." : "Post Reply"}
                        </Text>
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <Text style={{ fontSize: 12, lineHeight: 18, color: theme.muted }}>
                    This thread is closed for new student replies.
                  </Text>
                )}
              </View>
            </>
          ) : (
            <View style={{ paddingHorizontal: 14, paddingVertical: 14 }}>
              <Text style={{ fontSize: 12, color: theme.muted }}>Loading thread...</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
