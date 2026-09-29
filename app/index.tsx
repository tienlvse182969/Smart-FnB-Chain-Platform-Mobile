import { Redirect } from 'expo-router';

import { useStore } from '@/src/data/store';

export default function Index() {
  const { state } = useStore();
  if (state.role === 'Thu ngân') return <Redirect href="/(cashier)/pos" />;
  if (state.role === 'Pha chế') return <Redirect href="/(barista)/queue" />;
  return <Redirect href="/login" />;
}
