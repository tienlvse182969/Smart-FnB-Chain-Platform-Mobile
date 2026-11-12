import { absoluteAssetUrl, apiClient } from '@/src/lib/api-client';
import { sizeOf } from '@/src/data/order-utils';
import type { CartCombo } from '@/src/data/store';
import type {
  HistoryOrder,
  LineStatus,
  MenuCategory,
  MenuCombo,
  MenuItem,
  OrderOption,
  OrderRefundRef,
  OrderStatus,
  SelectedExtra,
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
    maxExtras?: number;
    extras?: {
      extraId: string;
      name: string;
      price: string;
      maxQuantity: number;
      isActive: boolean;
      isAvailable: boolean;
    }[];
  };
};

type ApiBranchCombo = {
  effectiveAvailable: boolean;
  combo: {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    price: string;
    components: {
      id: string;
      name: string;
      type: 'FIXED' | 'CHOICE';
      quantity: number;
      fixedSizeCode: string | null;
      choices: {
        menuItemId: string;
        itemName: string;
        surcharge: string;
        isDefault: boolean;
        effectiveAvailable: boolean;
      }[];
    }[];
  };
};

type CashierContextResponse = {
  branch: { id: string; name: string; timezone: string; chain: { currency: string } };
  menuItems: ApiBranchMenuItem[];
  combos?: ApiBranchCombo[];
};

function mapCombo({ combo, effectiveAvailable }: ApiBranchCombo): MenuCombo {
  return {
    id: combo.id,
    name: combo.name,
    description: combo.description ?? undefined,
    price: Number(combo.price),
    image: absoluteAssetUrl(combo.imageUrl) ?? '',
    available: effectiveAvailable,
    components: combo.components.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      quantity: c.quantity,
      fixedSizeCode: c.fixedSizeCode,
      choices: c.choices.map((x) => ({
        menuItemId: x.menuItemId,
        name: x.itemName,
        surcharge: Number(x.surcharge),
        isDefault: x.isDefault,
        available: x.effectiveAvailable,
      })),
    })),
  };
}

