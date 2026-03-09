import { useMemo } from 'react';
import { Image, Linking, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useLessonCompleteMutation, useLessonDetail, useLessonStatus } from '@/api/hooks';
import type { StudentRouteParamList } from '@/navigation/types';
import type { ContentBlock } from '@/types/lesson';
import { ActionCard, AppButton, EmptyState, HeroCard, ProgressBar, Screen, SectionHeader, StatusChip } from '@/shared/components/ui';
import { getDescription } from '@/shared/utils/helpers';

type Props = NativeStackScreenProps<StudentRouteParamList, 'LessonDetail'>;

export function LessonDetailScreen({ navigation, route }: Props) {
  const { lessonId, classId } = route.params;
  const lessonQuery = useLessonDetail(lessonId);
  const lessonStatusQuery = useLessonStatus(lessonId);
  const completeMutation = useLessonCompleteMutation(classId, lessonId);

  const lesson = lessonQuery.data;
  const contentBlocks = useMemo(
    () => [...(lesson?.contentBlocks ?? [])].sort((a, b) => a.order - b.order),
    [lesson?.contentBlocks],
  );

  const completed = lessonStatusQuery.data?.completed ?? false;
  const progress = contentBlocks.length > 0 ? 100 : completed ? 100 : 12;

  return (
    <Screen>
      <HeroCard
        eyebrow="Lesson Reader"
        title={lesson?.title ?? 'Lesson'}
        subtitle={getDescription(lesson?.description) || 'Review each content block, then mark the lesson complete.'}
        right={
          <View className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
            <Text className="text-[10px] font-black uppercase tracking-[2px] text-slate-400">Status</Text>
            <Text className={`mt-1 text-sm font-black ${completed ? 'text-emerald-600' : 'text-brand-600'}`}>
              {completed ? 'Completed' : 'In Progress'}
            </Text>
          </View>
        }
      />

      <View className="mt-6">
        <ProgressBar progress={progress} tone={completed ? 'success' : 'brand'} />
      </View>

      <View className="mt-7 gap-4">
        <SectionHeader
          title="Learning Blocks"
          subtitle={`${contentBlocks.length} block${contentBlocks.length === 1 ? '' : 's'} in this lesson`}
          action={completed ? <StatusChip tone="success">Completed</StatusChip> : <StatusChip tone="warning">Pending</StatusChip>}
        />
        {!lesson ? (
          <EmptyState
            title="Lesson not found"
            description="This lesson may have been removed or you no longer have access."
            icon={<MaterialCommunityIcons name="book-remove-outline" size={28} color="#dc2626" />}
          />
        ) : contentBlocks.length === 0 ? (
          <EmptyState
            title="No lesson content yet"
            description="This lesson is published, but the content blocks are still empty."
            icon={<MaterialCommunityIcons name="book-open-outline" size={28} color="#dc2626" />}
          />
        ) : (
          contentBlocks.map((block, index) => (
            <ContentBlockCard key={block.id} index={index + 1} block={block} />
          ))
        )}
      </View>

      <View className="mt-7 gap-3">
        <AppButton
          title={completed ? 'Lesson Completed' : 'Mark Lesson Complete'}
          onPress={() => completeMutation.mutate()}
          disabled={completed}
          loading={completeMutation.isPending}
        />
        <AppButton
          title={classId ? 'Back To Class' : 'Back'}
          variant="secondary"
          onPress={() => (classId ? navigation.navigate('ClassDetail', { classId }) : navigation.goBack())}
        />
      </View>
    </Screen>
  );
}

function ContentBlockCard({
  block,
  index,
}: {
  block: ContentBlock;
  index: number;
}) {
  const textContent = extractText(block.content);
  const urlContent = extractUrl(block.content);
  const metadata = (block.metadata ?? {}) as Record<string, unknown>;
  const label = block.type.replace('_', ' ');

  if (block.type === 'divider') {
    return (
      <View className="items-center py-2">
        <View className="h-[1px] w-full bg-slate-200" />
      </View>
    );
  }

  return (
    <ActionCard>
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-xs font-black uppercase tracking-[2px] text-slate-400">
          Block {index}
        </Text>
        <StatusChip tone="info">{label}</StatusChip>
      </View>

      {block.type === 'text' && (
        <Text className="mt-4 text-base leading-7 text-slate-700">
          {textContent || 'No text available.'}
        </Text>
      )}

      {block.type === 'image' && (
        <View className="mt-4 gap-3">
          {urlContent ? (
            <Image
              source={{ uri: urlContent }}
              className="h-60 w-full rounded-[22px] bg-slate-100"
              resizeMode="cover"
            />
          ) : null}
          <Text className="text-sm leading-6 text-slate-500">
            {String(metadata.caption ?? textContent ?? 'Image block')}
          </Text>
        </View>
      )}

      {block.type === 'video' && (
        <View className="mt-4 gap-3">
          <Text className="text-base leading-7 text-slate-700">
            {textContent || 'Video resource'}
          </Text>
          <AppButton
            title="Open Video"
            variant="secondary"
            onPress={() => {
              if (urlContent) {
                void Linking.openURL(urlContent);
              }
            }}
          />
        </View>
      )}

      {block.type === 'question' && (
        <View className="mt-4 rounded-[22px] border border-sky-200 bg-sky-50 px-4 py-4">
          <Text className="text-xs font-black uppercase tracking-[2px] text-sky-700">Reflection Prompt</Text>
          <Text className="mt-3 text-base leading-7 text-slate-700">
            {textContent || 'Question unavailable.'}
          </Text>
        </View>
      )}

      {block.type === 'file' && (
        <View className="mt-4 gap-3">
          <View className="flex-row items-center gap-3">
            <View className="rounded-2xl bg-brand-50 p-3">
              <MaterialCommunityIcons name="paperclip" size={20} color="#dc2626" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-black text-slate-950">
                {String(metadata.fileName ?? textContent ?? 'Attachment')}
              </Text>
              <Text className="mt-1 text-sm text-slate-500">Open the class attachment in your browser.</Text>
            </View>
          </View>
          <AppButton
            title="Open Attachment"
            variant="secondary"
            onPress={() => {
              const fileUrl = typeof metadata.url === 'string' ? metadata.url : urlContent;
              if (fileUrl) {
                void Linking.openURL(fileUrl);
              }
            }}
          />
        </View>
      )}
    </ActionCard>
  );
}

function extractText(content: ContentBlock['content']) {
  if (typeof content === 'string') return content;
  if (content && typeof content === 'object' && 'text' in content) {
    return String((content as { text?: string }).text ?? '');
  }
  return '';
}

function extractUrl(content: ContentBlock['content']) {
  if (typeof content === 'string' && /^https?:\/\//.test(content)) return content;
  if (content && typeof content === 'object') {
    const candidate = (content as { url?: string; text?: string }).url ?? (content as { text?: string }).text;
    return typeof candidate === 'string' ? candidate : '';
  }
  return '';
}
