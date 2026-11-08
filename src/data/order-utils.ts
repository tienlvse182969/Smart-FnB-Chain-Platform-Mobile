import { SIZE_GROUP_ID, type MenuItem, type OrderOption, type SelectedExtra } from './types';

/** Tiền topping của một ly. */
export const extrasTotal = (extras: SelectedExtra[] = []) =>
  extras.reduce((sum, e) => sum + e.price * e.qty, 0);

/** Nhãn ngắn cho topping, vd. "+Pudding trứng ×2". */
export const extraLabel = (e: SelectedExtra) => `+${e.label}${e.qty > 1 ? ` ×${e.qty}` : ''}`;

/** groupId → các choiceId đã chọn */
export type OptionSelection = Record<string, string[]>;

/** Tuỳ chọn mặc định chọn sẵn — đa số ly chỉ cần chọn size rồi thêm vào giỏ (mục 12.4). */
export function defaultSelection(item: MenuItem): OptionSelection {
  const out: OptionSelection = {};
  for (const g of item.options) {
    const availableChoices = g.choices.filter((choice) => choice.available !== false);
    const defaults = availableChoices
      .filter((choice) => choice.isDefault)
      .slice(0, g.max)
      .map((choice) => choice.id);
    out[g.id] = defaults.length
      ? defaults
      : g.required && availableChoices.length
        ? [availableChoices[0].id]
        : [];
  }
  return out;
}

/** BR-14: mỗi nhóm phải chọn trong khoảng [min, max] (nhóm bắt buộc tối thiểu 1). */
export function selectionErrors(
  item: MenuItem,
  selected: OptionSelection,
  isChoiceAvailable: (choiceId: string) => boolean = () => true,
): string[] {
  const bad: string[] = [];
  for (const g of item.options) {
    const picks = selected[g.id] ?? [];
    const min = g.required ? Math.max(1, g.min) : g.min;
    if (picks.length < min || picks.length > g.max) bad.push(g.id);
    else if (picks.some((id) => !isChoiceAvailable(id))) bad.push(g.id);
  }
  return bad;
}

export function optionsFromSelection(item: MenuItem, selected: OptionSelection): OrderOption[] {
  const out: OrderOption[] = [];
  for (const g of item.options) {
    for (const id of selected[g.id] ?? []) {
      const c = g.choices.find((x) => x.id === id);
      if (!c) continue;
      out.push({
        groupId: g.id,
        groupLabel: g.label,
        choiceId: c.id,
        label: c.label,
        priceDelta: c.priceDelta,
        isDefault: !!c.isDefault,
      });
    }
  }
  return out;
}

/** BR-19: giá một ly = giá món + giá cộng thêm của từng tuỳ chọn và topping. Backend tính lại khi chốt đơn. */
export const unitPriceOf = (item: MenuItem, options: OrderOption[], extras: SelectedExtra[] = []) =>
  item.price + options.reduce((sum, o) => sum + o.priceDelta, 0) + extrasTotal(extras);

export const sizeOf = (options: OrderOption[]) => options.find((o) => o.groupId === SIZE_GROUP_ID);

/** Tuỳ chọn khác mặc định — thứ pha chế cần nhìn thấy nhất. */
export const customOptions = (options: OrderOption[]) => options.filter((o) => !o.isDefault);

/** Chuẩn hoá để tìm kiếm: chữ thường, bỏ dấu tiếng Việt (đ → d), gọn khoảng trắng. */
export const normalizeText = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
