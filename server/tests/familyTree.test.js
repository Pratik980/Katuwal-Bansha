// tests/familyTree.test.js
// Family Tree + Marriage/Spouse + Data Entry integration scenarios.
// Run with: npm test   (uses an in-memory MongoDB, never the database in .env)
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, stopTestApp, resetDatabase, api, toFormData } from './helpers/testApp.js';

let Member;
let familyId;

before(async () => {
  await startTestApp();
  ({ default: Member } = await import('../models/Member.js'));
});

after(async () => {
  await stopTestApp();
});

beforeEach(async () => {
  await resetDatabase();
  const family = await api.post('/families', {
    familyName: 'कटुवाल परिवार',
    houseNumber: '12',
    vanshaGenerationNumber: '7',
  });
  assert.equal(family.status, 201, JSON.stringify(family.data));
  familyId = family.data._id;
});

// ---- helpers ---------------------------------------------------------------

// The fields the Data Entry form always submits for a new member.
const formDefaults = () => ({
  gender: 'male',
  dob: '2030-01-15',
  district: 'Kathmandu',
  country: 'Nepal',
  nationality: 'Nepali',
  bloodGroup: 'unknown',
  isAlive: true,
  personStatus: 'known',
  family: familyId,
  generation: 1,
  generationMode: 'auto',
  lineageRole: 'lineage_member',
  maritalStatus: 'single',
});

const addMember = async (fields) => {
  const res = await api.post('/members', toFormData({ ...formDefaults(), ...fields }));
  assert.equal(res.status, 201, `create ${fields.name}: ${JSON.stringify(res.data)}`);
  return res.data;
};

// Mirrors the edit form: every stored field is sent back, relations as ids.
const editMember = async (id, changes = {}) => {
  const list = await api.get('/members?limit=1000');
  const row = list.data.data.find((m) => m._id === id);
  const fields = {};
  Object.entries(row).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) fields[key] = value._id;
    else fields[key] = value;
  });
  if (row.dobNepali) fields.dob = row.dobNepali;
  return api.put(`/members/${id}`, toFormData({ ...fields, ...changes }));
};

const getTree = async (id = familyId) => {
  const res = await api.get(`/families/${id}/tree`);
  assert.equal(res.status, 200, JSON.stringify(res.data));
  return res.data;
};

// Every card in the tree, in drawing order.
const cardsOf = (roots) => {
  const cards = [];
  const walk = (nodes, parent) =>
    nodes.forEach((node) => {
      cards.push({ ...node, parentName: parent?.name || null });
      (node.spouses || []).forEach((spouse) => cards.push({ ...spouse, besideName: node.name }));
      walk(node.children || [], node);
    });
  walk(roots, null);
  return cards;
};

const findNode = (roots, name) => {
  for (const node of roots) {
    if (node.name === name) return node;
    const found = findNode(node.children || [], name);
    if (found) return found;
  }
  return null;
};

const namesOf = (list) => list.map((item) => item.name);

const assertEveryMemberOnce = (tree, expectedCount) => {
  const ids = cardsOf(tree.data)
    .filter((card) => !card.isPlaceholder)
    .map((card) => card._id);
  assert.equal(new Set(ids).size, ids.length, 'a person is drawn more than once');
  assert.equal(ids.length, expectedCount, 'a member is missing from the tree');
};

// ---- 1. Married male -> tree with wife -------------------------------------

test('married male: wife picked from existing members stands beside him', async () => {
  const wife = await addMember({ name: 'सीता', gender: 'female' });
  const husband = await addMember({ name: 'राम', maritalStatus: 'married', spouse: wife._id });

  const tree = await getTree();
  assert.equal(tree.data.length, 1);
  assert.equal(tree.data[0].name, 'राम');
  assert.deepEqual(namesOf(tree.data[0].spouses), ['सीता']);
  assertEveryMemberOnce(tree, 2);

  const [h, w] = await Promise.all([Member.findById(husband._id).lean(), Member.findById(wife._id).lean()]);
  assert.equal(String(h.spouse), wife._id);
  assert.equal(String(h.wife), wife._id);
  assert.equal(String(w.spouse), husband._id);
  assert.equal(String(w.husband), husband._id);
  assert.equal(w.maritalStatus, 'married');
});

