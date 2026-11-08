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
import { SIZE_GROUP_ID, type MenuItem, type OrderOption, type SelectedExtra } from '@/src/data/types';
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
  extras: SelectedExtra[];
  unitPrice: number;
};

/** extraId → số phần đã chọn cho một ly */
export type ExtraSelection = Record<string, number>;

export function OptionRow({
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
        {checked ? <Icon name="check" size={12} color={theme.brand_on_primary} strokeWidth={3} /> : null}
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

/** Topping đã chọn, theo thứ tự của món, bỏ các loại 0 phần. */
export function extrasFromSelection(item: MenuItem, selected: ExtraSelection): SelectedExtra[] {
  return (item.extras ?? [])
    .filter((e) => (selected[e.id] ?? 0) > 0)
    .map((e) => ({ extraId: e.id, label: e.label, price: e.price, qty: selected[e.id] }));
}

/** Tổng phần topping vượt giới hạn của món, hoặc có topping đã hết. */
export function extrasInvalid(item: MenuItem, selected: ExtraSelection): boolean {
  const extras = item.extras ?? [];
  const total = extras.reduce((sum, e) => sum + (selected[e.id] ?? 0), 0);
  return (
    total > (item.maxExtras ?? 0) ||
    extras.some((e) => (selected[e.id] ?? 0) > 0 && (!e.available || selected[e.id] > e.maxQuantity))
  );
}

/** Danh sách nhóm tuỳ chọn của một món (size, đường, đá…) theo quy tắc BR-14. */
export function OptionGroupsPicker({
  item,
  selected,
  onChange,
  isOptionAvailable,
  hideSize = false,
}: {
  item: MenuItem;
  selected: OptionSelection;
  onChange: (next: OptionSelection) => void;
  /**
   * Nhận từ dialog cha: nội dung AppModal render qua portal nằm ngoài StoreProvider,
   * nên component con trong modal không được gọi `useStore()`.
   */
  isOptionAvailable: (choiceId: string) => boolean;
  /** combo cố định size thì không cho đổi size */
  hideSize?: boolean;
}) {
  const { t } = useTranslation();

  const toggle = (groupId: string, choiceId: string, max: number) => {
    const cur = selected[groupId] ?? [];
    if (max === 1) return onChange({ ...selected, [groupId]: [choiceId] });
    if (cur.includes(choiceId)) return onChange({ ...selected, [groupId]: cur.filter((c) => c !== choiceId) });
    if (cur.length >= max) return;
    onChange({ ...selected, [groupId]: [...cur, choiceId] });
  };

  return (
    <>
      {item.options
        .filter((g) => !(hideSize && g.id === SIZE_GROUP_ID))
        .map((g) => (
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
    </>
  );
}

/** Chọn số phần cho từng topping; tổng không vượt `maxExtras` của món. */
export function ExtrasPicker({
  item,
  selected,
  onChange,
}: {
  item: MenuItem;
  selected: ExtraSelection;
  onChange: (next: ExtraSelection) => void;
}) {
  const { t } = useTranslation();
  const extras = item.extras ?? [];
  const maxExtras = item.maxExtras ?? 0;
  if (!extras.length || maxExtras <= 0) return null;
  const total = extras.reduce((sum, e) => sum + (selected[e.id] ?? 0), 0);

  return (
    <View style={styles.group}>
      <Txt variant="label" muted style={styles.groupLabel}>
        {t('itemOptionsDialog.toppingTitle', { max: maxExtras })}
      </Txt>
      {extras.map((e) => {
        const value = selected[e.id] ?? 0;
        const room = maxExtras - total + value;
        return (
          <View key={e.id} style={[styles.extraRow, !e.available && { opacity: 0.4 }]}>
            <Txt variant="body" style={styles.optLabel}>
              {`${e.label}  (+${formatVnd(e.price)})`}
            </Txt>
            {e.available ? (
              <Stepper
                size="sm"
                min={0}
                max={Math.max(value, Math.min(e.maxQuantity, room))}
                value={value}
                onChange={(q) => onChange({ ...selected, [e.id]: q })}
              />
            ) : (
              <Txt variant="caption" muted>
                {t('itemOptionsDialog.soldOut')}
              </Txt>
            )}
          </View>
        );
      })}
    </View>
  );
}

/**
 * Chọn tuỳ chọn cho một ly (CS-01, mục 12): tuỳ chọn mặc định chọn sẵn, mỗi nhóm kiểm tra quy
 * tắc bắt buộc/tối thiểu/tối đa (BR-14), tuỳ chọn đang tắt ở chi nhánh bị khoá; topping chọn theo số phần.
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
  const [extraSel, setExtraSel] = useState<ExtraSelection>({});

  useEffect(() => {
    if (!visible || !item) return;
    setQty(1);
    setNote('');
    setSelected(defaultSelection(item));
    setExtraSel({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, item?.id]);

  const { unitPrice, options, extras, valid } = useMemo(() => {
    if (!item) return { unitPrice: 0, options: [] as OrderOption[], extras: [] as SelectedExtra[], valid: false };
    const opts = optionsFromSelection(item, selected);
    const picked = extrasFromSelection(item, extraSel);
    return {
      unitPrice: unitPriceOf(item, opts, picked),
      options: opts,
      extras: picked,
      valid:
        selectionErrors(item, selected, isOptionAvailable).length === 0 && !extrasInvalid(item, extraSel),
    };
  }, [item, selected, extraSel, isOptionAvailable]);

  if (!item) return null;

  return (
    <AppModal
      visible={visible}
      title={item.name}
      onClose={onDismiss}
      actions={[
        { text: t('common.cancel'), onPress: onDismiss },
        {
          text: t('itemOptionsDialog.addBtn', { total: formatVnd(unitPrice * qty) }),
          onPress: () => onConfirm({ qty, note: note.trim(), options, extras, unitPrice }),
          primary: true,
          disabled: !valid,
        },
      ]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
        <OptionGroupsPicker
          item={item}
          selected={selected}
          onChange={setSelected}
          isOptionAvailable={isOptionAvailable}
        />
        <ExtrasPicker item={item} selected={extraSel} onChange={setExtraSel} />

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

export const optionStyles = StyleSheet.create({
  scroll: { maxHeight: 420 },
  body: { gap: 8, paddingBottom: 4 },
  group: { gap: 2 },
  groupLabel: { marginTop: 6, marginBottom: 2 },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
});

const styles = StyleSheet.create({
  ...optionStyles,
  optRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  extraRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  optLabel: { flex: 1 },
  box: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
