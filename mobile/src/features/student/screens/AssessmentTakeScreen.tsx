import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAssessmentDetail, useAssessmentSubmitMutation } from '@/api/hooks';
import type { StudentRouteParamList } from '@/navigation/types';
import type { AssessmentQuestion } from '@/types/assessment';
import { ActionCard, AppButton, ProgressBar, Screen, SectionHeader, StatusChip } from '@/shared/components/ui';

type Props = NativeStackScreenProps<StudentRouteParamList, 'AssessmentTake'>;
type AnswerValue = string | string[] | undefined;

export function AssessmentTakeScreen({ navigation, route }: Props) {
  const { assessmentId, timeLimit } = route.params;
  const assessmentQuery = useAssessmentDetail(assessmentId);
  const submitMutation = useAssessmentSubmitMutation(assessmentId);
  const assessment = assessmentQuery.data;
  const questions = useMemo(
    () => [...(assessment?.questions ?? [])].sort((a, b) => a.order - b.order),
    [assessment?.questions],
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((value) => value + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const remainingSeconds = timeLimit ? Math.max(0, timeLimit * 60 - elapsedSeconds) : null;
  const answeredCount = questions.filter((question) => isAnswered(answers[question.id])).length;
  const progress = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;
  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    if (remainingSeconds === 0 && !submitMutation.isPending && questions.length > 0) {
      void handleSubmit(true);
    }
  }, [remainingSeconds, submitMutation.isPending, questions.length]);

  async function handleSubmit(autoSubmitted = false) {
    if (!assessment) return;

    const payload = {
      assessmentId,
      timeSpentSeconds: elapsedSeconds,
      responses: questions.map((question) => {
        const answer = answers[question.id];
        if (question.type === 'multiple_choice' || question.type === 'true_false' || question.type === 'dropdown') {
          return {
            questionId: question.id,
            selectedOptionId: typeof answer === 'string' ? answer : undefined,
          };
        }
        if (question.type === 'multiple_select') {
          return {
            questionId: question.id,
            selectedOptionIds: Array.isArray(answer) ? answer : [],
          };
        }
        return {
          questionId: question.id,
          studentAnswer: typeof answer === 'string' ? answer : '',
        };
      }),
    };

    await submitMutation.mutateAsync(payload);
    if (autoSubmitted) {
      Alert.alert('Time is up', 'Your assessment was submitted automatically.', [
        {
          text: 'Open Assessment',
          onPress: () => navigation.replace('AssessmentDetail', { assessmentId }),
        },
      ]);
      return;
    }

    navigation.replace('AssessmentDetail', { assessmentId });
  }

  function confirmSubmit() {
    Alert.alert(
      'Submit assessment?',
      `You answered ${answeredCount} of ${questions.length} questions.`,
      [
        { text: 'Keep working', style: 'cancel' },
        { text: 'Submit', onPress: () => void handleSubmit(false) },
      ],
    );
  }

  if (!assessment || !currentQuestion) {
    return (
      <Screen>
        <ActionCard>
          <Text className="text-lg font-black text-slate-950">No questions available.</Text>
          <Text className="mt-2 text-sm leading-6 text-slate-500">
            This assessment has no published questions yet.
          </Text>
        </ActionCard>
      </Screen>
    );
  }

  return (
    <Screen>
      <ActionCard className="border-brand-100 bg-brand-50">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="text-lg font-black text-slate-950">{assessment.title}</Text>
            <Text className="mt-1 text-sm text-slate-500">
              Question {currentIndex + 1} of {questions.length}
            </Text>
          </View>
          <StatusChip tone={remainingSeconds !== null && remainingSeconds <= 60 ? 'danger' : 'info'}>
            {remainingSeconds !== null ? formatClock(remainingSeconds) : formatClock(elapsedSeconds)}
          </StatusChip>
        </View>
        <View className="mt-4 gap-2">
          <ProgressBar progress={progress} />
          <Text className="text-xs font-black uppercase tracking-[1px] text-slate-400">
            {answeredCount}/{questions.length} answered
          </Text>
        </View>
      </ActionCard>

      <View className="mt-7 gap-4">
        <ActionCard>
          <SectionHeader
            title={`Question ${currentIndex + 1}`}
            subtitle={currentQuestion.type.replace('_', ' ')}
            action={<StatusChip tone="warning">{currentQuestion.points} pts</StatusChip>}
          />
          <Text className="mt-4 text-lg font-semibold leading-8 text-slate-950">{currentQuestion.content}</Text>
          <View className="mt-5">
            <QuestionInput
              question={currentQuestion}
              value={answers[currentQuestion.id]}
              onChange={(nextValue) =>
                setAnswers((current) => ({
                  ...current,
                  [currentQuestion.id]: nextValue,
                }))
              }
            />
          </View>
        </ActionCard>

        <ActionCard>
          <SectionHeader title="Question Navigator" subtitle="Jump between items before submitting." />
          <View className="mt-4 flex-row flex-wrap gap-2">
            {questions.map((question, index) => (
              <Pressable
                key={question.id}
                onPress={() => setCurrentIndex(index)}
                className={`min-w-[46px] items-center rounded-2xl border px-4 py-3 ${
                  index === currentIndex
                    ? 'border-brand-500 bg-brand-500'
                    : isAnswered(answers[question.id])
                      ? 'border-emerald-200 bg-emerald-50'
                      : 'border-slate-200 bg-white'
                }`}
              >
                <Text
                  className={`text-sm font-black ${
                    index === currentIndex
                      ? 'text-white'
                      : isAnswered(answers[question.id])
                        ? 'text-emerald-700'
                        : 'text-slate-500'
                  }`}
                >
                  {index + 1}
                </Text>
              </Pressable>
            ))}
          </View>
        </ActionCard>
      </View>

      <View className="mt-7 flex-row gap-3">
        <View className="flex-1">
          <AppButton
            title="Previous"
            variant="secondary"
            onPress={() => setCurrentIndex((value) => Math.max(0, value - 1))}
            disabled={currentIndex === 0}
          />
        </View>
        <View className="flex-1">
          {currentIndex < questions.length - 1 ? (
            <AppButton title="Next" onPress={() => setCurrentIndex((value) => Math.min(questions.length - 1, value + 1))} />
          ) : (
            <AppButton title="Submit Assessment" onPress={confirmSubmit} loading={submitMutation.isPending} />
          )}
        </View>
      </View>
    </Screen>
  );
}

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: AssessmentQuestion;
  value: AnswerValue;
  onChange: (value: string | string[]) => void;
}) {
  const options = [...(question.options ?? [])].sort((a, b) => a.order - b.order);

  if (question.type === 'short_answer' || question.type === 'fill_blank') {
    return (
      <TextInput
        multiline
        value={typeof value === 'string' ? value : ''}
        onChangeText={onChange}
        placeholder="Type your answer..."
        placeholderTextColor="#94a3b8"
        textAlignVertical="top"
        className="min-h-[140px] rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-base text-slate-950"
      />
    );
  }

  if (question.type === 'dropdown') {
    return (
      <View className="gap-2">
        {options.map((option) => (
          <OptionRow
            key={option.id}
            label={option.text}
            active={value === option.id}
            onPress={() => onChange(option.id)}
          />
        ))}
      </View>
    );
  }

  if (question.type === 'multiple_select') {
    const selected = Array.isArray(value) ? value : [];
    return (
      <View className="gap-2">
        {options.map((option) => (
          <OptionRow
            key={option.id}
            label={option.text}
            active={selected.includes(option.id)}
            onPress={() =>
              onChange(
                selected.includes(option.id)
                  ? selected.filter((entry) => entry !== option.id)
                  : [...selected, option.id],
              )
            }
          />
        ))}
      </View>
    );
  }

  return (
    <View className="gap-2">
      {options.map((option) => (
        <OptionRow
          key={option.id}
          label={option.text}
          active={value === option.id}
          onPress={() => onChange(option.id)}
        />
      ))}
    </View>
  );
}

function OptionRow({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-[22px] border px-4 py-4 ${active ? 'border-brand-200 bg-brand-50' : 'border-slate-200 bg-white'}`}
    >
      <Text className={`text-base ${active ? 'font-black text-brand-700' : 'font-semibold text-slate-700'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function isAnswered(value: AnswerValue) {
  if (Array.isArray(value)) return value.length > 0;
  return typeof value === 'string' && value.trim().length > 0;
}

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
