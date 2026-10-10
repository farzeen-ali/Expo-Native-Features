import { useEffect, useState, type ComponentType } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

export default function CameraRoute() {
  const [Screen, setScreen] = useState<ComponentType | null>(null);

  useEffect(() => {
    let mounted = true;
    import('@/components/media/camera-studio').then((module) => {
      if (mounted) setScreen(() => module.default);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!Screen) {
    return (
      <View className="flex-1 items-center justify-center bg-ink">
        <ActivityIndicator color="#C6A15A" />
        <Text className="mt-4 text-base text-paper">Opening camera</Text>
      </View>
    );
  }

  return <Screen />;
}
