import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAnnouncements, useAssessmentAttempts, useAssessments, useClassDetail, useLessonCompletions, useLessons } from '@/api/hooks';
import type { StudentRouteParamList } from '@/navigation/types';
import { formatDateShort, getDescription } from '@/shared/utils/helpers';
import { ActionCard, EmptyState, HeroCard, Screen, SectionHeader, SelectPill, StatusChip } from '@/shared/components/ui';

type Props = NativeStackScreenProps<StudentRouteParamList, 'ClassDetail'>;

export function ClassDetailScreen({ navigation, route }: Props) {
  const { classId } = route.params;
  const [tab, setTab] = useState<'lessons' | 'assessments' | 'announcements'>('lessons');
  const classQuery = useClassDetail(classId);
  const lessonsQuery = useLessons(classId);
  const completionsQuery = useLessonCompletions(classId);
  const assessmentsQuery = useAssessments(classId);
  const announcementsQuery = useAnnouncements(classId);

  const classItem = classQuery.data;
  const lessons = (lessonsQuery.data ?? []).filter((entry) => !entry.isDraft).sort((a, b) => a.order - b.order);
  const completions = useMemo(() => new Set((completionsQuery.data ?? []).map((entry) => entry.lessonId)), [completionsQuery.data]);
  const assessments = (assessmentsQuery.data ?? []).filter((entry) => entry.isPublished);
  const announcements = announcementsQuery.data ?? [];

  return (
    <Screen>
      <HeroCard
        eyebrow="Class Workspace"
        title={classItem?.subjectName || 'Class'}
        subtitle={`${classItem?.section?.name ?? 'Section'} | Grade ${classItem?.section?.gradeLevel ?? '--'}`}
      />

      <View className="mt-6 flex-row flex-wrap gap-2">
        <SelectPill title="Lessons" selected={tab === 'lessons'} onPress={() => setTab('lessons')} />
        <SelectPill title="Assessments" selected={tab === 'assessments'} onPress={() => setTab('assessments')} />
        <SelectPill title="Announcements" selected={tab === 'announcements'} onPress={() => setTab('announcements')} />
      </View>

      <View className="mt-6 gap-4">
        {tab === 'lessons' && (
          <>
            <SectionHeader title="Lessons" subtitle={`${lessons.length} published lesson${lessons.length === 1 ? '' : 's'}`} />
            {lessons.length === 0 ? (
              <EmptyState
                title="No lessons yet"
                description="Your teacher has not posted lessons for this class yet."
                icon={<MaterialCommunityIcons name="book-outline" size={28} color="#dc2626" />}
              />
            ) : (
              lessons.map((lesson) => (
                <ActionCard
                  key={lesson.id}
                  onPress={() => navigation.navigate('LessonDetail', { lessonId: lesson.id, classId })}
                >
                  <Text className="text-lg font-black text-slate-950">{lesson.title}</Text>
                  <Text className="mt-1 text-sm leading-6 text-slate-500">{getDescription(lesson.description)}</Text>
                  <View className="mt-4 flex-row justify-end">
                    {completions.has(lesson.id) ? (
                      <StatusChip tone="success">Completed</StatusChip>
                    ) : (
                      <StatusChip tone="warning">Pending</StatusChip>
                    )}
                  </View>
                </ActionCard>
              ))
            )}
          </>
        )}

        {tab === 'assessments' && (
          <>
            <SectionHeader title="Assessments" subtitle={`${assessments.length} published assessment${assessments.length === 1 ? '' : 's'}`} />
            {assessments.length === 0 ? (
              <EmptyState
                title="No assessments yet"
                description="Published assessments will appear here."
                icon={<MaterialCommunityIcons name="clipboard-check-outline" size={28} color="#dc2626" />}
              />
            ) : (
              assessments.map((assessment) => (
                <AssessmentEntry
                  key={assessment.id}
                  assessmentId={assessment.id}
                  title={assessment.title}
                  description={getDescription(assessment.description)}
                  type={assessment.type}
                  dueDate={assessment.dueDate}
                  onPress={() => navigation.navigate('AssessmentDetail', { assessmentId: assessment.id, classId })}
                />
              ))
            )}
          </>
        )}

        {tab === 'announcements' && (
          <>
            <SectionHeader title="Announcements" subtitle={`${announcements.length} class update${announcements.length === 1 ? '' : 's'}`} />
            {announcements.length === 0 ? (
              <EmptyState
                title="No announcements yet"
                description="Your teacher has not posted announcements for this class."
                icon={<MaterialCommunityIcons name="bullhorn-outline" size={28} color="#dc2626" />}
              />
            ) : (
              announcements.map((announcement) => (
                <ActionCard key={announcement.id}>
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-lg font-black text-slate-950">{announcement.title}</Text>
                      <Text className="mt-2 text-sm leading-6 text-slate-500">{announcement.content}</Text>
                    </View>
                    {announcement.isPinned && <StatusChip tone="warning">Pinned</StatusChip>}
                  </View>
                  <Text className="mt-4 text-xs font-black uppercase tracking-[1px] text-slate-400">
                    {formatDateShort(announcement.createdAt)} | {announcement.author?.firstName} {announcement.author?.lastName}
                  </Text>
                </ActionCard>
              ))
            )}
          </>
        )}
      </View>
    </Screen>
  );
}

function AssessmentEntry({
  assessmentId,
  title,
  description,
  type,
  dueDate,
  onPress,
}: {
  assessmentId: string;
  title: string;
  description: string;
  type: string;
  dueDate?: string;
  onPress: () => void;
}) {
  const attemptsQuery = useAssessmentAttempts(assessmentId);
  const attempts = attemptsQuery.data ?? [];
  const bestAttempt = attempts.length
    ? attempts.reduce((best, current) => ((current.score ?? 0) > (best.score ?? 0) ? current : best), attempts[0])
    : null;

  return (
    <ActionCard onPress={onPress}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-lg font-black text-slate-950">{title}</Text>
          <Text className="mt-1 text-sm leading-6 text-slate-500">{description}</Text>
        </View>
        <StatusChip tone={bestAttempt ? (bestAttempt.passed ? 'success' : 'danger') : 'warning'}>
          {bestAttempt ? `${bestAttempt.score ?? 0}%` : 'Not Started'}
        </StatusChip>
      </View>
      <Text className="mt-4 text-xs font-black uppercase tracking-[1px] text-slate-400">
        {type} | {dueDate ? `Due ${formatDateShort(dueDate)}` : 'No due date'}
      </Text>
    </ActionCard>
  );
}
