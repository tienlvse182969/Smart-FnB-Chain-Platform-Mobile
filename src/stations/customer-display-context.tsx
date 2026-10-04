import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  getCustomerDisplay,
  pairCustomerDisplay,
  type CustomerDisplay,
} from '@/src/services/display-pairing-api';

/**
 * Trạng thái màn hình phía khách của quầy đang chọn. Bản thật: `connected/disconnected` đến từ sự
 * kiện Socket.IO `display:status` (11.11); mock coi máy vừa ghép là đang kết nối.
 */
export type DisplayLink =
  | { status: 'loading' }
  | { status: 'unpaired' }
  | { status: 'connected' | 'disconnected'; display: CustomerDisplay };

/** Quầy mà POS đang làm việc — chỉ cần mã và tên. */
export type DisplayStation = { id: string; name: string };

type CustomerDisplayContextValue = {
  station: DisplayStation | null;
  link: DisplayLink;
  /** ném `DisplayPairingError` khi sai mã / hết hạn / quầy bị khoá */
  pair: (code: string) => Promise<CustomerDisplay>;
  /** hộp thoại ghép (`CustomerDisplayDialog`, gắn cạnh provider) đang mở hay không */
  pairingOpen: boolean;
  openPairing: () => void;
  closePairing: () => void;
  /** giả lập màn hình khách mất kết nối để thử BR-47 — chỉ dùng cho demo */
  simulateDisconnected: boolean;
  setSimulateDisconnected: (value: boolean) => void;
};

const CustomerDisplayContext = createContext<CustomerDisplayContextValue | null>(null);

export function CustomerDisplayProvider({
  station,
  children,
}: {
  station: DisplayStation | null;
  children: ReactNode;
}) {
  const stationId = station?.id ?? null;
  const [display, setDisplay] = useState<CustomerDisplay | null | undefined>(undefined);
  const [simulateDisconnected, setSimulateDisconnected] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setDisplay(undefined);
    if (!stationId) return;
    getCustomerDisplay(stationId)
      .then((value) => {
        if (active) setDisplay(value);
      })
      .catch(() => {
        if (active) setDisplay(null);
      });
    return () => {
      active = false;
    };
  }, [stationId]);

  const pair = useCallback(
    async (code: string) => {
      if (!stationId) throw new Error('Chưa chọn quầy');
      const paired = await pairCustomerDisplay(stationId, code);
      setDisplay(paired);
      setSimulateDisconnected(false);
      return paired;
    },
    [stationId],
  );

  const value = useMemo<CustomerDisplayContextValue>(() => {
    const link: DisplayLink =
      display === undefined
        ? { status: 'loading' }
        : display === null
          ? { status: 'unpaired' }
          : { status: simulateDisconnected ? 'disconnected' : 'connected', display };
    return {
      station,
      link,
      pair,
      pairingOpen: dialogOpen,
      openPairing: () => setDialogOpen(true),
      closePairing: () => setDialogOpen(false),
      simulateDisconnected,
      setSimulateDisconnected,
    };
  }, [station, display, simulateDisconnected, dialogOpen, pair]);

  return (
    <CustomerDisplayContext.Provider value={value}>{children}</CustomerDisplayContext.Provider>
  );
}

export function useCustomerDisplay() {
  const ctx = useContext(CustomerDisplayContext);
  if (!ctx) throw new Error('useCustomerDisplay must be used inside CustomerDisplayProvider');
  return ctx;
}
