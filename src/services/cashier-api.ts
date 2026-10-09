import { apiClient } from '@/src/lib/api-client';
import { sizeOf } from '@/src/data/order-utils';
import type {
  HistoryOrder,
  LineStatus,
  MenuCategory,
  MenuItem,
  OrderOption,
  OrderStatus,
} from '@/src/data/types';
import { mapOptions } from './barista-api';

type ApiOption = {
  id: string;
  name: string;
  priceDelta: string;
  isDefault?: boolean;
  chainAvailable?: boolean;
  branchAvailable?: boolean;
  effectiveAvailable?: boolean;
  branchAvailability: { isAvailable: boolean }[];
};

type ApiOptionGroupLink = {
  group: {
    id: string;
    code: string;
    name: string;
    isRequired: boolean;
    minSelections: number;
    maxSelections: number;
    options: ApiOption[];
  };
};

type ApiBranchMenuItem = {
  isAvailable: boolean;
  isEnabled: boolean;
  remainingPortions: number | null;
  chainAvailable?: boolean;
  branchEnabled?: boolean;
  branchAvailable?: boolean;
  effectiveAvailable?: boolean;
  unavailableReason?:
    | 'CHAIN_DISABLED'
    | 'NOT_ASSIGNED_TO_BRANCH'
    | 'BRANCH_SOLD_OUT'
    | 'NO_REMAINING_PORTIONS'
    | null;
  menuItem: {
    id: string;
    name: string;
    price: string;
    imageUrl: string | null;
    allowBatching?: boolean;
    isActive: boolean;
    isAvailable: boolean;
    category: { id: string; name: string };
    optionGroups: ApiOptionGroupLink[];
  };
};

type CashierContextResponse = {
  branch: { id: string; name: string; timezone: string; chain: { currency: string } };
  menuItems: ApiBranchMenuItem[];
};

export type CounterOrder = {
  id: string;
  orderCode: string;
  status: string;
  paymentStatus: string;
  totalAmount: string;
  callNumber: number | null;
  createdAt: string;
  items: {
    id: string;
    menuItemId: string;
    itemName: string;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
    selectedOptions: unknown;
    specialInstructions: string | null;
  }[];
};

export type PayosPayment = {
  id: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  qrCode: string | null;
  checkoutUrl: string | null;
  expiresAt: string | null;
};

async function loadMenu(path: '/cashier/context' | '/barista/context'): Promise<{
  branch: CashierContextResponse['branch'];
  categories: MenuCategory[];
  menu: MenuItem[];
}> {
  const { data } = await apiClient.get<CashierContextResponse>(path);
  const categoryMap = new Map<string, MenuCategory>();
  const menu = data.menuItems.map((row) => {
    const { menuItem, isAvailable, isEnabled, remainingPortions } = row;
    const chainAvailable = row.chainAvailable ?? (menuItem.isActive && menuItem.isAvailable);
    const branchEnabled = row.branchEnabled ?? isEnabled;
    const branchAvailable = row.branchAvailable ?? isAvailable;
    const hasRemainingPortions = remainingPortions === null || remainingPortions > 0;
    const effectiveAvailable =
      row.effectiveAvailable ??
      (chainAvailable && branchEnabled && branchAvailable && hasRemainingPortions);
    if (!categoryMap.has(menuItem.category.id)) {
      categoryMap.set(menuItem.category.id, {
        id: menuItem.category.id,
        label: menuItem.category.name,
        kind: /drink|beverage|nước|trà|cà phê|coffee/i.test(menuItem.category.name) ? 'drink' : 'food',
      });
    }
    return {
      id: menuItem.id,
      name: menuItem.name,
      categoryId: menuItem.category.id,
      price: Number(menuItem.price),
      available: effectiveAvailable,
      chainAvailable,
      branchEnabled,
      branchAvailable,
      remainingPortions,
      unavailableReason: row.unavailableReason ?? (
        !chainAvailable
          ? 'CHAIN_DISABLED'
          : !branchEnabled
            ? 'NOT_ASSIGNED_TO_BRANCH'
            : !branchAvailable
              ? 'BRANCH_SOLD_OUT'
              : !hasRemainingPortions
                ? 'NO_REMAINING_PORTIONS'
                : null
      ),
      image: menuItem.imageUrl ?? '',
      batchable: menuItem.allowBatching ?? true,
      options: menuItem.optionGroups.map(({ group }) => ({
        // UI uses the literal `size` to highlight Size; API still receives the option UUID.
        id: group.code.toLowerCase() === 'size' ? 'size' : group.id,
        label: group.name,
        required: group.isRequired,
        min: group.minSelections,
        max: group.maxSelections,
        choices: group.options.map((option) => ({
          id: option.id,
          label: option.name,
          priceDelta: Number(option.priceDelta),
          isDefault: option.isDefault ?? false,
          chainAvailable: option.chainAvailable ?? true,
          branchAvailable:
            option.branchAvailable ?? option.branchAvailability[0]?.isAvailable !== false,
          available:
            option.effectiveAvailable ??
            ((option.chainAvailable ?? true) &&
              (option.branchAvailable ?? option.branchAvailability[0]?.isAvailable !== false)),
        })),
      })),
    } satisfies MenuItem;
  });
  return { branch: data.branch, categories: [...categoryMap.values()], menu };
}