export type CounterOrder = {
  id: string;
  orderCode: string;
  status: string;
  paymentStatus: string;
  totalAmount: string;
  callNumber: number | null;
  /** Số máy báo rung đã gán (1–999); chỉ có sau khi thanh toán. */
  pagerNumber?: number | null;
  pagerNotifiedAt?: string | null;
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

export type PrintJobStatus = 'PENDING' | 'PRINTED' | 'FAILED' | 'CANCELLED';

/** Lượt in bill (RECEIPT) hoặc phiếu số (QUEUE_TICKET); Mobile phải báo kết quả in thật về backend. */
export type PrintJob = {
  id: string;
  orderId: string;
  type: 'RECEIPT' | 'QUEUE_TICKET';
  status: PrintJobStatus;
  isReprint: boolean;
  reason: string | null;
  printedAt: string | null;
  errorMessage: string | null;
};

/** `DISABLED` khi backend tắt `RECEIPT_PDF_ENABLED`; khi đó chỉ có `status` và `orderId`. */
export type ReceiptDocument = {
  status: 'PENDING' | 'READY' | 'FAILED' | 'DISABLED';
  orderId: string;
  fileName?: string | null;
  fileSize?: number | null;
  generatedAt?: string | null;
  errorMessage?: string | null;
  /** S3/R2: presigned URL sống 10 phút. Local storage: đường dẫn tương đối, cần JWT. */
  downloadUrl?: string | null;
  expiresAt?: string | null;
};

export type PayosPayment = {
  id: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'AMOUNT_MISMATCH' | 'REQUIRES_ATTENTION';
  qrCode: string | null;
  checkoutUrl: string | null;
  expiresAt: string | null;
  receivedAmount?: string | null;
  paidAt?: string | null;
  failureReason?: string | null;
};

export type PayosRecheckResult = PayosPayment & {
  order?: CounterOrder;
  tracking?: { token: string; url: string };
};

async function loadMenu(path: '/cashier/context' | '/barista/context'): Promise<{
  branch: CashierContextResponse['branch'];
  categories: MenuCategory[];
  menu: MenuItem[];
  combos: MenuCombo[];
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
      image: absoluteAssetUrl(menuItem.imageUrl) ?? '',
      batchable: menuItem.allowBatching ?? true,
      maxExtras: menuItem.maxExtras ?? 0,
      extras: (menuItem.extras ?? [])
        .filter((e) => e.isActive)
        .map((e) => ({
          id: e.extraId,
          label: e.name,
          price: Number(e.price),
          maxQuantity: e.maxQuantity,
          available: e.isAvailable,
        })),
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
  return {
    branch: data.branch,
    categories: [...categoryMap.values()],
    menu,
    combos: (data.combos ?? []).map(mapCombo),
  };
}

export const loadCashierMenu = () => loadMenu('/cashier/context');
export const loadBaristaMenu = () => loadMenu('/barista/context');

type CheckoutCartLine = {
  menuItemId: string;
  qty: number;
  note?: string;
  options: OrderOption[];
  extras?: SelectedExtra[];
  combo?: CartCombo;
};

const extrasPayload = (extras: SelectedExtra[] = []) =>
  extras.filter((e) => e.qty > 0).map((e) => ({ extraId: e.extraId, quantity: e.qty }));

export async function checkoutCart(cart: CheckoutCartLine[]) {
  const { data } = await apiClient.post<CounterOrder>('/cashier/checkout', {
    items: cart
      .filter((line) => !line.combo)
      .map((line) => ({
        menuItemId: line.menuItemId,
        quantity: line.qty,
        optionIds: line.options.map((option) => option.choiceId),
        extras: extrasPayload(line.extras),
        specialInstructions: line.note,
      })),
    combos: cart.flatMap((line) =>
      line.combo
        ? [
            {
              comboId: line.combo.comboId,
              quantity: line.qty,
              components: line.combo.components.map((c, index) => ({
                componentId: c.componentId,
                menuItemId: c.menuItemId,
                optionIds: c.options.map((option) => option.choiceId),
                extras: extrasPayload(c.extras),
                // ghi chú của cả combo đi kèm thành phần đầu để pha chế vẫn thấy
                specialInstructions: index === 0 ? line.note : undefined,
              })),
            },
          ]
        : [],
    ),
  });
  return data;
}

export async function collectCash(orderId: string, stationId: string, tenderedAmount: number) {
  const { data } = await apiClient.post<{
    order: CounterOrder;
    tracking: { token: string; url: string };
    printJobs?: PrintJob[];
  }>(`/cashier/orders/${orderId}/payments/cash`, {
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

export async function recheckPayosPayment(paymentId: string) {
  const { data } = await apiClient.post<PayosRecheckResult>(
    `/cashier/payments/${paymentId}/payos/recheck`,
  );
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
  pagerNumber?: number | null;
  pagerNotifiedAt?: string | null;
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
    /** Thành tiền dòng; Decimal của Prisma về dạng chuỗi. */
    totalPrice?: string;
    /** Khác null khi là món con của combo. */
    parentId?: string | null;
    status: string;
    cancellationReason?: string | null;
    selectedOptions: unknown;
    specialInstructions: string | null;
  }[];
  payments: {
    method: string;
    status: string;
    amount: string;
    paidAt: string | null;
  }[];
  /** Chỉ có khi backend trả kèm các lượt hoàn của đơn. */
  refunds?: ApiOrderRefund[];
};

/** Lượt hoàn tiền rút gọn mà backend có thể trả kèm đơn; chỉ cần `id` để lấy PDF phiếu hoàn. */
type ApiOrderRefund = {
  id: string;
  status?: string;
  amount?: string | number;
  completedAt?: string | null;
  requestedAt?: string | null;
};

function mapOrderRefunds(refunds: ApiOrderRefund[] | undefined): OrderRefundRef[] {
  if (!Array.isArray(refunds)) return [];
  return refunds
    .filter((refund) => refund?.id && (refund.status === undefined || refund.status === 'COMPLETED'))
    .map((refund) => ({
      id: refund.id,
      amount: refund.amount !== undefined ? Number(refund.amount) : undefined,
      at: refund.completedAt ?? refund.requestedAt ?? undefined,
    }));
}

export type OrderReceipt = {
  orderId: string;
  orderCode: string;
  callNumber: number | null;
  paidAt: string | null;
  currency: string;
  seller: { name: string; branchName: string; address: string | null; phone: string | null };
  cashier: string | null;
  items: {
    id: string;
    itemName: string;
    quantity: number;
    unitPrice: string;
    selectedOptions: unknown;
    specialInstructions: string | null;
  }[];
  subtotal: string;
  totalAmount: string;
  /** Giao dịch thanh toán thành công gần nhất; Decimal của Prisma về dạng chuỗi. */
  payment: {
    method: string;
    amount: string;
    tenderedAmount: string | null;
    changeAmount: string | null;
  } | null;
  tracking: { url: string } | null;
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

function lineTotalOf(item: ApiHistoryOrder['items'][number]) {
  return item.totalPrice !== undefined ? Number(item.totalPrice) : Number(item.unitPrice) * item.quantity;
}

/** Lịch sử không kèm refund: suy ra tiền đã hoàn từ các dòng gốc bị huỷ của đơn đã thanh toán. */
function refundedAmountOf(order: ApiHistoryOrder): number | undefined {
  if (!order.paidAt) return undefined;
  if (order.status === 'CANCELLED') return Number(order.totalAmount);
  const refunded = order.items
    .filter((item) => !item.parentId && item.status === 'CANCELLED')
    .reduce((sum, item) => sum + lineTotalOf(item), 0);
  return refunded > 0 ? refunded : undefined;
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
    refundedAmount: refundedAmountOf(order),
    refunds: mapOrderRefunds(order.refunds),
    pagerNumber: order.pagerNumber ?? undefined,
    pagerNotifiedAt: order.pagerNotifiedAt ?? undefined,
    pagerEligible:
      order.paymentStatus === 'PAID' && ['SUBMITTED', 'PREPARING', 'READY'].includes(order.status),
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
        parentId: item.parentId ?? undefined,
        lineTotal: lineTotalOf(item),
        cancelledReason: item.cancellationReason ?? undefined,
      };
    }),
  };
}

