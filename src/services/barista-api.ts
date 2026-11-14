import { apiClient } from '@/src/lib/api-client';
import type { Batch, OrderOption } from '@/src/data/types';

type ApiOptionSnapshot = {
  id?: string;
  groupId?: string;
  groupCode?: string;
  groupName?: string;
  name?: string;
  priceDelta?: string;
  /** 'EXTRA' = topping tính theo phần; tuỳ chọn thường không có trường này */
  kind?: string;
  /** số phần topping khách chọn (chỉ có ở topping) */
  quantity?: number;
};

const isExtraSnapshot = (option: ApiOptionSnapshot) =>
  option.kind === 'EXTRA' || option.groupCode === 'EXTRA';

type ApiBatch = {
  id: string;
  menuItemId: string;
  itemName: string;
  categoryId: string;
  size: string;
  oldestPaidAt: string;
  status: 'QUEUED' | 'PREPARING';
  units: {
    id: string;
    sequence: number;
    callNumber: number | null;
    options: unknown;
    specialInstructions: string | null;
  }[];
};

export type ReadyCounterOrder = {
  id: string;
  orderCode: string;
  callNumber: number | null;
  readyAt: string | null;
  pagerNumber?: number | null;
  pagerNotifiedAt?: string | null;
  items: { id: string; itemName: string; quantity: number }[];
};

/**
 * Snapshot tuỳ chọn của dòng đơn → OrderOption. Backend lưu topping trước tuỳ chọn và kèm số phần
 * (`quantity`); ở đây đưa tuỳ chọn lên trước, topping ghi giống giỏ POS ("+Trân châu đen ×2").
 */
export function mapOptions(value: unknown): OrderOption[] {
  if (!Array.isArray(value)) return [];
  const snapshots = value as ApiOptionSnapshot[];
  const ordered = [
    ...snapshots.filter((option) => !isExtraSnapshot(option)),
    ...snapshots.filter(isExtraSnapshot),
  ];
  return ordered.map((option) => {
    const extra = isExtraSnapshot(option);
    const qty = Number(option.quantity ?? 1);
    return {
      groupId: option.groupCode?.toLowerCase() === 'size' ? 'size' : option.groupId ?? (extra ? 'extra' : ''),
      groupLabel: option.groupName ?? '',
      choiceId: option.id ?? '',
      label: extra ? `+${option.name ?? ''}${qty > 1 ? ` ×${qty}` : ''}` : option.name ?? '',
      priceDelta: Number(option.priceDelta ?? 0),
      isDefault: false,
    };
  });
}

export async function loadBaristaQueue(): Promise<Batch[]> {
  const { data } = await apiClient.get<ApiBatch[]>('/barista/queue');
  return data.map((batch) => ({
    key: batch.id,
    menuItemId: batch.menuItemId,
    name: batch.itemName,
    categoryId: batch.categoryId,
    sizeLabel: batch.size || undefined,
    state: batch.status === 'PREPARING' ? 'started' : 'waiting',
    cupCount: batch.units.length,
    oldestPaidAt: batch.oldestPaidAt,
    entries: batch.units.map((unit) => ({
      orderId: '',
      callNumber: unit.callNumber ?? 0,
      paidAt: batch.oldestPaidAt,
      line: {
        id: unit.id,
        menuItemId: batch.menuItemId,
        name: batch.itemName,
        categoryId: batch.categoryId,
        batchable: true,
        sizeLabel: batch.size || undefined,
        qty: 1,
        unitPrice: 0,
        options: mapOptions(unit.options),
        note: unit.specialInstructions ?? undefined,
        status: batch.status === 'PREPARING' ? 'Đang pha' : 'Chờ pha',
      },
    })),
  }));
}

export async function loadReadyOrders() {
  const { data } = await apiClient.get<ReadyCounterOrder[]>('/barista/ready-orders');
  return data;
}

export async function startBatch(unitIds: string[]) {
  await apiClient.post('/barista/batches/start', { unitIds });
}

export async function completeUnit(unitId: string) {
  await apiClient.post(`/barista/units/${unitId}/complete`);
}

export async function deliverOrder(orderId: string) {
  await apiClient.post(`/barista/orders/${orderId}/deliver`);
}

export async function setMenuItemAvailability(menuItemId: string, isAvailable: boolean) {
  await apiClient.patch(`/barista/menu-items/${menuItemId}/availability`, { isAvailable });
}

export async function setMenuOptionAvailability(optionId: string, isAvailable: boolean) {
  await apiClient.patch(`/barista/menu-options/${optionId}/availability`, { isAvailable });
}

/** Topping tính tiền theo phần (menu extra) — bật/tắt còn bán ở chi nhánh của pha chế. */
export async function setMenuExtraAvailability(extraId: string, isAvailable: boolean) {
  await apiClient.patch(`/menu-extras/${extraId}/availability`, { isAvailable });
}
