import { Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAssessmentResult } from '@/api/hooks';
import type { StudentRouteParamList } from '@/navigation/types';
import { ActionCard, AppButton, EmptyState, HeroCard, Screen, SectionHeader, StatusChip } from '@/shared/components/ui';

type Props = NativeStackScreenProps<StudentRouteParamList, 'AssessmentResults'>;

export function AssessmentResultsScreen({ navigation, route }: Props) {
  const { assessmentId, attemptId } = route.params;
  const resultQuery = useAssessmentResult(attemptId);
  const result = resultQuery.data;

  if (!result) {
    return (
      <Screen>
        <EmptyState
          title="Results not available"
          description="This attempt has no results yet or it no longer exists."
          icon={<MaterialCommunityIcons name="clipboard-alert-outline" size={28} color="#dc2626" />}
        />
      </Screen>
    );
  }

  const correctCount = result.responses.filter((entry) => entry.isCorrect === true).length;

  if (result.isReturned === false) {
    return (
      <Screen>
        <HeroCard
          eyebrow="Assessment Results"
          title="Awaiting Teacher Review"
          subtitle="Your attempt is submitted. The score and feedback will appear after your teacher returns the results."
        />
        <View className="mt-7">
          <AppButton title="Back To Assessment" variant="secondary" onPress={() => navigation.replace('AssessmentDetail', { assessmentId })} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <HeroCard
        eyebrow="Assessment Results"
        title={result.passed ? 'Great Work' : 'Keep Improving'}
        subtitle={`You answered ${correctCount} of ${result.responses.length} question${result.responses.length === 1 ? '' : 's'} correctly.`}
        right={<StatusChip tone={result.passed ? 'success' : 'danger'}>{result.passed ? 'Passed' : 'Needs Work'}</StatusChip>}
      />

      <View className="mt-6 flex-row gap-3">
        <MetricCard label="Score" value={`${result.score}%`} accent="brand" />
        <MetricCard label="Attempt" value={`#${result.attemptNumber}`} accent="slate" />
        <MetricCard label="Correct" value={correctCount} accent={result.passed ? 'success' : 'danger'} />
      </View>

      {result.teacherFeedback ? (
        <View className="mt-7">
          <ActionCard className="border-sky-200 bg-sky-50">
            <Text className="text-xs font-black uppercase tracking-[2px] text-sky-700">Teacher Feedback</Text>
            <Text className="mt-3 text-base leading-7 text-slate-700">{result.teacherFeedback}</Text>
          </ActionCard>
        </View>
      ) : null}

      <View className="mt-7 gap-4">
        <SectionHeader title="Question Review" subtitle="Use the result details to guide your next study session." />
        {result.responses.map((response, index) => {
          const selectedText =
            response.selectedOptionId
              ? response.question?.options?.find((entry) => entry.id === response.selectedOptionId)?.text
              : null;
          const selectedTexts = response.selectedOptionIds?.length
            ? response.selectedOptionIds.map(
                (id) => response.question?.options?.find((entry) => entry.id === id)?.text ?? id,
              )
            : [];
          const correctAnswers =
            response.question?.options?.filter((entry) => entry.isCorrect).map((entry) => entry.text).join(', ') ?? '';

          return (
            <ActionCard
              key={response.questionId}
              className={response.isCorrect ? 'border-emerald-200 bg-emerald-50/60' : 'border-rose-200 bg-rose-50/60'}
            >
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-lg font-black text-slate-950">Question {index + 1}</Text>
                  <Text className="mt-2 text-base leading-7 text-slate-700">
                    {response.question?.content ?? 'Question content unavailable.'}
                  </Text>
                </View>
                <StatusChip tone={response.isCorrect ? 'success' : 'danger'}>
                  {response.isCorrect ? 'Correct' : 'Incorrect'}
                </StatusChip>
              </View>
              <Text className="mt-4 text-sm text-slate-500">
                Your answer:{' '}
                <Text className="font-semibold text-slate-800">
                  {selectedText || selectedTexts.join(', ') || response.studentAnswer || 'No answer submitted'}
                </Text>
              </Text>
              {!response.isCorrect && !!correctAnswers && (
                <Text className="mt-2 text-sm text-slate-500">
                  Correct answer: <Text className="font-semibold text-emerald-700">{correctAnswers}</Text>
                </Text>
              )}
              {response.question?.explanation ? (
                <View className="mt-4 rounded-[20px] border border-sky-200 bg-sky-50 px-4 py-4">
                  <Text className="text-sm leading-6 text-sky-800">{response.question.explanation}</Text>
                </View>
              ) : null}
            </ActionCard>
          );
        })}
      </View>

      <View className="mt-7 gap-3">
        <AppButton title="Back To Assessment" variant="secondary" onPress={() => navigation.replace('AssessmentDetail', { assessmentId })} />
      </View>
    </Screen>
  );
}

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: 'brand' | 'slate' | 'success' | 'danger';
}) {
  const className =
    accent === 'success'
      ? 'bg-emerald-50 text-emerald-700'
      : accent === 'danger'
        ? 'bg-rose-50 text-rose-700'
        : accent === 'brand'
          ? 'bg-brand-50 text-brand-700'
          : 'bg-slate-100 text-slate-700';

  return (
    <View className="flex-1 rounded-[24px] bg-white p-4 shadow-soft">
      <Text className="text-xs font-black uppercase tracking-[1.5px] text-slate-400">{label}</Text>
      <View className={`mt-4 self-start rounded-2xl px-3 py-2 ${className}`}>
        <Text className="text-2xl font-black">{value}</Text>
      </View>
    </View>
  );
}
