import { Redirect } from 'expo-router';

import { useAuth } from '@/src/auth/auth-context';

export default function Index() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user?.role === 'CASHIER') return <Redirect href="/select-station" />;
  if (user?.role === 'BARISTA') return <Redirect href="/(barista)/queue" />;
  return <Redirect href="/login" />;
}
