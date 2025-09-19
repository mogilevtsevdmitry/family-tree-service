/**
 * Алгоритм раскладки:
 * 1) Строим «союзы» (union): либо пара супругов, либо одиночка.
 * 2) Назначаем уровни (level) от root: вверх — отрицательные, вниз — положительные.
 * 3) Для каждого ребёнка находим «родительский союз»:
 *    - если оба его родителей состоят в паре друг с другом — берём эту пару,
 *    - иначе берём союз одиночки известного родителя.
 * 4) Пост-ордером считаем subtreeW для каждого союза, учитывая cardW/hGap/spouseGutter.
 * 5) Раскладываем X-центры детей под центром РОДИТЕЛЬСКОГО союза; разводим, чтобы не пересекались.
 * 6) Экспандим союзы в реальные карточки людей: пара → слева/справа, одиночка → по центру.
 * 7) Собираем LayoutNode[] и вычисляем бейджи.
 */

import { defaultOptions } from '../config';
import { buildGraph, Graph } from './graph';
import { DataValidationError } from './errors';
import { sortByBirthThenId, usersById } from './utils';
import { Badge, BadgeRu, LayoutNode, LayoutOptions, UnionNode, Link, User } from './types';
import { computeBadges } from './badge';

// Ключи союзов
function coupleKey(a: number, b: number) {
  const [x, y] = a < b ? [a, b] : [b, a];
  return `couple:${x}-${y}`;
}
function singleKey(a: number) {
  return `single:${a}`;
}

interface BuildUnionsResult {
  unions: UnionNode[]; // пост-ордер, начиная от topUnion
  unionByUid: Map<string, UnionNode>;
  rootUnion: UnionNode;
  topUnion: UnionNode; // ВЕРХНИЙ предок, от него считаем геометрию
  levelOf: Map<number, number>;
  unionOfPerson: Map<number, UnionNode>;
}

