import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useAuth } from '@/src/auth/auth-context';
import { toast } from '@/src/components/ui/toast';
import { clockAt, formatVnd } from '@/src/data/format';
import type { HistoryOrder, OrderRefundRef } from '@/src/data/types';
import {
  completeApprovedCashRefund,
  getOrderReceipt,
  listPrintJobs,
  loadOrderRefunds,
  recordRefundSlipPrint,
  reprintOrder,
  type CashRefundResult,
  type OrderReceipt,
  type PrintJob,
  type RefundApprovalRequest,
} from '@/src/services/cashier-api';
import { toPrintFailure, type PrintFailure } from '@/src/services/printer/bluetooth-printer';
import { printReceipt, printRefundSlip, type RefundSlipPrintJob } from '@/src/services/printer/print-service';
import { useStation } from '@/src/stations/station-context';
import { useAppTheme } from '@/src/theme/use-theme';
import { OrderStatusBadge, RefundBadge } from '../status-badge';
import { AppModal } from '../ui/app-modal';
import { Btn } from '../ui/button';
import { Field } from '../ui/field';
import { Txt } from '../ui/txt';
import { PrintErrorDialog } from './print-error-dialog';
import { ReceiptPdfSection, RefundPdfSection } from './receipt-pdf-section';
import { ReceiptPreview } from './receipt-preview';
import { formatRefundReason, RefundDialog, refundableLines } from './refund-dialog';

const MIN_REASON_LENGTH = 3;

/** Lượt in lại đã được backend ghi nhận nhưng chưa in được; giữ để "Thử lại" không tạo thêm lượt in lại mới. */
type PendingReprint = { receipt: Awaited<ReturnType<typeof reprintOrder>>; jobIds?: string[] };

/**
 * Lượt hoàn vừa tạo trên máy này, theo đơn: lịch sử đơn của thu ngân có thể không trả kèm refund nên giữ lại để mở
 * lại chi tiết đơn vẫn thấy được PDF phiếu hoàn.
 */
const recentRefunds = new Map<string, OrderRefundRef[]>();

/** Gộp các nguồn id lượt hoàn, bỏ trùng (giữ bản có nhiều thông tin hơn), cũ trước mới sau. */
function mergeRefunds(...sources: (OrderRefundRef[] | undefined)[]): OrderRefundRef[] {
  const byId = new Map<string, OrderRefundRef>();
  for (const source of sources) {
    for (const refund of source ?? []) {
      const known = byId.get(refund.id);
      byId.set(refund.id, {
        id: refund.id,
        amount: known?.amount ?? refund.amount,
        at: known?.at ?? refund.at,
      });
    }
  }
  return [...byId.values()].sort((a, b) => (a.at ?? '').localeCompare(b.at ?? ''));
}

/**
 * Chi tiết một đơn trong lịch sử (CS-05): xem lại bill, in lại kèm lý do — backend ghi nhận mỗi lần in lại (BR-21) —
 * và hoàn tiền mặt cho đơn đã thanh toán hôm nay (cả đơn hoặc từng món).
 */
