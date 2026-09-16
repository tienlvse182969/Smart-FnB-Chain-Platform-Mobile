import type { MenuItem } from './types';

/**
 * MOCK — không gọi API thật. Đứng vai trò minh hoạ điểm chạm AI duy nhất của sản phẩm
 * (mục 9): waiter gõ yêu cầu của khách, hệ thống gợi ý món, khách/waiter tự quyết định
 * có thêm vào giỏ hay không (luôn cần xác nhận, không tự thực thi).
 */
export function mockAiSuggest(
  query: string,
  pool: MenuItem[],
  isAvailable: (id: string) => boolean,
): { items: MenuItem[]; note: string } {
  const peopleMatch = query.match(/(\d+)\s*người/i);
  const budgetMatch = query.match(/(\d+)\s*(k\b|nghìn|ngàn)?/i);
  const noSpicy = /không.*cay/i.test(query);

  const people = peopleMatch ? Math.max(1, parseInt(peopleMatch[1], 10)) : 2;
  let budget = 300_000;
  if (budgetMatch) {
    const n = parseInt(budgetMatch[1], 10);
    const hasUnit = /k|nghìn|ngàn/i.test(budgetMatch[2] ?? '');
    budget = hasUnit || n < 2000 ? n * 1000 : n;
  }

  const avail = pool.filter((m) => isAvailable(m.id) && (!noSpicy || !/cay/i.test(m.name)));
  const mains = avail.filter((m) => m.categoryId === 'main').sort((a, b) => a.price - b.price);
  const drinks = avail
    .filter((m) => m.categoryId === 'coffee' || m.categoryId === 'tea')
    .sort((a, b) => a.price - b.price);

  const picks: MenuItem[] = [];
  let spent = 0;
  for (let i = 0; i < people && mains.length > 0; i++) {
    const m = mains[i % mains.length];
    if (spent + m.price <= budget) {
      picks.push(m);
      spent += m.price;
    }
  }
  for (const d of drinks) {
    if (picks.length >= people + 2) break;
    if (spent + d.price <= budget) {
      picks.push(d);
      spent += d.price;
    }
  }

  return {
    items: picks.slice(0, 5),
    note: `Gợi ý cho ~${people} người, ngân sách ~${budget.toLocaleString('vi-VN')}₫${noSpicy ? ', tránh món cay' : ''}.`,
  };
}
