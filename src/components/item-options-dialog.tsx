import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { formatVnd } from '@/src/data/format';
import type { MenuItem } from '@/src/data/types';
import { useAppTheme } from '@/src/theme/use-theme';
import { AppModal } from './ui/app-modal';
import { Field } from './ui/field';
import { Icon } from './ui/icon';
import { Stepper } from './ui/stepper';
import { Txt } from './ui/txt';

export type ItemDraft = {
  qty: number;
  note: string;
  optionLabels: string[];
  unitPrice: number;
};

function OptionRow({
  label,
  checked,
  multiple,
  onPress,
}: {
  label: string;
  checked: boolean;
  multiple: boolean;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  return (
    <Pressable onPress={onPress} style={styles.optRow}>
      <View
        style={[
          styles.box,
          {
            borderColor: theme.border_color_base,
            borderRadius: multiple ? 2 : 999,
            backgroundColor: checked ? theme.brand_primary : 'transparent',
          },
        ]}>
        {checked ? <Icon name="check" size={12} color={theme.color_text_base_inverse} strokeWidth={3} /> : null}
      </View>
      <Txt variant="body">{label}</Txt>
    </Pressable>
  );
}

export function ItemOptionsDialog({
  visible,
  item,
  initial,
  onDismiss,
  onConfirm,
}: {
  visible: boolean;
  item: MenuItem | null;
  initial?: Partial<ItemDraft>;
  onDismiss: () => void;
  onConfirm: (draft: ItemDraft) => void;
}) {
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [selected, setSelected] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!visible || !item) return;
    setQty(initial?.qty ?? 1);
    setNote(initial?.note ?? '');
    const preset: Record<string, string[]> = {};
    item.options.forEach((g) => {
      const pre = g.choices.find((c) => initial?.optionLabels?.includes(c.label));
      if (pre) preset[g.id] = [pre.id];
      else if (g.required && !g.multiple) preset[g.id] = [g.choices[0].id];
      else preset[g.id] = [];
    });
    setSelected(preset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, item?.id]);

  const { unitPrice, labels, valid } = useMemo(() => {
    if (!item) return { unitPrice: 0, labels: [] as string[], valid: false };
    let price = item.price;
    const lbls: string[] = [];
    let ok = true;
    for (const g of item.options) {
      const picks = selected[g.id] ?? [];
      if (g.required && picks.length === 0) ok = false;
      for (const cid of picks) {
        const choice = g.choices.find((c) => c.id === cid);
        if (choice) {
          price += choice.priceDelta;
          lbls.push(choice.label);
        }
      }
    }
    return { unitPrice: price, labels: lbls, valid: ok };
  }, [item, selected]);

  if (!item) return null;

  const toggle = (groupId: string, choiceId: string, multiple: boolean) => {
    setSelected((prev) => {
      const cur = prev[groupId] ?? [];
      if (multiple) {
        return {
          ...prev,
          [groupId]: cur.includes(choiceId)
            ? cur.filter((c) => c !== choiceId)
            : [...cur, choiceId],
        };
      }
      return { ...prev, [groupId]: [choiceId] };
    });
  };

  return (
    <AppModal
      visible={visible}
      title={item.name}
      onClose={onDismiss}
      actions={[
        { text: 'Huỷ', onPress: onDismiss },
        {
          text: `Thêm · ${formatVnd(unitPrice * qty)}`,
          onPress: () => onConfirm({ qty, note: note.trim(), optionLabels: labels, unitPrice }),
          primary: true,
          disabled: !valid,
        },
      ]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
        {item.options.map((g) => (
          <View key={g.id} style={styles.group}>
            <Txt variant="label" muted style={styles.groupLabel}>
              {g.label}
              {g.required ? ' *' : ''}
            </Txt>
            {g.choices.map((c) => (
              <OptionRow
                key={c.id}
                label={c.priceDelta ? `${c.label}  (+${formatVnd(c.priceDelta)})` : c.label}
                checked={(selected[g.id] ?? []).includes(c.id)}
                multiple={g.multiple}
                onPress={() => toggle(g.id, c.id, g.multiple)}
              />
            ))}
          </View>
        ))}

        <View style={styles.qtyRow}>
          <Txt variant="bodyStrong">Số lượng</Txt>
          <Stepper value={qty} onChange={setQty} />
        </View>

        <Field
          label="Ghi chú cho bếp"
          placeholder="Ít đá, không đường…"
          value={note}
          onChangeText={setNote}
        />
      </ScrollView>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 380 },
  body: { gap: 8, paddingBottom: 4 },
  group: { gap: 2 },
  groupLabel: { marginTop: 6, marginBottom: 2 },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  box: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
});
