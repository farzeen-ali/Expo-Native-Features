import { useColorScheme } from 'react-native';

export function usePalette() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  return {
    dark,
    icon: dark ? '#F3EEE6' : '#14161C',
    muted: dark ? '#A39B90' : '#5C564E',
    paper: '#F3EEE6',
    ink: '#14161C',
    brass: '#C6A15A',
    brassInk: '#2A2112',
    bone: dark ? '#2A2E38' : '#E4DCCE',
    placeholder: dark ? '#A39B90' : '#5C564E',
    danger: dark ? '#F0C2BC' : '#8E3B32',
  };
}
