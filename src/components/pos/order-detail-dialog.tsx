import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { toast } from '@/src/components/ui/toast';
import { clockAt } from '@/src/data/format';
import type { HistoryOrder } from '@/src/data/types';
import {
  getOrderReceipt,
  listPrintJobs,
  reprintOrder,
  type OrderReceipt,
  type PrintJob,
} from '@/src/services/cashier-api';
import { toPrintFailure, type PrintFailure } from '@/src/services/printer/bluetooth-printer';
import { printReceipt } from '@/src/services/printer/print-service';
import { useStation } from '@/src/stations/station-context';
import { OrderStatusBadge } from '../status-badge';
import { AppModal } from '../ui/app-modal';
import { Btn } from '../ui/button';
import { Field } from '../ui/field';
import { Txt } from '../ui/txt';
import { PrintErrorDialog } from './print-error-dialog';
import { ReceiptPdfSection } from './receipt-pdf-section';
import { ReceiptPreview } from './receipt-preview';

const MIN_REASON_LENGTH = 3;

/** Lượt in lại đã được backend ghi nhận nhưng chưa in được; giữ để "Thử lại" không tạo thêm lượt in lại mới. */
type PendingReprint = { receipt: Awaited<ReturnType<typeof reprintOrder>>; jobIds?: string[] };

