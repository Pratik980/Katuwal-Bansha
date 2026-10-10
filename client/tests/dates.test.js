// tests/dates.test.js
// The date box: what counts as a date, and what a card shows. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDateString, adToBs, bsToAd, getDaysInNepaliMonth, isApproximateBsYear, BS_YEAR_RANGE,
} from '../src/utils/nepaliDateConverter.js';
import { getBsDateLabel, getBirthDateLabel, getRelationLabel, getSpouseLabel } from '../src/utils/treeLabels.js';

const iso = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

test('what is typed in the date box is a BS date', () => {
  assert.deepEqual(parseDateString('2047-02-15'), { type: 'BS', year: 2047, month: 2, day: 15 });
  assert.deepEqual(parseDateString('2047-2-5'), { type: 'BS', year: 2047, month: 2, day: 5 });
  assert.deepEqual(parseDateString('1975/03/10'), { type: 'BS', year: 1975, month: 3, day: 10 });
  assert.equal(parseDateString('2031-02-32').day, 32, 'a month with 32 days accepts the 32nd');
});

test('a date that does not exist is refused', () => {
  assert.equal(parseDateString('2081-01-32'), null, 'Baisakh 2081 has 31 days');
  assert.equal(parseDateString('2081-13-01'), null);
  assert.equal(parseDateString('2081-00-10'), null);
  assert.equal(parseDateString('2081-01-00'), null);
  assert.equal(parseDateString(`${BS_YEAR_RANGE.max + 1}-01-01`), null);
  assert.equal(parseDateString(`${BS_YEAR_RANGE.min - 1}-01-01`), null);
  assert.equal(parseDateString('15 May 1990'), null);
  assert.equal(parseDateString(''), null);
  assert.equal(parseDateString(null), null);
});

test('an English date is read only when asked for', () => {
  assert.deepEqual(parseDateString('1990-05-15', 'AD'), { type: 'AD', year: 1990, month: 5, day: 15 });
  assert.equal(parseDateString('1990-02-30', 'AD'), null, '30 February does not exist');
  assert.equal(adToBs(new Date(1990, 4, 15)).formatted, '2047-02-01');
  assert.equal(iso(bsToAd(2047, 2, 1)), '1990-05-15');
});

test('known new-year days are right', () => {
  assert.equal(iso(bsToAd(2081, 1, 1)), '2024-04-13');
  assert.equal(iso(bsToAd(2083, 1, 1)), '2026-04-14');
  assert.equal(iso(bsToAd(2000, 1, 1)), '1943-04-14');
  assert.equal(getDaysInNepaliMonth(2081, 2), 32);
});

test('dates before BS 1970 are marked approximate', () => {
  assert.equal(isApproximateBsYear(1969), true);
  assert.equal(isApproximateBsYear(1970), false);
  assert.equal(adToBs(bsToAd(1890, 5, 15)).approximate, true);
  assert.equal(adToBs(bsToAd(1890, 5, 15)).formatted, '1890-05-15');
});

test('a card shows dates as they were typed', () => {
  assert.equal(getBirthDateLabel({ dobNepali: '2047-02-01', dob: '1990-05-14T18:15:00.000Z' }), '2047-02-01');
  assert.equal(getBirthDateLabel({}), '');
  assert.equal(getBsDateLabel({ dod: '2022-06-15T00:00:00.000Z', dodNepali: '2079-02-32' }, 'dod'), '2079-02-32');
  // a record saved before the BS text was kept: the date itself holds the BS digits
  assert.equal(getBsDateLabel({ dod: '2079-05-10T00:00:00.000Z' }, 'dod'), '2079-05-10');
  assert.equal(getBsDateLabel({}, 'dod'), '');
});

test('relationship labels follow the person, and a husband is never called wife', () => {
  assert.equal(getSpouseLabel({ gender: 'male' }), 'श्रीमान्');
  assert.equal(getSpouseLabel({ gender: 'female' }), 'श्रीमती');
  assert.equal(getRelationLabel({ lineageRole: 'lineage_head', relationship: 'छोरा' }), 'घरमुली');
  assert.equal(getRelationLabel({ relationship: 'बुहारी', isSpouseCard: true, gender: 'female' }), 'बुहारी');
  assert.equal(getRelationLabel({ relationship: 'सदस्य', isSpouseCard: true, gender: 'male' }), 'श्रीमान्');
  assert.equal(getRelationLabel({ relationship: '' }), 'सदस्य');
  assert.equal(getRelationLabel(null), 'सदस्य');
});