test('married male: wife typed only as a name still shows as his wife', async () => {
  await addMember({ name: 'राम', maritalStatus: 'married', wifeName: 'सीता देवी' });

  const tree = await getTree();
  const [wife] = tree.data[0].spouses;
  assert.equal(wife.name, 'सीता देवी');
  assert.equal(wife.gender, 'female');
  assert.equal(wife.isPlaceholder, true);
  assert.equal(tree.count, 1);
});

// ---- 2. Married female -> tree with husband ---------------------------------

test('married female: husband picked from existing members is shown with her', async () => {
  const husband = await addMember({ name: 'हरि' });
  await addMember({ name: 'गीता', gender: 'female', maritalStatus: 'married', spouse: husband._id });

  const tree = await getTree();
  assert.equal(tree.data.length, 1);
  const cards = cardsOf(tree.data);
  assert.deepEqual(namesOf(cards).sort(), ['गीता', 'हरि'].sort());
  assert.equal(cards.filter((c) => c.isSpouseCard).length, 1);
  assertEveryMemberOnce(tree, 2);
});

test('married female: husband typed only as a name still shows as her husband', async () => {
  await addMember({ name: 'गीता', gender: 'female', maritalStatus: 'married', husbandName: 'हरि बहादुर' });

  const tree = await getTree();
  const [husband] = tree.data[0].spouses;
  assert.equal(husband.name, 'हरि बहादुर');
  assert.equal(husband.gender, 'male');
  assert.equal(husband.isPlaceholder, true);
});

// ---- 3. Husband first -> wife later -----------------------------------------

test('husband first, wife later as a separate entry: linked, not duplicated', async () => {
  const husband = await addMember({ name: 'राम', maritalStatus: 'married', wifeName: 'सीता' });
  const wife = await addMember({ name: 'सीता', gender: 'female', relationship: 'बुहारी' });

  const tree = await getTree();
  assert.equal(tree.data.length, 1, 'wife must not be a separate tree');
  assert.deepEqual(namesOf(tree.data[0].spouses), ['सीता']);
  assert.equal(tree.data[0].spouses[0]._id, wife._id, 'the card is the real member, not the typed name');
  assertEveryMemberOnce(tree, 2);

  const h = await Member.findById(husband._id).lean();
  assert.equal(String(h.spouse), wife._id);
  assert.equal(h.wifeName, 'सीता', 'what was typed earlier is kept');
  assert.equal(await Member.countDocuments(), 2);
});

test('husband first, wife later choosing him as spouse', async () => {
  const husband = await addMember({ name: 'राम', maritalStatus: 'married' });
  await addMember({ name: 'सीता', gender: 'female', maritalStatus: 'married', spouse: husband._id });

  const tree = await getTree();
  assert.equal(tree.data[0].name, 'राम');
  assert.deepEqual(namesOf(tree.data[0].spouses), ['सीता']);
  assertEveryMemberOnce(tree, 2);
});

// ---- 4. Wife first -> husband later -----------------------------------------

test('wife first, husband later as a separate entry: linked, not duplicated', async () => {
  const wife = await addMember({ name: 'गीता', gender: 'female', maritalStatus: 'married', husbandName: 'हरि' });
  const husband = await addMember({ name: 'हरि', maritalStatus: 'married' });

  const tree = await getTree();
  assert.equal(tree.data.length, 1);
  assertEveryMemberOnce(tree, 2);
  assert.equal(cardsOf(tree.data).filter((c) => c.isPlaceholder).length, 0);

  const w = await Member.findById(wife._id).lean();
  assert.equal(String(w.spouse), husband._id);
  assert.equal(String(w.husband), husband._id);
});

