import { apiClient } from '@/src/lib/api-client';

export type PosStation = {
  id: string;
  branchId: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  printerConnection: 'NONE' | 'BLUETOOTH' | 'WIFI';
  printerAddress: string | null;
};

export async function listStations() {
  const { data } = await apiClient.get<PosStation[]>('/stations');
  return data;
}
