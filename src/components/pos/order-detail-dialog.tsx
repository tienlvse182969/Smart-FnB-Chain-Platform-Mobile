import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useAuth } from '@/src/auth/auth-context';
import { toast } from '@/src/components/ui/toast';
import { clockAt, formatVnd } from '@/src/data/format';
import type { HistoryOrder } from '@/src/data/types';
import {
  completeApprovedCashRefund,
  getOrderReceipt,
  listPrintJobs,
  reprintOrder,
  type CashRefundResult,
  type OrderReceipt,
  type PrintJob,
  type RefundApprovalRequest,
} from '@/src/services/cashier-api';
import { toPrintFailure, type PrintFailure } from '@/src/services/printer/bluetooth-printer';
import { printReceipt, printRefundReceipt } from '@/src/services/printer/print-service';
import type { RefundSlipHeader } from '@/src/services/printer/receipt-layout';
import { useStation } from '@/src/stations/station-context';
import { useAppTheme } from '@/src/theme/use-theme';
import { OrderStatusBadge, RefundBadge } from '../status-badge';
import { AppModal } from '../ui/app-modal';
import { Btn } from '../ui/button';
import { Field } from '../ui/field';
import { Txt } from '../ui/txt';
import { PrintErrorDialog } from './print-error-dialog';
import { ReceiptPdfSection } from './receipt-pdf-section';
import { ReceiptPreview } from './receipt-preview';
import { formatRefundReason, RefundDialog, refundableLines } from './refund-dialog';

const MIN_REASON_LENGTH = 3;

/** Lượt in lại đã được backend ghi nhận nhưng chưa in được; giữ để "Thử lại" không tạo thêm lượt in lại mới. */
type PendingReprint = { receipt: Awaited<ReturnType<typeof reprintOrder>>; jobIds?: string[] };

/** Phiếu hoàn tiền chưa in được; "Thử lại" chỉ in lại phiếu, không gọi lại API hoàn tiền. */
type PendingRefundPrint = { orderId: string; refundId: string; header: RefundSlipHeader };

/**
 * Chi tiết một đơn trong lịch sử (CS-05): xem lại bill, in lại kèm lý do — backend ghi nhận mỗi lần in lại (BR-21) —
 * và hoàn tiền mặt cho đơn đã thanh toán hôm nay (cả đơn hoặc từng món).
 */
