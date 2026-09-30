import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from '@/src/auth/auth-context';
import { listStations, type PosStation } from '@/src/services/stations-api';

type StationContextValue = {
  stations: PosStation[];
  selectedStation: PosStation | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  selectStation: (station: PosStation) => Promise<void>;
  clearStation: () => Promise<void>;
};

const StationContext = createContext<StationContextValue | null>(null);
const storageKey = (branchId: string) => `smartfnb.station.${branchId}`;

export function StationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const branchId = user?.employee?.branchId ?? null;
  const [stations, setStations] = useState<PosStation[]>([]);
  const [selectedStation, setSelectedStation] = useState<PosStation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (user?.role !== 'CASHIER' || !branchId) {
      setStations([]);
      setSelectedStation(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const activeStations = (await listStations()).filter((station) => station.status === 'ACTIVE');
      const savedId = await AsyncStorage.getItem(storageKey(branchId));
      setStations(activeStations);
      setSelectedStation(activeStations.find((station) => station.id === savedId) ?? null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể tải danh sách quầy');
    } finally {
      setLoading(false);
    }
  }, [branchId, user?.role]);

  useEffect(() => { void refresh(); }, [refresh]);

  const selectStation = useCallback(async (station: PosStation) => {
    if (!branchId || station.branchId !== branchId || station.status !== 'ACTIVE') {
      throw new Error('Quầy không hợp lệ với chi nhánh hiện tại');
    }
    await AsyncStorage.setItem(storageKey(branchId), station.id);
    setSelectedStation(station);
  }, [branchId]);

  const clearStation = useCallback(async () => {
    if (branchId) await AsyncStorage.removeItem(storageKey(branchId));
    setSelectedStation(null);
  }, [branchId]);

  const value = useMemo(
    () => ({ stations, selectedStation, loading, error, refresh, selectStation, clearStation }),
    [stations, selectedStation, loading, error, refresh, selectStation, clearStation],
  );
  return <StationContext.Provider value={value}>{children}</StationContext.Provider>;
}

export function useStation() {
  const value = useContext(StationContext);
  if (!value) throw new Error('useStation must be used inside StationProvider');
  return value;
}
