import { apiClient } from '@/src/lib/api-client';
import type { MenuCategory, MenuItem, OrderOption } from '@/src/data/types';

type ApiOption = {
  id: string;
  name: string;
  priceDelta: string;
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
  remainingPortions: number | null;
  menuItem: {
    id: string;
    name: string;
    price: string;
    imageUrl: string | null;
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

async function loadMenu(path: '/cashier/context' | '/barista/context'): Promise<{
  branch: CashierContextResponse['branch'];
  categories: MenuCategory[];
  menu: MenuItem[];
}> {
  const { data } = await apiClient.get<CashierContextResponse>(path);
  const categoryMap = new Map<string, MenuCategory>();
  const menu = data.menuItems.map(({ menuItem, isAvailable }) => {
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
      // còn/hết chỉ do pha chế bật/tắt (cờ chi nhánh); số suất không ảnh hưởng
      available: isAvailable && menuItem.isAvailable,
      image: menuItem.imageUrl ?? '',
      batchable: true,
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
          isDefault: false,
          available: option.branchAvailability[0]?.isAvailable !== false,
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

export async function cancelUnpaidOrder(orderId: string, reason: string) {
  await apiClient.post(`/cashier/orders/${orderId}/cancel`, { reason });
}
