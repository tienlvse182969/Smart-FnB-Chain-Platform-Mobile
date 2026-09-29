import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { formatVnd } from '@/src/data/format';
import {
  defaultSelection,
  optionsFromSelection,
  selectionErrors,
  unitPriceOf,
  type OptionSelection,
} from '@/src/data/order-utils';
import { useStore } from '@/src/data/store';
import type { MenuItem, OrderOption } from '@/src/data/types';
import { useAppTheme } from '@/src/theme/use-theme';
import { AppModal } from '../ui/app-modal';
import { Field } from '../ui/field';
import { Icon } from '../ui/icon';
import { Stepper } from '../ui/stepper';
import { Txt } from '../ui/txt';

export type ItemDraft = {
  qty: number;
  note: string;
  options: OrderOption[];
  unitPrice: number;
};

function OptionRow({
  label,
  checked,
  multiple,
  disabled,
  soldOutLabel,
  onPress,
}: {
  label: string;
  checked: boolean;
  multiple: boolean;
  disabled?: boolean;
  soldOutLabel?: string;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.optRow, disabled && { opacity: 0.4 }]}>
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
      <Txt variant="body" style={styles.optLabel}>
        {label}
      </Txt>
      {disabled && soldOutLabel ? (
        <Txt variant="caption" muted>
          {soldOutLabel}
        </Txt>
      ) : null}
    </Pressable>
  );
}

/**
 * Chọn tuỳ chọn cho một ly (CS-01, mục 12): tuỳ chọn mặc định chọn sẵn, mỗi nhóm kiểm tra quy
 * tắc bắt buộc/tối thiểu/tối đa (BR-14), tuỳ chọn đang tắt ở chi nhánh bị khoá.
 */
export function ItemOptionsDialog({
  visible,
  item,
  onDismiss,
  onConfirm,
}: {
  visible: boolean;
  item: MenuItem | null;
  onDismiss: () => void;
  onConfirm: (draft: ItemDraft) => void;
}) {
  const { t } = useTranslation();
  const { isOptionAvailable } = useStore();
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [selected, setSelected] = useState<OptionSelection>({});

  useEffect(() => {
    if (!visible || !item) return;
    setQty(1);
    setNote('');
    setSelected(defaultSelection(item));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, item?.id]);

  const { unitPrice, options, valid } = useMemo(() => {
    if (!item) return { unitPrice: 0, options: [] as OrderOption[], valid: false };
    const opts = optionsFromSelection(item, selected);
    return {
      unitPrice: unitPriceOf(item, opts),
      options: opts,
      valid: selectionErrors(item, selected, isOptionAvailable).length === 0,
    };
  }, [item, selected, isOptionAvailable]);

  if (!item) return null;

  const toggle = (groupId: string, choiceId: string, max: number) => {
    setSelected((prev) => {
      const cur = prev[groupId] ?? [];
      if (max === 1) return { ...prev, [groupId]: [choiceId] };
      if (cur.includes(choiceId)) return { ...prev, [groupId]: cur.filter((c) => c !== choiceId) };
      if (cur.length >= max) return prev;
      return { ...prev, [groupId]: [...cur, choiceId] };
    });
  };

  return (
    <AppModal
      visible={visible}
      title={item.name}
      onClose={onDismiss}
      actions={[
        { text: t('common.cancel'), onPress: onDismiss },
        {
          text: t('itemOptionsDialog.addBtn', { total: formatVnd(unitPrice * qty) }),
          onPress: () => onConfirm({ qty, note: note.trim(), options, unitPrice }),
          primary: true,
          disabled: !valid,
        },
      ]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
        {item.options.map((g) => (
          <View key={g.id} style={styles.group}>
            <Txt variant="label" muted style={styles.groupLabel}>
              {g.label}
              {g.required
                ? ` · ${t('itemOptionsDialog.required')}`
                : g.max > 1
                  ? ` · ${t('itemOptionsDialog.maxHint', { max: g.max })}`
                  : ''}
            </Txt>
            {g.choices.map((c) => (
              <OptionRow
                key={c.id}
                label={c.priceDelta ? `${c.label}  (+${formatVnd(c.priceDelta)})` : c.label}
                checked={(selected[g.id] ?? []).includes(c.id)}
                multiple={g.max > 1}
                disabled={!isOptionAvailable(c.id)}
                soldOutLabel={t('itemOptionsDialog.soldOut')}
                onPress={() => toggle(g.id, c.id, g.max)}
              />
            ))}
          </View>
        ))}

        <View style={styles.qtyRow}>
          <Txt variant="bodyStrong">{t('itemOptionsDialog.qtyLabel')}</Txt>
          <Stepper value={qty} onChange={setQty} />
        </View>

        <Field
          label={t('itemOptionsDialog.noteLabel')}
          placeholder={t('itemOptionsDialog.notePlaceholder')}
          value={note}
          onChangeText={setNote}
        />
      </ScrollView>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 420 },
  body: { gap: 8, paddingBottom: 4 },
  group: { gap: 2 },
  groupLabel: { marginTop: 6, marginBottom: 2 },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  optLabel: { flex: 1 },
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
