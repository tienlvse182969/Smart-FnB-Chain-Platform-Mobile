import { Toast } from '@ant-design/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/src/components/empty-state';
import { MoveTableDialog } from '@/src/components/move-table-dialog';
import { OutOfStockDialog } from '@/src/components/out-of-stock-dialog';
import { ProxyOrderDialog } from '@/src/components/proxy-order-dialog';
import { SessionPanel } from '@/src/components/session-panel';
import { TableStatusBadge } from '@/src/components/status-badge';
import { Btn } from '@/src/components/ui/button';
import { IconButton } from '@/src/components/ui/icon';
import { Txt } from '@/src/components/ui/txt';
import { useStore } from '@/src/data/store';
import type { OrderItem } from '@/src/data/types';
import { useAppTheme } from '@/src/theme/use-theme';

export default function SessionDetailScreen() {
  const theme = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const {
    state,
    tableById,
    sessionByTable,
    outOfStockFor,
    addProxyOrder,
    moveSession,
    resolveSwap,
    resolveRefund,
    closeSession,
    cancelSession,
    kitchenTick,
  } = useStore();

  const table = tableById(id);
  const session = sessionByTable(id);
  const oos = session ? outOfStockFor(session.id) : [];

  const [proxyOpen, setProxyOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [stockItem, setStockItem] = useState<OrderItem | null>(null);

  const railWidth = width < 820 ? 68 : 116;
  const maxW = Math.min(720, width - railWidth - 32);

  if (!table) {
    return (
      <SafeAreaView style={styles.safe}>
        <EmptyState icon="unavailable" title="Không tìm thấy bàn" />
      </SafeAreaView>
    );
  }

  const stockItemObj = (itemId: string): OrderItem | null => {
    for (const o of session?.orders ?? []) {
      const it = o.items.find((i) => i.id === itemId);
      if (it) return it;
    }
    return null;
  };

  const moveCandidates = state.tables.filter((t) => t.id !== id && t.status === 'Trống');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: theme.border_color_thin }]}>
        <IconButton name="back" onPress={() => router.replace('/(waiter)/floor')} />
        <View style={styles.headTitle}>
          <Txt variant="h2">Bàn {table.name}</Txt>
          <View style={styles.headMeta}>
            <TableStatusBadge status={table.status} size="sm" />
            <Txt variant="label" muted>
              {table.area}
              {session ? ` · ${session.guests} khách` : ''}
            </Txt>
          </View>
        </View>
        <IconButton
          name="stove"
          variant="outlined"
          onPress={() => {
            kitchenTick();
            Toast.info('Giả lập bếp: đẩy 1 món tiến 1 bước.', 1.2);
          }}
        />
      </View>

      <View style={[styles.body, { width: maxW, alignSelf: 'center' }]}>
        {session ? (
          <SessionPanel
            table={table}
            session={session}
            outOfStockCount={oos.length}
            onProxyOrder={() => setProxyOpen(true)}
            onMove={() => setMoveOpen(true)}
            onResolveStock={() => setStockItem(stockItemObj(oos[0].itemId))}
            onClose={() => {
              closeSession(session.id);
              Toast.info(`Đã đóng phiên · bàn ${table.name} cần dọn.`, 1.6);
              router.replace('/(waiter)/floor');
            }}
          />
        ) : (
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="receipt"
              title="Bàn chưa có phiên"
              hint="Về sơ đồ bàn, chọn bàn trống để mở phiên và kích hoạt QR."
            />
            <Btn
              label="Về sơ đồ bàn"
              icon="back"
              onPress={() => router.replace('/(waiter)/floor')}
            />
          </View>
        )}
      </View>

      {session ? (
        <>
          <ProxyOrderDialog
            visible={proxyOpen}
            tableName={table.name}
            unavailableMenu={state.unavailableMenu}
            onDismiss={() => setProxyOpen(false)}
            onSubmit={(cart, method) => {
              addProxyOrder(session.id, cart, method);
              setProxyOpen(false);
              Toast.success(
                method === 'QR'
                  ? 'Thanh toán QR thành công (giả lập) — món đã xuống bếp.'
                  : 'Đã báo Thu ngân thu tiền mặt — món đã xuống bếp.',
                2,
              );
            }}
          />
          <MoveTableDialog
            visible={moveOpen}
            fromTable={table}
            candidates={moveCandidates}
            onDismiss={() => setMoveOpen(false)}
            onPick={(toId) => {
              moveSession(id, toId);
              setMoveOpen(false);
              router.replace({ pathname: '/(waiter)/table/[id]', params: { id: toId } });
            }}
          />
          <OutOfStockDialog
            visible={!!stockItem}
            item={stockItem}
            unavailableMenu={state.unavailableMenu}
            onDismiss={() => setStockItem(null)}
            onSwap={(newId, price) => {
              if (stockItem) resolveSwap(stockItem.id, newId, price);
              Toast.success('Đã đổi món — chờ bếp làm lại.', 1.8);
            }}
            onRefund={(reason) => {
              if (stockItem) resolveRefund(stockItem.id, reason);
              Toast.success('Đã chuyển yêu cầu hoàn tiền cho Thu ngân.', 1.8);
            }}
          />
        </>
      ) : null}

      {session && session.orders.length === 0 ? (
        <View style={styles.cancelBar}>
          <Btn
            label="Khách bỏ về — huỷ phiên"
            variant="plain"
            size="sm"
            onPress={() => {
              cancelSession(session.id);
              router.replace('/(waiter)/floor');
            }}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 16,
    paddingLeft: 4,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexWrap: 'wrap',
  },
  headTitle: { flex: 1, minWidth: 140 },
  headMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2, flexWrap: 'wrap' },
  body: { flex: 1, paddingVertical: 12 },
  emptyWrap: { alignItems: 'center', gap: 8 },
  cancelBar: { alignItems: 'center', paddingBottom: 8 },
});
