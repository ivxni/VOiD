import { Redirect } from 'expo-router';
import { useAuthStore } from '../lib/store/useAuthStore';

export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/camera" />;
  }

  return <Redirect href="/(auth)/welcome" />;
}
