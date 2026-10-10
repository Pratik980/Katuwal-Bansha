// tests/appFixes.test.js
// The problems found in the app-wide audit, each with a test that fails without its fix.
// Run with: npm test   (in-memory MongoDB and a stand-in for Cloudinary)
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import XLSX from 'xlsx';
import {
  startTestApp, stopTestApp, resetDatabase, api, toFormData, tinyImage, cloudinaryCalls,
} from './helpers/testApp.js';

let Member;
let Family;
let familyId;

before(async () => {
  await startTestApp();
  ({ default: Member } = await import('../models/Member.js'));
  ({ default: Family } = await import('../models/Family.js'));
});

after(async () => {
  await stopTestApp();
});

beforeEach(async () => {
  await resetDatabase();
  const family = await api.post('/families', { familyName: 'कटुवाल परिवार', houseNumber: '12', vanshaGenerationNumber: '7' });
  assert.equal(family.status, 201, JSON.stringify(family.data));
  familyId = family.data._id;
});

// ---- helpers ---------------------------------------------------------------

const formDefaults = () => ({
  gender: 'male',
  dob: '2030-01-15',
  district: 'काठमाडौं',
  province: 'बागमती प्रदेश',
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

// Mirrors the edit form: every stored field is sent back, relations as ids,
// and a field the user emptied is sent as ''.
const editMember = async (id, changes = {}) => {
  const list = await api.get('/members?limit=1000');
  const row = list.data.data.find((m) => m._id === id);
  const fields = {};
  Object.entries(row).forEach(([key, value]) => {
    fields[key] = value && typeof value === 'object' && !Array.isArray(value) ? value._id : value;
  });
  if (row.dobNepali) fields.dob = row.dobNepali;
  ['dod', 'wifeDob', 'husbandDob'].forEach((field) => {
    if (row[`${field}Nepali`]) fields[field] = row[`${field}Nepali`];
  });
  const cleared = Object.keys(changes).filter((key) => changes[key] === '');
  return api.put(`/members/${id}`, toFormData({ ...fields, ...changes }, cleared));
};

const stored = (id) => Member.findById(id).lean();
const getTree = async () => (await api.get(`/families/${familyId}/tree`)).data;
const names = (list) => list.map((item) => item.name);
const sheetRows = async (path) => {
  const res = await api.raw(path);
  assert.equal(res.status, 200, `${path}: ${res.status}`);
  const workbook = XLSX.read(Buffer.from(await res.arrayBuffer()), { type: 'buffer' });
  return { res, workbook, rows: XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[workbook.SheetNames.length - 1]]) };
};

// ---- Documents tab and photos ----------------------------------------------

