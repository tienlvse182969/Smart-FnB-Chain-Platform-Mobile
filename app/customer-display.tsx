import { router } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Txt } from '@/src/components/ui/txt';
import type { DisplaySnapshot } from '@/src/services/customer-display-realtime';
import {
  connectCustomerDisplay,
  createCustomerDisplayPairing,
  customerDisplayStorage,
  getCustomerDisplayContext,
  type CustomerDisplayContext,
  type PairingCode,
} from '@/src/services/customer-display-device';

const empty: DisplaySnapshot = { state: 'IDLE', items: [], totalAmount: 0 };
const money = (value: number) => new Intl.NumberFormat('vi-VN').format(value) + 'đ';

export default function CustomerDisplayScreen() {
  useKeepAwake();
  const [pairing, setPairing] = useState<PairingCode | null>(null);
  const [context, setContext] = useState<CustomerDisplayContext | null>(null);
  const [snapshot, setSnapshot] = useState<DisplaySnapshot>(empty);
  const [error, setError] = useState<string | null>(null);
  const latestVersion = useRef(-1);

  const reset = useCallback(async () => {
    await customerDisplayStorage.clear();
    router.replace('/login');
  }, []);

  useEffect(() => {
    let active = true;
    let socket: ReturnType<typeof connectCustomerDisplay> | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;

    const accept = (next: DisplaySnapshot, version?: number) => {
      if (typeof version === 'number' && version < latestVersion.current) return;
      if (typeof version === 'number') latestVersion.current = version;
      if (active) setSnapshot(next);
    };
    const attach = async (token: string) => {
      try {
        const next = await getCustomerDisplayContext(token);
        if (!active) return true;
        setContext(next);
        accept(next.snapshot, next.version);
        socket = connectCustomerDisplay(token, accept, () => void reset());
        return true;
      } catch (reason) {
        const status = (reason as { response?: { status?: number } }).response?.status;
        if (status === 403) return false;
        if (active) setError('Không kết nối được máy chủ. Màn hình sẽ tự thử lại.');
        return false;
      }
    };
    const start = async () => {
      await customerDisplayStorage.setMode('CUSTOMER_DISPLAY');
      let token = await customerDisplayStorage.getToken();
      if (token && await attach(token)) return;
      let nextPairing = await createCustomerDisplayPairing();
      token = nextPairing.deviceToken;
      if (active) setPairing(nextPairing);
      timer = setInterval(() => void (async () => {
        if (Date.now() >= new Date(nextPairing.expiresAt).getTime()) {
          nextPairing = await createCustomerDisplayPairing();
          token = nextPairing.deviceToken;
          if (active) setPairing(nextPairing);
          return;
        }
        if (await attach(token!)) {
          setPairing(null);
          if (timer) clearInterval(timer);
        }
      })(), 2_000);
    };
    void start().catch(() => setError('Không tạo được mã ghép. Kiểm tra mạng rồi thử lại.'));
    return () => {
      active = false;
      if (timer) clearInterval(timer);
      socket?.disconnect();
    };
  }, [reset]);

  const primary = context?.branding.primaryColor ?? '#1677ff';
  if (pairing) return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.pairing}>
        <Txt variant="title">Màn hình khách hàng</Txt>
        <Txt muted>Nhập mã này ở POS hoặc trang quản lý quầy</Txt>
        <Txt style={[styles.code, { color: primary }]}>{pairing.code}</Txt>
        <Txt muted>Mã có hiệu lực đến {new Date(pairing.expiresAt).toLocaleTimeString('vi-VN')}</Txt>
        <Pressable onPress={() => void reset()}><Txt color="#b42318">Thoát chế độ màn hình khách</Txt></Pressable>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: context?.branding.secondaryColor ?? '#f6f8fb' }]}>
      <View style={[styles.header, { backgroundColor: primary }]}>
        {context?.branding.logoUrl ? <Image source={{ uri: context.branding.logoUrl }} style={styles.logo} /> : null}
        <View><Txt variant="title" color="#fff">{context?.branding.displayName ?? 'Smart F&B'}</Txt><Txt color="#fff">{context?.branch.name} · {context?.station.name}</Txt></View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {snapshot.state === 'IDLE' ? <View style={styles.center}><Txt variant="title">Xin chào quý khách</Txt><Txt muted>Đơn hàng sẽ hiện tại đây khi thu ngân bắt đầu chọn món.</Txt></View> : null}
        {snapshot.state !== 'IDLE' ? <>
          <View style={styles.card}>
            <Txt variant="h2">Đơn hàng của bạn</Txt>
            {snapshot.items.map((item) => <View key={item.key} style={styles.line}><View style={styles.grow}><Txt variant="bodyStrong">{item.quantity} × {item.name}</Txt>{item.options.length ? <Txt muted>{item.options.join(', ')}</Txt> : null}{item.note ? <Txt muted>Ghi chú: {item.note}</Txt> : null}</View><Txt variant="bodyStrong">{money(item.lineTotal)}</Txt></View>)}
            <View style={styles.total}><Txt variant="h2">Tổng cộng</Txt><Txt style={[styles.totalMoney, { color: primary }]}>{money(snapshot.totalAmount)}</Txt></View>
          </View>
          {snapshot.state === 'PAYMENT_QR' && snapshot.qrCode ? <View style={[styles.card, styles.center]}><Txt variant="h2">Quét mã để thanh toán</Txt><QRCode value={snapshot.qrCode} size={230} /><Txt muted>Vui lòng giữ màn hình này cho đến khi có xác nhận.</Txt></View> : null}
          {snapshot.state === 'PAID' ? <View style={[styles.card, styles.center, { borderColor: '#16a34a' }]}><Txt variant="title" color="#15803d">Thanh toán thành công</Txt><Txt muted>Số gọi của bạn</Txt><Txt style={styles.callNumber}>{String(snapshot.callNumber ?? 0).padStart(3, '0')}</Txt></View> : null}
        </> : null}
        {error ? <Txt color="#b42318">{error}</Txt> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, pairing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, padding: 32 }, code: { fontSize: 72, lineHeight: 84, fontWeight: '800', letterSpacing: 12 },
  header: { minHeight: 92, paddingHorizontal: 28, flexDirection: 'row', alignItems: 'center', gap: 16 }, logo: { width: 58, height: 58, borderRadius: 10 },
  content: { flexGrow: 1, padding: 24, gap: 20 }, center: { alignItems: 'center', justifyContent: 'center', gap: 14, minHeight: 180 }, card: { backgroundColor: '#fff', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', gap: 18 },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#d1d5db' }, grow: { flex: 1, gap: 3 }, total: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, totalMoney: { fontSize: 32, lineHeight: 40, fontWeight: '800' }, callNumber: { fontSize: 86, lineHeight: 96, fontWeight: '800', color: '#15803d' },
});
