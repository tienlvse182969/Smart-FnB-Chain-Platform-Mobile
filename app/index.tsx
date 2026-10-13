import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

import { useAuth } from '@/src/auth/auth-context';
import { customerDisplayStorage } from '@/src/services/customer-display-device';

export default function Index() {
  const { user, loading } = useAuth();
  const [deviceMode, setDeviceMode] = useState<string | null | undefined>(undefined);
  useEffect(() => { void customerDisplayStorage.getMode().then(setDeviceMode); }, []);
  if (loading || deviceMode === undefined) return null;
  if (deviceMode === 'CUSTOMER_DISPLAY') return <Redirect href="/customer-display" />;
  if (user?.role === 'CASHIER') return <Redirect href="/select-station" />;
  if (user?.role === 'BARISTA') return <Redirect href="/(barista)/queue" />;
  return <Redirect href="/login" />;
}
