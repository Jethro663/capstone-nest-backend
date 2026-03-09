import { Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { usePerformanceSummary } from '@/api/hooks';
import type { StudentRouteParamList } from '@/navigation/types';
import { ActionCard, EmptyState, HeroCard, Screen, SectionHeader, StatCard, StatusChip } from '@/shared/components/ui';
import { formatDateTime } from '@/shared/utils/helpers';

type Props = NativeStackScreenProps<StudentRouteParamList, 'Performance'>;

export function PerformanceScreen(_: Props) {
  const summaryQuery = usePerformanceSummary();
  const summary = summaryQuery.data;
  const classes = summary?.classes ?? [];

  return (
    <Screen>
      <HeroCard
        eyebrow="Performance Insights"
        title="Academic Standing"
        subtitle={`Maintain at least ${summary?.threshold ?? 74}% blended score to stay on track.`}
        right={
          <View className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
            <Text className="text-[10px] font-black uppercase tracking-[2px] text-slate-400">Average</Text>
            <Text className="mt-1 text-2xl font-black text-brand-600">
              {summary?.overall.averageBlendedScore != null ? `${summary.overall.averageBlendedScore.toFixed(1)}%` : '--'}
            </Text>
          </View>
        }
      />

      <View className="mt-6 flex-row gap-3">
        <StatCard
          label="Classes"
          value={summary?.overall.totalClasses ?? 0}
          accentClassName="bg-slate-950"
          icon={<MaterialCommunityIcons name="school-outline" size={18} color="#ffffff" />}
        />
        <StatCard
          label="Graded"
          value={summary?.overall.classesWithData ?? 0}
          accentClassName="bg-brand-500"
          icon={<MaterialCommunityIcons name="chart-box-outline" size={18} color="#ffffff" />}
        />
        <StatCard
          label="At Risk"
          value={summary?.overall.atRiskClasses ?? 0}
          accentClassName={(summary?.overall.atRiskClasses ?? 0) > 0 ? 'bg-rose-600' : 'bg-emerald-600'}
          icon={<MaterialCommunityIcons name="alert-outline" size={18} color="#ffffff" />}
        />
      </View>

      <View className="mt-7 gap-4">
        <SectionHeader title="Subject Breakdown" subtitle="Every enrolled class with computed performance data." />
        {classes.length === 0 ? (
          <EmptyState
            title="No performance data yet"
            description="Grades have not been computed for your classes yet."
            icon={<MaterialCommunityIcons name="chart-bar-stacked" size={28} color="#dc2626" />}
          />
        ) : (
          classes.map((entry) => (
            <ActionCard key={entry.classId} className={entry.isAtRisk ? 'border-rose-200 bg-rose-50/50' : undefined}>
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-lg font-black text-slate-950">{entry.class?.subjectName ?? entry.classId}</Text>
                  <Text className="mt-1 text-sm uppercase tracking-[1px] text-slate-400">
                    {entry.class?.subjectCode ?? 'CLASS'} | {entry.class?.section?.name ?? 'Section'}
                  </Text>
                </View>
                <StatusChip tone={entry.isAtRisk ? 'danger' : 'success'}>
                  {entry.isAtRisk ? 'At Risk' : 'Stable'}
                </StatusChip>
              </View>

              <View className="mt-4 flex-row gap-3">
                <ScoreTile label="Assessment" value={entry.assessmentAverage} />
                <ScoreTile label="Record" value={entry.classRecordAverage} />
                <ScoreTile label="Blended" value={entry.blendedScore} emphasis />
              </View>

              <Text className="mt-4 text-xs font-black uppercase tracking-[1px] text-slate-400">
                Last computed {formatDateTime(entry.lastComputedAt)}
              </Text>
            </ActionCard>
          ))
        )}
      </View>
    </Screen>
  );
}

function ScoreTile({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: number | null;
  emphasis?: boolean;
}) {
  return (
    <View className={`flex-1 rounded-[22px] px-4 py-4 ${emphasis ? 'bg-brand-50' : 'bg-slate-50'}`}>
      <Text className={`text-xs font-black uppercase tracking-[1px] ${emphasis ? 'text-brand-600' : 'text-slate-400'}`}>
        {label}
      </Text>
      <Text className={`mt-2 text-2xl font-black ${emphasis ? 'text-brand-700' : 'text-slate-900'}`}>
        {value != null ? `${value.toFixed(1)}%` : '--'}
      </Text>
    </View>
  );
}