function buildUnions(
  graph: Graph,
  rootId: number,
  opt: Required<Omit<LayoutOptions, 'rootId'>>
): BuildUnionsResult {
  const { users, spouses, parentsOf, childrenOf } = graph;
  const byId = usersById(users);

  if (!byId.has(rootId)) {
    throw new DataValidationError(`rootId=${rootId} отсутствует среди пользователей`);
  }

  // 1) Назначаем уровни (BFS от root)
  const levelOf = new Map<number, number>();
  const q: number[] = [rootId];
  levelOf.set(rootId, 0);

  while (q.length) {
    const v = q.shift()!;
    const lvl = levelOf.get(v)!;

    // вверх — родители
    const ps = parentsOf.get(v) || [];
    for (const p of ps) {
      if (!levelOf.has(p)) {
        levelOf.set(p, lvl - 1);
        q.push(p);
      }
    }
    // вниз — дети
    const ch = childrenOf.get(v) || [];
    for (const c of ch) {
      if (!levelOf.has(c)) {
        levelOf.set(c, lvl + 1);
        q.push(c);
      }
    }
    // супруг — тот же уровень
    const s = spouses.get(v);
    if (s !== undefined && !levelOf.has(s)) {
      levelOf.set(s, lvl);
      q.push(s);
    }
  }

  // 2) Формируем союзы (пары / одиночки)
  const unionByUid = new Map<string, UnionNode>();
  const unionOfPerson = new Map<number, UnionNode>();

  // пары
  for (const [a, b] of spouses) {
    if (a < b) {
      const uid = coupleKey(a, b);
      if (!unionByUid.has(uid)) {
        const au = byId.get(a)!;
        const bu = byId.get(b)!;
        let members = [a, b];
        // male слева, если известно
        if (au.sex === 'female' && bu.sex === 'male') members = [b, a];
        const u: UnionNode = {
          uid,
          members,
          level: levelOf.get(a) ?? 0,
          children: [],
          subtreeW: 0,
          xCenter: 0,
        };
        unionByUid.set(uid, u);
        unionOfPerson.set(a, u);
        unionOfPerson.set(b, u);
      }
    }
  }

  // одиночки
  for (const u of users) {
    if (unionOfPerson.has(u.id)) continue;
    const uid = singleKey(u.id);
    const level = levelOf.get(u.id) ?? 0;
    const nu: UnionNode = { uid, members: [u.id], level, children: [], subtreeW: 0, xCenter: 0 };
    unionByUid.set(uid, nu);
    unionOfPerson.set(u.id, nu);
  }

  // 3) Привязываем детей к «родительскому союзу» + строим обратный индекс parent->child и child->parentsUnion
  const parentsOfUnion = new Map<string, UnionNode[]>(); // childUid -> [parentUnions]

  for (const [child, ps] of parentsOf) {
    if (!ps || ps.length === 0) continue;
    let parentUnion: UnionNode | undefined;
    if (ps.length === 2) {
      const [p1, p2] = ps;
      const s1 = graph.spouses.get(p1);
      if (s1 === p2) {
        const uid = coupleKey(p1, p2);
        parentUnion = unionByUid.get(uid);
      }
    }
    if (!parentUnion) {
      const p = ps[0];
      parentUnion = unionOfPerson.get(p);
    }
    const childUnion = unionOfPerson.get(child);
    if (parentUnion && childUnion && parentUnion !== childUnion) {
      parentUnion.children.push(childUnion);
      const arr = parentsOfUnion.get(childUnion.uid) ?? [];
      arr.push(parentUnion);
      parentsOfUnion.set(childUnion.uid, arr);
    }
  }

  // 4) Определяем корневой и ВЕРХНИЙ союзы
  const rootUnion = unionOfPerson.get(rootId)!;

  // Поднимаемся от rootUnion максимально вверх по parentsOfUnion — получаем topUnion
  let topUnion = rootUnion;
  const seen = new Set<string>();
  while (true) {
    const parents = parentsOfUnion.get(topUnion.uid) || [];
    if (!parents.length) break;
    // берём родителя с минимальным level (наиболее верхний)
    let next = parents[0];
    for (const p of parents) if (p.level < next.level) next = p;
    if (seen.has(next.uid)) break;
    seen.add(next.uid);
    topUnion = next;
  }

  // 5) Сортируем детей союзов по «старшинству» (рекурсивно), чтобы порядок был стабилен
  const childMainId = (un: UnionNode): number => {
    if (un.children.length === 0) {
      return Math.min(...un.members);
    }
    const allKids: number[] = [];
    for (const cu of un.children) {
      for (const m of cu.members) {
        const theirKids = (graph.childrenOf.get(m) || []);
        for (const k of theirKids) allKids.push(k);
      }
    }
    if (allKids.length === 0) return Math.min(...un.members);
    const sorted = sortByBirthThenId(
      users,
      Array.from(new Set(allKids))
    );
    return sorted[0];
  };

  const sortUnionChildren = (parent: UnionNode) => {
    parent.children.sort((a, b) => childMainId(a) - childMainId(b));
    for (const ch of parent.children) sortUnionChildren(ch);
  };
  sortUnionChildren(topUnion);

  // 6) Собираем список всех союзов пост-ордером, начиная от topUnion (это включает и предков, и потомков)
  const visited = new Set<string>();
  const allUnions: UnionNode[] = [];
  const dfsCollect = (u: UnionNode) => {
    if (visited.has(u.uid)) return;
    visited.add(u.uid);
    for (const ch of u.children) dfsCollect(ch);
    allUnions.push(u);
  };
  dfsCollect(topUnion);

  return { unions: allUnions, unionByUid, rootUnion, topUnion, levelOf, unionOfPerson };
}

function computeWidths(unions: UnionNode[], opt: Required<Omit<LayoutOptions, 'rootId'>>) {
  const { cardW, hGap, spouseGutter } = opt;
  const unit = cardW + hGap;

  const ownWidth = (u: UnionNode): number => {
    if (u.members.length === 2) return 2 * cardW + spouseGutter;
    return cardW;
    };

  for (const u of unions) {
    if (!u.children.length) {
      u.subtreeW = Math.max(ownWidth(u), unit);
      continue;
    }
    const sumChildren = u.children.reduce((acc, c) => acc + c.subtreeW, 0);
    const gaps = hGap * (u.children.length - 1);
    const childrenWidth = sumChildren + gaps;
    u.subtreeW = Math.max(childrenWidth, ownWidth(u));
    const cols = Math.ceil(u.subtreeW / unit);
    u.subtreeW = cols * unit - hGap; // последняя колонка без правого hGap
  }
}

