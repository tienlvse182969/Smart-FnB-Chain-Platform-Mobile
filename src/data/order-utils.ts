import { SIZE_GROUP_ID, type MenuItem, type OrderOption } from './types';

/** groupId → các choiceId đã chọn */
export type OptionSelection = Record<string, string[]>;

/** Tuỳ chọn mặc định chọn sẵn — đa số ly chỉ cần chọn size rồi thêm vào giỏ (mục 12.4). */
export function defaultSelection(item: MenuItem): OptionSelection {
  const out: OptionSelection = {};
  for (const g of item.options) {
    const defaults = g.choices.filter((c) => c.isDefault).map((c) => c.id);
    out[g.id] = defaults.length ? defaults : g.required ? [g.choices[0].id] : [];
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

/** BR-19: giá một ly = giá món + giá cộng thêm của từng tuỳ chọn. Tính lại ở backend khi có API. */
export const unitPriceOf = (item: MenuItem, options: OrderOption[]) =>
  item.price + options.reduce((sum, o) => sum + o.priceDelta, 0);

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
