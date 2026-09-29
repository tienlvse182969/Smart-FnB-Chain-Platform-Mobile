import { useEffect, useState } from 'react';

/** Trả về `Date.now()` và tự cập nhật mỗi `intervalMs` — dùng cho đồng hồ đếm ngược và thời gian chờ. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
