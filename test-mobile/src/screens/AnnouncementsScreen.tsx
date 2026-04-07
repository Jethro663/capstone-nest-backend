import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Text, View } from "react-native";
import { AnimatedEntrance, Card, EmptyState, GradientHeader, Pill, Refreshable, ScreenScroll, SectionTitle } from "../components/ui/primitives";
import { queryKeys, useStudentClasses } from "../api/hooks";
import { announcementsApi } from "../api/services/announcements";
import { toAnnouncementPreview, toSubjectCard } from "../data/mappers";
import { useAuth } from "../providers/AuthProvider";
import type { MainTabParamList } from "../navigation/types";
import { colors, gradients } from "../theme/tokens";

type Props = BottomTabScreenProps<MainTabParamList, "Announcements">;

export function AnnouncementsScreen(_: Props) {
  const { user } = useAuth();
  const classesQuery = useStudentClasses(user?.userId || user?.id);
  const classIds = classesQuery.data?.map((item) => item.id) ?? [];

  const announcementQueries = useQueries({
    queries: classIds.map((classId) => ({
      queryKey: queryKeys.announcements(classId),
      queryFn: () => announcementsApi.getByClass(classId),
      enabled: classIds.length > 0,
    })),
  });

  const announcements = useMemo(() => {
    if (!classesQuery.data) return [];
    return announcementQueries
      .flatMap((query, index) => {
        const classItem = classesQuery.data?.[index];
        if (!classItem || !query.data) return [];
        const subject = toSubjectCard(classItem, [], [], null);
        return query.data.map((entry) => toAnnouncementPreview(entry, subject));
      })
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  }, [announcementQueries, classesQuery.data]);

  const refreshing = classesQuery.isRefetching || announcementQueries.some((query) => query.isRefetching);

  return (
    <ScreenScroll
      refreshControl={
        <Refreshable
          refreshing={refreshing}
          onRefresh={() => {
            void Promise.all([classesQuery.refetch(), ...announcementQueries.map((query) => query.refetch())]);
          }}
        />
      }
    >
      <GradientHeader colors={gradients.announcements} eyebrow="Class updates" title="Announcements" />

      <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
        <SectionTitle
          title="Latest posts"
          right={<Pill label={`${announcements.length} updates`} backgroundColor={colors.paleGreen} color={colors.green} />}
        />

        {announcements.length === 0 ? (
          <EmptyState emoji="📢" title="No announcements yet" subtitle="Your class updates will appear here." />
        ) : (
          <View style={{ gap: 12 }}>
            {announcements.map((announcement, index) => (
              <AnimatedEntrance key={announcement.id} delay={index * 70}>
                <Card>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Text style={{ fontSize: 22 }}>{announcement.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "900", color: colors.text }}>{announcement.title}</Text>
                      <Text style={{ marginTop: 2, fontSize: 11, color: colors.textSecondary }}>
                        {announcement.subject} • {announcement.createdAt}
                      </Text>
                    </View>
                    {announcement.isPinned ? (
                      <Pill label="Pinned" backgroundColor={colors.paleAmber} color={colors.orange} />
                    ) : null}
                  </View>
                  <Text style={{ marginTop: 10, fontSize: 12, lineHeight: 19, color: colors.textSecondary }}>
                    {announcement.content}
                  </Text>
                </Card>
              </AnimatedEntrance>
            ))}
          </View>
        )}
      </View>
    </ScreenScroll>
  );
}