export const loadCashierMenu = () => loadMenu('/cashier/context');
export const loadBaristaMenu = () => loadMenu('/barista/context');

type CheckoutCartLine = {
  menuItemId: string;
  qty: number;
  note?: string;
  options: OrderOption[];
};

export async function checkoutCart(cart: CheckoutCartLine[]) {
  const { data } = await apiClient.post<CounterOrder>('/cashier/checkout', {
    items: cart.map((line) => ({
      menuItemId: line.menuItemId,
      quantity: line.qty,
      optionIds: line.options.map((option) => option.choiceId),
      specialInstructions: line.note,
    })),
  });
  return data;
}

export async function collectCash(orderId: string, stationId: string, tenderedAmount: number) {
  const { data } = await apiClient.post<{ order: CounterOrder }>(`/cashier/orders/${orderId}/payments/cash`, {
    stationId,
    tenderedAmount,
  });
  return data;
}

export async function createPayosPayment(orderId: string, stationId: string) {
  const callbackUrl = 'https://smart-fnb-be.onrender.com/api/docs';
  const { data } = await apiClient.post<PayosPayment>(`/cashier/orders/${orderId}/payments/payos`, {
    stationId,
    cancelUrl: callbackUrl,
    returnUrl: callbackUrl,
  });
  return data;
}

export async function getCounterOrder(orderId: string) {
  const { data } = await apiClient.get<CounterOrder>(`/cashier/orders/${orderId}`);
  return data;
}

export async function cancelUnpaidOrder(orderId: string, reason: string) {
  await apiClient.post(`/cashier/orders/${orderId}/cancel`, { reason });
}

type ApiHistoryOrder = {
  id: string;
  orderCode: string;
  status: string;
  paymentStatus: string;
  totalAmount: string;
  callNumber: number | null;
  createdAt: string;
  paidAt: string | null;
  readyAt: string | null;
  cancellationReason: string | null;
  items: {
    id: string;
    menuItemId: string;
    itemName: string;
    quantity: number;
    unitPrice: string;
    status: string;
    selectedOptions: unknown;
    specialInstructions: string | null;
  }[];
  payments: {
    method: string;
    status: string;
    amount: string;
    paidAt: string | null;
  }[];
};

export type OrderReceipt = {
  orderId: string;
  orderCode: string;
  callNumber: number | null;
  paidAt: string | null;
  seller: { name: string; branchName: string; address: string | null; phone: string | null };
  cashier: string | null;
};

function mapHistoryStatus(order: ApiHistoryOrder): OrderStatus {
  switch (order.status) {
    case 'CANCELLED':
      return 'Đã huỷ';
    case 'PREPARING':
      return 'Đang pha';
    case 'READY':
      return 'Sẵn sàng';
    case 'DELIVERED':
    case 'COMPLETED':
    case 'SERVED':
      return 'Hoàn tất';
    default:
      return order.paymentStatus === 'PAID' ? 'Đã thanh toán' : 'Chờ thanh toán';
  }
}

function mapHistoryLineStatus(status: string): LineStatus {
  if (status === 'CANCELLED') return 'Huỷ';
  if (status === 'OUT_OF_STOCK') return 'Hết món';
  return 'Xong';
}

function mapHistoryOrder(order: ApiHistoryOrder): HistoryOrder {
  const paidPayment = order.payments.find((payment) => payment.status === 'SUCCESS');
  return {
    id: order.id,
    orderCode: order.orderCode,
    callNumber: order.callNumber ?? undefined,
    total: Number(order.totalAmount),
    status: mapHistoryStatus(order),
    createdAt: order.createdAt,
    paidAt: order.paidAt ?? paidPayment?.paidAt ?? undefined,
    readyAt: order.readyAt ?? undefined,
    cancelledReason: order.cancellationReason ?? undefined,
    cashierName: '',
    reprintCount: 0,
    payment: paidPayment
      ? {
          method: paidPayment.method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản QR',
          amount: Number(paidPayment.amount),
          paidAt: paidPayment.paidAt ?? undefined,
        }
      : undefined,
    lines: order.items.map((item) => {
      const options = mapOptions(item.selectedOptions);
      const size = sizeOf(options);
      return {
        id: item.id,
        menuItemId: item.menuItemId,
        name: item.itemName,
        categoryId: '',
        batchable: false,
        sizeChoiceId: size?.choiceId,
        sizeLabel: size?.label,
        qty: item.quantity,
        unitPrice: Number(item.unitPrice),
        options,
        note: item.specialInstructions ?? undefined,
        status: mapHistoryLineStatus(item.status),
      };
    }),
  };
}

/** Đơn quầy hôm nay của chi nhánh (đã thanh toán + đã huỷ), mới nhất trước. */
export async function loadTodayOrders(): Promise<HistoryOrder[]> {
  const { data } = await apiClient.get<ApiHistoryOrder[]>('/cashier/orders');
  return data.map(mapHistoryOrder).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getOrderReceipt(orderId: string) {
  const { data } = await apiClient.get<OrderReceipt>(`/cashier/orders/${orderId}/receipt`);
  return data;
}

export async function reprintOrder(orderId: string, reason: string) {
  const { data } = await apiClient.post<OrderReceipt>(`/cashier/orders/${orderId}/reprint`, {
    reason: reason.trim(),
  });
  return data;
}
