import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { durationSince } from '@/src/data/format';
import type { KitchenTicketItem, OrderItemStatus } from '@/src/data/types';
import { orderItemActionKey } from '@/src/i18n/labels';
import { fontFamily } from '@/src/theme/typography';
import { useAppTheme } from '@/src/theme/use-theme';
import { Txt } from '../ui/txt';

const SLA_COLOR = {
  'bình thường': undefined,
  'sắp trễ': { bg: '#FFF3D6', border: '#B7791F' },
  trễ: { bg: '#FBDBD8', border: '#C0392B' },
} as const;

const ACTIONS: { status: OrderItemStatus; labelKey: string }[] = [
  { status: 'Trong hàng đợi', labelKey: orderItemActionKey['Trong hàng đợi'] },
  { status: 'Đang làm', labelKey: orderItemActionKey['Đang làm'] },
  { status: 'Xong', labelKey: orderItemActionKey.Xong },
  { status: 'Hết món', labelKey: orderItemActionKey['Hết món'] },
];

function BigButton({
  label,
  active,
  danger,
  onPress,
}: {
  label: string;
  active?: boolean;
  danger?: boolean;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  const bg = active ? theme.brand_primary : theme.fill_base;
  const fg = active ? theme.color_text_base_inverse : theme.color_text_base;
  const border = danger && !active ? '#C0392B' : theme.border_color_base;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.bigBtn,
        { backgroundColor: bg, borderColor: border },
        pressed && { opacity: 0.7 },
      ]}>
      <Txt style={[styles.bigBtnText, { color: danger && !active ? '#C0392B' : fg }]}>{label}</Txt>
    </Pressable>
  );
}

export function KitchenItemCard({
  ticket,
  onSetStatus,
}: {
  ticket: KitchenTicketItem;
  onSetStatus: (status: OrderItemStatus) => void;
}) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const sla = SLA_COLOR[ticket.sla];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: sla?.bg ?? theme.fill_base,
          borderColor: sla?.border ?? theme.border_color_thin,
          borderWidth: ticket.sla === 'trễ' ? 3 : sla ? 2 : StyleSheet.hairlineWidth,
        },
      ]}>
      <View style={styles.headRow}>
        <Txt style={styles.tables} numberOfLines={1}>
          {ticket.tableNames.join(', ')}
        </Txt>
        <Txt style={[styles.wait, sla ? { color: sla.border } : null]}>
          {durationSince(ticket.queuedAt)}
        </Txt>
      </View>

      <Txt style={styles.name} numberOfLines={2}>
        {ticket.name} × {ticket.qty}
      </Txt>
      {ticket.optionLabels.length ? (
        <Txt variant="title" muted numberOfLines={1}>
          {ticket.optionLabels.join(', ')}
        </Txt>
      ) : null}
      {ticket.note ? (
        <Txt style={styles.note} numberOfLines={2}>
          ✎ {ticket.note}
        </Txt>
      ) : null}

      <View style={styles.btnRow}>
        {ACTIONS.map((a) => (
          <BigButton
            key={a.status}
            label={t(a.labelKey)}
            active={ticket.status === a.status}
            danger={a.status === 'Hết món'}
            onPress={() => onSetStatus(a.status)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 6, padding: 14, gap: 8 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tables: { fontFamily: fontFamily.bold, fontSize: 22, flexShrink: 1 },
  wait: { fontFamily: fontFamily.bold, fontSize: 20 },
  name: { fontFamily: fontFamily.bold, fontSize: 24, lineHeight: 30 },
  note: { fontFamily: fontFamily.bold, fontSize: 20 },
  btnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  bigBtn: {
    flexGrow: 1,
    flexBasis: '22%',
    minHeight: 64,
    borderWidth: 2,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  bigBtnText: { fontFamily: fontFamily.bold, fontSize: 20 },
});
