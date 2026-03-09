import { Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useLessonCompletions, useLessons, useStudentClasses } from '@/api/hooks';
import type { StudentRouteParamList, StudentTabParamList } from '@/navigation/types';
import { useAuth } from '@/providers/AuthProvider';
import { EmptyState, HeroCard, ProgressBar, Screen, SectionHeader, ActionCard } from '@/shared/components/ui';

type Props = CompositeScreenProps<
  BottomTabScreenProps<StudentTabParamList, 'Courses'>,
  NativeStackScreenProps<StudentRouteParamList>
>;

export function CoursesScreen({ navigation }: Props) {
  const { user } = useAuth();
  const classesQuery = useStudentClasses(user?.id);
  const classes = classesQuery.data ?? [];

  return (
    <Screen>
      <HeroCard
        eyebrow="Academic Progress"
        title="My Courses"
        subtitle="Review your enrolled classes, then dive into lessons, assessments, and announcements."
      />

      <View className="mt-7 gap-4">
        <SectionHeader title="Course List" subtitle={`${classes.length} enrolled class${classes.length === 1 ? '' : 'es'}`} />
        {classes.length === 0 ? (
          <EmptyState
            title="No courses yet"
            description="You are not enrolled in any classes yet."
            icon={<MaterialCommunityIcons name="school-outline" size={28} color="#dc2626" />}
          />
        ) : (
          classes.map((entry) => (
            <CourseProgressCard
              key={entry.id}
              classId={entry.id}
              title={entry.subjectName || entry.className || entry.name || 'Untitled Class'}
              subtitle={`${entry.subjectCode} | ${entry.section?.name ?? 'Section'}`}
              onPress={() => navigation.navigate('ClassDetail', { classId: entry.id })}
            />
          ))
        )}
      </View>
    </Screen>
  );
}

function CourseProgressCard({
  classId,
  title,
  subtitle,
  onPress,
}: {
  classId: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const lessonsQuery = useLessons(classId);
  const completionsQuery = useLessonCompletions(classId);
  const totalLessons = lessonsQuery.data?.length ?? 0;
  const completedLessons = completionsQuery.data?.length ?? 0;
  const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <ActionCard onPress={onPress}>
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-lg font-black text-slate-950">{title}</Text>
          <Text className="mt-1 text-sm uppercase tracking-[1px] text-slate-400">{subtitle}</Text>
        </View>
        <View className="rounded-2xl bg-brand-50 p-3">
          <MaterialCommunityIcons name="book-open-page-variant-outline" size={20} color="#dc2626" />
        </View>
      </View>
      <Text className="mt-4 text-xs font-black uppercase tracking-[2px] text-slate-400">Progress</Text>
      <View className="mt-2 flex-row items-center gap-3">
        <View className="flex-1">
          <ProgressBar progress={progress} />
        </View>
        <Text className="text-sm font-black text-brand-600">{progress}%</Text>
      </View>
    </ActionCard>
  );
}