test('wife first, husband later naming her as his wife', async () => {
  const wife = await addMember({ name: 'गीता', gender: 'female' });
  const husband = await addMember({ name: 'हरि', maritalStatus: 'married', wifeName: 'गीता' });

  const tree = await getTree();
  assert.equal(tree.data.length, 1);
  assertEveryMemberOnce(tree, 2);
  assert.equal(String((await Member.findById(wife._id).lean()).spouse), husband._id);
});

// ---- 5. No duplicates -------------------------------------------------------

test('a couple with children is drawn once, with the children under both', async () => {
  const father = await addMember({ name: 'बुवा', maritalStatus: 'married' });
  const mother = await addMember({ name: 'आमा', gender: 'female', maritalStatus: 'married', spouse: father._id });
  await addMember({ name: 'छोरा', father: father._id, mother: mother._id });
  await addMember({ name: 'छोरी', gender: 'female', father: father._id, mother: mother._id });

  const tree = await getTree();
  assert.equal(tree.data.length, 1, 'the mother must not start a second tree');
  assert.deepEqual(namesOf(tree.data[0].spouses), ['आमा']);
  assert.deepEqual(namesOf(tree.data[0].children), ['छोरा', 'छोरी']);
  assertEveryMemberOnce(tree, 4);
  assert.deepEqual(tree.stats, { members: 4, placed: 4, couples: 1, roots: 1 });
});

test('father and mother named on a child are a couple even when never linked as spouses', async () => {
  const father = await addMember({ name: 'बुवा' });
  const mother = await addMember({ name: 'आमा', gender: 'female' });
  await addMember({ name: 'छोरा', father: father._id, mother: mother._id });

  const tree = await getTree();
  assert.equal(tree.data.length, 1);
  assert.deepEqual(namesOf(tree.data[0].spouses), ['आमा']);
  assertEveryMemberOnce(tree, 3);
});

test('entering the same person twice is refused instead of creating a second record', async () => {
  await addMember({ name: 'सीता', gender: 'female' });
  const again = await api.post('/members', toFormData({ ...formDefaults(), name: 'सीता', gender: 'female' }));
  assert.equal(again.status, 409);
  assert.equal(await Member.countDocuments(), 1);
});

test('someone already married cannot be taken as a second spouse', async () => {
  const husband = await addMember({ name: 'राम', maritalStatus: 'married' });
  const wife = await addMember({ name: 'सीता', gender: 'female', maritalStatus: 'married', spouse: husband._id });
  const other = await api.post(
    '/members',
    toFormData({ ...formDefaults(), name: 'श्याम', maritalStatus: 'married', spouse: wife._id })
  );
  assert.equal(other.status, 400);
  assert.equal(String((await Member.findById(wife._id).lean()).spouse), husband._id);
});

test('a child is never auto-linked as the spouse of a parent with the same typed name', async () => {
  const father = await addMember({ name: 'राम', maritalStatus: 'married', wifeName: 'सीता' });
  const daughter = await addMember({ name: 'सीता', gender: 'female', father: father._id });

  assert.equal((await Member.findById(daughter._id).lean()).spouse, undefined);
  const tree = await getTree();
  assert.deepEqual(namesOf(tree.data[0].children), ['सीता']);
  assert.equal(tree.data[0].spouses[0].isPlaceholder, true);
});

// ---- 6. Parent / child ------------------------------------------------------

