import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAssessments, useLessons, useStudentClasses } from '@/api/hooks';
import type { StudentRouteParamList, StudentTabParamList } from '@/navigation/types';
import { useAuth } from '@/providers/AuthProvider';
import { getTeacherName } from '@/shared/utils/helpers';
import { ActionCard, AppButton, EmptyState, HeroCard, Screen, SectionHeader, StatCard } from '@/shared/components/ui';

type Props = CompositeScreenProps<
  BottomTabScreenProps<StudentTabParamList, 'Dashboard'>,
  NativeStackScreenProps<StudentRouteParamList>
>;

export function DashboardScreen({ navigation }: Props) {
  const { user } = useAuth();
  const classesQuery = useStudentClasses(user?.id);
  const classes = classesQuery.data ?? [];

  const classIds = useMemo(() => classes.slice(0, 4).map((entry) => entry.id), [classes]);
  const lessonsQuery = useLessons(classIds[0]);
  const assessmentsQuery = useAssessments(classIds[0]);

  const lessons = lessonsQuery.data ?? [];
  const assessments = (assessmentsQuery.data ?? []).filter((entry) => entry.isPublished);
  const pendingAssessments = assessments.slice(0, 3);
  const recentLessons = lessons.slice(0, 3);

  return (
    <Screen>
      <HeroCard
        eyebrow="Learning Hub"
        title={`Hello, ${user?.firstName ?? 'Student'}.`}
        subtitle={`You're enrolled in ${classes.length} class${classes.length === 1 ? '' : 'es'}. Pick up your next lesson, complete an assessment, or review performance insights.`}
        right={
          <View className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
            <Text className="text-[10px] font-black uppercase tracking-[2px] text-slate-400">Progress</Text>
            <Text className="mt-1 text-2xl font-black text-brand-600">{Math.min(100, lessons.length * 10)}%</Text>
          </View>
        }
      />

      <View className="mt-6 flex-row gap-3">
        <StatCard
          label="Classes"
          value={classes.length}
          accentClassName="bg-slate-950"
          icon={<MaterialCommunityIcons name="school-outline" size={18} color="#ffffff" />}
        />
        <StatCard
          label="Lessons"
          value={lessons.length}
          accentClassName="bg-brand-500"
          icon={<MaterialCommunityIcons name="book-open-page-variant-outline" size={18} color="#ffffff" />}
        />
        <StatCard
          label="Tasks"
          value={pendingAssessments.length}
          accentClassName="bg-slate-950"
          icon={<MaterialCommunityIcons name="clipboard-check-outline" size={18} color="#ffffff" />}
        />
      </View>

      <View className="mt-7 gap-4">
        <SectionHeader
          title="Quick Access"
          subtitle="Jump into the student tools that matter most on mobile."
        />
        <View className="gap-3">
          <ActionCard onPress={() => navigation.navigate('Courses')}>
            <Text className="text-lg font-black text-slate-950">My Courses</Text>
            <Text className="mt-1 text-sm leading-6 text-slate-500">Open your enrolled classes and continue learning.</Text>
          </ActionCard>
          <ActionCard onPress={() => navigation.navigate('Performance')}>
            <Text className="text-lg font-black text-slate-950">Performance</Text>
            <Text className="mt-1 text-sm leading-6 text-slate-500">Review blended scores, risk flags, and academic standing.</Text>
          </ActionCard>
        </View>
      </View>

      <View className="mt-7 gap-4">
        <SectionHeader title="Enrolled Classes" subtitle="Your current class roster." />
        {classes.length === 0 ? (
          <EmptyState
            title="No classes yet"
            description="You are not enrolled in any classes yet."
            icon={<MaterialCommunityIcons name="book-outline" size={28} color="#dc2626" />}
          />
        ) : (
          classes.slice(0, 4).map((entry) => (
            <ActionCard key={entry.id} onPress={() => navigation.navigate('ClassDetail', { classId: entry.id })}>
              <Text className="text-lg font-black text-slate-950">{entry.subjectName || entry.className || entry.name}</Text>
              <Text className="mt-1 text-sm uppercase tracking-[1px] text-slate-400">
                {entry.subjectCode} | {entry.section?.name ?? 'Student Section'}
              </Text>
              <Text className="mt-3 text-sm text-slate-500">Teacher: {getTeacherName(entry.teacher)}</Text>
            </ActionCard>
          ))
        )}
      </View>

      <View className="mt-7 gap-4">
        <SectionHeader title="Recent Lessons" subtitle="Continue your latest reading." />
        {recentLessons.length === 0 ? (
          <EmptyState
            title="No lessons posted"
            description="Published lessons will appear here once your teacher posts them."
            icon={<MaterialCommunityIcons name="book-open-outline" size={28} color="#dc2626" />}
          />
        ) : (
          recentLessons.map((lesson) => (
            <ActionCard
              key={lesson.id}
              onPress={() => navigation.navigate('LessonDetail', { lessonId: lesson.id, classId: lesson.classId })}
            >
              <Text className="text-lg font-black text-slate-950">{lesson.title}</Text>
              <Text className="mt-1 text-sm leading-6 text-slate-500">{lesson.description || 'Open the lesson to continue reading.'}</Text>
            </ActionCard>
          ))
        )}
      </View>

      <View className="mt-7 gap-4">
        <SectionHeader title="Pending Assessments" subtitle="Stay on top of due work." />
        {pendingAssessments.length === 0 ? (
          <EmptyState
            title="No pending tasks"
            description="You're all caught up on published assessments in the first active class snapshot."
            icon={<MaterialCommunityIcons name="check-circle-outline" size={28} color="#dc2626" />}
          />
        ) : (
          pendingAssessments.map((assessment) => (
            <ActionCard
              key={assessment.id}
              onPress={() => navigation.navigate('AssessmentDetail', { assessmentId: assessment.id, classId: assessment.classId })}
            >
              <Text className="text-lg font-black text-slate-950">{assessment.title}</Text>
              <Text className="mt-1 text-sm uppercase tracking-[1px] text-slate-400">{assessment.type}</Text>
              <Text className="mt-3 text-sm text-slate-500">
                {assessment.dueDate ? `Due ${new Date(assessment.dueDate).toLocaleDateString()}` : 'No due date'}
              </Text>
            </ActionCard>
          ))
        )}
      </View>

      <View className="mt-6">
        <AppButton title="Open Full Performance View" variant="secondary" onPress={() => navigation.navigate('Performance')} />
      </View>
    </Screen>
  );
}
