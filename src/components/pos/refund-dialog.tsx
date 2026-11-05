import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { toast } from '@/src/components/ui/toast';
import { formatVnd } from '@/src/data/format';
import type { HistoryOrder, OrderLine } from '@/src/data/types';
import {
  createCashRefund,
  requestCashRefundApproval,
  REFUND_NOTE_MAX_LENGTH,
  REFUND_NOTE_MIN_LENGTH,
  REFUND_REASON_CODES,
  type CashRefundResult,
  type RefundReasonCode,
} from '@/src/services/cashier-api';
import { useAppTheme } from '@/src/theme/use-theme';
import { AppModal } from '../ui/app-modal';
import { Field } from '../ui/field';
import { Icon } from '../ui/icon';
import { Pill } from '../ui/pill';
import { Segmented } from '../ui/segmented';
import { Txt } from '../ui/txt';

type Scope = 'all' | 'items';

/** Dòng còn hoàn được: chưa huỷ và là dòng gốc (combo phải hoàn cả combo). */
export function refundableLines(order: HistoryOrder) {
  return order.lines.filter((line) => line.status !== 'Huỷ' && !line.parentId);
}

/**
 * Backend lưu lý do hoàn dạng `MÃ` hoặc `MÃ: ghi chú` (vd. `OUT_OF_STOCK: hết đào`); đổi mã sang nhãn hiển thị.
 * Lý do huỷ khác (không mở đầu bằng mã hoàn tiền) giữ nguyên.
 */
export function formatRefundReason(reason: string, t: (key: string) => string) {
  const [code, ...rest] = reason.split(': ');
  if (!(REFUND_REASON_CODES as readonly string[]).includes(code)) return reason;
  const note = rest.join(': ').trim();
  return note ? `${t(`refund.reason.${code}`)} · ${note}` : t(`refund.reason.${code}`);
}

function lineAmount(line: OrderLine) {
  return line.lineTotal ?? line.unitPrice * line.qty;
}

/**
 * Thu ngân trả lại tiền mặt cho khách rồi xác nhận trên app (đơn thanh toán hôm nay của chi nhánh): hoàn cả đơn hoặc
 * từng món, ví dụ khi pha chế báo hết nguyên liệu hay làm sai món. Backend ghi nhận hoàn tiền ngay, huỷ món và trừ
 * doanh thu; thao tác không hoàn tác được.
 */
export function RefundDialog({
  order,
  visible,
  onClose,
  onRefunded,
  onRequested,
  requiresApproval,
}: {
  order: HistoryOrder;
  visible: boolean;
  onClose: () => void;
  onRefunded: (result: CashRefundResult) => void;
  onRequested: () => void;
  requiresApproval: boolean;
}) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const lines = useMemo(() => refundableLines(order), [order]);
  const [scope, setScope] = useState<Scope>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState<RefundReasonCode | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setScope('all');
    setSelected(new Set());
    setReason(null);
    setNote('');
  }, [visible, order.id]);

  const balance = Math.max(0, order.total - (order.refundedAmount ?? 0));
  const amount =
    scope === 'all'
      ? balance
      : Math.min(
          balance,
          lines.filter((line) => selected.has(line.id)).reduce((sum, line) => sum + lineAmount(line), 0),
        );
  const noteValid = reason !== 'OTHER' || note.trim().length >= REFUND_NOTE_MIN_LENGTH;
  const valid = reason !== null && noteValid && amount > 0 && (scope === 'all' || selected.size > 0);

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = async () => {
    if (!valid || !reason || submitting) return;
    setSubmitting(true);
    try {
      const input = {
        reasonCode: reason,
        note: note.trim() || undefined,
        orderItemIds: scope === 'items' ? [...selected] : undefined,
      };
      if (requiresApproval) {
        await requestCashRefundApproval(order.id, input);
        toast.success(t('refund.requested'), 2, undefined, false);
        onRequested();
      } else {
        const result = await createCashRefund(order.id, input);
        onRefunded(result);
      }
    } catch (failure) {
      toast.fail(failure instanceof Error ? failure.message : t('refund.failed'), 3, undefined, false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppModal
      visible={visible}
      icon="refund"
      title={t('refund.title', { code: order.orderCode })}
      onClose={submitting ? () => {} : onClose}
      maxWidth={520}
      actions={[
        { text: t('common.cancel'), onPress: onClose, disabled: submitting },
        {
          text: requiresApproval ? t('refund.requestApproval') : t('refund.confirm', { amount: formatVnd(amount) }),
          onPress: submit,
          primary: true,
          disabled: !valid || submitting,
        },
      ]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Txt variant="label" muted>
            {t('refund.scopeLabel')}
          </Txt>
          <Segmented<Scope>
            value={scope}
            onChange={setScope}
            options={[
              { value: 'all', label: t('refund.scopeAll') },
              { value: 'items', label: t('refund.scopeItems') },
            ]}
          />
        </View>

        {scope === 'items' ? (
          <View style={styles.lines}>
            {lines.map((line) => {
              const checked = selected.has(line.id);
              return (
                <Pressable
                  key={line.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                  onPress={() => toggle(line.id)}
                  style={({ pressed }) => [
                    styles.lineRow,
                    {
                      borderColor: checked ? theme.brand_primary : theme.border_color_base,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}>
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: checked ? theme.brand_primary : theme.border_color_base,
                        backgroundColor: checked ? theme.brand_primary : 'transparent',
                      },
                    ]}>
                    {checked ? <Icon name="check" size={14} color={theme.brand_on_primary} /> : null}
                  </View>
                  <Txt variant="body" style={styles.lineName} numberOfLines={2}>
                    {line.qty} × {line.name}
                    {line.sizeLabel ? ` (${line.sizeLabel})` : ''}
                  </Txt>
                  <Txt variant="bodyStrong">{formatVnd(lineAmount(line))}</Txt>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Txt variant="caption" muted>
            {t('refund.scopeAllHint', { count: lines.length })}
          </Txt>
        )}

        <View style={styles.section}>
          <Txt variant="label" muted>
            {t('refund.reasonLabel')}
          </Txt>
          <View style={styles.reasons}>
            {REFUND_REASON_CODES.map((code) => (
              <Pill
                key={code}
                label={t(`refund.reason.${code}`)}
                selected={reason === code}
                onPress={() => setReason(code)}
              />
            ))}
          </View>
        </View>

        <Field
          label={reason === 'OTHER' ? t('refund.noteRequired') : t('refund.noteOptional')}
          placeholder={t('refund.notePlaceholder')}
          value={note}
          onChangeText={setNote}
          maxLength={REFUND_NOTE_MAX_LENGTH}
        />
        {reason === 'OTHER' && !noteValid ? (
          <Txt variant="tiny" color={theme.brand_error}>
            {t('refund.noteTooShort', { min: REFUND_NOTE_MIN_LENGTH })}
          </Txt>
        ) : null}

        <View style={[styles.amountBox, { borderColor: theme.border_color_base }]}>
          <Txt variant="title">{requiresApproval ? t('refund.requestAmountLabel') : t('refund.amountLabel')}</Txt>
          <Txt variant="title">{formatVnd(amount)}</Txt>
        </View>
        <Txt variant="tiny" muted>
          {t(requiresApproval ? 'refund.requestNote' : 'refund.irreversibleNote')}
        </Txt>
      </ScrollView>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 560 },
  body: { gap: 12 },
  section: { gap: 6 },
  lines: { gap: 8 },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineName: { flex: 1 },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amountBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderStyle: 'dashed',
    paddingTop: 10,
  },
});
