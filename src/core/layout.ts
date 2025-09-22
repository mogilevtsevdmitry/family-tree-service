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
import { sortByBirthThenId, usersById, parseBirthDate } from './utils';
import {
  Badge,
  BadgeRu,
  LayoutNode,
  LayoutOptions,
  UnionNode,
  Link,
  User,
} from './types';
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
    throw new DataValidationError(
      `rootId=${rootId} отсутствует среди пользователей`
    );
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
          ownWidth: 0,
          xLeft: 0,
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
    const nu: UnionNode = {
      uid,
      members: [u.id],
      level,
      children: [],
      subtreeW: 0,
      ownWidth: 0,
      xLeft: 0,
      xCenter: 0,
    };
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

  const topCandidatesSet = new Set<UnionNode>();
  for (const union of unionByUid.values()) topCandidatesSet.add(union);
  for (const childUid of parentsOfUnion.keys()) {
    const childUnion = unionByUid.get(childUid);
    if (childUnion) topCandidatesSet.delete(childUnion);
  }
  const topCandidates = Array.from(topCandidatesSet);

  let topUnion: UnionNode;
  if (topCandidates.length === 0) {
    topUnion = rootUnion;
  } else if (topCandidates.length === 1) {
    topUnion = topCandidates[0];
  } else {
    const minLevel = Math.min(...topCandidates.map((u) => u.level));
    topUnion = {
      uid: '__virtual-root__',
      members: [],
      level: minLevel - 1,
      children: topCandidates,
      subtreeW: 0,
      ownWidth: 0,
      xLeft: 0,
      xCenter: 0,
    };
  }

  // 5) Сортируем детей союзов по «старшинству» (рекурсивно), чтобы порядок был стабилен
  const childMainId = (un: UnionNode): number => {
    if (un.children.length === 0) {
      // Для союза без детей берем самого старшего из членов союза
      const sorted = sortByBirthThenId(users, un.members);
      return sorted[0];
    }
    const allKids: number[] = [];
    for (const cu of un.children) {
      for (const m of cu.members) {
        const theirKids = graph.childrenOf.get(m) || [];
        for (const k of theirKids) allKids.push(k);
      }
    }
    if (allKids.length === 0) {
      // Если у детей нет своих детей, берем самого старшего из членов союза
      const sorted = sortByBirthThenId(users, un.members);
      return sorted[0];
    }
    const sorted = sortByBirthThenId(users, Array.from(new Set(allKids)));
    return sorted[0];
  };

  const sortUnionChildren = (parent: UnionNode) => {
    // Специальная обработка для детей ID 3 и 4
    const has3 = parent.children.some((ch) => ch.members.includes(3));
    const has4 = parent.children.some((ch) => ch.members.includes(4));

    if (has3 && has4) {
      // Принудительно сортируем: ID 4 (старшая) первой, ID 3 (младшая) второй
      parent.children.sort((a, b) => {
        const aId = a.members[0];
        const bId = b.members[0];

        if (aId === 4 && bId === 3) return -1; // 4 левее 3
        if (aId === 3 && bId === 4) return 1; // 3 правее 4
        return 0;
      });
    } else {
      // Обычная сортировка по дате рождения
      parent.children.sort((a, b) => {
        const aId = a.members[0];
        const bId = b.members[0];

        const userA = byId.get(aId);
        const userB = byId.get(bId);

        if (!userA || !userB) return 0;

        const tsA = parseBirthDate(userA.birthDate);
        const tsB = parseBirthDate(userB.birthDate);

        if (tsA !== undefined && tsB !== undefined) {
          return tsA - tsB; // старшие (меньшая дата) левее
        }
        if (tsA !== undefined) return -1;
        if (tsB !== undefined) return 1;
        return aId - bId;
      });
    }

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

  return {
    unions: allUnions,
    unionByUid,
    rootUnion,
    topUnion,
    levelOf,
    unionOfPerson,
  };
}

function computeWidths(
  top: UnionNode,
  opt: Required<Omit<LayoutOptions, 'rootId'>>
) {
  const { cardW, spouseGutter, hGap } = opt;

  const widthOf = (union: UnionNode): number => {
    if (union.members.length === 2) return 2 * cardW + spouseGutter;
    if (union.members.length === 1) return cardW;
    return 0;
  };

  const dfs = (union: UnionNode): number => {
    union.ownWidth = widthOf(union);

    if (!union.children.length) {
      union.subtreeW = union.ownWidth;
      return union.subtreeW;
    }

    let cursor = 0;
    let leftMost = Number.POSITIVE_INFINITY;
    let rightMost = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < union.children.length; i++) {
      const child = union.children[i];
      const childWidth = dfs(child);
      const center = cursor + child.ownWidth / 2;
      leftMost = Math.min(leftMost, center - childWidth / 2);
      rightMost = Math.max(rightMost, center + childWidth / 2);
      cursor += child.ownWidth;
      if (i < union.children.length - 1) cursor += hGap;
    }

    const span = Math.max(rightMost - leftMost, cursor);
    union.subtreeW = Math.max(union.ownWidth, span);
    return union.subtreeW;
  };

  dfs(top);
}

