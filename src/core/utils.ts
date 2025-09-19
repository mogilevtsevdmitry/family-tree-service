import { User } from './types';

// Парсер даты "DD.MM.YYYY" -> число для сортировки
export function parseBirthDate(d?: string): number | undefined {
  if (!d) return undefined;
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(d);
  if (!m) return undefined;
  const [_, dd, mm, yyyy] = m;
  const dt = new Date(Number(yyyy), Number(mm) - 1, Number(dd)).getTime();
  return Number.isFinite(dt) ? dt : undefined;
}

// Сортировка детей: по дате рождения (старшие левее), иначе по id
export function sortByBirthThenId(users: User[], ids: number[]): number[] {
  const enriched = ids.map((id) => {
    const u = usersById(users).get(id);
    const ts = parseBirthDate(u?.birthDate);
    return { id, ts, idNum: id };
  });
  enriched.sort((a, b) => {
    if (a.ts !== undefined && b.ts !== undefined) return a.ts - b.ts;
    if (a.ts !== undefined) return -1;
    if (b.ts !== undefined) return 1;
    return a.idNum - b.idNum;
  });
  return enriched.map((x) => x.id);
}

export function usersById(users: User[]): Map<number, User> {
  const m = new Map<number, User>();
  for (const u of users) m.set(u.id, u);
  return m;
}
