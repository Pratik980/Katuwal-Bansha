// tests/lineageTree.test.js
// The tree builder on its own: awkward and inconsistent data must still give a
// tree where every person appears once. No database needed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFamilyTree } from '../utils/lineageTree.js';

const person = (id, fields = {}) => ({ _id: id, name: id, gender: 'male', generation: 1, ...fields });

const allIds = (roots) => {
  const ids = [];
  const walk = (nodes) =>
    nodes.forEach((node) => {
      ids.push(node._id);
      (node.spouses || []).forEach((spouse) => ids.push(spouse._id));
      walk(node.children || []);
    });
  walk(roots);
  return ids;
};

const assertOnce = (roots, expected) => {
  const ids = allIds(roots);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual([...ids].sort(), [...expected].sort());
};

test('empty family gives an empty tree', () => {
  assert.deepEqual(buildFamilyTree([]).roots, []);
});

test('a link stored on only one side still pairs the couple', () => {
  const { roots } = buildFamilyTree([person('ram'), person('sita', { gender: 'female', husband: 'ram' })]);
  assert.equal(roots.length, 1);
  assert.equal(roots[0]._id, 'ram');
  assert.deepEqual(roots[0].spouses.map((s) => s._id), ['sita']);
});

test('a daughter of the family is the main card and her husband stands beside her', () => {
  const { roots } = buildFamilyTree([
    person('father'),
    person('daughter', { gender: 'female', father: 'father', spouse: 'jwai' }),
    person('jwai', { spouse: 'daughter' }),
  ]);
  assert.equal(roots.length, 1);
  const [daughter] = roots[0].children;
  assert.equal(daughter._id, 'daughter');
  assert.deepEqual(daughter.spouses.map((s) => s._id), ['jwai']);
  assertOnce(roots, ['father', 'daughter', 'jwai']);
});

test('a spouse registered under another family is shown beside the member', () => {
  const { roots, stats } = buildFamilyTree([person('ram', { spouse: 'sita' })], {
    externalMembers: [person('sita', { gender: 'female', spouse: 'ram' })],
  });
  assert.equal(roots[0].spouses[0]._id, 'sita');
  assert.equal(roots[0].spouses[0].isExternal, true);
  assert.equal(stats.members, 1);
  assert.equal(stats.placed, 1);
});

test('a man with two wives has both beside him and all children below', () => {
  const { roots } = buildFamilyTree([
    person('ram', { spouse: 'wife1', wives: ['wife1', 'wife2'] }),
    person('wife1', { gender: 'female', spouse: 'ram' }),
    person('wife2', { gender: 'female', husband: 'ram' }),
    person('child1', { father: 'ram', mother: 'wife1' }),
    person('child2', { father: 'ram', mother: 'wife2' }),
  ]);
  assert.equal(roots.length, 1);
  assert.deepEqual(roots[0].spouses.map((s) => s._id).sort(), ['wife1', 'wife2']);
  assert.deepEqual(roots[0].children.map((c) => c._id).sort(), ['child1', 'child2']);
  assertOnce(roots, ['ram', 'wife1', 'wife2', 'child1', 'child2']);
});

test('a child is drawn once even when its parents are in different couples', () => {
  const { roots } = buildFamilyTree([
    person('father', { spouse: 'stepmother' }),
    person('stepmother', { gender: 'female', spouse: 'father' }),
    person('mother', { gender: 'female' }),
    person('child', { father: 'father', mother: 'mother' }),
  ]);
  assertOnce(roots, ['father', 'stepmother', 'mother', 'child']);
});

test('a parent wrongly stored as the spouse of their own child stays a parent', () => {
  const { roots } = buildFamilyTree([
    person('mother', { gender: 'female', spouse: 'son' }),
    person('son', { mother: 'mother', spouse: 'mother' }),
  ]);
  assert.equal(roots.length, 1);
  assert.equal(roots[0]._id, 'mother');
  assert.deepEqual(roots[0].spouses, []);
  assert.deepEqual(roots[0].children.map((c) => c._id), ['son']);
});

test('two people recorded as each other’s parent do not hang or disappear', () => {
  const { roots } = buildFamilyTree([person('a', { father: 'b' }), person('b', { father: 'a' })]);
  assertOnce(roots, ['a', 'b']);
});

test('a member with only a grandparent on record is still shown', () => {
  const { roots } = buildFamilyTree([person('grandfather'), person('grandson', { grandfather: 'grandfather' })]);
  assertOnce(roots, ['grandfather', 'grandson']);
});

test('the head of the family comes first, then the larger branches', () => {
  const { roots } = buildFamilyTree(
    [person('loner'), person('head'), person('child', { father: 'head' }), person('elder'), person('e1', { father: 'elder' }), person('e2', { father: 'elder' })],
    { familyHeadId: 'head' }
  );
  assert.deepEqual(roots.map((r) => r._id), ['head', 'elder', 'loner']);
});

test('children follow birth order, then date of birth', () => {
  const { roots } = buildFamilyTree([
    person('father'),
    person('third', { father: 'father', dob: '1990-01-01' }),
    person('second', { father: 'father', dob: '1985-01-01' }),
    person('first', { father: 'father', dob: '1999-01-01', childBirthOrder: 1 }),
  ]);
  assert.deepEqual(roots[0].children.map((c) => c._id), ['first', 'second', 'third']);
});

test('a typed wife name is replaced by the linked member, never shown alongside her', () => {
  const { roots } = buildFamilyTree([
    person('ram', { wifeName: 'Sita Devi', spouse: 'seeta' }),
    person('seeta', { gender: 'female', spouse: 'ram' }),
  ]);
  assert.deepEqual(roots[0].spouses.map((s) => s._id), ['seeta']);
});
