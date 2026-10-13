import { BillSheet, TestSheet, TicketSheet } from '@/src/components/pos/print-sheets';
import { renderToPrintImages } from '@/src/components/pos/receipt-print-host';
import type { OrderReceipt } from '@/src/services/cashier-api';

/** Bill và phiếu số gọi thành hai ảnh PNG (base64), theo thứ tự in. */
export function renderReceiptImages(receipt: OrderReceipt) {
  return renderToPrintImages([<BillSheet key="bill" receipt={receipt} />, <TicketSheet key="ticket" receipt={receipt} />]);
}

export function renderTestImages() {
  return renderToPrintImages([<TestSheet key="test" />]);
}
