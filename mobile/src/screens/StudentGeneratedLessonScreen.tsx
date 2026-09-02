import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { lxpApi } from "../api/services/lxp";
import { toAppError } from "../api/http";
import { RichTextContent } from "../components/ui/RichTextContent";
import { Refreshable, ScreenScroll } from "../components/ui/primitives";
import type { RootStackParamList } from "../navigation/types";
import { studentDarkTheme as theme } from "../theme/studentDark";

type Props = NativeStackScreenProps<RootStackParamList, "StudentGeneratedLesson">;

export function StudentGeneratedLessonScreen({ navigation, route }: Props) {
  const { classId, assignmentId } = route.params;
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState("");
  const lessonQuery = useQuery({
    queryKey: ["lxp-generated-lesson", classId, assignmentId],
    queryFn: () => lxpApi.getGeneratedLesson(classId, assignmentId),
  });
  const completeMutation = useMutation({
    mutationFn: () => lxpApi.completeCheckpoint(classId, assignmentId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["lxp-playlist", classId] }),
        queryClient.invalidateQueries({ queryKey: ["lxp-overview", classId] }),
        queryClient.invalidateQueries({ queryKey: ["lxp-eligibility"] }),
      ]);
      navigation.goBack();
    },
  });

  const complete = async () => {
    try {
      setActionError("");
      await completeMutation.mutateAsync();
    } catch (error) {
      setActionError(toAppError(error).message);
    }
  };

  if (lessonQuery.isLoading) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.bg }}><ActivityIndicator color={theme.blue} /><Text style={{ color: theme.muted, marginTop: 10 }}>Loading remedial lesson...</Text></View>;
  }

  if (lessonQuery.isError || !lessonQuery.data) {
    return (
      <View style={{ flex: 1, justifyContent: "center", backgroundColor: theme.bg, padding: 24 }}>
        <Text style={{ color: theme.text, fontSize: 20, fontWeight: "900" }}>Lesson unavailable</Text>
        <Text style={{ color: theme.muted, marginTop: 8 }}>{lessonQuery.error ? toAppError(lessonQuery.error).message : "The generated lesson was not returned."}</Text>
        <Pressable onPress={() => void lessonQuery.refetch()} style={{ marginTop: 18, borderRadius: 12, backgroundColor: theme.blue, paddingVertical: 13, alignItems: "center" }}><Text style={{ color: "#FFFFFF", fontWeight: "900" }}>Retry</Text></Pressable>
        <Pressable onPress={() => navigation.goBack()} style={{ marginTop: 10, paddingVertical: 12, alignItems: "center" }}><Text style={{ color: theme.muted, fontWeight: "800" }}>Back to Learners Path</Text></Pressable>
      </View>
    );
  }

  const lesson = lessonQuery.data.generatedLesson;
  return (
    <ScreenScroll backgroundColor={theme.bg} refreshControl={<Refreshable refreshing={lessonQuery.isRefetching} onRefresh={() => void lessonQuery.refetch()} />}>
      <View style={{ padding: 18, paddingBottom: 50 }}>
        <Pressable onPress={() => navigation.goBack()}><Text style={{ color: theme.blue, fontWeight: "800" }}>Back to Learners Path</Text></Pressable>
        <Text style={{ color: theme.muted, fontSize: 11, fontWeight: "900", letterSpacing: 1, marginTop: 22 }}>AI REMEDIAL LESSON</Text>
        <Text style={{ color: theme.text, fontSize: 27, fontWeight: "900", marginTop: 7 }}>{lesson.title}</Text>
        {lesson.summary ? <Text style={{ color: theme.muted, lineHeight: 20, marginTop: 8 }}>{lesson.summary}</Text> : null}
        {lesson.weakConcepts.length ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 14 }}>{lesson.weakConcepts.map((concept) => <View key={concept} style={{ borderRadius: 999, backgroundColor: theme.redSoft, paddingHorizontal: 10, paddingVertical: 6 }}><Text style={{ color: theme.red, fontSize: 11, fontWeight: "800" }}>{concept}</Text></View>)}</View> : null}
        <View style={{ marginTop: 18, borderRadius: 18, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, padding: 16 }}>
          <RichTextContent html={lesson.lessonBody} color={theme.text} mutedColor={theme.muted} accentColor={theme.blue} />
        </View>
        {actionError ? <Text accessibilityLiveRegion="polite" style={{ color: theme.red, marginTop: 12 }}>{actionError}</Text> : null}
        <Pressable disabled={completeMutation.isPending} onPress={() => void complete()} style={{ marginTop: 18, borderRadius: 12, backgroundColor: theme.blue, paddingVertical: 14, alignItems: "center", opacity: completeMutation.isPending ? 0.6 : 1 }}>
          <Text style={{ color: "#FFFFFF", fontWeight: "900" }}>{completeMutation.isPending ? "Saving..." : "Mark lesson complete"}</Text>
        </Pressable>
      </View>
    </ScreenScroll>
  );
}