test('three generations sit on the right level with the right generation number', async () => {
  const grandfather = await addMember({ name: 'हजुरबा', lineageRole: 'lineage_head', maritalStatus: 'married' });
  const grandmother = await addMember({
    name: 'हजुरआमा', gender: 'female', maritalStatus: 'married', spouse: grandfather._id,
  });
  const father = await addMember({ name: 'बुवा', father: grandfather._id, mother: grandmother._id });
  const uncle = await addMember({ name: 'काका', father: grandfather._id, dob: '2035-01-01' });
  const mother = await addMember({ name: 'आमा', gender: 'female', maritalStatus: 'married', spouse: father._id });
  const son = await addMember({ name: 'नाति', father: father._id, mother: mother._id });

  assert.equal(father.generation, 2);
  assert.equal(uncle.generation, 2);
  assert.equal(mother.generation, 2, 'a wife sits in her husband’s generation');
  assert.equal(son.generation, 3);

  const tree = await getTree();
  assert.equal(tree.data.length, 1);
  const root = tree.data[0];
  assert.equal(root.name, 'हजुरबा');
  assert.equal(root.level, 0);
  assert.deepEqual(namesOf(root.children), ['बुवा', 'काका'], 'children are ordered by age');
  assert.equal(findNode(tree.data, 'बुवा').level, 1);
  assert.equal(findNode(tree.data, 'नाति').level, 2);
  assert.deepEqual(namesOf(findNode(tree.data, 'बुवा').spouses), ['आमा']);
  assertEveryMemberOnce(tree, 6);
});

test('a generation typed by hand is kept', async () => {
  const elder = await addMember({ name: 'पुर्खा', generation: 5 });
  const child = await addMember({ name: 'सन्तान', father: elder._id });
  const manual = await addMember({ name: 'म्यानुअल', father: elder._id, generation: 9, generationMode: 'manual' });

  assert.equal(elder.generation, 5);
  assert.equal(child.generation, 6);
  assert.equal(manual.generation, 9);
});

test('children picked on the parent form are placed under that parent', async () => {
  const son = await addMember({ name: 'छोरा' });
  const daughter = await addMember({ name: 'छोरी', gender: 'female' });
  const father = await addMember({ name: 'बुवा', sons: [son._id], daughters: [daughter._id] });

  const tree = await getTree();
  assert.equal(tree.data.length, 1);
  assert.equal(tree.data[0].name, 'बुवा');
  assert.deepEqual(namesOf(tree.data[0].children).sort(), ['छोरा', 'छोरी'].sort());
  assert.equal(String((await Member.findById(son._id).lean()).father), father._id);
  assert.deepEqual(tree.data[0].children.map((child) => child.generation), [2, 2], 'children sit one generation below');
});

test('children picked on the parent form keep a generation that was typed by hand', async () => {
  const son = await addMember({ name: 'छोरा', generation: 6 });
  await addMember({ name: 'बुवा', generation: 5, sons: [son._id] });
  assert.equal((await Member.findById(son._id).lean()).generation, 6);
});

// ---- 7. Large tree ----------------------------------------------------------

test('large tree: every member is placed exactly once', async () => {
  let counter = 0;
  const person = (fields) => ({
    name: `सदस्य ${++counter}`,
    gender: 'male',
    dob: new Date(1950 + (counter % 60), 0, 1),
    family: familyId,
    memberNumber: `T${String(counter).padStart(5, '0')}`,
    ...fields,
  });

  const [root] = await Member.insertMany([person({ lineageRole: 'lineage_head', generation: 1 })]);
  let parents = [root];
  let total = 1;

  // 5 generations below the root, 3 sons each, every son married: 1 + 363 * 2 members
  for (let generation = 2; generation <= 6; generation += 1) {
    const sons = await Member.insertMany(
      parents.flatMap((parent) => [1, 2, 3].map((order) => person({ father: parent._id, generation, childBirthOrder: order })))
    );
    const wives = await Member.insertMany(
      sons.map((son) => person({ gender: 'female', spouse: son._id, husband: son._id, generation }))
    );
    await Promise.all(
      sons.map((son, index) => Member.updateOne({ _id: son._id }, { spouse: wives[index]._id, wife: wives[index]._id }))
    );
    total += sons.length + wives.length;
    parents = sons;
  }

  const tree = await getTree();
  assert.equal(tree.count, total);
  assert.equal(tree.data.length, 1);
  assertEveryMemberOnce(tree, total);
  assert.equal(tree.stats.placed, total);

  const depth = (node) => 1 + Math.max(0, ...(node.children || []).map(depth));
  assert.equal(depth(tree.data[0]), 6);
  assert.ok(cardsOf(tree.data).every((card) => card.isSpouseCard || card.children.length === 0 || card.children.length === 3));
});

