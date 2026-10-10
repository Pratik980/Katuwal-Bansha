// tests/treeLayout.test.js
// Where the family tree puts its cards. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutTree, collectParentIds } from '../src/utils/treeLayout.js';

const CARD = 192;
const LINK = 48;
const person = (id, extra = {}) => ({ _id: id, name: id, spouses: [], children: [], ...extra });
const layout = (roots, options = {}) => layoutTree(roots, { cardWidth: CARD, linkWidth: LINK, ...options });

// Every card as a box, to look for overlaps
const cardBoxes = (result) =>
  result.rows.flatMap((row, level) =>
    row.flatMap((box) => box.cards.map((card, i) => ({ id: card._id, level, left: box.x + i * (CARD + LINK), right: box.x + i * (CARD + LINK) + CARD })))
  );

const assertNoOverlap = (result) => {
  const boxes = cardBoxes(result);
  boxes.forEach((a, i) =>
    boxes.slice(i + 1).forEach((b) => {
      if (a.level === b.level) assert.ok(a.right <= b.left || b.right <= a.left, `${a.id} overlaps ${b.id}`);
    })
  );
  boxes.forEach((box) => assert.ok(box.left >= 0 && box.right <= result.width, `${box.id} is outside the chart`));
  assert.equal(new Set(boxes.map((box) => box.id)).size, boxes.length, 'a card is drawn twice');
};

// A wide and deep family, some with one spouse, some with two, some with none
const bigFamily = (depth, width) => {
  let count = 0;
  const build = (level) => {
    count += 1;
    const id = `p${count}`;
    const spouses = Array.from({ length: count % 3 }, (_, i) => person(`${id}-s${i}`));
    return person(id, { spouses, children: level < depth ? Array.from({ length: width }, () => build(level + 1)) : [] });
  };
  return [build(1)];
};

test('an empty tree has no size', () => {
  assert.deepEqual(layout([]), { width: 0, rows: [] });
});

test('a couple: the child line leaves from the husband, not from between him and his wife', () => {
  const result = layout([person('ram', { spouses: [person('sita')], children: [person('son')] })]);
  const [couple] = result.rows[0];
  assert.deepEqual(couple.cards.map((c) => c._id), ['ram', 'sita']);
  assert.equal(couple.stemX, couple.x + CARD / 2, 'under the middle of his own card');
  assert.ok(couple.stemX < couple.x + CARD, 'never over the marriage line or the wife');
  assert.equal(result.rows[1][0].dropX, couple.stemX, 'an only child hangs straight below him');
  assertNoOverlap(result);
});

test('a son with a wife: the line arrives at the son and goes on down from the son', () => {
  const result = layout([
    person('father', { children: [person('son', { spouses: [person('buhari')], children: [person('g1'), person('g2')] })] }),
  ]);
  const [son] = result.rows[1];
  assert.equal(son.dropX, son.x + CARD / 2);
  assert.equal(son.stemX, son.dropX, 'one straight line through the son');
  assertNoOverlap(result);
});

test('whatever the number of spouses, descent starts under the main person', () => {
  for (const spouses of [[], [person('w1')], [person('w1'), person('w2')], [person('w1'), person('w2'), person('w3')]]) {
    const result = layout([person('ram', { spouses, children: [person('c1'), person('c2'), person('c3')] })]);
    const [unit] = result.rows[0];
    assert.equal(unit.stemX, unit.x + unit.mainIndex * (CARD + LINK) + CARD / 2);
    assertNoOverlap(result);
  }
});

test('two wives stand on either side of the husband', () => {
  const result = layout([person('ram', { spouses: [person('w1'), person('w2')], children: [person('c1'), person('c2')] })]);
  const [unit] = result.rows[0];
  assert.deepEqual(unit.cards.map((c) => c._id), ['w1', 'ram', 'w2']);
  assert.equal(unit.stemX, unit.dropX, 'children descend from the husband');
  assertNoOverlap(result);
});

test('no card overlaps another however large the tree grows', () => {
  for (const [depth, width] of [[2, 12], [4, 3], [6, 2], [3, 7]]) {
    const result = layout(bigFamily(depth, width));
    assertNoOverlap(result);
    assert.equal(result.rows.length, depth);
  }
});

test('parents sit centred over their children', () => {
  const result = layout(bigFamily(4, 3));
  result.rows.flat().forEach((box) => {
    if (box.children.length === 0) return;
    const first = box.children[0].dropX;
    const last = box.children[box.children.length - 1].dropX;
    assert.ok(Math.abs(box.stemX - (first + last) / 2) <= 1, `${box.node._id} is off centre`);
  });
});

test('several separate trees sit side by side', () => {
  const result = layout([person('a', { children: [person('a1'), person('a2')] }), person('b'), person('c', { spouses: [person('cs')] })]);
  assert.equal(result.rows[0].length, 3);
  assertNoOverlap(result);
});

test('a collapsed branch takes no room and remembers how many children it hides', () => {
  const roots = [person('father', { children: [person('son', { children: [person('g1'), person('g2')] }), person('daughter')] })];
  const open = layout(roots);
  const closed = layout(roots, { isCollapsed: (id) => id === 'son' });

  assert.equal(open.rows.length, 3);
  assert.equal(closed.rows.length, 2);
  const son = closed.rows[1].find((box) => box.node._id === 'son');
  assert.equal(son.collapsed, true);
  assert.equal(son.childCount, 2);
  assert.deepEqual(collectParentIds(roots), ['father', 'son']);
});
