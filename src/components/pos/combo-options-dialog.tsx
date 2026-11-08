import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { formatVnd } from '@/src/data/format';
import {
  defaultSelection,
  extrasTotal,
  optionsFromSelection,
  selectionErrors,
  type OptionSelection,
} from '@/src/data/order-utils';
import { useStore, type CartComboComponent } from '@/src/data/store';
import {
  SIZE_GROUP_ID,
  type MenuCombo,
  type MenuComboComponent,
  type MenuItem,
} from '@/src/data/types';
import { useAppTheme } from '@/src/theme/use-theme';
import { AppModal } from '../ui/app-modal';
import { Field } from '../ui/field';
import { Stepper } from '../ui/stepper';
import { Txt } from '../ui/txt';
import {
  ExtrasPicker,
  extrasFromSelection,
  extrasInvalid,
  OptionGroupsPicker,
  OptionRow,
  optionStyles,
  type ExtraSelection,
} from './item-options-dialog';

export type ComboDraft = {
  qty: number;
  note: string;
  unitPrice: number;
  components: CartComboComponent[];
};

type ComponentState = {
  menuItemId: string;
  options: OptionSelection;
  extras: ExtraSelection;
};

/** Combo cố định size: bỏ nhóm Size khỏi món để không bắt chọn và không tính giá size (backend tự gán). */
const itemForComponent = (item: MenuItem, component: MenuComboComponent): MenuItem =>
  component.fixedSizeCode ? { ...item, options: item.options.filter((g) => g.id !== SIZE_GROUP_ID) } : item;

function initialChoice(component: MenuComboComponent) {
  return (
    component.choices.find((c) => c.isDefault && c.available) ??
    component.choices.find((c) => c.available) ??
    component.choices[0]
  );
}

/**
 * Chọn combo: mỗi thành phần chọn một món (thành phần cố định chỉ có một món), rồi chọn tuỳ chọn
 * và topping cho món đó. Giá = giá combo + (phụ thu + tuỳ chọn + topping) × số ly của thành phần.
 */
export function ComboOptionsDialog({
  visible,
  combo,
  onDismiss,
  onConfirm,
}: {
  visible: boolean;
  combo: MenuCombo | null;
  onDismiss: () => void;
  onConfirm: (draft: ComboDraft) => void;
}) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const { state, isOptionAvailable } = useStore();
  const menuById = useMemo(() => new Map(state.menu.map((m) => [m.id, m])), [state.menu]);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [parts, setParts] = useState<Record<string, ComponentState>>({});

  const stateFor = (component: MenuComboComponent, menuItemId: string): ComponentState => {
    const item = menuById.get(menuItemId);
    return {
      menuItemId,
      options: item ? defaultSelection(itemForComponent(item, component)) : {},
      extras: {},
    };
  };

  useEffect(() => {
    if (!visible || !combo) return;
    setQty(1);
    setNote('');
    setParts(
      Object.fromEntries(
        combo.components.map((c) => [c.id, stateFor(c, initialChoice(c)?.menuItemId ?? '')]),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, combo?.id]);

  const { unitPrice, components, valid } = useMemo(() => {
    if (!combo) return { unitPrice: 0, components: [] as CartComboComponent[], valid: false };
    let price = combo.price;
    let ok = true;
    const out: CartComboComponent[] = [];
    for (const c of combo.components) {
      const part = parts[c.id];
      const choice = c.choices.find((x) => x.menuItemId === part?.menuItemId);
      const base = choice ? menuById.get(choice.menuItemId) : undefined;
      if (!part || !choice || !base || !choice.available) {
        ok = false;
        continue;
      }
      const item = itemForComponent(base, c);
      const options = optionsFromSelection(item, part.options);
      const extras = extrasFromSelection(item, part.extras);
      if (selectionErrors(item, part.options, isOptionAvailable).length || extrasInvalid(item, part.extras)) ok = false;
      const deltas = options.reduce((s, o) => s + o.priceDelta, 0) + extrasTotal(extras);
      price += (choice.surcharge + deltas) * c.quantity;
      out.push({
        componentId: c.id,
        componentName: c.name,
        quantity: c.quantity,
        menuItemId: choice.menuItemId,
        itemName: choice.name,
        options,
        extras,
      });
    }
    return { unitPrice: price, components: out, valid: ok && out.length === combo.components.length };
  }, [combo, parts, menuById, isOptionAvailable]);

  if (!combo) return null;

  const update = (componentId: string, patch: Partial<ComponentState>) =>
    setParts((prev) => ({ ...prev, [componentId]: { ...prev[componentId], ...patch } }));

  return (
    <AppModal
      visible={visible}
      title={combo.name}
      onClose={onDismiss}
      actions={[
        { text: t('common.cancel'), onPress: onDismiss },
        {
          text: t('itemOptionsDialog.addBtn', { total: formatVnd(unitPrice * qty) }),
          onPress: () => onConfirm({ qty, note: note.trim(), unitPrice, components }),
          primary: true,
          disabled: !valid,
        },
      ]}>
      <ScrollView style={styles.scroll} contentContainerStyle={optionStyles.body}>
        {combo.description ? (
          <Txt variant="caption" muted>
            {combo.description}
          </Txt>
        ) : null}
        {combo.components.map((c) => {
          const part = parts[c.id];
          const base = part ? menuById.get(part.menuItemId) : undefined;
          const item = base ? itemForComponent(base, c) : undefined;
          return (
            <View key={c.id} style={[styles.component, { borderColor: theme.border_color_thin }]}>
              <Txt variant="bodyStrong">
                {c.name}
                {c.quantity > 1 ? ` ×${c.quantity}` : ''}
              </Txt>
              {c.type === 'CHOICE' ? (
                <View style={optionStyles.group}>
                  {c.choices.map((x) => (
                    <OptionRow
                      key={x.menuItemId}
                      label={x.surcharge ? `${x.name}  (+${formatVnd(x.surcharge)})` : x.name}
                      checked={part?.menuItemId === x.menuItemId}
                      multiple={false}
                      disabled={!x.available || !menuById.has(x.menuItemId)}
                      soldOutLabel={t('itemOptionsDialog.soldOut')}
                      onPress={() => setParts((prev) => ({ ...prev, [c.id]: stateFor(c, x.menuItemId) }))}
                    />
                  ))}
                </View>
              ) : (
                <Txt variant="body">{c.choices[0]?.name}</Txt>
              )}
              {item && part ? (
                <>
                  <OptionGroupsPicker
                    item={item}
                    selected={part.options}
                    onChange={(options) => update(c.id, { options })}
                    isOptionAvailable={isOptionAvailable}
                  />
                  <ExtrasPicker item={item} selected={part.extras} onChange={(extras) => update(c.id, { extras })} />
                </>
              ) : null}
            </View>
          );
        })}

        <View style={optionStyles.qtyRow}>
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
  scroll: { maxHeight: 520 },
  component: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, padding: 10, gap: 4 },
});