/** Chi tiết một đơn trong lịch sử (CS-05): xem lại bill, in lại kèm lý do — backend ghi nhận mỗi lần in lại (BR-21). */
export function OrderDetailDialog({ order, onClose }: { order: HistoryOrder | null; onClose: () => void }) {
  const { t } = useTranslation();
  const { selectedStation } = useStation();
  const orderId = order?.id;
  const paid = order?.callNumber !== undefined;
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);
  const [printJobs, setPrintJobs] = useState<PrintJob[]>([]);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [printing, setPrinting] = useState(false);
  const [printFailure, setPrintFailure] = useState<PrintFailure | null>(null);
  const [pendingReprint, setPendingReprint] = useState<PendingReprint | null>(null);

  const loadPrintJobs = useCallback(async (id: string) => {
    try {
      const jobs = await listPrintJobs(id);
      setPrintJobs(jobs);
      return jobs;
    } catch {
      // lịch sử in chỉ để tham khảo, không chặn xem bill / in lại
      return null;
    }
  }, []);

  useEffect(() => {
    setReceipt(null);
    setPrintJobs([]);
    setPrintFailure(null);
    setPendingReprint(null);
    setReasonOpen(false);
    setReason('');
    if (!orderId || !paid) return;
    let active = true;
    getOrderReceipt(orderId)
      .then((result) => {
        if (active) setReceipt(result);
      })
      .catch(() => {
        // bill vẫn xem được từ dữ liệu danh sách; chỉ thiếu tên thu ngân / chi nhánh
      });
    void loadPrintJobs(orderId);
    return () => {
      active = false;
    };
  }, [orderId, paid, loadPrintJobs]);

  if (!order) return null;

  // mỗi lượt in tạo 2 job (bill + phiếu số) cùng kết quả → chỉ liệt kê job bill
  const printHistory = printJobs.filter((job) => job.type === 'RECEIPT');
  const reasonValid = reason.trim().length >= MIN_REASON_LENGTH;

  /** Gửi lệnh in; lỗi (chưa kết nối, hết/kẹt giấy…) hiện modal để thu ngân xử lý rồi thử lại. */
  const runReprint = async (job: PendingReprint) => {
    setPrinting(true);
    try {
      // kết quả in thật được báo về từng PrintJob backend vừa tạo cho lượt in lại
      await printReceipt(job.receipt, selectedStation, job.jobIds);
      setPendingReprint(null);
      setReasonOpen(false);
      setReason('');
      const jobs = await loadPrintJobs(job.receipt.orderId);
      const count = jobs ? jobs.filter((j) => j.type === 'RECEIPT' && j.isReprint).length : 1;
      toast.success(t('orders.reprinted', { count }), 1.5, undefined, false);
    } catch (failure) {
      setPendingReprint(job);
      setPrintFailure(toPrintFailure(failure));
      void loadPrintJobs(job.receipt.orderId);
    } finally {
      setPrinting(false);
    }
  };

  const submitReprint = async () => {
    if (!reasonValid || printing) return;
    setPrinting(true);
    let reprinted: PendingReprint['receipt'];
    try {
      // Backend ghi nhận lượt in lại (BR-21) rồi trả receipt; máy POS mới là nơi gửi lệnh tới máy in.
      reprinted = await reprintOrder(order.id, reason);
    } catch (failure) {
      toast.fail(failure instanceof Error ? failure.message : t('orders.reprintFailed'), 3, undefined, false);
      setPrinting(false);
      return;
    }
    await runReprint({ receipt: reprinted, jobIds: reprinted.printJobs?.map((job) => job.id) });
  };

  const cashierName = receipt?.cashier ?? order.cashierName;

  return (
    <>
    <PrintErrorDialog
      failure={printFailure}
      onClose={() => {
        setPrintFailure(null);
        setPendingReprint(null);
      }}
      onRetry={
        pendingReprint
          ? () => {
              setPrintFailure(null);
              void runReprint(pendingReprint);
            }
          : undefined
      }
    />
    <AppModal
      visible
      title={t('orders.detailTitle', { code: order.orderCode })}
      onClose={onClose}
      maxWidth={520}
      actions={[{ text: t('common.close'), onPress: onClose }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.statusRow}>
          <View style={styles.badges}>
            <OrderStatusBadge status={order.status} />
          </View>
          {cashierName ? (
            <Txt variant="caption" muted>
              {t('orders.cashier')}: {cashierName}
            </Txt>
          ) : null}
        </View>

        {order.status === 'Đã huỷ' && order.cancelledReason ? (
          <Txt variant="caption" muted>
            {t('orders.cancelledReason', { reason: order.cancelledReason })}
          </Txt>
        ) : null}

        <ReceiptPreview
          order={order}
          branchName={receipt?.seller.branchName}
          trackingUrl={receipt?.tracking?.url}
        />

        {paid ? <ReceiptPdfSection orderId={order.id} /> : null}

        {paid && printHistory.length > 0 ? (
          <View style={styles.history}>
            <Txt variant="bodyStrong">{t('orders.printHistory.title')}</Txt>
            {printHistory.map((job) => (
              <View key={job.id} style={styles.historyRow}>
                <Txt variant="caption" style={styles.historyMain} numberOfLines={2}>
                  {job.isReprint ? t('orders.printHistory.reprint') : t('orders.printHistory.first')}
                  {job.printedAt ? ` · ${clockAt(job.printedAt)}` : ''}
                  {job.isReprint && job.reason ? ` · ${job.reason}` : ''}
                  {job.status === 'FAILED' && job.errorMessage ? ` · ${job.errorMessage}` : ''}
                </Txt>
                <Txt variant="caption" muted>
                  {t(`orders.printHistory.status.${job.status}`)}
                </Txt>
              </View>
            ))}
          </View>
        ) : null}

        {paid ? (
          <>
            {reasonOpen ? (
              <View style={styles.reasonBox}>
                <Field
                  label={t('orders.reprintReason')}
                  placeholder={t('orders.reprintReasonPlaceholder')}
                  value={reason}
                  onChangeText={setReason}
                  maxLength={500}
                />
                <View style={styles.reasonActions}>
                  <Btn label={t('common.cancel')} variant="ghost" onPress={() => setReasonOpen(false)} />
                  <Btn
                    label={t('orders.reprintConfirm')}
                    icon="print"
                    disabled={!reasonValid || printing}
                    onPress={submitReprint}
                  />
                </View>
              </View>
            ) : (
              <Btn
                label={t('orders.reprint')}
                icon="print"
                block
                variant="ghost"
                onPress={() => setReasonOpen(true)}
              />
            )}
            <Txt variant="tiny" muted style={styles.note}>
              {t('orders.managerOnlyNote')}
            </Txt>
          </>
        ) : null}
      </ScrollView>
    </AppModal>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 620 },
  body: { gap: 12 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  reasonBox: { gap: 10 },
  reasonActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  note: { textAlign: 'center' },
  history: { gap: 6 },
  historyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  historyMain: { flex: 1 },
});
