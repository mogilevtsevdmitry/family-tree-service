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

import { buildGraph } from './graph';
import { Badge, Link, User } from './types';

export function computeBadges(
  users: User[],
  links: Link[],
  rootId: number,
  failOnUnknownIds: boolean = true
): Map<number, Badge> {
  const g = buildGraph(users, links, failOnUnknownIds);
  const res = new Map<number, Badge>();

  // SELF
  res.set(rootId, Badge.SELF);

  // РЎРїСѓС‚РЅРёРє Р¶РёР·РЅРё
  const spouse = g.spouses.get(rootId);
  if (spouse !== undefined) res.set(spouse, Badge.SPOUSE);

  // РџСЂРµРґРєРё (РІРІРµСЂС…)
  const markAncestors = (start: number, depth = 1) => {
    const ps = g.parentsOf.get(start) || [];
    for (const p of ps) {
      if (!res.has(p))
        res.set(p, depth === 1 ? Badge.PARENT : Badge.GRANDPARENT);
      markAncestors(p, depth + 1);
    }
  };
  markAncestors(rootId);

  // РџРѕС‚РѕРјРєРё (РІРЅРёР·)
  const markDesc = (start: number, depth = 1) => {
    const ch = g.childrenOf.get(start) || [];
    for (const c of ch) {
      if (!res.has(c)) res.set(c, depth === 1 ? Badge.CHILD : Badge.GRANDCHILD);
      markDesc(c, depth + 1);
    }
  };
  markDesc(rootId);

  // Р‘СЂР°С‚СЊСЏ/СЃС‘СЃС‚СЂС‹: РѕР±С‰РёРµ СЂРѕРґРёС‚РµР»Рё
  const parentsOfRoot = new Set(g.parentsOf.get(rootId) || []);
  for (const u of users) {
    if (u.id === rootId) continue;
    if (res.has(u.id)) continue; // СѓР¶Рµ СЂР°Р·РјРµС‡РµРЅ
    const ps = new Set(g.parentsOf.get(u.id) || []);
    // РїРµСЂРµСЃРµС‡РµРЅРёРµ СЂРѕРґРёС‚РµР»РµР№
    const common = [...parentsOfRoot].some((p) => ps.has(p));
    if (common) {
      res.set(u.id, Badge.SIBLING);
    }
  }

  // Р РѕРґСЃС‚РІРµРЅРЅРёРєРё С‡РµСЂРµР· Р±СЂР°Рє: СЃСѓРїСЂСѓРіРё СѓР¶Рµ СЂР°Р·РјРµС‡РµРЅРЅС‹С… СЂРѕРґСЃС‚РІРµРЅРЅРёРєРѕРІ
  for (const u of users) {
    if (res.has(u.id)) continue;
    const sp = g.spouses.get(u.id);
    if (!sp) continue;
    if (res.has(sp) && res.get(sp) !== Badge.SELF) {
      res.set(u.id, Badge.IN_LAW);
    }
  }

  // Р”СЏРґСЏ/С‚С‘С‚СЏ Рё РїР»РµРјСЏРЅРЅРёРєРё/РїР»РµРјСЏРЅРЅРёС†С‹
  // Р”СЏРґСЏ/С‚С‘С‚СЏ: СЂРѕРґРЅРѕР№ Р±СЂР°С‚/СЃРµСЃС‚СЂР° Р»СЋР±РѕРіРѕ СЂРѕРґРёС‚РµР»СЏ root
  const parents = g.parentsOf.get(rootId) || [];
  const parentSiblings = new Set<number>();
  for (const p of parents) {
    const pp = g.parentsOf.get(p) || [];
    // РґРµС‚Рё Р±Р°Р±СѓС€РµРє/РґРµРґСѓС€РµРє root => Р±СЂР°С‚СЊСЏ/СЃС‘СЃС‚СЂС‹ СЂРѕРґРёС‚РµР»СЏ
    for (const gp of pp) {
      const theirKids = g.childrenOf.get(gp) || [];
      for (const kid of theirKids) {
        if (kid !== p) parentSiblings.add(kid);
      }
    }
  }
  for (const id of parentSiblings) {
    if (!res.has(id)) res.set(id, Badge.UNCLE_AUNT);
    const kids = g.childrenOf.get(id) || [];
    for (const k of kids) {
      if (!res.has(k)) res.set(k, Badge.COUSIN); // РґРµС‚Рё РґСЏРґРё/С‚С‘С‚Рё вЂ” РєСѓР·РµРЅС‹
    }
  }

  // РџР»РµРјСЏРЅРЅРёРєРё/РїР»РµРјСЏРЅРЅРёС†С‹: РґРµС‚Рё Р±СЂР°С‚СЊРµРІ/СЃРµСЃС‚С‘СЂ root
  const siblings = users
    .filter((u) => res.get(u.id) === Badge.SIBLING)
    .map((u) => u.id);
  for (const s of siblings) {
    const kids = g.childrenOf.get(s) || [];
    for (const k of kids) {
      if (!res.has(k)) res.set(k, Badge.NEPHEW_NIECE);
    }
  }

  // РћСЃС‚Р°Р»СЊРЅС‹Рµ РїСѓСЃС‚СЊ Р±СѓРґСѓС‚ UNKNOWN
  for (const u of users) {
    if (!res.has(u.id)) res.set(u.id, Badge.UNKNOWN);
  }

  return res;
}
