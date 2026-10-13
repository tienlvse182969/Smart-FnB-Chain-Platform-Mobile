import { mapOptions } from '@/src/services/barista-api';
import type { OrderReceipt } from '@/src/services/cashier-api';
import { EscPos, wrap } from './escpos';
import { dateTime, methodLabel, money } from './format';

/** Khổ giấy 58mm: font A cho 32 ký tự mỗi dòng. */
const WIDTH = 32;

function bill(p: EscPos, receipt: OrderReceipt) {
  p.align('center').bold(true).size(2, 1);
  for (const line of wrap(receipt.seller.name, WIDTH / 2)) p.line(line);
  p.size(1).bold(false);
  p.line(receipt.seller.branchName);
  if (receipt.seller.address) for (const line of wrap(receipt.seller.address, WIDTH)) p.line(line);
  if (receipt.seller.phone) p.line(`ĐT: ${receipt.seller.phone}`);

  p.divider().bold(true).line('HÓA ĐƠN').bold(false).align('left');
  p.row('Mã đơn', receipt.orderCode);
  p.row('Thời gian', dateTime(receipt.paidAt));
  if (receipt.cashier) p.row('Thu ngân', receipt.cashier);
  p.divider();

  for (const item of receipt.items) {
    const amount = money(Number(item.unitPrice) * item.quantity);
    const [first, ...rest] = wrap(`${item.quantity} x ${item.itemName}`, WIDTH - amount.length - 1);
    p.row(first, amount);
    for (const line of rest) p.line(line);
    const options = mapOptions(item.selectedOptions).map((option) => option.label);
    const extras = [...options, item.specialInstructions ? `"${item.specialInstructions}"` : null]
      .filter(Boolean)
      .join(', ');
    if (extras) for (const line of wrap(extras, WIDTH - 2)) p.line(`  ${line}`);
  }

  p.divider();
  p.bold(true).size(1, 2).row('TỔNG', money(receipt.totalAmount)).size(1).bold(false);
  if (receipt.payment) {
    p.row('Thanh toán', methodLabel(receipt.payment.method));
    if (receipt.payment.tenderedAmount !== null) p.row('Tiền khách đưa', money(receipt.payment.tenderedAmount));
    if (receipt.payment.changeAmount !== null) p.row('Tiền thừa', money(receipt.payment.changeAmount));
  }
  p.divider().align('center').line('Cảm ơn quý khách!').feed(3).cut();
}

function queueTicket(p: EscPos, receipt: OrderReceipt) {
  p.align('center').line(receipt.seller.branchName).line(`Đơn ${receipt.orderCode}`);
  if (receipt.callNumber !== null) {
    p.line('SỐ GỌI').bold(true).size(4).line(String(receipt.callNumber).padStart(3, '0')).size(1).bold(false);
    p.line('Vui lòng chờ gọi số để nhận món');
  }
  if (receipt.tracking?.url) {
    p.feed(1).qr(receipt.tracking.url).feed(1).line('Quét mã để theo dõi đơn');
  }
  p.feed(3).cut();
}

/** Bill + phiếu số gọi (kèm QR theo dõi đơn) bằng chữ ASCII không dấu, cắt giấy giữa hai phiếu. */
export function buildReceiptPayload(receipt: OrderReceipt) {
  const p = new EscPos(WIDTH).init();
  bill(p, receipt);
  queueTicket(p, receipt);
  return p.toBinaryString();
}

/** Phiếu in thử chế độ chữ: chỉ ASCII không dấu. */
export function buildTestPayload() {
  return new EscPos(WIDTH)
    .init()
    .align('center')
    .bold(true)
    .line('IN THỬ MÁY IN')
    .bold(false)
    .divider()
    .line('Chế độ chữ không dấu')
    .line('Cà phê sữa đá - Trà đào cam sả')
    .feed(3)
    .cut()
    .toBinaryString();
}
