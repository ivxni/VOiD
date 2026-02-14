import { View } from 'react-native';
import { colors } from '../lib/constants/theme';

/**
 * Root index — just a blank screen.
 *
 * Navigation is handled entirely by the auth guard in _layout.tsx:
 *   - Not authenticated → /(auth)/welcome
 *   - Authenticated + no onboarding → /(auth)/onboarding
 *   - Authenticated + onboarded → /(tabs)/home
 */
export default function Index() {
  return <View style={{ flex: 1, backgroundColor: colors.black }} />;
}
