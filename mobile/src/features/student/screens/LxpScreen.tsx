import { useEffect, useMemo, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useLxpCheckpointMutation, useLxpEligibility, useLxpPlaylist } from '@/api/hooks';
import { lxpApi } from '@/api/services/lxp';
import type { StudentRouteParamList, StudentTabParamList } from '@/navigation/types';
import { ActionCard, AppButton, EmptyState, HeroCard, ProgressBar, Screen, SectionHeader, SelectPill, StatusChip } from '@/shared/components/ui';

type Props = CompositeScreenProps<
  BottomTabScreenProps<StudentTabParamList, 'Lxp'>,
  NativeStackScreenProps<StudentRouteParamList>
>;

export function LxpScreen({ navigation }: Props) {
  const eligibilityQuery = useLxpEligibility();
  const eligibility = eligibilityQuery.data;
  const eligibleClasses = eligibility?.eligibleClasses ?? [];
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [feedback, setFeedback] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    if (!selectedClassId && eligibleClasses[0]?.classId) {
      setSelectedClassId(eligibleClasses[0].classId);
    }
  }, [eligibleClasses, selectedClassId]);

  const selectedClass = useMemo(
    () => eligibleClasses.find((entry) => entry.classId === selectedClassId) ?? null,
    [eligibleClasses, selectedClassId],
  );
  const playlistQuery = useLxpPlaylist(selectedClassId);
  const checkpointMutation = useLxpCheckpointMutation(selectedClassId);
  const playlist = playlistQuery.data;

  async function submitFeedback() {
    setSubmittingFeedback(true);
    try {
      await lxpApi.submitFeedback({
        targetModule: 'lxp',
        usabilityScore: 4,
        functionalityScore: 4,
        performanceScore: 4,
        satisfactionScore: 4,
        feedback: feedback.trim() || undefined,
      });
      setFeedback('');
    } finally {
      setSubmittingFeedback(false);
    }
  }

  return (
    <Screen>
      <HeroCard
        eyebrow="LXP Intervention"
        title="Recovery Playlist"
        subtitle={`Access opens when your blended score falls below ${eligibility?.threshold ?? 74}%. Complete checkpoints to earn XP and recover faster.`}
        right={
          playlist ? (
            <View className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
              <Text className="text-[10px] font-black uppercase tracking-[2px] text-slate-400">XP Total</Text>
              <Text className="mt-1 text-2xl font-black text-brand-600">{playlist.progress.xpTotal}</Text>
            </View>
          ) : undefined
        }
      />

      {eligibleClasses.length === 0 ? (
        <View className="mt-7">
          <EmptyState
            title="No active intervention"
            description="You currently have no LXP-eligible classes."
            icon={<MaterialCommunityIcons name="rocket-launch-outline" size={28} color="#dc2626" />}
          />
        </View>
      ) : (
        <>
          <View className="mt-7 gap-4">
            <SectionHeader title="Eligible Classes" subtitle="Choose a class to open its intervention playlist." />
            <View className="flex-row flex-wrap gap-2">
              {eligibleClasses.map((entry) => (
                <SelectPill
                  key={entry.classId}
                  title={entry.class.subjectCode}
                  selected={selectedClassId === entry.classId}
                  onPress={() => setSelectedClassId(entry.classId)}
                />
              ))}
            </View>
            {selectedClass ? (
              <ActionCard>
                <Text className="text-lg font-black text-slate-950">{selectedClass.class.subjectName}</Text>
                <Text className="mt-1 text-sm uppercase tracking-[1px] text-slate-400">
                  {selectedClass.class.subjectCode} | {selectedClass.class.section?.name ?? 'Section'}
                </Text>
                <Text className="mt-3 text-sm text-slate-500">
                  Trigger score: {selectedClass.blendedScore ?? '--'}% | Threshold {selectedClass.thresholdApplied}%
                </Text>
              </ActionCard>
            ) : null}
          </View>

          {playlist ? (
            <>
              <View className="mt-7 flex-row gap-3">
                <MetricBox label="Completion" value={`${playlist.progress.completionPercent}%`} />
                <MetricBox label="Streak" value={`${playlist.progress.streakDays}d`} />
                <MetricBox label="Done" value={playlist.progress.checkpointsCompleted} />
              </View>

              <View className="mt-7 gap-4">
                <SectionHeader title="Checkpoint Playlist" subtitle="Progress through the recovery track one step at a time." />
                <ProgressBar progress={playlist.progress.completionPercent} />
                {playlist.checkpoints.length === 0 ? (
                  <EmptyState
                    title="No checkpoints assigned"
                    description="Your intervention case is open, but no tasks have been posted yet."
                    icon={<MaterialCommunityIcons name="playlist-remove" size={28} color="#dc2626" />}
                  />
                ) : (
                  playlist.checkpoints.map((checkpoint, index) => (
                    <ActionCard key={checkpoint.id} className={checkpoint.isCompleted ? 'border-emerald-200 bg-emerald-50/60' : undefined}>
                      <View className="flex-row items-start justify-between gap-3">
                        <View className="flex-1">
                          <Text className="text-xs font-black uppercase tracking-[2px] text-slate-400">Checkpoint {index + 1}</Text>
                          <Text className="mt-2 text-lg font-black text-slate-950">{checkpoint.label}</Text>
                          <Text className="mt-2 text-sm leading-6 text-slate-500">
                            {checkpoint.type === 'lesson_review' ? 'Review lesson content and reinforce concepts.' : 'Retry an assessment-linked intervention checkpoint.'}
                          </Text>
                        </View>
                        <StatusChip tone={checkpoint.isCompleted ? 'success' : 'warning'}>
                          +{checkpoint.xpAwarded} XP
                        </StatusChip>
                      </View>

                      <View className="mt-4 flex-row flex-wrap gap-2">
                        {checkpoint.lesson?.id ? (
                          <AppButton
                            title="Open Lesson"
                            variant="secondary"
                            onPress={() =>
                              navigation.navigate('LessonDetail', {
                                lessonId: checkpoint.lesson!.id,
                                classId: selectedClassId,
                              })
                            }
                          />
                        ) : null}
                        {checkpoint.assessment?.id ? (
                          <AppButton
                            title="Open Assessment"
                            variant="secondary"
                            onPress={() =>
                              navigation.navigate('AssessmentDetail', {
                                assessmentId: checkpoint.assessment!.id,
                                classId: selectedClassId,
                              })
                            }
                          />
                        ) : null}
                        <AppButton
                          title={checkpoint.isCompleted ? 'Checkpoint Done' : 'Mark Complete'}
                          onPress={() => checkpointMutation.mutate({ assignmentId: checkpoint.id })}
                          disabled={checkpoint.isCompleted}
                          loading={checkpointMutation.isPending}
                        />
                      </View>
                    </ActionCard>
                  ))
                )}
              </View>
            </>
          ) : null}

          <View className="mt-7">
            <ActionCard>
              <SectionHeader title="Quick LXP Feedback" subtitle="Record simple student feedback for the intervention module." />
              <TextInput
                multiline
                value={feedback}
                onChangeText={setFeedback}
                placeholder="Share what helped you most..."
                placeholderTextColor="#94a3b8"
                textAlignVertical="top"
                className="mt-4 min-h-[120px] rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-base text-slate-950"
              />
              <View className="mt-4">
                <AppButton title="Submit Feedback" onPress={() => void submitFeedback()} loading={submittingFeedback} />
              </View>
            </ActionCard>
          </View>
        </>
      )}
    </Screen>
  );
}

function MetricBox({ label, value }: { label: string; value: string | number }) {
  return (
    <View className="flex-1 rounded-[24px] bg-white p-4 shadow-soft">
      <Text className="text-xs font-black uppercase tracking-[1.5px] text-slate-400">{label}</Text>
      <Text className="mt-4 text-3xl font-black text-slate-950">{value}</Text>
    </View>
  );
}
