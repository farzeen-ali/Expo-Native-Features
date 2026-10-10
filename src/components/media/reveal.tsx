import { MotiView } from 'moti';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export function Reveal({
  children,
  delay = 0,
  reduced = false,
  style,
}: {
  children: ReactNode;
  delay?: number;
  reduced?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <MotiView
      style={style}
      from={{ opacity: reduced ? 1 : 0, translateY: reduced ? 0 : 16 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: reduced ? 0 : 420, delay: reduced ? 0 : delay }}>
      {children}
    </MotiView>
  );
}
