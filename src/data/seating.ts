import type { SeatingOption, Table, TableArea } from './types';

const MAX_BLOCK = 4;

type Partial = { ids: string[]; seats: number; area: TableArea };

const key = (ids: string[]) => [...ids].sort().join(',');

/**
 * Thuật toán xếp & ghép bàn (mục 8). Cho số khách (+khu vực tuỳ chọn), trả về tối đa
 * 3 phương án tốt nhất: 1 bàn hoặc 1 khối bàn liền kề đủ chỗ.
 *
 * Cách giải (mục 8.5): lọc bàn khả dụng → dựng đồ thị liền kề trong khu vực → mở rộng
 * từng khối, cắt tỉa ngay khi đủ ghế (không mở rộng thêm) → chấm điểm theo mục 8.4:
 * ít ghế thừa nhất → ít bàn nhất → không phí bàn lớn.
 */
export function suggestSeating(
  tables: Table[],
  guests: number,
  area?: TableArea,
): SeatingOption[] {
  const pool = tables.filter((t) => t.status === 'Trống' && (!area || t.area === area));
  const byId = new Map(pool.map((t) => [t.id, t]));

  const adjacentAvailable = (t: Table) =>
    t.adjacentIds.filter((id) => {
      const other = byId.get(id);
      return other && other.area === t.area;
    });

  const seen = new Set<string>();
  const complete: Partial[] = [];

  let frontier: Partial[] = pool.map((t) => ({ ids: [t.id], seats: t.seats, area: t.area }));
  for (const p of frontier) {
    if (p.seats >= guests) {
      seen.add(key(p.ids));
      complete.push(p);
    }
  }

  let size = 1;
  while (size < MAX_BLOCK && frontier.length > 0) {
    const next: Partial[] = [];
    for (const p of frontier) {
      if (p.seats >= guests) continue; // đủ ghế rồi — không mở rộng thêm (mục 8.5 bước 3)

      const neighborIds = new Set<string>();
      for (const id of p.ids) {
        const t = byId.get(id);
        if (!t) continue;
        for (const n of adjacentAvailable(t)) {
          if (!p.ids.includes(n)) neighborIds.add(n);
        }
      }

      for (const nId of neighborIds) {
        const nTable = byId.get(nId);
        if (!nTable) continue;
        const ids = [...p.ids, nId];
        const k = key(ids);
        if (seen.has(k)) continue;
        const seats = p.seats + nTable.seats;
        const np: Partial = { ids, seats, area: p.area };
        if (seats >= guests) {
          seen.add(k);
          complete.push(np);
        } else {
          next.push(np);
        }
      }
    }
    frontier = next;
    size += 1;
  }

  return complete
    .map((p) => {
      const seatsArr = p.ids.map((id) => byId.get(id)!.seats);
      const option: SeatingOption = {
        tableIds: p.ids,
        tableNames: p.ids.map((id) => byId.get(id)!.name),
        area: p.area,
        totalSeats: p.seats,
        leftover: p.seats - guests,
      };
      return { option, rank: [option.leftover, p.ids.length, Math.max(...seatsArr)] as const };
    })
    .sort(
      (a, b) => a.rank[0] - b.rank[0] || a.rank[1] - b.rank[1] || a.rank[2] - b.rank[2],
    )
    .slice(0, 3)
    .map((s) => s.option);
}
