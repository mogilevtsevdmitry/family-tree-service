import { computeLayout, Badge } from '../src';
import { usersSample, linksSample, linksWithUnknowns } from './sample-data';

const baseOptions = {
  rootId: 1,
  cardW: 220,
  cardH: 250,
  hGap: 40,
  vGap: 80,
  spouseGutter: 30,
  failOnUnknownIds: true,
};

function rect(
  id: number,
  nodes: ReturnType<typeof computeLayout>,
  w = 220,
  h = 250
) {
  const n = nodes.find((n) => n.id === id)!;
  return {
    ...n,
    cx: n.x + w / 2,
    cy: n.y + h / 2,
    right: n.x + w,
    bottom: n.y + h,
  };
}
function intersects(a: ReturnType<typeof rect>, b: ReturnType<typeof rect>) {
  return !(
    a.right <= b.x ||
    b.right <= a.x ||
    a.bottom <= b.y ||
    b.bottom <= a.y
  );
}
function expectLevelY(
  n: { level: number; y: number },
  cardH: number,
  vGap: number
) {
  expect(n.y).toBe(n.level * (cardH + vGap));
}

describe('Family layout', () => {
  test('basic placement — spouses side-by-side; children centered; no overlaps; correct coords', () => {
    const opt = baseOptions;
    const nodes = computeLayout(usersSample, linksSample, opt);

    // Главный пользователь
    const me = rect(1, nodes, opt.cardW, opt.cardH);
    expect(me.level).toBe(0);
    expect(me.badge).toBe(Badge.SELF);
    expectLevelY(me, opt.cardH, opt.vGap);

    // Супруга рядом на том же уровне; расстояние между левыми X — 2*cardW + spouseGutter
    const wife = rect(2, nodes, opt.cardW, opt.cardH);
    expect(wife.level).toBe(0);
    expect(wife.badge).toBe(Badge.SPOUSE);
    expectLevelY(wife, opt.cardH, opt.vGap);
    expect(wife.y).toBe(me.y);

    const dxSpouses = Math.abs(wife.x - me.x);
    expect(dxSpouses).toBe(2 * opt.cardW + opt.spouseGutter);

    // Центр пары — среднее центров супругов
    const coupleCenter = (me.cx + wife.cx) / 2;

    // Дети — уровнем ниже, центрированы под центром пары
    const dOlder = rect(4, nodes, opt.cardW, opt.cardH); // старшая
    const dYounger = rect(3, nodes, opt.cardW, opt.cardH);
    expect(dOlder.level).toBe(1);
    expect(dYounger.level).toBe(1);
    expectLevelY(dOlder, opt.cardH, opt.vGap);
    expectLevelY(dYounger, opt.cardH, opt.vGap);
    expect(dOlder.badge).toBe(Badge.CHILD);
    expect(dYounger.badge).toBe(Badge.CHILD);

    // Старшая левее младшей
    expect(dOlder.x).toBeLessThan(dYounger.x);

    // Средний центр детей совпадает с центром пары (±1px из-за округлений)
    const kidsCenter = (dOlder.cx + dYounger.cx) / 2;
    expect(Math.abs(kidsCenter - coupleCenter)).toBeLessThanOrEqual(1);

    // Родители root — уровнем выше, тоже пара
    const f = rect(6, nodes, opt.cardW, opt.cardH);
    const m = rect(7, nodes, opt.cardW, opt.cardH);
    expect(f.level).toBe(-1);
    expect(m.level).toBe(-1);
    expectLevelY(f, opt.cardH, opt.vGap);
    expectLevelY(m, opt.cardH, opt.vGap);
    expect(f.badge).toBe(Badge.PARENT);
    expect(m.badge).toBe(Badge.PARENT);
    expect(f.y).toBe(m.y);
    const dxParents = Math.abs(f.x - m.x);
    expect(dxParents).toBe(2 * opt.cardW + opt.spouseGutter);

    // Нет наложений прямоугольников у всех
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const A = rect(nodes[i].id, nodes, opt.cardW, opt.cardH);
        const B = rect(nodes[j].id, nodes, opt.cardW, opt.cardH);
        expect(intersects(A, B)).toBe(false);
      }
    }
  });

  test('grand relations & in-law/cousin detection', () => {
    const nodes = computeLayout(usersSample, linksSample, baseOptions);
    const gp1 = nodes.find((n) => n.id === 8)!;
    const gp2 = nodes.find((n) => n.id === 9)!;
    expect(gp1.badge).toBe(Badge.GRANDPARENT);
    expect(gp2.badge).toBe(Badge.GRANDPARENT);

    const aunt = nodes.find((n) => n.id === 10)!; // тётя root
    expect([Badge.UNCLE_AUNT, Badge.IN_LAW]).toContain(aunt.badge);

    const cousin = nodes.find((n) => n.id === 11)!;
    expect([Badge.COUSIN, Badge.UNKNOWN]).toContain(cousin.badge);
  });

  test('fail on unknown ids in links', () => {
    expect(() =>
      computeLayout(usersSample, linksWithUnknowns, {
        ...baseOptions,
        failOnUnknownIds: true,
      })
    ).toThrow();
  });

  test('works when ignoring unknown ids', () => {
    const nodes = computeLayout(usersSample, linksWithUnknowns, {
      ...baseOptions,
      failOnUnknownIds: false,
    });
    expect(nodes.find((n) => n.id === 1)).toBeTruthy();
  });
});