// ---- 8. Photos --------------------------------------------------------------

test('photos reach the tree for sons, daughters, wives and daughters-in-law', async () => {
  const photo = (name) => `https://res.cloudinary.com/demo/image/upload/family-members/${name}.jpg`;
  const [father] = await Member.insertMany([
    { name: 'बुवा', gender: 'male', dob: new Date(1960, 0, 1), family: familyId, photo: photo('father'), memberNumber: 'P1' },
  ]);
  const [mother, son, daughter] = await Member.insertMany([
    { name: 'आमा', gender: 'female', dob: new Date(1962, 0, 1), family: familyId, spouse: father._id, relationship: 'श्रीमती', photo: photo('mother'), memberNumber: 'P2' },
    { name: 'छोरा', gender: 'male', dob: new Date(1985, 0, 1), family: familyId, father: father._id, photo: photo('son'), memberNumber: 'P3' },
    { name: 'छोरी', gender: 'female', dob: new Date(1988, 0, 1), family: familyId, father: father._id, relationship: 'छोरी', photo: photo('daughter'), memberNumber: 'P4' },
  ]);
  await Member.insertMany([
    { name: 'बुहारी', gender: 'female', dob: new Date(1987, 0, 1), family: familyId, spouse: son._id, relationship: 'बुहारी', photo: photo('buhari'), memberNumber: 'P5' },
  ]);

  const tree = await getTree();
  const byName = Object.fromEntries(cardsOf(tree.data).map((card) => [card.name, card]));
  assert.equal(byName['बुवा'].photo, photo('father'));
  assert.equal(byName['आमा'].photo, photo('mother'));
  assert.equal(byName['छोरा'].photo, photo('son'));
  assert.equal(byName['छोरी'].photo, photo('daughter'));
  assert.equal(byName['बुहारी'].photo, photo('buhari'));
  assert.equal(byName['बुहारी'].relationship, 'बुहारी');
  assert.equal(byName['बुहारी'].besideName, 'छोरा');
  assertEveryMemberOnce(tree, 5);
  assert.ok(mother && daughter);
});

// ---- 9. New member from Data Entry -> tree ----------------------------------

test('Data Entry: a new member saves without a house number and appears in the chosen family only', async () => {
  const other = await api.post('/families', { familyName: 'अर्को परिवार', houseNumber: '13' });
  const created = await addMember({ name: 'नयाँ सदस्य', dob: '2031-02-32' });

  assert.equal(created.memberNumber, 'M0001');
  assert.equal(created.dobNepali, '2031-02-32');
  assert.equal(created.vanshaGenerationNumber, '7', 'vansha number comes from the family');

  assert.deepEqual(namesOf(cardsOf((await getTree()).data)), ['नयाँ सदस्य']);
  assert.equal((await getTree(other.data._id)).data.length, 0);
});

test('Data Entry: a person whose name is unknown can be saved and keeps a place in the tree', async () => {
  const father = await addMember({ name: 'बुवा' });
  const res = await api.post(
    '/members',
    toFormData({ ...formDefaults(), dob: '', personStatus: 'unknown_name', father: father._id })
  );
  assert.equal(res.status, 201, JSON.stringify(res.data));
  assert.equal(res.data.name, 'नाम अज्ञात');
  assert.deepEqual(namesOf((await getTree()).data[0].children), ['नाम अज्ञात']);
});

