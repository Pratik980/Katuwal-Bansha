// tests/nepaliCalendar.test.js
// BS <-> AD conversion: known dates, and the server and client tables staying identical.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bsToAd, adToBs, parseDateInput, getDaysInNepaliMonth } from '../utils/nepaliCalendar.js';
import * as client from '../../client/src/utils/nepaliDateConverter.js';

const iso = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// 1 Baisakh (BS new year) and a few other days whose AD date is well known
const KNOWN_DATES = {
  '1970-01-01': '1913-04-13',
  '2000-01-01': '1943-04-14',
  '2030-01-01': '1973-04-13',
  '2047-01-01': '1990-04-14',
  '2047-02-01': '1990-05-15',
  '2060-01-01': '2003-04-14',
  '2077-01-01': '2020-04-13',
  '2081-01-01': '2024-04-13',
  '2082-01-01': '2025-04-14',
  '2083-01-01': '2026-04-14',
  '2083-06-24': '2026-10-10',
};

test('known BS dates convert to the right AD date, and back', () => {
  Object.entries(KNOWN_DATES).forEach(([bs, ad]) => {
    const [year, month, day] = bs.split('-').map(Number);
    assert.equal(iso(bsToAd(year, month, day)), ad, `${bs} BS`);
    assert.equal(adToBs(new Date(...ad.split('-').map((part, i) => (i === 1 ? Number(part) - 1 : Number(part))))).formatted, bs, `${ad} AD`);
  });
});

test('every day from BS 1700 to 2090 survives a round trip, on server and client alike', () => {
  for (let year = 1700; year <= 2090; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      const length = getDaysInNepaliMonth(year, month);
      assert.equal(client.getDaysInNepaliMonth(year, month), length, `month length ${year}-${month}`);
      assert.ok(length >= 29 && length <= 32, `month length ${year}-${month} = ${length}`);

      for (const day of [1, length]) {
        const ad = bsToAd(year, month, day);
        assert.equal(iso(client.bsToAd(year, month, day)), iso(ad), `client and server differ on ${year}-${month}-${day}`);
        const back = adToBs(ad);
        assert.deepEqual([back.year, back.month, back.day], [year, month, day]);
      }
    }
  }
});

test('months follow each other without a gap or an overlap', () => {
  let previous = bsToAd(1700, 1, 1);
  for (let year = 1700; year <= 2090; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      const first = bsToAd(year, month, 1);
      if (year > 1700 || month > 1) {
        const lastOfPrevious = month === 1 ? [year - 1, 12] : [year, month - 1];
        const days = getDaysInNepaliMonth(...lastOfPrevious);
        assert.equal(Math.round((first - previous) / 86400000), days, `${lastOfPrevious.join('-')} -> ${year}-${month}`);
      }
      previous = first;
    }
  }
});

test('the form sends BS dates: before 2000 too, marked approximate before 1970', () => {
  assert.equal(iso(parseDateInput('2047-02-01').adDate), '1990-05-15');
  assert.equal(parseDateInput('2047-02-01').bsString, '2047-02-01');

  // an ancestor born in BS 1975
  assert.equal(iso(parseDateInput('1975-03-10').adDate), '1918-06-24');
  assert.equal(parseDateInput('1975-03-10').bsString, '1975-03-10');

  // no calendar table before 1970: still stored, within a day or two
  const old = parseDateInput('1890-05-15');
  assert.equal(old.bsString, '1890-05-15');
  assert.equal(old.adDate.getFullYear(), 1833);
  assert.equal(adToBs(old.adDate).approximate, true);
  assert.equal(adToBs(bsToAd(2050, 1, 1)).approximate, false);
});

test('dates outside the calendar are refused instead of guessed', () => {
  assert.equal(bsToAd(1699, 1, 1), null);
  assert.equal(bsToAd(2091, 1, 1), null);
  assert.equal(bsToAd(2050, 13, 1), null);
  assert.equal(adToBs(new Date(2040, 0, 1)), null);
  assert.equal(adToBs('not a date'), null);
  assert.deepEqual(parseDateInput('15 May 1990'), { adDate: null, bsString: null });
  assert.equal(parseDateInput('2095-01-01').bsString, null, 'year 2095 can only be AD, and is past the table');
});