export function OrderDetailDialog({
  order,
  onClose,
  onRefunded,
  approvalRequest,
}: {
  order: HistoryOrder | null;
  onClose: () => void;
  /** Gọi sau khi backend ghi nhận hoàn tiền để màn hình tải lại danh sách đơn. */
  onRefunded?: () => void;
  approvalRequest?: RefundApprovalRequest | null;
}) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const { user } = useAuth();
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
  const [refundOpen, setRefundOpen] = useState(false);
  const [confirmPayout, setConfirmPayout] = useState(false);
  const [completingPayout, setCompletingPayout] = useState(false);
  const [pendingRefundPrint, setPendingRefundPrint] = useState<PendingRefundPrint | null>(null);

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
    setPendingRefundPrint(null);
    setRefundOpen(false);
    setConfirmPayout(false);
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
  const paidAt = order.paidAt ?? order.payment?.paidAt;
  const businessDay = (value: string | Date) => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(value));
  const requiresApproval = !!paidAt && businessDay(paidAt) !== businessDay(new Date());
  const hasOpenRequest = approvalRequest?.status === 'PENDING' || approvalRequest?.status === 'APPROVED';
  const canRefund = paid && order.status !== 'Đã huỷ' && refundableLines(order).length > 0 && !hasOpenRequest;

  /** In phiếu hoàn tiền; lỗi máy in không ảnh hưởng lượt hoàn đã được backend ghi nhận. */
  const runRefundPrint = async (job: PendingRefundPrint) => {
    setPrinting(true);
    try {
      await printRefundReceipt(job.orderId, job.refundId, job.header, selectedStation);
      setPendingRefundPrint(null);
      toast.success(t('refund.slipPrinted'), 1.5, undefined, false);
    } catch (failure) {
      setPendingRefundPrint(job);
      setPrintFailure(toPrintFailure(failure));
    } finally {
      setPrinting(false);
    }
  };

  const handleRefunded = (result: CashRefundResult) => {
    setRefundOpen(false);
    toast.success(t('refund.success', { amount: formatVnd(Number(result.refund.amount)) }), 2, undefined, false);
    onRefunded?.();
    void runRefundPrint({
      orderId: order.id,
      refundId: result.refund.id,
      header: {
        sellerName: receipt?.seller.name,
        branchName: receipt?.seller.branchName,
        // người hoàn tiền là thu ngân đang đăng nhập, có thể khác người đã thu tiền đơn này
        cashier: user?.employee
          ? `${user.employee.firstName} ${user.employee.lastName}`.trim() || null
          : null,
      },
    });
  };

  const confirmApprovedPayout = async () => {
    if (!approvalRequest || completingPayout) return;
    setCompletingPayout(true);
    try {
      const result = await completeApprovedCashRefund(approvalRequest.id);
      setConfirmPayout(false);
      handleRefunded(result);
    } catch (failure) {
      toast.fail(failure instanceof Error ? failure.message : t('refund.failed'), 3, undefined, false);
    } finally {
      setCompletingPayout(false);
    }
  };

  return (
    <>
    <PrintErrorDialog
      failure={printFailure}
      onClose={() => {
        setPrintFailure(null);
        setPendingReprint(null);
        setPendingRefundPrint(null);
      }}
      onRetry={
        pendingReprint
          ? () => {
              setPrintFailure(null);
              void runReprint(pendingReprint);
            }
          : pendingRefundPrint
            ? () => {
                setPrintFailure(null);
                void runRefundPrint(pendingRefundPrint);
              }
            : undefined
      }
    />
    <RefundDialog
      order={order}
      visible={refundOpen}
      onClose={() => setRefundOpen(false)}
      onRefunded={handleRefunded}
      requiresApproval={requiresApproval}
      onRequested={() => { setRefundOpen(false); onRefunded?.(); }}
    />
    <AppModal
      visible={confirmPayout}
      title={t('refund.payoutTitle')}
      onClose={() => { if (!completingPayout) setConfirmPayout(false); }}
      maxWidth={440}
      actions={[
        { text: t('common.cancel'), onPress: () => setConfirmPayout(false), disabled: completingPayout },
        { text: t('refund.confirmPayout'), onPress: () => void confirmApprovedPayout(), primary: true, disabled: completingPayout },
      ]}>
      <Txt variant="body">{t('refund.payoutWarning', { amount: formatVnd(Number(approvalRequest?.amount ?? 0)) })}</Txt>
    </AppModal>
    <AppModal
      visible={!refundOpen && !confirmPayout}
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
            {t('orders.cancelledReason', { reason: formatRefundReason(order.cancelledReason, t) })}
          </Txt>
        ) : null}

        {order.refundedAmount ? (
          <View style={[styles.refundBox, { borderColor: theme.border_color_base }]}>
            <View style={styles.refundHead}>
              <RefundBadge amount={order.refundedAmount} />
            </View>
            {order.lines
              .filter((line) => line.status === 'Huỷ' && !line.parentId)
              .map((line) => (
                <Txt key={line.id} variant="caption" muted numberOfLines={2}>
                  {line.qty} × {line.name}
                  {line.cancelledReason && order.status !== 'Đã huỷ'
                    ? ` · ${formatRefundReason(line.cancelledReason, t)}`
                    : ''}
                </Txt>
              ))}
          </View>
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
            {approvalRequest?.status === 'PENDING' ? (
              <Txt variant="caption" muted>{t('refund.pendingApproval')}</Txt>
            ) : null}
            {approvalRequest?.status === 'REJECTED' ? (
              <Txt variant="caption" color={theme.brand_error}>{t('refund.rejected', { note: approvalRequest.reviewNote || '—' })}</Txt>
            ) : null}
            {approvalRequest?.status === 'APPROVED' ? (
              <Btn
                label={t('refund.confirmPayout')}
                icon="refund"
                block
                disabled={printing || completingPayout}
                onPress={() => setConfirmPayout(true)}
              />
            ) : null}
            {canRefund ? (
              <Btn
                label={t('refund.open')}
                icon="refund"
                block
                variant="ghost"
                disabled={printing}
                onPress={() => setRefundOpen(true)}
              />
            ) : null}
            <Txt variant="tiny" muted style={styles.note}>{t('refund.refundPolicyNote')}</Txt>
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
  refundBox: { gap: 4, borderWidth: 1, borderStyle: 'dashed', borderRadius: 6, padding: 10 },
  refundHead: { flexDirection: 'row', marginBottom: 2 },
});
