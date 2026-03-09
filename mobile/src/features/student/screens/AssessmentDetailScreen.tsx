import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAssessmentAttempts, useAssessmentDetail } from '@/api/hooks';
import { assessmentsApi } from '@/api/services/assessments';
import type { StudentRouteParamList } from '@/navigation/types';
import { ActionCard, AppButton, EmptyState, HeroCard, Screen, SectionHeader, StatCard, StatusChip } from '@/shared/components/ui';
import { formatDate, formatDateTime, getDescription } from '@/shared/utils/helpers';

type Props = NativeStackScreenProps<StudentRouteParamList, 'AssessmentDetail'>;

export function AssessmentDetailScreen({ navigation, route }: Props) {
  const { assessmentId } = route.params;
  const assessmentQuery = useAssessmentDetail(assessmentId);
  const attemptsQuery = useAssessmentAttempts(assessmentId);
  const assessment = assessmentQuery.data;
  const attempts = useMemo(
    () => [...(attemptsQuery.data ?? [])].sort((a, b) => {
      const left = new Date(b.submittedAt ?? b.createdAt ?? 0).getTime();
      const right = new Date(a.submittedAt ?? a.createdAt ?? 0).getTime();
      return left - right;
    }),
    [attemptsQuery.data],
  );
  const submittedAttempts = attempts.filter((entry) => entry.isSubmitted !== false);
  const maxAttempts = assessment?.maxAttempts ?? 1;
  const attemptsRemaining = Math.max(0, maxAttempts - submittedAttempts.length);

  async function startAttempt() {
    const payload = await assessmentsApi.startAttempt(assessmentId);
    navigation.navigate('AssessmentTake', {
      assessmentId,
      attemptId: payload.attempt.id,
      timeLimit: payload.timeLimitMinutes,
    });
  }

  return (
    <Screen>
      <HeroCard
        eyebrow="Assessment Hub"
        title={assessment?.title ?? 'Assessment'}
        subtitle={getDescription(assessment?.description) || 'Review the assessment details, then start when you are ready.'}
        right={
          assessment ? (
            <StatusChip tone={assessment.type === 'exam' ? 'danger' : assessment.type === 'assignment' ? 'warning' : 'info'}>
              {assessment.type}
            </StatusChip>
          ) : undefined
        }
      />

      {!assessment ? (
        <View className="mt-7">
          <EmptyState
            title="Assessment not found"
            description="This assessment may have been removed or you no longer have access."
            icon={<MaterialCommunityIcons name="clipboard-remove-outline" size={28} color="#dc2626" />}
          />
        </View>
      ) : (
        <>
          <View className="mt-6 flex-row gap-3">
            <StatCard
              label="Questions"
              value={assessment.questions?.length ?? 0}
              accentClassName="bg-slate-950"
              icon={<MaterialCommunityIcons name="help-circle-outline" size={18} color="#ffffff" />}
            />
            <StatCard
              label="Points"
              value={assessment.totalPoints ?? 0}
              accentClassName="bg-brand-500"
              icon={<MaterialCommunityIcons name="star-circle-outline" size={18} color="#ffffff" />}
            />
            <StatCard
              label="Attempts Left"
              value={attemptsRemaining}
              accentClassName="bg-slate-950"
              icon={<MaterialCommunityIcons name="history" size={18} color="#ffffff" />}
            />
          </View>

          <View className="mt-7 gap-4">
            <ActionCard>
              <SectionHeader title="Assessment Rules" subtitle="Know the attempt limits before you begin." />
              <View className="mt-4 gap-3">
                <RuleRow label="Due Date" value={assessment.dueDate ? formatDate(assessment.dueDate) : 'No due date'} />
                <RuleRow label="Passing Score" value={`${assessment.passingScore ?? 60}%`} />
                <RuleRow label="Time Limit" value={assessment.timeLimitMinutes ? `${assessment.timeLimitMinutes} min` : 'Untimed'} />
                <RuleRow label="Attempts" value={`${submittedAttempts.length}/${maxAttempts} used`} />
              </View>
            </ActionCard>

            <AppButton
              title={submittedAttempts.length > 0 ? 'Start Another Attempt' : 'Start Assessment'}
              onPress={() => void startAttempt()}
              disabled={attemptsRemaining <= 0}
            />
          </View>

          <View className="mt-7 gap-4">
            <SectionHeader title="Attempt History" subtitle="Review submitted attempts and open result pages." />
            {submittedAttempts.length === 0 ? (
              <EmptyState
                title="No attempts yet"
                description="Start this assessment to create your first attempt."
                icon={<MaterialCommunityIcons name="timer-sand-empty" size={28} color="#dc2626" />}
              />
            ) : (
              submittedAttempts.map((attempt) => (
                <ActionCard
                  key={attempt.id}
                  onPress={() =>
                    navigation.navigate('AssessmentResults', {
                      assessmentId,
                      attemptId: attempt.id,
                    })
                  }
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-lg font-black text-slate-950">
                        Attempt #{attempt.attemptNumber ?? submittedAttempts.length}
                      </Text>
                      <Text className="mt-1 text-sm leading-6 text-slate-500">
                        Submitted {formatDateTime(attempt.submittedAt ?? attempt.createdAt)}
                      </Text>
                    </View>
                    {attempt.isReturned === false ? (
                      <StatusChip tone="warning">Awaiting Review</StatusChip>
                    ) : (
                      <StatusChip tone={attempt.passed ? 'success' : 'danger'}>
                        {attempt.score ?? 0}%
                      </StatusChip>
                    )}
                  </View>
                </ActionCard>
              ))
            )}
          </View>
        </>
      )}
    </Screen>
  );
}

function RuleRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="text-sm font-black uppercase tracking-[1px] text-slate-400">{label}</Text>
      <Text className="text-sm font-semibold text-slate-700">{value}</Text>
    </View>
  );
}
