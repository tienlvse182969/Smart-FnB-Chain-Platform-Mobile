import { Redirect } from 'expo-router';

import { useStore } from '@/src/data/store';

export default function Index() {
  const { state } = useStore();
  if (!state.checkedInAt) return <Redirect href="/login" />;
  return <Redirect href={state.role === 'Bếp' ? '/(kitchen)/queue' : '/(waiter)/floor'} />;
}
