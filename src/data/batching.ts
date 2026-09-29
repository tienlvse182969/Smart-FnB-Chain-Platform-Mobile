import type { Batch, BatchEntry, Order } from './types';

/** Cửa sổ gom W — ly chỉ được gom với ly đầu mẻ nếu thanh toán cách nhau không quá W (mục 8.4). */
export const BATCH_WINDOW_MS = 5 * 60_000;
/** Trần số ly K của một mẻ. */
export const BATCH_MAX_CUPS = 4;

/** Đơn đã trả tiền mới có dòng món trong hàng đợi (BR-17, BR-32). */
const isQueued = (order: Order) => order.status === 'Đã thanh toán' || order.status === 'Đang pha';

const byPaidThenCall = (a: BatchEntry, b: BatchEntry) =>
  new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime() || a.callNumber - b.callNumber;

const cups = (entries: BatchEntry[]) => entries.reduce((sum, e) => sum + e.line.qty, 0);

function toBatch(key: string, state: Batch['state'], entries: BatchEntry[]): Batch {
  const head = entries[0].line;
  return {
    key,
    menuItemId: head.menuItemId,
    name: head.name,
    categoryId: head.categoryId,
    sizeLabel: head.sizeLabel,
    state,
    entries,
    cupCount: cups(entries),
    oldestPaidAt: entries.reduce((min, e) => (e.paidAt < min ? e.paidAt : min), entries[0].paidAt),
  };
}

/**
 * Thuật toán gom món trong hàng đợi pha chế (mục 8.5), tham lam O(n²):
 * 1. dòng `Chờ pha` của đơn đã trả tiền, sắp theo thời điểm thanh toán rồi số gọi;
 * 2. dòng đầu chưa vào mẻ mở mẻ mới;
 * 3. quét các dòng sau — cùng món + size, trong cửa sổ W từ dòng đầu, tổng ly ≤ K — thêm vào mẻ;
 * 4. lặp tới khi mọi dòng đều thuộc một mẻ.
 *
 * Ràng buộc: mẻ đầu hàng đợi luôn chứa dòng chờ lâu nhất (BR-34); không tách một dòng (dòng
 * có qty ≥ K tự thành một mẻ); món `batchable: false` mỗi dòng một mẻ. Mẻ đã Bắt đầu thì khoá
 * và luôn nằm trên cùng — không tính lại.
 */
export function buildBatches(orders: Order[]): Batch[] {
  const started = new Map<string, BatchEntry[]>();
  const waiting: BatchEntry[] = [];

  for (const order of orders) {
    if (!isQueued(order) || order.callNumber === undefined || !order.paidAt) continue;
    for (const line of order.lines) {
      const entry: BatchEntry = {
        orderId: order.id,
        callNumber: order.callNumber,
        paidAt: order.paidAt,
        line,
      };
      if (line.status === 'Đang pha' && line.batchId) {
        started.set(line.batchId, [...(started.get(line.batchId) ?? []), entry]);
      } else if (line.status === 'Chờ pha') {
        waiting.push(entry);
      }
    }
  }

  const startedBatches = [...started.entries()]
    .map(([id, entries]) => toBatch(id, 'started', entries.sort(byPaidThenCall)))
    .sort((a, b) => {
      const ta = Math.min(...a.entries.map((e) => new Date(e.line.startedAt ?? e.paidAt).getTime()));
      const tb = Math.min(...b.entries.map((e) => new Date(e.line.startedAt ?? e.paidAt).getTime()));
      return ta - tb;
    });

  waiting.sort(byPaidThenCall);
  const used = new Set<string>();
  const waitingBatches: Batch[] = [];

  for (const head of waiting) {
    if (used.has(head.line.id)) continue;
    used.add(head.line.id);
    const entries = [head];
    let total = head.line.qty;

    if (head.line.batchable && total < BATCH_MAX_CUPS) {
      const headTime = new Date(head.paidAt).getTime();
      for (const other of waiting) {
        if (used.has(other.line.id)) continue;
        if (
          other.line.menuItemId !== head.line.menuItemId ||
          other.line.sizeChoiceId !== head.line.sizeChoiceId ||
          !other.line.batchable
        ) {
          continue;
        }
        if (new Date(other.paidAt).getTime() - headTime > BATCH_WINDOW_MS) continue;
        if (total + other.line.qty > BATCH_MAX_CUPS) continue;
        used.add(other.line.id);
        entries.push(other);
        total += other.line.qty;
      }
    }
    waitingBatches.push(toBatch(`w_${head.line.id}`, 'waiting', entries));
  }

  return [...startedBatches, ...waitingBatches];
}

export type WaitLevel = 'bình thường' | 'sắp trễ' | 'trễ';

/** Mức chờ của mẻ tính từ ly thanh toán sớm nhất — đổi màu thẻ mẻ ở màn hình pha chế (mục 4.7). */
export function waitLevelOf(paidAt: string, now = Date.now()): WaitLevel {
  const mins = (now - new Date(paidAt).getTime()) / 60_000;
  if (mins > 10) return 'trễ';
  if (mins >= 5) return 'sắp trễ';
  return 'bình thường';
}
