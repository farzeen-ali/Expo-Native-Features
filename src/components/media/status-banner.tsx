import { Pressable, Text, View } from 'react-native';

type Tone = 'error' | 'success' | 'info';

const TONE = {
  error: {
    label: 'Error',
    box: 'border-clay/30 bg-[#F8E4DF] dark:border-[#F0C2BC]/30 dark:bg-[#3A2220]',
    labelColor: 'text-clay dark:text-[#F0C2BC]',
    body: 'text-ink dark:text-paper',
  },
  success: {
    label: 'Saved',
    box: 'border-pine/30 bg-[#E5F3EF] dark:border-[#9ED9CC]/30 dark:bg-[#17312C]',
    labelColor: 'text-pine dark:text-[#9ED9CC]',
    body: 'text-ink dark:text-paper',
  },
  info: {
    label: 'Note',
    box: 'border-ink/10 bg-foam dark:border-white/10 dark:bg-panel',
    labelColor: 'text-mist dark:text-[#A39B90]',
    body: 'text-ink dark:text-paper',
  },
} as const;

export function StatusBanner({
  tone,
  message,
  actionLabel,
  onAction,
  onDismiss,
}: {
  tone: Tone;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
}) {
  const colors = TONE[tone];
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole={tone === 'error' ? 'alert' : 'summary'}
      className={`rounded-2xl border px-4 py-3 ${colors.box}`}>
      <Text className={`text-xs font-semibold uppercase tracking-widest ${colors.labelColor}`}>
        {colors.label}
      </Text>
      <Text className={`mt-1 text-base leading-6 ${colors.body}`}>{message}</Text>
      <View className="mt-3 flex-row flex-wrap gap-2">
        {actionLabel && onAction ? (
          <Pressable
            accessibilityRole="button"
            onPress={onAction}
            className="min-h-12 items-center justify-center rounded-full bg-ink px-4 dark:bg-paper">
            <Text className="text-sm font-semibold text-paper dark:text-ink">{actionLabel}</Text>
          </Pressable>
        ) : null}
        {onDismiss ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss message"
            onPress={onDismiss}
            className="min-h-12 items-center justify-center rounded-full px-4">
            <Text className="text-sm font-semibold text-ink dark:text-paper">Dismiss</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
