import { Image, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { mapOptions } from '@/src/services/barista-api';
import type { OrderReceipt } from '@/src/services/cashier-api';
import { dateTime, methodLabel, money } from '@/src/services/printer/format';
import { PRINT_WIDTH_DOTS } from '@/src/services/printer/raster';
import { fontFamily } from '@/src/theme/typography';

/**
 * Các phiếu dựng thành ảnh để in ra máy in nhiệt (không tương tác, không theme sáng/tối).
 * Máy chỉ in đen/trắng nên chỉ dùng màu đen, chữ từ Medium trở lên và cỡ ≥ 18 để nét không bị mất.
 * Mỗi phiếu rộng đúng `PRINT_WIDTH_DOTS` điểm để khớp 1:1 với đầu in.
 */
const INK = '#000000';
const PAPER = '#FFFFFF';
const VND = 'đ';

function Dash() {
  return (
    <Text numberOfLines={1} ellipsizeMode="clip" style={[styles.text, styles.dash]}>
      {'- '.repeat(60)}
    </Text>
  );
}

function Pair({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <View style={styles.pair}>
      <Text style={[styles.text, big && styles.total, styles.grow]}>{label}</Text>
      <Text style={[styles.text, big && styles.total]}>{value}</Text>
    </View>
  );
}

function ItemLine({ item }: { item: OrderReceipt['items'][number] }) {
  const options = mapOptions(item.selectedOptions).map((option) => option.label);
  const extras = [...options, item.specialInstructions ? `“${item.specialInstructions}”` : null]
    .filter(Boolean)
    .join(', ');
  return (
    <View style={styles.item}>
      <View style={styles.pair}>
        <Text style={[styles.text, styles.strong, styles.grow]}>
          {item.quantity} × {item.itemName}
        </Text>
        <Text style={[styles.text, styles.strong]}>{money(Number(item.unitPrice) * item.quantity, VND)}</Text>
      </View>
      {extras ? <Text style={[styles.text, styles.small, styles.indent]}>{extras}</Text> : null}
    </View>
  );
}

export function BillSheet({ receipt }: { receipt: OrderReceipt }) {
  const { seller, payment } = receipt;
  return (
    <View style={styles.sheet}>
      <Image source={require('@/assets/logo/logo1.png')} style={styles.logo} resizeMode="contain" />
      <Text style={[styles.text, styles.title, styles.center]}>{seller.name}</Text>
      <Text style={[styles.text, styles.center]}>{seller.branchName}</Text>
      {seller.address ? <Text style={[styles.text, styles.small, styles.center]}>{seller.address}</Text> : null}
      {seller.phone ? <Text style={[styles.text, styles.small, styles.center]}>ĐT: {seller.phone}</Text> : null}

      <Dash />
      <Text style={[styles.text, styles.title, styles.center]}>HÓA ĐƠN</Text>
      <Pair label="Mã đơn" value={receipt.orderCode} />
      <Pair label="Thời gian" value={dateTime(receipt.paidAt)} />
      {receipt.cashier ? <Pair label="Thu ngân" value={receipt.cashier} /> : null}
      <Dash />

      {receipt.items.map((item) => (
        <ItemLine key={item.id} item={item} />
      ))}

      <Dash />
      <Pair label="TỔNG" value={money(receipt.totalAmount, VND)} big />
      {payment ? (
        <>
          <Pair label="Thanh toán" value={methodLabel(payment.method)} />
          {payment.tenderedAmount !== null ? (
            <Pair label="Tiền khách đưa" value={money(payment.tenderedAmount, VND)} />
          ) : null}
          {payment.changeAmount !== null ? <Pair label="Tiền thừa" value={money(payment.changeAmount, VND)} /> : null}
        </>
      ) : null}
      <Dash />
      <Text style={[styles.text, styles.center]}>Cảm ơn quý khách!</Text>
    </View>
  );
}

export function TicketSheet({ receipt }: { receipt: OrderReceipt }) {
  return (
    <View style={styles.sheet}>
      <Text style={[styles.text, styles.center]}>{receipt.seller.branchName}</Text>
      <Text style={[styles.text, styles.center]}>Đơn {receipt.orderCode}</Text>
      {receipt.callNumber !== null ? (
        <>
          <Text style={[styles.text, styles.strong, styles.center, styles.gapTop]}>SỐ GỌI</Text>
          <Text style={styles.callNumber}>{String(receipt.callNumber).padStart(3, '0')}</Text>
          <Text style={[styles.text, styles.small, styles.center]}>Vui lòng chờ gọi số để nhận món</Text>
        </>
      ) : null}
      {receipt.tracking?.url ? (
        <View style={styles.qr}>
          <QRCode value={receipt.tracking.url} size={190} color={INK} backgroundColor={PAPER} />
          <Text style={[styles.text, styles.small, styles.center]}>Quét mã để theo dõi đơn</Text>
        </View>
      ) : null}
    </View>
  );
}

/** Phiếu in thử: chữ tiếng Việt ở các độ đậm + khung rộng đúng 384 điểm để xem đầu in có cắt mép không. */
export function TestSheet() {
  return (
    <View style={styles.sheet}>
      <Text style={[styles.text, styles.title, styles.center]}>IN THỬ MÁY IN</Text>
      <View style={styles.ruler}>
        <Text style={[styles.text, styles.small, styles.center]}>Khung này rộng {PRINT_WIDTH_DOTS} điểm</Text>
        <Text style={[styles.text, styles.small, styles.center]}>Thấy đủ 4 cạnh là đầu in đủ rộng</Text>
      </View>
      <Text style={[styles.text, styles.gapTop]}>Cà phê sữa đá - Trà đào cam sả</Text>
      <Text style={[styles.text, styles.strong]}>Bạc xỉu, Cà phê muối, Sinh tố bơ</Text>
      <Text style={[styles.text, styles.small]}>Ấ Ắ Ằ Ẳ Ẵ Ặ Ế Ề Ể Ễ Ệ Ố Ồ Ổ Ỗ Ộ</Text>
      <Text style={[styles.text, styles.small]}>Ớ Ờ Ở Ỡ Ợ Ứ Ừ Ử Ữ Ự Ỳ Ỷ Ỹ Ỵ Đ</Text>
      <Text style={styles.text}>0123456789  45.000đ  1.250.000đ</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { width: PRINT_WIDTH_DOTS, backgroundColor: PAPER, paddingHorizontal: 8, paddingVertical: 10 },
  text: { color: INK, fontFamily: fontFamily.medium, fontSize: 20, lineHeight: 26 },
  strong: { fontFamily: fontFamily.bold },
  small: { fontSize: 18, lineHeight: 24 },
  title: { fontFamily: fontFamily.bold, fontSize: 26, lineHeight: 32 },
  total: { fontFamily: fontFamily.bold, fontSize: 28, lineHeight: 34 },
  center: { textAlign: 'center' },
  grow: { flex: 1 },
  indent: { paddingLeft: 12 },
  gapTop: { marginTop: 8 },
  dash: { fontSize: 18, lineHeight: 24 },
  pair: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  item: { marginBottom: 6 },
  logo: { width: 200, height: 80, alignSelf: 'center' },
  callNumber: {
    color: INK,
    fontFamily: fontFamily.black,
    fontSize: 110,
    lineHeight: 124,
    textAlign: 'center',
  },
  qr: { alignItems: 'center', gap: 6, marginTop: 10 },
  // bù lề của `sheet` để khung chạm hai mép, rộng đúng PRINT_WIDTH_DOTS điểm
  ruler: { borderWidth: 2, borderColor: INK, paddingVertical: 6, marginTop: 8, marginHorizontal: -8 },
});
