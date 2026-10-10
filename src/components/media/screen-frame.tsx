import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabInset } from '@/constants/theme';

export function ScreenFrame({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const paddingTop = Platform.OS === 'web' ? 96 : insets.top + 12;
  const paddingBottom = Platform.OS === 'web' ? 28 : insets.bottom + BottomTabInset + 16;

  return (
    <View
      className="flex-1 bg-paper dark:bg-ink"
      style={{
        paddingTop,
        paddingBottom,
        paddingLeft: Math.max(insets.left, 20),
        paddingRight: Math.max(insets.right, 20),
      }}>
      <View className="mx-auto w-full max-w-3xl flex-1">{children}</View>
    </View>
  );
}