test('a member saves with files attached on the Documents tab', async () => {
  const member = await addMember({
    name: 'कागजात भएको',
    photo: tinyImage(),
    citizenshipFront: tinyImage(),
    birthCertificate: tinyImage(),
    marriageCertificate: tinyImage(),
    panCard: tinyImage(),
    voterId: tinyImage(),
    deathCertificate: tinyImage(),
  });

  const saved = await stored(member._id);
  assert.match(saved.photo, /\/family-members\//);
  for (const field of ['citizenshipFront', 'birthCertificate', 'marriageCertificate', 'deathCertificate', 'panCard', 'voterId']) {
    assert.match(saved[field], /\/documents\//, `${field} is stored`);
  }

  // ID cards and certificates keep enough detail to stay readable; the portrait stays small
  const sizeOf = (folder) => cloudinaryCalls.uploads.find((u) => u.folder === folder).transformation[0].width;
  assert.equal(sizeOf('family-members'), 500);
  assert.equal(sizeOf('documents'), 1600);
});

test('a replaced, removed or deleted photo is also removed from Cloudinary', async () => {
  const member = await addMember({ name: 'फोटो भएको', photo: tinyImage(), birthCertificate: tinyImage() });
  const first = (await stored(member._id)).photo;
  const firstId = first.split('/upload/v1/')[1].replace('.png', '');

  assert.equal((await editMember(member._id, { photo: tinyImage() })).status, 200);
  const second = (await stored(member._id)).photo;
  assert.notEqual(second, first);
  assert.deepEqual(cloudinaryCalls.destroyed, [firstId], 'the old photo is removed by its full id, folder included');

  // an edit that does not touch the photo keeps it
  assert.equal((await editMember(member._id, { occupation: 'Teacher' })).status, 200);
  assert.equal((await stored(member._id)).photo, second);
  assert.equal(cloudinaryCalls.destroyed.length, 1);

  // the photo removed on the form
  assert.equal((await editMember(member._id, { photo: '' })).status, 200);
  assert.equal((await stored(member._id)).photo, undefined);
  assert.equal(cloudinaryCalls.destroyed.length, 2);

  // deleting the member removes what is left (the birth certificate)
  assert.equal((await api.delete(`/members/${member._id}`)).status, 200);
  assert.equal(cloudinaryCalls.destroyed.length, 3);
  assert.match(cloudinaryCalls.destroyed[2], /^documents\//);
});

// ---- Search ----------------------------------------------------------------

test('searching with brackets, plus signs and other symbols works', async () => {
  await addMember({ name: 'राम (जेठो)', phone: '9841000000' });
  await addMember({ name: 'श्याम' });

  for (const text of ['(', '+977', '[', '*', '\\', 'राम (']) {
    const res = await api.get(`/members?search=${encodeURIComponent(text)}`);
    assert.equal(res.status, 200, `members search "${text}": ${JSON.stringify(res.data)}`);
  }
  assert.deepEqual(names((await api.get(`/members?search=${encodeURIComponent('(जेठो)')}`)).data.data), ['राम (जेठो)']);
  assert.deepEqual(names((await api.get('/members?search=9841')).data.data), ['राम (जेठो)']);

  assert.equal((await api.get(`/families?search=${encodeURIComponent('(')}`)).status, 200);
  assert.equal((await api.get(`/houses?search=${encodeURIComponent('+')}`)).status, 200);
  assert.equal((await api.get(`/search?query=${encodeURIComponent('((')}`)).status, 200);
  assert.equal((await api.get('/members/not-an-id')).status, 404);
});

// ---- Members filters -------------------------------------------------------

test('every filter of the Members page narrows the list', async () => {
  const other = await api.post('/families', { familyName: 'अर्को परिवार', houseNumber: '77' });
  await addMember({ name: 'घरमुली', lineageRole: 'lineage_head', vanshaGenerationNumber: '7' });
  await addMember({ name: 'मृत', isAlive: false, vanshaGenerationNumber: '9' });
  await addMember({ name: 'पोखरेली', district: 'कास्की', province: 'गण्डकी प्रदेश' });
  await addMember({ name: 'अर्को घरको', family: other.data._id });

  const list = async (query) => {
    const res = await api.get(`/members?limit=100&${query}`);
    assert.equal(res.status, 200, `${query}: ${JSON.stringify(res.data)}`);
    return names(res.data.data).sort();
  };

  assert.deepEqual(await list('house=77'), ['अर्को घरको'], 'house, by the number people type');
  assert.deepEqual(await list('house=12&status=deceased'), ['मृत']);
  assert.deepEqual(await list('house=999'), []);
  assert.deepEqual(await list('status=deceased'), ['मृत']);
  assert.equal((await list('status=active')).includes('मृत'), false);
  assert.deepEqual(await list('lineageRole=lineage_head'), ['घरमुली']);
  assert.deepEqual(await list('vanshaGenerationNumber=9'), ['मृत']);
  assert.deepEqual(await list(`district=${encodeURIComponent('कास्की')}`), ['पोखरेली']);
  assert.deepEqual(await list(`province=${encodeURIComponent('गण्डकी प्रदेश')}`), ['पोखरेली']);
  assert.deepEqual(await list('verificationStatus=verified'), []);
  assert.equal((await list('verificationStatus=pending')).length, 4);
  assert.deepEqual(await list('family=not-an-id'), []);

  // the list also carries what the table shows in its House and Family columns
  const row = (await api.get('/members?limit=100&house=77')).data.data[0];
  assert.equal(row.family.house.houseNumber, '77');
  assert.equal(row.family.familyNumber, '1');
});

// ---- Same phone / same name ------------------------------------------------

test('family members may share a phone number', async () => {
  const father = await addMember({ name: 'बुवा', phone: '9841000000' });
  const son = await addMember({ name: 'छोरा', phone: '9841000000', father: father._id });
  assert.equal(son.phone, '9841000000');
});

test('a second person with the same name is asked about, then accepted', async () => {
  const grandfather = await addMember({ name: 'रामबहादुर' });

  const first = await api.post('/members', toFormData({ ...formDefaults(), name: 'रामबहादुर', dob: '2075-01-01', father: grandfather._id }));
  assert.equal(first.status, 409);
  assert.equal(first.data.code, 'POSSIBLE_DUPLICATE');
  assert.equal(first.data.existingMember._id, grandfather._id);
  assert.equal(await Member.countDocuments(), 1, 'nothing is saved until the user confirms');

  const confirmed = await api.post('/members', toFormData({ ...formDefaults(), name: 'रामबहादुर', dob: '2075-01-01', father: grandfather._id, confirmDuplicate: true }));
  assert.equal(confirmed.status, 201, JSON.stringify(confirmed.data));
  assert.equal(await Member.countDocuments(), 2);

  // both can be edited afterwards without being asked again
  assert.equal((await editMember(grandfather._id, { occupation: 'Farmer' })).status, 200);
  assert.equal((await editMember(confirmed.data._id, { occupation: 'Student' })).status, 200);

  // renaming someone to a name already in the family asks once
  const other = await addMember({ name: 'हरि' });
  assert.equal((await editMember(other._id, { name: 'रामबहादुर' })).data.code, 'POSSIBLE_DUPLICATE');
  assert.equal((await editMember(other._id, { name: 'रामबहादुर', confirmDuplicate: true })).status, 200);
});

test('a citizenship number can belong to one member only', async () => {
  await addMember({ name: 'पहिलो', citizenshipNumber: '12-34-56' });
  const second = await api.post('/members', toFormData({ ...formDefaults(), name: 'दोस्रो', citizenshipNumber: '12-34-56', confirmDuplicate: true }));
  assert.equal(second.status, 409);
  assert.equal(second.data.code, 'DUPLICATE_CITIZENSHIP');
});

// ---- Family numbers --------------------------------------------------------

test('a house can hold more than ten families, each with its own number', async () => {
  const numbers = ['1'];
  const identifiers = [(await Family.findById(familyId).lean()).houseIdentifier];
  for (let i = 2; i <= 13; i += 1) {
    const res = await api.post('/families', { familyName: `परिवार ${i}`, houseNumber: '12' });
    assert.equal(res.status, 201, JSON.stringify(res.data));
    numbers.push(res.data.familyNumber);
    identifiers.push(res.data.houseIdentifier);
  }

  assert.deepEqual(numbers, Array.from({ length: 13 }, (_, i) => String(i + 1)));
  assert.deepEqual(identifiers, Array.from({ length: 13 }, (_, i) => `S${i + 1}`));
  assert.equal(await Family.countDocuments(), 13, 'every family that was reported as saved is really there');
  assert.equal((await api.get('/houses/next-number')).data.nextHouseNumber, '13');
});

test('the family list counts members and generations', async () => {
  const father = await addMember({ name: 'बुवा' });
  await addMember({ name: 'छोरा', father: father._id });
  const list = await api.get('/families?limit=1000');
  const family = list.data.data.find((f) => f._id === familyId);
  assert.equal(family.memberCount, 2);
  assert.equal(family.generationCount, 2);
});

// ---- Second wife, and undoing a wrong link ---------------------------------

test('a second wife is added from her own form and both wives stay beside the husband', async () => {
  const husband = await addMember({ name: 'श्रीमान', maritalStatus: 'married' });
  const first = await addMember({ name: 'जेठी', gender: 'female', maritalStatus: 'married', spouse: husband._id });
  const second = await addMember({ name: 'कान्छी', gender: 'female', maritalStatus: 'married', spouse: husband._id });

  const h = await stored(husband._id);
  assert.equal(String(h.spouse), first._id, 'the first wife stays his spouse');
  assert.deepEqual(h.wives.map(String).sort(), [first._id, second._id].sort());
  assert.equal(String((await stored(second._id)).husband), husband._id);

  const tree = await getTree();
  assert.equal(tree.data.length, 1);
  assert.deepEqual(names(tree.data[0].spouses).sort(), ['कान्छी', 'जेठी'].sort());
  assert.equal(tree.stats.placed, 3);

  // editing either wife changes nothing
  assert.equal((await editMember(second._id)).status, 200);
  assert.equal((await editMember(first._id)).status, 200);
  assert.equal(String((await stored(husband._id)).spouse), first._id);

  // a man still cannot take a woman who already has a husband
  const refused = await api.post('/members', toFormData({ ...formDefaults(), name: 'अर्को पुरुष', maritalStatus: 'married', spouse: first._id }));
  assert.equal(refused.status, 400);

  // removing the second wife leaves the first marriage whole
  assert.equal((await api.delete(`/members/${second._id}`)).status, 200);
  assert.equal(String((await stored(husband._id)).spouse), first._id);
  assert.deepEqual((await stored(husband._id)).wives.map(String), [first._id]);
});

test('a wrong father, spouse or value can be removed on the edit form', async () => {
  const wrongFather = await addMember({ name: 'गलत बुवा' });
  const child = await addMember({ name: 'बालक', father: wrongFather._id, occupation: 'Student', childBirthOrder: 2 });
  assert.equal(child.generation, 2);

  const res = await editMember(child._id, { father: '', occupation: '', childBirthOrder: '' });
  assert.equal(res.status, 200, JSON.stringify(res.data));

  const saved = await stored(child._id);
  assert.equal(saved.father, undefined);
  assert.equal(saved.occupation, '');
  assert.equal(saved.childBirthOrder, undefined);
  assert.deepEqual((await stored(wrongFather._id)).sons, []);
  assert.equal((await getTree()).data.length, 2, 'the child is no longer under that father');
});

test('a spouse removed on the form stays removed', async () => {
  const husband = await addMember({ name: 'राम', maritalStatus: 'married', wifeName: 'सीता' });
  const wife = await addMember({ name: 'सीता', gender: 'female' });
  assert.equal(String((await stored(husband._id)).spouse), wife._id, 'linked by the typed name');

  assert.equal((await editMember(husband._id, { spouse: '' })).status, 200);
  const [h, w] = await Promise.all([stored(husband._id), stored(wife._id)]);
  assert.equal(h.spouse, undefined);
  assert.equal(h.wife, undefined);
  assert.equal(w.spouse, undefined);
  assert.equal(w.husband, undefined);
  assert.equal(await Member.countDocuments(), 2, 'both people are still there');

  // saving either of them again does not link them back
  assert.equal((await editMember(husband._id, { occupation: 'Farmer' })).status, 200);
  assert.equal((await editMember(wife._id, { occupation: 'Teacher' })).status, 200);
  assert.equal((await stored(husband._id)).spouse, undefined);
  assert.equal((await getTree()).data.length, 2);
});

// ---- Status, verification, unknown name ------------------------------------

test('a member marked as not alive is deceased, and living again when corrected', async () => {
  const member = await addMember({ name: 'व्यक्ति', isAlive: false });
  assert.equal(member.status, 'deceased');

  assert.equal((await editMember(member._id, { isAlive: true })).status, 200);
  assert.equal((await stored(member._id)).status, 'active');

  assert.equal((await editMember(member._id, { isAlive: false })).status, 200);
  assert.equal((await stored(member._id)).status, 'deceased');
});

test('verification can be approved, rejected and set back to pending', async () => {
  const member = await addMember({ name: 'जाँच हुने' });
  assert.equal(member.verificationStatus, 'pending');

  for (const status of ['verified', 'rejected', 'pending']) {
    const res = await api.put(`/members/${member._id}/verification`, { status });
    assert.equal(res.status, 200);
    assert.equal(res.data.verificationStatus, status);
  }
  assert.equal((await api.put(`/members/${member._id}/verification`, { status: 'maybe' })).status, 400);
  assert.equal((await api.put('/members/not-an-id/verification', { status: 'verified' })).status, 404);

  // the member form does not undo an approval
  await api.put(`/members/${member._id}/verification`, { status: 'verified' });
  assert.equal((await editMember(member._id, { occupation: 'Farmer' })).status, 200);
  assert.equal((await stored(member._id)).verificationStatus, 'verified');
});

test('a person whose name is unknown is not given today as a birth date', async () => {
  const res = await api.post('/members', toFormData({ ...formDefaults(), dob: '', personStatus: 'unknown_name' }));
  assert.equal(res.status, 201, JSON.stringify(res.data));
  assert.equal(res.data.dob, null);
  assert.equal((await editMember(res.data._id, { occupation: 'Farmer' })).status, 200);
  assert.equal((await stored(res.data._id)).dob ?? null, null);
});

// ---- The other dates -------------------------------------------------------

test('date of death and the other dates are kept in BS and stored with the right AD date', async () => {
  const member = await addMember({
    name: 'मिति भएको',
    isAlive: false,
    dod: '2079-02-32',
    citizenshipIssueDate: '2047-02-01',
    passportExpiryDate: '2088-05-10',
  });

  const saved = await stored(member._id);
  assert.equal(saved.dodNepali, '2079-02-32', 'a 32nd day is accepted and kept');
  assert.equal(saved.dod.getFullYear(), 2022, 'BS 2079 is AD 2022, not AD 2079');
  assert.equal(saved.citizenshipIssueDateNepali, '2047-02-01');
  assert.equal(saved.citizenshipIssueDate.toDateString(), new Date(1990, 4, 15).toDateString());
  assert.equal(saved.passportExpiryDate.getFullYear(), 2031);

  // an edit that does not touch them changes nothing
  const before = JSON.stringify([saved.dod, saved.dodNepali, saved.citizenshipIssueDate, saved.passportExpiryDate]);
  assert.equal((await editMember(member._id, { occupation: 'Farmer' })).status, 200);
  const again = await stored(member._id);
  assert.equal(JSON.stringify([again.dod, again.dodNepali, again.citizenshipIssueDate, again.passportExpiryDate]), before);

  // and a date can be taken off again
  assert.equal((await editMember(member._id, { dod: '' })).status, 200);
  const cleared = await stored(member._id);
  assert.equal(cleared.dod, undefined);
  assert.equal(cleared.dodNepali, undefined);
});

// ---- Notifications ---------------------------------------------------------

test('notifications can be cleared: only the read ones, or all', async () => {
  await addMember({ name: 'एक' });
  await addMember({ name: 'दुई' });
  const list = await api.get('/notifications?limit=50');
  assert.equal(list.data.pagination.total, 3, 'one for the family and one per member');

  await api.put(`/notifications/${list.data.data[0]._id}/read`);
  const readOnly = await api.delete('/notifications?isRead=true');
  assert.equal(readOnly.data.deleted, 1);
  assert.equal((await api.get('/notifications')).data.pagination.total, 2);

  assert.equal((await api.delete('/notifications')).data.deleted, 2);
  assert.equal((await api.get('/notifications')).data.pagination.total, 0);

  // paging
  for (let i = 0; i < 5; i += 1) await api.post('/notifications', { type: 'general', title: `t${i}`, message: 'm' });
  const page2 = await api.get('/notifications?limit=2&page=2');
  assert.equal(page2.data.data.length, 2);
  assert.equal(page2.data.pagination.pages, 3);
});

// ---- Reports ---------------------------------------------------------------

test('reports: verification filter, Nepali family names, one family, and Export All with filters', async () => {
  const other = await api.post('/families', { familyName: 'Other Family', houseNumber: '77' });
  const father = await addMember({ name: 'बुवा', isAlive: false, dod: '2079-01-10' });
  const mother = await addMember({ name: 'आमा', gender: 'female', maritalStatus: 'married', spouse: father._id });
  const son = await addMember({ name: 'छोरा', father: father._id, mother: mother._id });
  await addMember({ name: 'बाहिरको', family: other.data._id });
  await api.put(`/members/${son._id}/verification`, { status: 'verified' });

  // pending / verified
  const pending = await api.get('/reports/members?format=json&verification=pending');
  assert.equal(pending.data.total, 3);
  const verified = await api.get('/reports/members?format=json&verification=verified');
  assert.deepEqual(names(verified.data.data.map((r) => ({ name: r.Name }))), ['छोरा']);
  assert.equal(verified.data.data[0].Verification, 'verified');
  assert.equal(verified.data.data[0]['Date of Birth (BS)'], '2030-01-15');
  assert.equal((await api.get('/reports/members?format=json&status=deceased')).data.total, 1);

  // a family with a Nepali name downloads, under its own name
  const familyReport = await sheetRows(`/reports/family?format=excel&familyId=${familyId}`);
  assert.deepEqual(familyReport.workbook.SheetNames, ['Family Info', 'Statistics', 'Generations', 'Members']);
  assert.equal(familyReport.rows.length, 3);
  const disposition = familyReport.res.headers.get('content-disposition');
  assert.match(disposition, /filename\*=UTF-8''/);
  assert.equal(decodeURIComponent(disposition.split("filename*=UTF-8''")[1]), 'कटुवाल परिवार-report.xlsx');
  assert.equal((await api.raw(`/reports/family?format=csv&familyId=${familyId}`)).status, 200);

  // one family's generation and demographic reports are not empty
  const generations = await api.get(`/reports/generation?format=json&familyId=${familyId}`);
  assert.deepEqual(generations.data.map((g) => [g.Generation, g['Total Members'], g.Deceased]), [[1, 2, 1], [2, 1, 0]]);
  const demographic = await api.get(`/reports/demographic?format=json&familyId=${familyId}`);
  assert.equal(demographic.data['Gender Distribution'].reduce((sum, g) => sum + g.count, 0), 3);
  assert.equal((await api.get('/reports/generation?format=json')).data.reduce((sum, g) => sum + g['Total Members'], 0), 4);

  // Export All follows the filters on screen
  assert.equal((await sheetRows('/reports/export/members')).rows.length, 4);
  const women = await sheetRows('/reports/export/members?gender=female');
  assert.deepEqual(women.rows.map((r) => r['Full Name']), ['आमा']);
  assert.equal(women.rows[0]['House Number'], '12');
  assert.equal((await sheetRows(`/reports/export/members?search=${encodeURIComponent('(')}`)).rows.length, 0);
  assert.equal((await sheetRows('/reports/export/members?house=77')).rows.length, 1);

  // family tree data, and the reports that used to fail outright
  const tree = await api.get(`/reports/export/family-tree?familyId=${familyId}`);
  assert.equal(tree.status, 200, JSON.stringify(tree.data));
  assert.equal(tree.data.treeData.length, 1);
  assert.equal(tree.data.treeData[0].spouses.length, 1);
  for (const path of ['/reports/donation?format=csv', '/reports/donation?format=excel', '/reports/genealogy?format=csv', '/reports/all-families?format=excel', '/reports/qr?format=excel', '/reports/demographic?format=excel', '/reports/generation?format=csv']) {
    assert.equal((await api.raw(path)).status, 200, path);
  }
});

// ---- Smaller things --------------------------------------------------------

test('the member lists for the form come in one light request', async () => {
  const father = await addMember({ name: 'बुवा', surname: 'कटुवाल' });
  const res = await api.get('/members/options');
  assert.equal(res.status, 200);
  assert.deepEqual(Object.keys(res.data.data[0]).sort(), ['_id', 'family', 'gender', 'memberNumber', 'name', 'surname']);
  assert.equal(res.data.data[0]._id, father._id);
});

test('moving a member to another family keeps both stored totals right', async () => {
  const other = await api.post('/families', { familyName: 'अर्को परिवार', houseNumber: '77' });
  const member = await addMember({ name: 'सर्ने' });
  await addMember({ name: 'बस्ने' });

  assert.equal((await editMember(member._id, { family: other.data._id })).status, 200);
  assert.equal((await Family.findById(familyId).lean()).totalMembers, 1);
  assert.equal((await Family.findById(other.data._id).lean()).totalMembers, 1);
});

test('a member number is not used up by a save that fails', async () => {
  const failed = await api.post('/members', toFormData({ ...formDefaults(), name: 'मिति बिना', dob: '' }));
  assert.equal(failed.status, 400);
  assert.equal((await addMember({ name: 'पहिलो' })).memberNumber, 'M0001');
});
