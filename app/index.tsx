import { Redirect } from 'expo-router';

import { useStore } from '@/src/data/store';

export default function Index() {
  const { state } = useStore();
  return <Redirect href={state.checkedInAt ? '/(waiter)/floor' : '/login'} />;
}