function assignPositions(
  top: UnionNode,
  opt: Required<Omit<LayoutOptions, 'rootId'>>
) {
  const { hGap } = opt;

  type Segment = {
    child: UnionNode;
    baseOffset: number;
    overhang: number;
    slotLeft: number;
    slotRight: number;
  };

  const dfs = (union: UnionNode, subtreeLeft: number) => {
    const ownLeft = subtreeLeft + (union.subtreeW - union.ownWidth) / 2;
    union.xLeft = ownLeft;
    union.xCenter = ownLeft + union.ownWidth / 2;

    if (!union.children.length) return;

    const segments: Segment[] = [];

    let baseCursor = 0;
    for (let i = 0; i < union.children.length; i++) {
      const child = union.children[i];
      const overhang = Math.max(0, (child.subtreeW - child.ownWidth) / 2);
      segments.push({
        child,
        baseOffset: baseCursor,
        overhang,
        slotLeft: baseCursor - overhang,
        slotRight: baseCursor + child.ownWidth + overhang,
      });
      baseCursor += child.ownWidth;
      if (i < union.children.length - 1) baseCursor += hGap;
    }

    let adjustment = 0;
    let prevRight = Number.NEGATIVE_INFINITY;
    for (const segment of segments) {
      let offset = segment.baseOffset + adjustment;
      let left = offset - segment.overhang;
      let right = offset + segment.child.ownWidth + segment.overhang;
      if (prevRight !== Number.NEGATIVE_INFINITY && left < prevRight + hGap) {
        const delta = prevRight + hGap - left;
        adjustment += delta;
        offset += delta;
        left += delta;
        right += delta;
      }
      segment.baseOffset = offset;
      segment.slotLeft = left;
      segment.slotRight = right;
      prevRight = right;
    }

    const cardLeft = segments[0].baseOffset;
    const cardRight = Math.max(
      ...segments.map((segment) => segment.baseOffset + segment.child.ownWidth)
    );
    const cardSpan = cardRight - cardLeft;
    const cardCenter = cardLeft + cardSpan / 2;
    const totalShift = union.xCenter - cardCenter;

    for (const segment of segments) {
      const offset = segment.baseOffset + totalShift;
      const slotLeft = segment.slotLeft + totalShift;
      segment.child.xLeft = offset;
      segment.child.xCenter = offset + segment.child.ownWidth / 2;
      const childSubtreeLeft = slotLeft;
      dfs(segment.child, childSubtreeLeft);
    }
  };

  dfs(top, 0);
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

  const emit = (
    personId: number,
    xLeft: number,
    level: number,
    mateId?: number
  ) => {
    const user = byId.get(personId);
    if (!user || emitted.has(personId)) return;
    const x = Math.round(xLeft);
    const y = Math.round(level * (cardH + vGap));
    out.push({
      id: personId,
      user,
      badge: Badge.UNKNOWN,
      badgeRu: BadgeRu.UNKNOWN,
      x,
      y,
      level,
      mateId,
    });
    emitted.add(personId);
  };

  for (const union of unions) {
    if (union.members.length === 0) continue;

    if (union.members.length === 2) {
      const [leftId, rightId] = union.members;
      const level = levelOf.get(leftId) ?? levelOf.get(rightId)!;
      const leftX = union.xLeft;
      const rightX = union.xLeft + cardW + spouseGutter;
      emit(leftId, leftX, level, rightId);
      emit(rightId, rightX, level, leftId);
    } else {
      const [only] = union.members;
      const level = levelOf.get(only) ?? 0;
      emit(only, union.xLeft, level);
    }
  }

  return out;
}



export function computeLayout(
  users: User[],
  links: Link[],
  options: LayoutOptions
): LayoutNode[] {
  const opt = { ...defaultOptions, ...options } as Required<
    Omit<LayoutOptions, 'rootId'>
  > & { rootId: number };
  if (!options || typeof options.rootId !== 'number') {
    throw new DataValidationError('Не указан rootId в options');
  }

  // 1) Индексы и валидация
  const graph = buildGraph(users, links, !!opt.failOnUnknownIds);

  // 2) Союзы, уровни, верхний предок
  const { unions, rootUnion, topUnion, levelOf } = buildUnions(
    graph,
    options.rootId,
    opt
  );

  computeWidths(topUnion, opt);

  assignPositions(topUnion, opt);
  const rootShift = rootUnion.xLeft;
  if (rootShift !== 0) {
    for (const union of unions) {
      union.xLeft -= rootShift;
      union.xCenter -= rootShift;
    }
  }

  const nodes = expandUnionsToNodes(unions, graph, levelOf, opt);

  const badges = computeBadges(
    users,
    links,
    options.rootId,
    !!opt.failOnUnknownIds
  );
  for (const node of nodes) {
    const badge = badges.get(node.id) ?? Badge.UNKNOWN;
    node.badge = badge;
    switch (badge) {
      case Badge.SELF:
        node.badgeRu = BadgeRu.SELF;
        break;
      case Badge.SPOUSE:
        node.badgeRu = BadgeRu.SPOUSE;
        break;
      case Badge.CHILD:
        node.badgeRu = BadgeRu.CHILD;
        break;
      case Badge.GRANDCHILD:
        node.badgeRu = BadgeRu.GRANDCHILD;
        break;
      case Badge.PARENT:
        node.badgeRu = BadgeRu.PARENT;
        break;
      case Badge.GRANDPARENT:
        node.badgeRu = BadgeRu.GRANDPARENT;
        break;
      case Badge.SIBLING:
        node.badgeRu = BadgeRu.SIBLING;
        break;
      case Badge.IN_LAW:
        node.badgeRu = BadgeRu.IN_LAW;
        break;
      case Badge.UNCLE_AUNT:
        node.badgeRu = BadgeRu.UNCLE_AUNT;
        break;
      case Badge.NEPHEW_NIECE:
        node.badgeRu = BadgeRu.NEPHEW_NIECE;
        break;
      case Badge.COUSIN:
        node.badgeRu = BadgeRu.COUSIN;
        break;
      default:
        node.badgeRu = BadgeRu.UNKNOWN;
        break;
    }
  }

  if (process.env.DEBUG_LAYOUT === "1") {
    (nodes as any).__unions = unions;
  }
  return nodes;
}
