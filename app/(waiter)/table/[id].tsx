import { Toast } from '@ant-design/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/src/components/empty-state';
import { ItemOptionsDialog } from '@/src/components/item-options-dialog';
import { MoveTableDialog } from '@/src/components/move-table-dialog';
import { OrderEntryDialog } from '@/src/components/order-entry-dialog';
import { OutOfStockDialog } from '@/src/components/out-of-stock-dialog';
import { PaymentQrDialog } from '@/src/components/payment-qr-dialog';
import { SessionPanel } from '@/src/components/session-panel';
import { TableStatusBadge } from '@/src/components/status-badge';
import { AppModal } from '@/src/components/ui/app-modal';
import { Btn } from '@/src/components/ui/button';
import { IconButton } from '@/src/components/ui/icon';
import { Txt } from '@/src/components/ui/txt';
import { menuById } from '@/src/data/mock';
import { useStore } from '@/src/data/store';
import type { CheckoutMethod, OrderItem } from '@/src/data/types';
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
    submitOrder,
    patchItem,
    removeItem,
    mergeTableIntoSession,
    moveSession,
    resolveSwap,
    dropOutOfStockItem,
    requestCheckout,
    collectCash,
    cancelSession,
    kitchenTick,
    isMenuAvailable,
    remainingPortionsOf,
  } = useStore();

  const table = tableById(id);
  const session = sessionByTable(id);
  const oos = session ? outOfStockFor(session.id) : [];
  const sessionTableIds = session?.tableIds ?? [id];
  const tableNames = sessionTableIds.map((tid) => tableById(tid)?.name ?? tid);

  const [orderOpen, setOrderOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [stockItem, setStockItem] = useState<OrderItem | null>(null);
  const [editingItem, setEditingItem] = useState<OrderItem | null>(null);

  const prevTableStatusRef = useRef(table?.status);
  const tableNamesRef = useRef(tableNames);
  tableNamesRef.current = tableNames;
  useEffect(() => {
    if (prevTableStatusRef.current === 'Đang phục vụ' && table?.status === 'Trống') {
      Toast.success(
        `Quản lý đã xác nhận thanh toán — bàn ${tableNamesRef.current.join(' + ')} về Trống.`,
        1.8,
      );
      router.replace('/(waiter)/floor');
    }
    prevTableStatusRef.current = table?.status;
  }, [table?.status]);

  const railWidth = width < 820 ? 68 : 116;
  const maxW = Math.min(760, width - railWidth - 32);

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

  const moveCandidates = state.tables.filter(
    (t) => t.status === 'Trống' && !sessionTableIds.includes(t.id),
  );
  const mergeCandidates = state.tables.filter(
    (t) =>
      t.status === 'Trống' &&
      sessionTableIds.some((tid) => tableById(tid)?.adjacentIds.includes(t.id)),
  );
  const fromTables = sessionTableIds.map((tid) => tableById(tid)).filter((t): t is NonNullable<typeof t> => !!t);

  const requestCheckoutMethod = (method: CheckoutMethod) => {
    if (!session) return;
    requestCheckout(session.id, method);
    setCheckoutOpen(false);
    Toast.info(
      method === 'Chuyển khoản QR'
        ? 'Đã báo Quản lý chi nhánh yêu cầu tính tiền. Mang tablet có mã QR ra bàn.'
        : 'Đã báo Quản lý chi nhánh yêu cầu tính tiền. Thu tiền mặt và mang lên quầy.',
      1.8,
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: theme.border_color_thin }]}>
        <IconButton name="back" onPress={() => router.replace('/(waiter)/floor')} />
        <View style={styles.headTitle}>
          <Txt variant="h2">Bàn {tableNames.join(' + ')}</Txt>
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
            tableNames={tableNames}
            table={table}
            session={session}
            outOfStockCount={oos.length}
            onNewOrder={() => setOrderOpen(true)}
            onMove={() => setMoveOpen(true)}
            onMerge={() => setMergeOpen(true)}
            onResolveStock={() => setStockItem(stockItemObj(oos[0].itemId))}
            onRequestCheckout={() => setCheckoutOpen(true)}
            onCollectCash={() => collectCash(session.id)}
            onViewQr={() => setQrOpen(true)}
            onEditItem={(item) => setEditingItem(item)}
            onRemoveItem={(item) => removeItem(item.id)}
            onQtyItem={(item, qty) => patchItem(item.id, { qty })}
          />
        ) : (
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="receipt"
              title="Bàn chưa có phiên"
              hint="Về sơ đồ bàn, bấm “Mở bàn mới” hoặc chọn bàn trống để mở phiên."
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
          <OrderEntryDialog
            visible={orderOpen}
            tableNames={tableNames}
            isMenuAvailable={isMenuAvailable}
            remainingPortionsOf={remainingPortionsOf}
            onDismiss={() => setOrderOpen(false)}
            onSubmit={(cart) => {
              submitOrder(session.id, cart);
              setOrderOpen(false);
              Toast.success('Đã gửi bếp — món vào hàng đợi ngay (BR-05).', 2);
            }}
          />
          <MoveTableDialog
            visible={moveOpen}
            mode="move"
            fromTables={fromTables}
            candidates={moveCandidates}
            onDismiss={() => setMoveOpen(false)}
            onPick={(toId) => {
              moveSession(session.id, [toId]);
              setMoveOpen(false);
              router.replace({ pathname: '/(waiter)/table/[id]', params: { id: toId } });
            }}
          />
          <MoveTableDialog
            visible={mergeOpen}
            mode="merge"
            fromTables={fromTables}
            candidates={mergeCandidates}
            onDismiss={() => setMergeOpen(false)}
            onPick={(toId) => {
              mergeTableIntoSession(session.id, toId);
              setMergeOpen(false);
              Toast.success(`Đã gộp bàn ${tableById(toId)?.name} vào phiên.`, 1.6);
            }}
          />
          <OutOfStockDialog
            visible={!!stockItem}
            item={stockItem}
            isMenuAvailable={isMenuAvailable}
            onDismiss={() => setStockItem(null)}
            onSwap={(newId) => {
              if (stockItem) resolveSwap(stockItem.id, newId);
              Toast.success('Đã đổi món — chờ bếp làm lại.', 1.8);
            }}
            onDrop={() => {
              if (stockItem) dropOutOfStockItem(stockItem.id);
              Toast.success('Đã bỏ món khỏi hoá đơn.', 1.6);
            }}
          />
          <ItemOptionsDialog
            visible={!!editingItem}
            item={editingItem ? (menuById[editingItem.menuItemId] ?? null) : null}
            initial={
              editingItem
                ? { qty: editingItem.qty, note: editingItem.note, optionLabels: editingItem.optionLabels }
                : undefined
            }
            onDismiss={() => setEditingItem(null)}
            onConfirm={(draft) => {
              if (editingItem) {
                patchItem(editingItem.id, {
                  qty: draft.qty,
                  note: draft.note,
                  optionLabels: draft.optionLabels,
                  unitPrice: draft.unitPrice,
                });
              }
              setEditingItem(null);
            }}
          />

          <PaymentQrDialog
            visible={qrOpen}
            value={`SFNB-${session.id}`}
            onDismiss={() => setQrOpen(false)}
          />

          <AppModal
            visible={checkoutOpen}
            title="Yêu cầu tính tiền"
            onClose={() => setCheckoutOpen(false)}
            maxWidth={360}
            actions={[{ text: 'Huỷ', onPress: () => setCheckoutOpen(false) }]}>
            <Txt variant="body" muted>
              Chọn phương thức khách dùng để trả. Chỉ Quản lý chi nhánh mới sinh mã QR và xác nhận
              thanh toán (BR-13).
            </Txt>
            <View style={styles.checkoutActions}>
              <Btn
                label="Chuyển khoản QR"
                block
                onPress={() => requestCheckoutMethod('Chuyển khoản QR')}
              />
              <Btn
                label="Tiền mặt"
                block
                variant="ghost"
                onPress={() => requestCheckoutMethod('Tiền mặt')}
              />
            </View>
          </AppModal>
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
  checkoutActions: { gap: 8, marginTop: 10 },
});
