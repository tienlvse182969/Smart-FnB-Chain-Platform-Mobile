import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Btn } from '@/src/components/ui/button';
import { Field } from '@/src/components/ui/field';
import { Icon } from '@/src/components/ui/icon';
import { toast } from '@/src/components/ui/toast';
import { Txt } from '@/src/components/ui/txt';
import { clockAt } from '@/src/data/format';
import {
  assignPager,
  notifyPager,
  PAGER_MAX,
  pagerErrorMessage,
  parsePagerNumber,
  type PagerUpdate,
} from '@/src/services/pager-api';
import { fontFamily } from '@/src/theme/typography';
import { useAppTheme } from '@/src/theme/use-theme';

type Busy = 'assign' | 'remove' | 'notify' | null;

/**
 * Khối "Máy báo rung" của một đơn quầy: thu ngân nhập số máy sau khi khách thanh toán, đổi / gỡ khi cần,
 * và ghi nhận đã gọi máy khi đơn sẵn sàng. Backend không phát tín hiệu thật — nhân viên bấm trên bộ phát.
 */
export function PagerPanel({
  orderId,
  pagerNumber,
  pagerNotifiedAt,
  editable = true,
  ready = false,
  autoFocus = false,
  onChanged,
}: {
  orderId: string;
  pagerNumber: number | null | undefined;
  pagerNotifiedAt?: string | null;
  /** Đơn đã thanh toán và chưa hoàn tất → được gán / đổi / gỡ. */
  editable?: boolean;
  /** Đơn đã READY → hiện nút ghi nhận đã gọi máy. */
  ready?: boolean;
  autoFocus?: boolean;
  onChanged?: (update: PagerUpdate) => void;
}) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const [current, setCurrent] = useState<number | null>(pagerNumber ?? null);
  const [notifiedAt, setNotifiedAt] = useState<string | null>(pagerNotifiedAt ?? null);
  const [editing, setEditing] = useState(editable && pagerNumber == null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);

  // đồng bộ khi mở đơn khác hoặc danh sách tải lại dữ liệu mới từ backend
  useEffect(() => {
    setCurrent(pagerNumber ?? null);
    setNotifiedAt(pagerNotifiedAt ?? null);
    setEditing(editable && pagerNumber == null);
    setInput('');
    setError(null);
  }, [orderId, pagerNumber, pagerNotifiedAt, editable]);

  const apply = (update: PagerUpdate) => {
    setCurrent(update.pagerNumber);
    setNotifiedAt(update.pagerNotifiedAt);
    onChanged?.(update);
  };

  const run = async (kind: Exclude<Busy, null>, action: () => Promise<PagerUpdate>, number: number | null) => {
    if (busy) return;
    setBusy(kind);
    setError(null);
    try {
      const update = await action();
      apply(update);
      setEditing(false);
      setInput('');
      if (kind === 'assign') toast.success(t('pager.assigned', { number: update.pagerNumber }), 1.5, undefined, false);
      if (kind === 'remove') toast.info(t('pager.removed'), 1.5, undefined, false);
      if (kind === 'notify') toast.success(t('pager.notifiedToast', { number }), 1.5, undefined, false);
    } catch (reason) {
      setError(pagerErrorMessage(reason, t, number));
    } finally {
      setBusy(null);
    }
  };

  const save = () => {
    const number = parsePagerNumber(input);
    if (number === null) return setError(t('pager.errors.range'));
    if (number === current) {
      setEditing(false);
      setInput('');
      return;
    }
    void run('assign', () => assignPager(orderId, number), number);
  };

  const remove = () => void run('remove', () => assignPager(orderId, null), current);
  const notify = () => {
    if (current !== null) void run('notify', () => notifyPager(orderId, current), current);
  };

  // đơn đã đóng và chưa từng gán máy → không có gì để hiện
  if (!editable && current === null) return null;

  return (
    <View style={[styles.box, { borderColor: theme.border_color_base, backgroundColor: theme.fill_base }]}>
      <View style={styles.head}>
        <Icon name="pager" size={18} />
        <Txt variant="bodyStrong" style={styles.flex}>{t('pager.title')}</Txt>
        {current !== null && !editing ? <Txt style={styles.number}>#{current}</Txt> : null}
      </View>

      {editing ? (
        <>
          <Txt variant="caption" muted>{t('pager.hint')}</Txt>
          <View style={styles.inputRow}>
            <Field
              containerStyle={styles.flex}
              value={input}
              onChangeText={(value) => setInput(value.replace(/[^0-9]/g, '').slice(0, String(PAGER_MAX).length))}
              placeholder={t('pager.placeholder')}
              keyboardType="number-pad"
              maxLength={3}
              autoFocus={autoFocus}
              onSubmitEditing={save}
              accessibilityLabel={t('pager.label')}
            />
            <Btn
              label={current === null ? t('pager.assign') : t('pager.save')}
              icon="pager"
              loading={busy === 'assign'}
              disabled={!input || !!busy}
              onPress={save}
            />
          </View>
          {current !== null ? (
            <Btn label={t('common.cancel')} variant="plain" size="sm" onPress={() => { setEditing(false); setInput(''); setError(null); }} />
          ) : null}
        </>
      ) : (
        <>
          {notifiedAt ? (
            <Txt variant="caption" muted>{t('pager.notified', { time: clockAt(notifiedAt) })}</Txt>
          ) : null}
          {ready && current !== null && !notifiedAt ? (
            <>
              <Txt variant="caption" muted>{t('pager.readyHint')}</Txt>
              <Btn label={t('pager.notifyLong')} icon="bell" block loading={busy === 'notify'} disabled={!!busy} onPress={notify} />
            </>
          ) : null}
          {editable && current !== null ? (
            <View style={styles.actions}>
              <Btn
                label={t('pager.change')}
                icon="edit"
                variant="ghost"
                size="sm"
                disabled={!!busy}
                onPress={() => { setInput(String(current)); setEditing(true); setError(null); }}
              />
              <Btn label={t('pager.remove')} icon="remove" variant="plain" size="sm" loading={busy === 'remove'} disabled={!!busy} onPress={remove} />
            </View>
          ) : null}
        </>
      )}

      {error ? <Txt variant="caption" color={theme.brand_error}>{error}</Txt> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignSelf: 'stretch', borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, padding: 12, gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  number: { fontFamily: fontFamily.black, fontSize: 24, lineHeight: 30 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});
