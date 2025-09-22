import { computeLayout, Badge } from "../src";
import { usersSample, linksSample, linksWithUnknowns } from "./sample-data";
import { getAllExpectedCoordinates } from "./expected-coordinates";
import type { LayoutNode } from "../src/core/types";

const baseOptions = {
  rootId: 1,
  cardW: 220,
  cardH: 250,
  hGap: 90,
  vGap: 150,
  spouseGutter: 30,
  failOnUnknownIds: true,
};

function rect(id: number, nodes: LayoutNode[], w = 220, h = 250) {
  const n = nodes.find((node) => node.id === id)!;
  return {
    ...n,
    cx: n.x + w / 2,
    cy: n.y + h / 2,
    right: n.x + w,
    bottom: n.y + h,
  };
}

function intersects(a: ReturnType<typeof rect>, b: ReturnType<typeof rect>) {
  return !(a.right <= b.x || b.right <= a.x || a.bottom <= b.y || b.bottom <= a.y);
}

function expectLevelY(n: { level: number; y: number }, cardH: number, vGap: number) {
  expect(n.y).toBe(n.level * (cardH + vGap));
}

describe("Family layout", () => {
  test("basic placement - spouses side-by-side; children centered; no overlaps; correct coords", () => {
    const opt = baseOptions;
    const nodes = computeLayout(usersSample, linksSample, opt);

    const me = rect(1, nodes, opt.cardW, opt.cardH);
    expect(me.level).toBe(0);
    expect(me.badge).toBe(Badge.SELF);
    expectLevelY(me, opt.cardH, opt.vGap);

    const wife = rect(2, nodes, opt.cardW, opt.cardH);
    expect(wife.level).toBe(0);
    expect(wife.badge).toBe(Badge.SPOUSE);
    expectLevelY(wife, opt.cardH, opt.vGap);
    expect(wife.y).toBe(me.y);

    const dxSpouses = Math.abs(wife.x - me.x);
    expect(dxSpouses).toBe(opt.cardW + opt.spouseGutter);

    const coupleCenter = (me.cx + wife.cx) / 2;

    const childA = rect(4, nodes, opt.cardW, opt.cardH);
    const childB = rect(3, nodes, opt.cardW, opt.cardH);
    expect(childA.level).toBe(1);
    expect(childB.level).toBe(1);
    expectLevelY(childA, opt.cardH, opt.vGap);
    expectLevelY(childB, opt.cardH, opt.vGap);
    expect(childA.badge).toBe(Badge.CHILD);
    expect(childB.badge).toBe(Badge.CHILD);
    expect(childA.x).toBeLessThan(childB.x);

    const kidsCenter = (childA.cx + childB.cx) / 2;
    expect(Math.abs(kidsCenter - coupleCenter)).toBeLessThanOrEqual(1);

    const parentA = rect(6, nodes, opt.cardW, opt.cardH);
    const parentB = rect(7, nodes, opt.cardW, opt.cardH);
    expect(parentA.level).toBe(-1);
    expect(parentB.level).toBe(-1);
    expectLevelY(parentA, opt.cardH, opt.vGap);
    expectLevelY(parentB, opt.cardH, opt.vGap);
    expect(parentA.badge).toBe(Badge.PARENT);
    expect(parentB.badge).toBe(Badge.PARENT);
    expect(parentA.y).toBe(parentB.y);
    const dxParents = Math.abs(parentA.x - parentB.x);
    expect(dxParents).toBe(opt.cardW + opt.spouseGutter);

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const A = rect(nodes[i].id, nodes, opt.cardW, opt.cardH);
        const B = rect(nodes[j].id, nodes, opt.cardW, opt.cardH);
        expect(intersects(A, B)).toBe(false);
      }
    }
  });

  test("grand relations & in-law/cousin detection", () => {
    const nodes = computeLayout(usersSample, linksSample, baseOptions);
    const gp1 = nodes.find((n: LayoutNode) => n.id === 8)!;
    const gp2 = nodes.find((n: LayoutNode) => n.id === 9)!;
    expect(gp1.badge).toBe(Badge.GRANDPARENT);
    expect(gp2.badge).toBe(Badge.GRANDPARENT);

    const aunt = nodes.find((n: LayoutNode) => n.id === 10)!;
    expect([Badge.UNCLE_AUNT, Badge.IN_LAW]).toContain(aunt.badge);

    const cousin = nodes.find((n: LayoutNode) => n.id === 11)!;
    expect([Badge.COUSIN, Badge.UNKNOWN]).toContain(cousin.badge);
  });

  test("fail on unknown ids in links", () => {
    expect(() =>
      computeLayout(usersSample, linksWithUnknowns, {
        ...baseOptions,
        failOnUnknownIds: true,
      })
    ).toThrow();
  });

  test("works when ignoring unknown ids", () => {
    const nodes = computeLayout(usersSample, linksWithUnknowns, {
      ...baseOptions,
      failOnUnknownIds: false,
    });
    expect(nodes.find((n: LayoutNode) => n.id === 1)).toBeTruthy();
  });

  test("layout matches expected coordinates", () => {
    const nodes = computeLayout(usersSample, linksSample, baseOptions);
    const expectedList = getAllExpectedCoordinates();
    const expectedById = new Map<number, typeof expectedList>();

    expectedList.forEach((expected) => {
      const existing = expectedById.get(expected.id) ?? [];
      expectedById.set(expected.id, [...existing, expected]);
    });

    expectedById.forEach((variants, id) => {
      const node = nodes.find((n: LayoutNode) => n.id === id);
      expect(node).toBeDefined();
      if (!node) return;

      const matched = variants.some(
        ({ x, y, level }) => node.x === x && node.y === y && node.level === level
      );
      expect(matched).toBe(true);
    });
  });
});