test('Data Entry: marital status and relationship set on the form match what the tree shows', async () => {
  const husband = await addMember({ name: 'राम', relationship: 'छोरा' });
  const wife = await addMember({
    name: 'सीता', gender: 'female', relationship: 'बुहारी', maritalStatus: 'married', spouse: husband._id,
  });

  const tree = await getTree();
  const card = tree.data[0].spouses[0];
  assert.equal(card._id, wife._id);
  assert.equal(card.relationship, 'बुहारी');
  assert.equal(card.maritalStatus, 'married');
  assert.equal(tree.data[0].maritalStatus, 'married', 'the husband is marked married too');
  assert.equal(tree.data[0].relationship, 'छोरा');
});

// ---- 10. Existing member -> edit -> tree update -----------------------------

test('edit: changing a name updates the tree and keeps spouse, children and photo', async () => {
  const father = await addMember({ name: 'बुवा', maritalStatus: 'married' });
  const mother = await addMember({ name: 'आमा', gender: 'female', maritalStatus: 'married', spouse: father._id });
  const son = await addMember({ name: 'छोरा', father: father._id, mother: mother._id });
  await Member.updateOne({ _id: father._id }, { photo: 'https://res.cloudinary.com/demo/image/upload/father.jpg' });

  const res = await editMember(father._id, { name: 'बुवा बहादुर', occupation: 'Farmer' });
  assert.equal(res.status, 200, JSON.stringify(res.data));

  const tree = await getTree();
  assert.equal(tree.data.length, 1);
  assert.equal(tree.data[0].name, 'बुवा बहादुर');
  assert.equal(tree.data[0].photo, 'https://res.cloudinary.com/demo/image/upload/father.jpg');
  assert.deepEqual(namesOf(tree.data[0].spouses), ['आमा']);
  assert.deepEqual(namesOf(tree.data[0].children), ['छोरा']);
  assertEveryMemberOnce(tree, 3);

  const s = await Member.findById(son._id).lean();
  assert.equal(String(s.father), father._id);
  assert.equal(String(s.mother), mother._id);
  assert.equal(String((await Member.findById(mother._id).lean()).husband), father._id);
});

test('edit: children recorded only on the child (older data) are not lost when the parent is edited', async () => {
  const [father] = await Member.insertMany([
    { name: 'बुवा', gender: 'male', dob: new Date(1960, 0, 1), family: familyId, memberNumber: 'L1', district: 'Kathmandu' },
  ]);
  const [child] = await Member.insertMany([
    { name: 'छोरा', gender: 'male', dob: new Date(1985, 0, 1), family: familyId, memberNumber: 'L2', father: father._id },
  ]);

  const res = await editMember(String(father._id), { occupation: 'Teacher' });
  assert.equal(res.status, 200, JSON.stringify(res.data));

  assert.equal(String((await Member.findById(child._id).lean()).father), String(father._id));
  assert.deepEqual(namesOf((await getTree()).data[0].children), ['छोरा']);
});

test('edit: moving a child to another father moves it in the tree', async () => {
  const first = await addMember({ name: 'जेठा' });
  const second = await addMember({ name: 'कान्छा' });
  const child = await addMember({ name: 'बालक', father: first._id });

  const res = await editMember(child._id, { father: second._id });
  assert.equal(res.status, 200, JSON.stringify(res.data));

  const tree = await getTree();
  assert.deepEqual(namesOf(findNode(tree.data, 'कान्छा').children), ['बालक']);
  assert.deepEqual(namesOf(findNode(tree.data, 'जेठा').children), []);
  assertEveryMemberOnce(tree, 3);

  const [a, b] = await Promise.all([Member.findById(first._id).lean(), Member.findById(second._id).lean()]);
  assert.deepEqual(a.sons.map(String), []);
  assert.deepEqual(b.sons.map(String), [child._id]);
});

