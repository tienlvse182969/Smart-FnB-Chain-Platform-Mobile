import { Toast } from '@ant-design/react-native';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { menuById } from '@/src/data/mock';
import { useStore } from '@/src/data/store';
import type { CheckoutMethod, OrderItem } from '@/src/data/types';
import { checkoutMethodKey, tableAreaKey } from '@/src/i18n/labels';
import { fontFamily } from '@/src/theme/typography';
import { useAppTheme } from '@/src/theme/use-theme';
import { EmptyState } from './empty-state';
import { ItemOptionsDialog } from './item-options-dialog';
import { MoveTableDialog } from './move-table-dialog';
import { useOrderPanel } from './order-panel-overlay';
import { OutOfStockDialog } from './out-of-stock-dialog';
import { PaymentQrDialog } from './payment-qr-dialog';
import { SessionPanel } from './session-panel';
import { TableStatusBadge } from './status-badge';
import { AppModal } from './ui/app-modal';
import { Btn } from './ui/button';
import { IconButton } from './ui/icon';
import { Txt } from './ui/txt';

/**
 * Nội dung chi tiết bàn/phiên — dùng chung cho màn hình đầy đủ (app/(waiter)/table/[id].tsx)
 * và panel bên phải nhúng trong Sơ đồ bàn (embedded=true, không tự căn giữa/giới hạn bề rộng).
 */
export function TableDetailPanel({
  id,
  onClose,
  onNavigate,
  embedded = false,
}: {
  id: string;
  onClose: () => void;
  onNavigate: (id: string) => void;
  embedded?: boolean;
}) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const {
    state,
    tableById,
    sessionByTable,
    outOfStockFor,
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
  } = useStore();
  const { openOrderPanel } = useOrderPanel();

  const table = tableById(id);
  const session = sessionByTable(id);
  const oos = session ? outOfStockFor(session.id) : [];
  const sessionTableIds = session?.tableIds ?? [id];
  const tableNames = sessionTableIds.map((tid) => tableById(tid)?.name ?? tid);

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
        t('tableDetail.paidToastConfirmed', { names: tableNamesRef.current.join(' + ') }),
        1.8,
      );
      onClose();
    }
    prevTableStatusRef.current = table?.status;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table?.status]);

  const railWidth = width < 820 ? 68 : 116;
  const maxW = Math.min(760, width - railWidth - 32);

  if (!table) {
    return (
      <View style={styles.safe}>
        <EmptyState icon="unavailable" title={t('tableDetail.notFound')} />
      </View>
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
        ? t('tableDetail.requestCheckoutToastQr')
        : t('tableDetail.requestCheckoutToastCash'),
      1.8,
    );
  };

  return (
    <View style={styles.safe}>
      <View style={[styles.header, { borderBottomColor: theme.border_color_thin }]}>
        <IconButton name="close" onPress={onClose} />
        <View style={styles.headTitle}>
          <Txt variant="h2" style={styles.title}>
            {t('tableDetail.titlePrefix', { names: tableNames.join(' + ') })}
          </Txt>
          <View style={styles.headMeta}>
            <TableStatusBadge status={table.status} size="sm" />
            <Txt variant="label" muted>
              {t(tableAreaKey[table.area])}
              {session ? t('tableDetail.guestsSuffix', { guests: session.guests }) : ''}
            </Txt>
          </View>
        </View>
        <IconButton
          name="stove"
          variant="outlined"
          onPress={() => {
            kitchenTick();
            Toast.info(t('tableDetail.simulateKitchenToast'), 1.2);
          }}
        />
      </View>

      <View style={[styles.body, !embedded && { width: maxW, alignSelf: 'center' }]}>
        {session ? (
          <SessionPanel
            tableNames={tableNames}
            table={table}
            session={session}
            outOfStockCount={oos.length}
            onNewOrder={() => openOrderPanel(id)}
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
              title={t('tableDetail.emptyTitle')}
              hint={t('tableDetail.emptyHint')}
            />
            <Btn label={t('tableDetail.backToFloor')} icon="back" onPress={onClose} />
          </View>
        )}
      </View>

      {session ? (
        <>
          <MoveTableDialog
            visible={moveOpen}
            mode="move"
            fromTables={fromTables}
            candidates={moveCandidates}
            onDismiss={() => setMoveOpen(false)}
            onPick={(toId) => {
              moveSession(session.id, [toId]);
              setMoveOpen(false);
              onNavigate(toId);
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
              Toast.success(t('tableDetail.mergedToast', { name: tableById(toId)?.name }), 1.6);
            }}
          />
          <OutOfStockDialog
            visible={!!stockItem}
            item={stockItem}
            isMenuAvailable={isMenuAvailable}
            onDismiss={() => setStockItem(null)}
            onSwap={(newId) => {
              if (stockItem) resolveSwap(stockItem.id, newId);
              Toast.success(t('tableDetail.swappedToast'), 1.8);
            }}
            onDrop={() => {
              if (stockItem) dropOutOfStockItem(stockItem.id);
              Toast.success(t('tableDetail.droppedToast'), 1.6);
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
            title={t('tableDetail.checkoutTitle')}
            onClose={() => setCheckoutOpen(false)}
            maxWidth={360}
            actions={[{ text: t('common.cancel'), onPress: () => setCheckoutOpen(false) }]}>
            <Txt variant="body" muted>
              {t('tableDetail.checkoutBody')}
            </Txt>
            <View style={styles.checkoutActions}>
              <Btn
                label={t(checkoutMethodKey['Chuyển khoản QR'])}
                block
                onPress={() => requestCheckoutMethod('Chuyển khoản QR')}
              />
              <Btn
                label={t(checkoutMethodKey['Tiền mặt'])}
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
            label={t('tableDetail.cancelSessionBtn')}
            variant="plain"
            size="sm"
            onPress={() => {
              cancelSession(session.id);
              onClose();
            }}
          />
        </View>
      ) : null}
    </View>
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
  title: { fontFamily: fontFamily.semibold },
  headMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2, flexWrap: 'wrap' },
  body: { flex: 1, paddingVertical: 12 },
  emptyWrap: { alignItems: 'center', gap: 8 },
  cancelBar: { alignItems: 'center', paddingBottom: 8 },
  checkoutActions: { gap: 8, marginTop: 10 },
});