function assignXCenters(top: UnionNode, opt: Required<Omit<LayoutOptions, 'rootId'>>) {
  top.xCenter = 0; // центр всей сцены

  const { hGap } = opt;

  const placeChildren = (parent: UnionNode) => {
    if (!parent.children.length) return;
    const totalW =
      parent.children.reduce((acc, c) => acc + c.subtreeW, 0) + hGap * (parent.children.length - 1);
    let cursorLeft = parent.xCenter - totalW / 2;

    for (const ch of parent.children) {
      const cx = cursorLeft + ch.subtreeW / 2;
      ch.xCenter = cx;
      placeChildren(ch);
      cursorLeft += ch.subtreeW + hGap;
    }
  };

  placeChildren(top);
}

function expandUnionsToNodes(
  unions: UnionNode[],
  graph: Graph,
  levelOf: Map<number, number>,
  opt: Required<Omit<LayoutOptions, 'rootId'>>
): LayoutNode[] {
  const { users } = graph;
  const { cardW, cardH, spouseGutter, vGap } = opt;
  const byId = usersById(users);

  const out: LayoutNode[] = [];
  const emitted = new Set<number>();

  const emit = (personId: number, xCenter: number, level: number, mateId?: number) => {
    const u = byId.get(personId)!;
    const x = Math.round(xCenter - cardW / 2);
    const y = Math.round(level * (cardH + vGap));
    if (!emitted.has(personId)) {
      out.push({
        id: personId,
        user: u,
        badge: Badge.UNKNOWN,
        badgeRu: BadgeRu.UNKNOWN,
        x, y, level,
        mateId,
      });
      emitted.add(personId);
    }
  };

  for (const u of unions) {
    if (u.members.length === 2) {
      const [leftId, rightId] = u.members;
      const leftCenter = u.xCenter - (spouseGutter + cardW) / 2;
      const rightCenter = u.xCenter + (spouseGutter + cardW) / 2;
      const lvl = levelOf.get(leftId) ?? levelOf.get(rightId)!;
      emit(leftId, leftCenter, lvl, rightId);
      emit(rightId, rightCenter, lvl, leftId);
    } else {
      const [only] = u.members;
      const lvl = levelOf.get(only) ?? 0;
      emit(only, u.xCenter, lvl);
    }
  }

  return out;
}

export function computeLayout(users: User[], links: Link[], options: LayoutOptions): LayoutNode[] {
  const opt = { ...defaultOptions, ...options } as Required<Omit<LayoutOptions, 'rootId'>> & { rootId: number };
  if (!options || typeof options.rootId !== 'number') {
    throw new DataValidationError('Не указан rootId в options');
  }

  // 1) Индексы и валидация
  const graph = buildGraph(users, links, !!opt.failOnUnknownIds);

  // 2) Союзы, уровни, верхний предок
  const { unions, rootUnion, topUnion, levelOf } = buildUnions(graph, options.rootId, opt);

  // 3) Ширины поддеревьев (пост-ордер уже соблюдён)
  computeWidths(unions, opt);

  // 4) Расстановка X-центров — от ВЕРХНЕГО предка
  assignXCenters(topUnion, opt);

  // 5) Экспансия в реальные ноды
  const nodes = expandUnionsToNodes(unions, graph, levelOf, opt);

  // 6) Бейджи родства
  const badges = computeBadges(users, links, options.rootId);
  for (const n of nodes) {
    const b = badges.get(n.id) ?? Badge.UNKNOWN;
    n.badge = b;
    switch (b) {
      case Badge.SELF: n.badgeRu = BadgeRu.SELF; break;
      case Badge.SPOUSE: n.badgeRu = BadgeRu.SPOUSE; break;
      case Badge.CHILD: n.badgeRu = BadgeRu.CHILD; break;
      case Badge.GRANDCHILD: n.badgeRu = BadgeRu.GRANDCHILD; break;
      case Badge.PARENT: n.badgeRu = BadgeRu.PARENT; break;
      case Badge.GRANDPARENT: n.badgeRu = BadgeRu.GRANDPARENT; break;
      case Badge.SIBLING: n.badgeRu = BadgeRu.SIBLING; break;
      case Badge.IN_LAW: n.badgeRu = BadgeRu.IN_LAW; break;
      case Badge.UNCLE_AUNT: n.badgeRu = BadgeRu.UNCLE_AUNT; break;
      case Badge.NEPHEW_NIECE: n.badgeRu = BadgeRu.NEPHEW_NIECE; break;
      case Badge.COUSIN: n.badgeRu = BadgeRu.COUSIN; break;
      default: n.badgeRu = BadgeRu.UNKNOWN; break;
    }
  }

  return nodes;
}