/** Đơn quầy hôm nay của chi nhánh (đã thanh toán + đã huỷ), mới nhất trước. */
export async function loadTodayOrders(days = 1): Promise<HistoryOrder[]> {
  const { data } = await apiClient.get<ApiHistoryOrder[]>('/cashier/orders', { params: { days } });
  return data.map(mapHistoryOrder).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getOrderReceipt(orderId: string) {
  const { data } = await apiClient.get<OrderReceipt>(`/cashier/orders/${orderId}/receipt`);
  return data;
}

export async function reprintOrder(orderId: string, reason: string) {
  const { data } = await apiClient.post<OrderReceipt & { printJobs?: PrintJob[] }>(
    `/cashier/orders/${orderId}/reprint`,
    { reason: reason.trim() },
  );
  return data;
}

export async function listPrintJobs(orderId: string) {
  const { data } = await apiClient.get<PrintJob[]>(`/cashier/orders/${orderId}/print-jobs`);
  return data;
}

const PRINT_ERROR_MAX_LENGTH = 500;

/** Báo kết quả in vật lý. FAILED bắt buộc có errorMessage (backend giới hạn 500 ký tự). */
export async function reportPrintResult(
  printJobId: string,
  status: 'PRINTED' | 'FAILED',
  errorMessage?: string,
) {
  const { data } = await apiClient.post<PrintJob>(`/cashier/print-jobs/${printJobId}/result`, {
    status,
    ...(status === 'FAILED'
      ? { errorMessage: (errorMessage?.trim() || 'Không in được').slice(0, PRINT_ERROR_MAX_LENGTH) }
      : {}),
  });
  return data;
}

/** Mã lý do hoàn tiền backend chấp nhận; `OTHER` bắt buộc kèm ghi chú ≥ 5 ký tự. */
export const REFUND_REASON_CODES = [
  'OUT_OF_STOCK',
  'WRONG_ITEM',
  'LONG_WAIT',
  'CHANGE_OF_MIND',
  'OTHER',
] as const;
export type RefundReasonCode = (typeof REFUND_REASON_CODES)[number];
export const REFUND_NOTE_MIN_LENGTH = 5;
/** Validator backend giới hạn 450 ký tự (Swagger ghi 500). */
export const REFUND_NOTE_MAX_LENGTH = 450;

export type CashRefund = {
  id: string;
  orderId: string;
  paymentId: string;
  /** Decimal dạng chuỗi */
  amount: string;
  status: 'PENDING' | 'COMPLETED';
  method: 'CASH' | 'BANK_TRANSFER';
  reason: string;
  reasonCode: RefundReasonCode | null;
  requestedAt: string;
  completedAt: string | null;
  items: {
    id: string;
    orderItemId: string;
    quantity: number;
    refundAmount: string;
    isWastage: boolean;
    orderItem: { id: string; itemName: string; quantity: number; status: string };
  }[];
};

export type CashRefundResult = {
  order: { id: string; status: string };
  refund: CashRefund;
  /** true khi không còn món nào: đơn chuyển sang CANCELLED */
  fullCancellation: boolean;
};

export type RefundApprovalRequest = {
  id: string;
  orderId: string;
  branchId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  orderItemIds: string[];
  amount: string;
  reason: string;
  requestedAt: string;
  reviewNote: string | null;
  reviewedAt: string | null;
  completedAt: string | null;
  refundId: string | null;
  order: { id: string; orderCode: string; callNumber: number | null; paidAt: string | null };
};

/** Dữ liệu cố định của phiếu hoàn tiền. */
export type CashRefundReceipt = CashRefund & {
  payment: { method: string };
  order: { orderCode: string; callNumber: number | null };
};

/**
 * Thu ngân xác nhận đã trả tiền mặt cho khách (đơn thanh toán hôm nay của chi nhánh). Không truyền `orderItemIds`
 * (hoặc mảng rỗng) là hoàn mọi món còn lại và huỷ đơn; chỉ truyền id dòng gốc, hoàn combo sẽ hoàn luôn món con.
 */
export async function createCashRefund(
  orderId: string,
  input: { orderItemIds?: string[]; reasonCode: RefundReasonCode; note?: string },
) {
  const note = input.note?.trim().slice(0, REFUND_NOTE_MAX_LENGTH);
  const { data } = await apiClient.post<CashRefundResult>(`/cashier/orders/${orderId}/refunds`, {
    reasonCode: input.reasonCode,
    ...(input.orderItemIds?.length
      ? { items: input.orderItemIds.map((orderItemId) => ({ orderItemId })) }
      : {}),
    ...(note ? { note } : {}),
  });
  return data;
}

export async function requestCashRefundApproval(
  orderId: string,
  input: { orderItemIds?: string[]; reasonCode: RefundReasonCode; note?: string },
) {
  const { data } = await apiClient.post<RefundApprovalRequest>(
    `/cashier/orders/${orderId}/refund-approval-requests`,
    {
      reasonCode: input.reasonCode,
      ...(input.orderItemIds?.length ? { items: input.orderItemIds.map((orderItemId) => ({ orderItemId })) } : {}),
      ...(input.note?.trim() ? { note: input.note.trim().slice(0, REFUND_NOTE_MAX_LENGTH) } : {}),
    },
  );
  return data;
}

export async function listCashRefundApprovals() {
  const { data } = await apiClient.get<RefundApprovalRequest[]>('/cashier/refund-approval-requests');
  return data;
}

export async function completeApprovedCashRefund(requestId: string) {
  const { data } = await apiClient.post<CashRefundResult>(
    `/cashier/refund-approval-requests/${requestId}/complete`,
  );
  return data;
}

export async function getCashRefundReceipt(orderId: string, refundId: string) {
  const { data } = await apiClient.get<CashRefundReceipt>(
    `/cashier/orders/${orderId}/refunds/${refundId}/receipt`,
  );
  return data;
}

export async function getReceiptDocument(orderId: string) {
  const { data } = await apiClient.get<ReceiptDocument>(`/cashier/orders/${orderId}/receipt-document`);
  return data;
}

/** Chuyển byte PNG thành base64 theo khối để không tràn stack khi ảnh vài trăm KB. */
function bytesToBase64(bytes: Uint8Array) {
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/** Hết thời gian này thì thôi chờ ảnh từ PDF để quầy vẫn có bill in ngay bằng bản dựng cục bộ. */
const PRINT_IMAGE_TIMEOUT_MS = 8_000;

/**
 * Ảnh PNG (base64, rộng 768px, đã cắt phần trống cuối phiếu) do backend render từ chính file PDF đã lưu, để in lên
 * máy nhiệt đúng nội dung bản lưu. Ném lỗi (404 khi PDF tắt/chưa tạo được, hết thời gian...) → caller tự in bản cục bộ.
 */
export async function getReceiptPrintImage(orderId: string) {
  const { data } = await apiClient.get<ArrayBuffer>(
    `/cashier/orders/${orderId}/receipt-document/print-image`,
    { responseType: 'arraybuffer', timeout: PRINT_IMAGE_TIMEOUT_MS },
  );
  return bytesToBase64(new Uint8Array(data));
}

export async function retryReceiptDocument(orderId: string) {
  const { data } = await apiClient.post<ReceiptDocument>(
    `/cashier/orders/${orderId}/receipt-document/retry`,
  );
  return data;
}

/**
 * Lượt hoàn tiền đã hoàn tất của một đơn, đọc từ chi tiết đơn (`refunds` nếu backend trả kèm). Không có / lỗi → mảng
 * rỗng; caller gộp thêm id lấy từ yêu cầu duyệt hoàn tiền và từ lượt hoàn vừa tạo.
 */
export async function loadOrderRefunds(orderId: string): Promise<OrderRefundRef[]> {
  const { data } = await apiClient.get<{ refunds?: ApiOrderRefund[] }>(`/cashier/orders/${orderId}`);
  return mapOrderRefunds(data?.refunds);
}

/** PDF phiếu hoàn tiền bất biến backend lưu cho từng lượt hoàn (mỗi lượt hoàn một PDF). */
export type RefundDocument = Omit<ReceiptDocument, 'orderId'> & {
  id?: string;
  refundId: string;
  orderId: string;
  checksum?: string | null;
  attempts?: number;
  printImageUrl?: string | null;
};

const refundDocumentPath = (orderId: string, refundId: string) =>
  `/cashier/orders/${orderId}/refunds/${refundId}/document`;

export async function getRefundDocument(orderId: string, refundId: string) {
  const { data } = await apiClient.get<RefundDocument>(refundDocumentPath(orderId, refundId));
  return data;
}

/** Tạo lại PDF sau khi lỗi; backend không bao giờ tạo PDF thứ hai hay lượt hoàn thứ hai. */
export async function retryRefundDocument(orderId: string, refundId: string) {
  const { data } = await apiClient.post<RefundDocument>(`${refundDocumentPath(orderId, refundId)}/retry`);
  return data;
}

/** Ảnh PNG (rộng 768px) render từ chính PDF phiếu hoàn đã lưu để in máy nhiệt 58mm. */
export async function getRefundPrintImage(orderId: string, refundId: string) {
  const { data } = await apiClient.get<ArrayBuffer>(
    `${refundDocumentPath(orderId, refundId)}/print-image`,
    { responseType: 'arraybuffer', timeout: PRINT_IMAGE_TIMEOUT_MS },
  );
  return bytesToBase64(new Uint8Array(data));
}

/** Một lượt in / in lại phiếu hoàn tiền; mobile báo kết quả in thật qua `reportRefundPrintResult`. */
export type RefundPrintLog = {
  id: string;
  refundId?: string;
  isReprint: boolean;
  reason: string | null;
  status?: PrintJobStatus;
  printedAt?: string | null;
  errorMessage?: string | null;
  createdAt?: string;
};

/** Ghi nhận lượt in phiếu hoàn; in lại bắt buộc lý do ≥ 3 ký tự (BR-53). */
export async function recordRefundSlipPrint(
  orderId: string,
  refundId: string,
  input: { isReprint: boolean; reason?: string },
) {
  const reason = input.reason?.trim();
  const { data } = await apiClient.post<RefundPrintLog>(`${refundDocumentPath(orderId, refundId)}/prints`, {
    isReprint: input.isReprint,
    ...(reason ? { reason } : {}),
  });
  return data;
}

export async function listRefundSlipPrints(orderId: string, refundId: string) {
  const { data } = await apiClient.get<RefundPrintLog[]>(`${refundDocumentPath(orderId, refundId)}/prints`);
  return data;
}

/** Báo kết quả in vật lý của phiếu hoàn; không bao giờ làm đổi lượt hoàn. */
export async function reportRefundPrintResult(
  printLogId: string,
  status: 'PRINTED' | 'FAILED',
  errorMessage?: string,
) {
  const { data } = await apiClient.post<RefundPrintLog>(`/cashier/refund-print-logs/${printLogId}/result`, {
    status,
    ...(status === 'FAILED'
      ? { errorMessage: (errorMessage?.trim() || 'Không in được').slice(0, PRINT_ERROR_MAX_LENGTH) }
      : {}),
  });
  return data;
}
