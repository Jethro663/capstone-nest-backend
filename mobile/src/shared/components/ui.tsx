import type { PropsWithChildren, ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, LinearTransition, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  padded?: boolean;
  className?: string;
  contentContainerClassName?: string;
}>;

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export function Screen({
  children,
  scroll = true,
  padded = true,
  className,
  contentContainerClassName,
}: ScreenProps) {
  const content = scroll ? (
    <ScrollView
      className={joinClasses('flex-1 bg-slate-50', className)}
      contentContainerStyle={{ paddingBottom: 48 }}
      contentContainerClassName={joinClasses(padded && 'px-5 pt-4', contentContainerClassName)}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View className={joinClasses('flex-1 bg-slate-50', padded && 'px-5 pt-4', className)}>
      {children}
    </View>
  );

  return <SafeAreaView className="flex-1 bg-slate-50">{content}</SafeAreaView>;
}

export function HeroCard({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  right?: ReactNode;
}) {
  return (
    <Animated.View
      entering={FadeInUp.duration(350)}
      className="overflow-hidden rounded-[28px] bg-white px-5 py-5 shadow-soft"
    >
      <View className="absolute right-0 top-0 h-full w-28 -translate-x-[-14px] skew-x-[-18deg] bg-brand-500/5" />
      <View className="flex-row items-start justify-between gap-4">
        <View className="flex-1">
          <View className="self-start rounded-full border border-brand-100 bg-brand-50 px-3 py-1">
            <Text className="text-[10px] font-black uppercase tracking-[2px] text-brand-600">{eyebrow}</Text>
          </View>
          <Text className="mt-3 text-[30px] font-black leading-9 text-slate-950">{title}</Text>
          <Text className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</Text>
        </View>
        {right}
      </View>
    </Animated.View>
  );
}

export function StatCard({
  label,
  value,
  accentClassName,
  icon,
}: {
  label: string;
  value: string | number;
  accentClassName: string;
  icon: ReactNode;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(260)} className="flex-1 rounded-[24px] bg-white p-4 shadow-soft">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-bold uppercase tracking-[1.5px] text-slate-400">{label}</Text>
        <View className={joinClasses('rounded-2xl px-3 py-3', accentClassName)}>{icon}</View>
      </View>
      <Text className="mt-4 text-3xl font-black text-slate-950">{value}</Text>
    </Animated.View>
  );
}

export function ActionCard({
  children,
  className,
  onPress,
}: PropsWithChildren<{ className?: string; onPress?: () => void }>) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const body = (
    <Animated.View
      layout={LinearTransition.springify()}
      entering={FadeInDown.duration(220)}
      style={animatedStyle}
      className={joinClasses(
        'rounded-[24px] border border-slate-200 bg-white p-4 shadow-soft',
        className,
      )}
    >
      {children}
    </Animated.View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.98);
      }}
      onPressOut={() => {
        scale.value = withSpring(1);
      }}
    >
      {body}
    </Pressable>
  );
}

export function StatusChip({
  tone,
  children,
}: PropsWithChildren<{ tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }>) {
  const toneClassName =
    tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : tone === 'danger'
          ? 'border-rose-200 bg-rose-50 text-rose-700'
          : tone === 'info'
            ? 'border-sky-200 bg-sky-50 text-sky-700'
            : 'border-slate-200 bg-slate-100 text-slate-600';

  return (
    <View className={joinClasses('rounded-full border px-3 py-1', toneClassName)}>
      <Text className="text-[11px] font-black uppercase tracking-[1px]">{children}</Text>
    </View>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <View className="flex-1">
        <Text className="text-xl font-black text-slate-950">{title}</Text>
        {!!subtitle && <Text className="mt-1 text-sm text-slate-500">{subtitle}</Text>}
      </View>
      {action}
    </View>
  );
}

export function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <View className="items-center rounded-[28px] border border-dashed border-slate-200 bg-white px-6 py-10 shadow-soft">
      <View className="rounded-[20px] bg-brand-50 p-4">{icon}</View>
      <Text className="mt-4 text-xl font-black text-slate-950">{title}</Text>
      <Text className="mt-2 text-center text-sm leading-6 text-slate-500">{description}</Text>
    </View>
  );
}

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
}: {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}) {
  const className =
    variant === 'secondary'
      ? 'bg-white border border-slate-200'
      : variant === 'ghost'
        ? 'bg-transparent'
        : variant === 'danger'
          ? 'bg-rose-600'
          : 'bg-slate-950';

  const textClassName =
    variant === 'secondary'
      ? 'text-slate-950'
      : variant === 'ghost'
        ? 'text-brand-600'
        : 'text-white';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={joinClasses(
        'items-center justify-center rounded-2xl px-4 py-4',
        className,
        (disabled || loading) && 'opacity-60',
      )}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? '#020617' : '#ffffff'} />
      ) : (
        <Text className={joinClasses('text-sm font-black uppercase tracking-[1px]', textClassName)}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  multiline,
  editable = true,
  error,
}: {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  multiline?: boolean;
  editable?: boolean;
  error?: string;
}) {
  return (
    <View>
      <Text className="mb-2 text-xs font-black uppercase tracking-[2px] text-slate-400">{label}</Text>
      <TextInput
        className={joinClasses(
          'rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base text-slate-950',
          multiline && 'min-h-[120px] pt-4',
          error && 'border-rose-300',
          !editable && 'bg-slate-100 text-slate-500',
        )}
        value={value}
        editable={editable}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
      {!!error && <Text className="mt-2 text-xs font-semibold text-rose-600">{error}</Text>}
    </View>
  );
}

export function SelectPill({
  title,
  selected,
  onPress,
}: {
  title: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={joinClasses(
        'rounded-full border px-4 py-3',
        selected ? 'border-brand-200 bg-brand-50' : 'border-slate-200 bg-white',
      )}
    >
      <Text className={joinClasses('text-sm font-black uppercase tracking-[1px]', selected ? 'text-brand-700' : 'text-slate-500')}>
        {title}
      </Text>
    </Pressable>
  );
}

export function InlineNotice({
  tone = 'neutral',
  text,
}: {
  tone?: 'neutral' | 'danger' | 'success' | 'warning';
  text: string;
}) {
  const className =
    tone === 'danger'
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : tone === 'success'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : tone === 'warning'
          ? 'border-amber-200 bg-amber-50 text-amber-700'
          : 'border-slate-200 bg-slate-100 text-slate-600';

  return (
    <View className={joinClasses('rounded-2xl border px-4 py-3', className)}>
      <Text className="text-sm font-semibold">{text}</Text>
    </View>
  );
}

export function ProgressBar({
  progress,
  tone = 'brand',
}: {
  progress: number;
  tone?: 'brand' | 'success';
}) {
  return (
    <View className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <Animated.View
        layout={LinearTransition.springify()}
        className={joinClasses('h-full rounded-full', tone === 'success' ? 'bg-emerald-500' : 'bg-brand-500')}
        style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }}
      />
    </View>
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <Animated.View
      entering={FadeInDown.duration(180)}
      className={joinClasses('animate-pulse rounded-2xl bg-slate-200/80', className)}
    />
  );
}
