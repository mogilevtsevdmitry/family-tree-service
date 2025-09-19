import { DataValidationError } from './errors';
import { Link, User } from './types';

// Индексы и проверки консистентности графа родства
export interface Graph {
  users: User[];
  byId: Map<number, User>;
  spouses: Map<number, number>;        // у каждого id — один супруг (по условию 7 сейчас игнорим вторых)
  childrenOf: Map<number, number[]>;   // parentId -> [childIds]
  parentsOf: Map<number, number[]>;    // childId -> [parentIds]
}

export function buildGraph(users: User[], links: Link[], failOnUnknownIds: boolean): Graph {
  const byId = new Map<number, User>();
  for (const u of users) {
    if (byId.has(u.id)) throw new DataValidationError(`Дубликат пользователя id=${u.id}`);
    byId.set(u.id, u);
  }

  const spouses = new Map<number, number>();
  const childrenOf = new Map<number, number[]>();
  const parentsOf = new Map<number, number[]>();

  const ensureUser = (id: number, ctx: string) => {
    if (!byId.has(id)) {
      if (failOnUnknownIds) {
        throw new DataValidationError(`Связь с неизвестным id=${id} (${ctx})`);
      } else {
        return false;
      }
    }
    return true;
  };

  for (const l of links) {
    if (l.type === 'spouse') {
      const { a, b } = l;
      if (!ensureUser(a, 'spouse') || !ensureUser(b, 'spouse')) continue;
      if (a === b) throw new DataValidationError('self-spouse связь недопустима');
      if (spouses.has(a) && spouses.get(a) !== b) {
        // По условию 7: «пока реализуем, будто нет второго супруга» — игнорим дополнительного
        continue;
      }
      if (spouses.has(b) && spouses.get(b) !== a) continue;
      spouses.set(a, b);
      spouses.set(b, a);
    } else {
      const { parent, child } = l;
      if (!ensureUser(parent, 'parent') || !ensureUser(child, 'parent')) continue;
      if (parent === child) throw new DataValidationError('parent == child недопустимо');
      if (!childrenOf.has(parent)) childrenOf.set(parent, []);
      childrenOf.get(parent)!.push(child);
      if (!parentsOf.has(child)) parentsOf.set(child, []);
      parentsOf.get(child)!.push(parent);
    }
  }

  // Почистим дубли и отсортируем списки
  for (const [p, list] of childrenOf) {
    const uniq = Array.from(new Set(list));
    childrenOf.set(p, uniq);
  }
  for (const [c, list] of parentsOf) {
    const uniq = Array.from(new Set(list));
    parentsOf.set(c, uniq);
    if (uniq.length > 2) {
      throw new DataValidationError(`У ребёнка id=${c} более двух родителей (${uniq.length})`);
    }
  }

  return { users, byId, spouses, childrenOf, parentsOf };
}