export function OrderDetailDialog({
  order,
  onClose,
  onRefunded,
  approvalRequest,
  knownRefunds,
}: {
  order: HistoryOrder | null;
  onClose: () => void;
  /** Gọi sau khi backend ghi nhận hoàn tiền để màn hình tải lại danh sách đơn. */
  onRefunded?: () => void;
  approvalRequest?: RefundApprovalRequest | null;
  /** Lượt hoàn đã biết từ nguồn khác (vd. yêu cầu duyệt hoàn tiền đã hoàn tất). */
  knownRefunds?: OrderRefundRef[];
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
  const [pendingRefundPrint, setPendingRefundPrint] = useState<RefundSlipPrintJob | null>(null);
  const [detailRefunds, setDetailRefunds] = useState<OrderRefundRef[]>([]);
  const [sessionRefunds, setSessionRefunds] = useState<OrderRefundRef[]>([]);
  const [refundReprintId, setRefundReprintId] = useState<string | null>(null);
  const [refundReprintReason, setRefundReprintReason] = useState('');
  const refundedAmount = order?.refundedAmount;

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
    setRefundReprintId(null);
    setRefundReprintReason('');
    setSessionRefunds(orderId ? recentRefunds.get(orderId) ?? [] : []);
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

  // id lượt hoàn để lấy PDF phiếu hoàn: chi tiết đơn có thể trả kèm `refunds` dù lịch sử không có
  useEffect(() => {
    setDetailRefunds([]);
    if (!orderId || !refundedAmount) return;
    let active = true;
    loadOrderRefunds(orderId)
      .then((refunds) => {
        if (active) setDetailRefunds(refunds);
      })
      .catch(() => {
        // vẫn còn id từ lịch sử / yêu cầu duyệt / lượt hoàn vừa tạo
      });
    return () => {
      active = false;
    };
  }, [orderId, refundedAmount]);

  const refunds = useMemo(
    () => mergeRefunds(order?.refunds, detailRefunds, knownRefunds, sessionRefunds),
    [order?.refunds, detailRefunds, knownRefunds, sessionRefunds],
  );

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

  /**
   * In phiếu hoàn tiền từ PDF backend đã lưu; lỗi máy in không ảnh hưởng lượt hoàn đã được ghi nhận. "Thử lại" dùng
   * lại đúng lượt in (`printLogId`) nên không tạo thêm lượt in lại mới.
   */
  const runRefundPrint = async (job: RefundSlipPrintJob, reprinted = false) => {
    setPrinting(true);
    try {
      await printRefundSlip(job, selectedStation);
      setPendingRefundPrint(null);
      setRefundReprintId(null);
      setRefundReprintReason('');
      toast.success(t(reprinted ? 'refund.pdf.reprinted' : 'refund.slipPrinted'), 1.5, undefined, false);
    } catch (failure) {
      setPendingRefundPrint(job);
      setPrintFailure(toPrintFailure(failure));
    } finally {
      setPrinting(false);
    }
  };

  /** Phần đầu phiếu chữ dự phòng; người hoàn là thu ngân đang đăng nhập, có thể khác người đã thu tiền đơn. */
  const refundSlipHeader = (): RefundSlipPrintJob['header'] => ({
    sellerName: receipt?.seller.name,
    branchName: receipt?.seller.branchName,
    cashier: user?.employee ? `${user.employee.firstName} ${user.employee.lastName}`.trim() || null : null,
  });

  const handleRefunded = async (result: CashRefundResult) => {
    setRefundOpen(false);
    toast.success(t('refund.success', { amount: formatVnd(Number(result.refund.amount)) }), 2, undefined, false);
    const created: OrderRefundRef = {
      id: result.refund.id,
      amount: Number(result.refund.amount),
      at: result.refund.completedAt ?? result.refund.requestedAt,
    };
    const remembered = mergeRefunds(recentRefunds.get(order.id), [created]);
    recentRefunds.set(order.id, remembered);
    setSessionRefunds(remembered);
    onRefunded?.();
    // lượt in đầu ngay sau khi hoàn; ghi nhận lỗi vẫn in để khách có phiếu ký nhận
    const printLog = await recordRefundSlipPrint(order.id, result.refund.id, { isReprint: false }).catch((reason) => {
      console.warn('Không ghi nhận được lượt in phiếu hoàn:', reason);
      return null;
    });
    void runRefundPrint({
      orderId: order.id,
      refundId: result.refund.id,
      header: refundSlipHeader(),
      printLogId: printLog?.id,
    });
  };

  const refundReprintValid = refundReprintReason.trim().length >= MIN_REASON_LENGTH;

  /** In lại phiếu hoàn: backend ghi nhận lượt in lại kèm lý do (BR-53) rồi mới in từ PDF đã lưu. */
  const submitRefundReprint = async (refundId: string) => {
    if (!refundReprintValid || printing) return;
    setPrinting(true);
    let printLogId: string;
    try {
      printLogId = (await recordRefundSlipPrint(order.id, refundId, { isReprint: true, reason: refundReprintReason })).id;
    } catch (failure) {
      toast.fail(failure instanceof Error ? failure.message : t('orders.reprintFailed'), 3, undefined, false);
      setPrinting(false);
      return;
    }
    await runRefundPrint({ orderId: order.id, refundId, header: refundSlipHeader(), printLogId }, true);
  };

  const confirmApprovedPayout = async () => {
    if (!approvalRequest || completingPayout) return;
    setCompletingPayout(true);
    try {
      const result = await completeApprovedCashRefund(approvalRequest.id);
      setConfirmPayout(false);
      void handleRefunded(result);
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
            {/* chỉ dựng danh sách món đã hoàn cục bộ khi không tìm được PDF phiếu hoàn trên backend */}
            {refunds.length === 0 ? (
              <>
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
                <Txt variant="tiny" muted>{t('refund.pdf.notFound')}</Txt>
              </>
            ) : null}
          </View>
        ) : null}

        {/* Phiếu hoàn tiền: xem / in lại đúng PDF backend đã lưu cho từng lượt hoàn */}
        {refunds.map((refund, index) => (
          <RefundPdfSection
            key={refund.id}
            orderId={order.id}
            refundId={refund.id}
            subtitle={[
              refunds.length > 1 ? t('refund.pdf.index', { index: index + 1 }) : null,
              refund.amount !== undefined ? formatVnd(refund.amount) : null,
              refund.at ? clockAt(refund.at) : null,
            ].filter(Boolean).join(' · ') || undefined}>
            {refundReprintId === refund.id ? (
              <View style={styles.reasonBox}>
                <Field
                  label={t('orders.reprintReason')}
                  placeholder={t('orders.reprintReasonPlaceholder')}
                  value={refundReprintReason}
                  onChangeText={setRefundReprintReason}
                  maxLength={500}
                />
                <View style={styles.reasonActions}>
                  <Btn label={t('common.cancel')} variant="ghost" onPress={() => setRefundReprintId(null)} />
                  <Btn
                    label={t('orders.reprintConfirm')}
                    icon="print"
                    disabled={!refundReprintValid || printing}
                    onPress={() => void submitRefundReprint(refund.id)}
                  />
                </View>
              </View>
            ) : (
              <Btn
                label={t('refund.pdf.reprint')}
                icon="print"
                block
                variant="ghost"
                disabled={printing}
                onPress={() => {
                  setRefundReprintReason('');
                  setRefundReprintId(refund.id);
                }}
              />
            )}
          </RefundPdfSection>
        ))}

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
