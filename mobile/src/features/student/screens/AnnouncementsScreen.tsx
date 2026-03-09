import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useQueries } from '@tanstack/react-query';
import { queryKeys, useStudentClasses } from '@/api/hooks';
import { announcementsApi } from '@/api/services/announcements';
import type { StudentTabParamList } from '@/navigation/types';
import { useAuth } from '@/providers/AuthProvider';
import { ActionCard, EmptyState, HeroCard, Screen, SectionHeader, StatusChip } from '@/shared/components/ui';
import { formatDateTime } from '@/shared/utils/helpers';

type Props = BottomTabScreenProps<StudentTabParamList, 'Announcements'>;

export function AnnouncementsScreen(_: Props) {
  const { user } = useAuth();
  const classesQuery = useStudentClasses(user?.id);
  const classes = classesQuery.data ?? [];
  const announcementQueries = useQueries({
    queries: classes.map((entry) => ({
      queryKey: queryKeys.announcements(entry.id),
      queryFn: () => announcementsApi.getByClass(entry.id),
      enabled: !!entry.id,
    })),
  });

  const feed = useMemo(() => {
    return classes
      .flatMap((entry, index) => {
        const items = announcementQueries[index]?.data ?? [];
        return items.map((announcement) => ({
          ...announcement,
          className: entry.subjectName,
          subjectCode: entry.subjectCode,
        }));
      })
      .sort((left, right) => {
        if (left.isPinned !== right.isPinned) return left.isPinned ? -1 : 1;
        return new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime();
      });
  }, [announcementQueries, classes]);

  return (
    <Screen>
      <HeroCard
        eyebrow="Virtual Bulletin"
        title="Announcements"
        subtitle={`Updates from ${classes.length} class${classes.length === 1 ? '' : 'es'}, pinned items first.`}
      />

      <View className="mt-7 gap-4">
        <SectionHeader title="Latest Updates" subtitle={`${feed.length} announcement${feed.length === 1 ? '' : 's'} in your feed`} />
        {feed.length === 0 ? (
          <EmptyState
            title="All caught up"
            description="No class announcements have been posted yet."
            icon={<MaterialCommunityIcons name="bullhorn-outline" size={28} color="#dc2626" />}
          />
        ) : (
          feed.map((announcement) => (
            <ActionCard key={`${announcement.classId}-${announcement.id}`} className={announcement.isPinned ? 'border-brand-100 bg-brand-50/40' : undefined}>
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-xs font-black uppercase tracking-[2px] text-slate-400">
                    {announcement.subjectCode} | {announcement.className}
                  </Text>
                  <Text className="mt-2 text-xl font-black text-slate-950">{announcement.title}</Text>
                  <Text className="mt-3 text-base leading-7 text-slate-600">{announcement.content}</Text>
                </View>
                {announcement.isPinned ? <StatusChip tone="warning">Pinned</StatusChip> : null}
              </View>
              <Text className="mt-4 text-xs font-black uppercase tracking-[1px] text-slate-400">
                {formatDateTime(announcement.createdAt)}
              </Text>
              {announcement.author ? (
                <Text className="mt-2 text-sm text-slate-500">
                  Posted by {announcement.author.firstName ?? ''} {announcement.author.lastName ?? ''}
                </Text>
              ) : null}
            </ActionCard>
          ))
        )}
      </View>
    </Screen>
  );
}