test('edit: marking an existing member married and choosing a spouse updates the tree', async () => {
  const husband = await addMember({ name: 'राम' });
  const wife = await addMember({ name: 'सीता', gender: 'female' });
  assert.equal((await getTree()).data.length, 2);

  const res = await editMember(husband._id, { maritalStatus: 'married', spouse: wife._id });
  assert.equal(res.status, 200, JSON.stringify(res.data));

  const tree = await getTree();
  assert.equal(tree.data.length, 1);
  assert.deepEqual(namesOf(tree.data[0].spouses), ['सीता']);
  assertEveryMemberOnce(tree, 2);
});

test('edit: saving twice changes nothing the second time', async () => {
  const father = await addMember({ name: 'बुवा', maritalStatus: 'married' });
  const mother = await addMember({ name: 'आमा', gender: 'female', maritalStatus: 'married', spouse: father._id });
  await addMember({ name: 'छोरा', father: father._id, mother: mother._id });

  const snapshot = async () =>
    (await Member.find().sort({ memberNumber: 1 }).lean()).map(({ updatedAt, __v, ...rest }) => rest);

  assert.equal((await editMember(father._id)).status, 200);
  const first = await snapshot();
  assert.equal((await editMember(father._id)).status, 200);
  assert.equal((await editMember(mother._id)).status, 200);
  assert.deepEqual(await snapshot(), first);
});

// ---- Dates ------------------------------------------------------------------

test('edit: the date of birth stays the same day, however it was first entered', async () => {
  const snapshot = async (id) => {
    const m = await Member.findById(id).lean();
    return { dob: m.dob.toISOString(), dobNepali: m.dobNepali ?? null };
  };

  const bs = await addMember({ name: 'बिएस मिति', dob: '2047-02-01' });
  const old = await addMember({ name: 'पुरानो पुर्खा', dob: '1975-03-10' });
  const older = await addMember({ name: 'झन् पुरानो पुर्खा', dob: '1890-05-15' });
  const beyond = await addMember({ name: 'तालिका बाहिर', dob: '2095-01-01' });

  assert.equal(bs.dobNepali, '2047-02-01', 'a BS date is kept exactly as typed');
  assert.equal(new Date(bs.dob).toDateString(), new Date(1990, 4, 15).toDateString(), '1 Jestha 2047 is 15 May 1990');
  assert.equal(old.dobNepali, '1975-03-10', 'an ancestor born before BS 2000 can be saved');
  assert.equal(older.dobNepali, '1890-05-15', 'and before BS 1970 too');
  assert.equal(beyond.dobNepali, null, 'no invented BS date outside the calendar table');

  for (const member of [bs, old, older, beyond]) {
    const before = await snapshot(member._id);
    assert.equal((await editMember(member._id, { occupation: 'Teacher' })).status, 200);
    assert.deepEqual(await snapshot(member._id), before, `${member.name} changed on edit`);
  }
});

// ---- Closing and reopening a family ------------------------------------------

test('a family can be closed and reopened, and a closed family takes no changes', async () => {
  const member = await addMember({ name: 'सदस्य' });

  const closed = await api.post(`/families/${familyId}/close`, { reason: 'जाँच' });
  assert.equal(closed.status, 200, JSON.stringify(closed.data));
  assert.equal(closed.data.family.status, 'closed');

  const blocked = await api.post('/members', toFormData({ ...formDefaults(), name: 'नयाँ' }));
  assert.equal(blocked.status, 403);
  assert.equal((await editMember(member._id, { occupation: 'Teacher' })).status, 403);
  assert.equal((await getTree()).count, 1, 'the tree of a closed family can still be viewed');

  const reopened = await api.post(`/families/${familyId}/reopen`);
  assert.equal(reopened.status, 200, JSON.stringify(reopened.data));
  assert.equal(reopened.data.family.status, 'open');
  assert.equal((await editMember(member._id, { occupation: 'Teacher' })).status, 200);
});
