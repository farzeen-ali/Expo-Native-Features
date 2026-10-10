import * as Linking from 'expo-linking';

export function openSystemSettings(): Promise<void> {
  return Linking.openSettings();
}
