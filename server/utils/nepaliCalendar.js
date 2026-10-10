// utils/nepaliCalendar.js
// Bikram Sambat (BS) <-> Gregorian (AD) dates.
// The table is the same one the client uses (client/src/utils/nepaliDateConverter.js);
// tests/nepaliCalendar.test.js fails if the two ever drift apart.

const NEPALI_MONTHS = [
  'बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज',
  'कात्तिक', 'मंसिर', 'पुष', 'माघ', 'फाल्गुन', 'चैत',
];

// Days in each month of the BS years 1970 - 2090.
const CALENDAR = {
  1970: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  1971: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  1972: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  1973: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  1974: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  1975: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  1976: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  1977: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  1978: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  1979: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  1980: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  1981: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  1982: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  1983: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  1984: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  1985: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  1986: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  1987: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  1988: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  1989: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  1990: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  1991: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  1992: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  1993: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  1994: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  1995: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  1996: [31, 31, 32, 32, 31, 30, 29, 30, 30, 29, 30, 30],
  1997: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  1998: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  1999: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2000: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2001: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2002: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2003: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2004: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2005: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2006: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2007: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2008: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2009: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2010: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2011: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2012: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2013: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2014: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2015: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2016: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2017: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2018: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2019: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2020: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2021: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2022: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2023: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2024: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2025: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2026: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2027: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2028: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2029: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
  2030: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2031: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2032: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2033: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2034: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2035: [30, 32, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2036: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2037: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2038: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2039: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2040: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2041: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2042: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2043: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2044: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2045: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2046: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2047: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2048: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2049: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2050: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2051: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2052: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2053: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2054: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2055: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2056: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
  2057: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2058: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2059: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2060: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2061: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2062: [30, 32, 31, 32, 31, 31, 29, 30, 29, 30, 29, 31],
  2063: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2064: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2065: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2066: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2067: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2068: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2069: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2070: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2071: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2072: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2073: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2074: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2075: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2076: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2077: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2078: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2079: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2081: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2082: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2083: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
  2084: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
  2085: [31, 32, 31, 32, 30, 31, 30, 30, 29, 30, 30, 30],
  2086: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2087: [31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30],
  2088: [30, 31, 32, 32, 30, 31, 30, 30, 29, 30, 30, 30],
  2089: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2090: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
};

const FIRST_YEAR = 1970;
const LAST_YEAR = 2090;
const EARLIEST_YEAR = 1700;
const DAY = 86400000;
const FIRST_DAY = Date.UTC(1913, 3, 13) / DAY; // 1 Baisakh 1970 BS = 13 April 1913

// No table exists for years before 1970. Those use a typical year, which puts a
// date within a day or two of the true one: good enough to record an ancestor.
const TYPICAL_YEAR = [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30];
const MEAN_YEAR = 365.2562;

const yearStart = (() => {
  const starts = {};
  let day = FIRST_DAY;
  for (let year = FIRST_YEAR; year <= LAST_YEAR; year += 1) {
    starts[year] = day;
    day += CALENDAR[year].reduce((a, b) => a + b, 0);
  }
  starts[LAST_YEAR + 1] = day;
  return (year) => (year >= FIRST_YEAR ? starts[year] : FIRST_DAY - Math.round((FIRST_YEAR - year) * MEAN_YEAR));
})();

const monthLengths = (year) => {
  if (CALENDAR[year]) return CALENDAR[year];
  const months = [...TYPICAL_YEAR];
  months[11] += yearStart(year + 1) - yearStart(year) - 365;
  return months;
};

const pad = (number) => String(number).padStart(2, '0');

export const isBsYear = (year) => Number.isInteger(year) && year >= EARLIEST_YEAR && year <= LAST_YEAR;

// Dates before this BS year are approximate
export const isApproximateBsYear = (year) => year < FIRST_YEAR;

export const getDaysInNepaliMonth = (year, month) => {
  if (!isBsYear(year) || month < 1 || month > 12) return 30;
  return monthLengths(year)[month - 1];
};

export const bsToAd = (bsYear, bsMonth, bsDay) => {
  const [year, month, day] = [Number(bsYear), Number(bsMonth), Number(bsDay)];
  if (!isBsYear(year) || !(month >= 1 && month <= 12) || !(day >= 1 && day <= 32)) return null;

  let dayNumber = yearStart(year) + day - 1;
  for (let m = 0; m < month - 1; m += 1) dayNumber += monthLengths(year)[m];

  // Midnight in the local time zone, like every other date in the app
  const utc = new Date(dayNumber * DAY);
  return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
};

export const adToBs = (adDate) => {
  if (!adDate) return null;
  const date = adDate instanceof Date ? adDate : new Date(adDate);
  if (Number.isNaN(date.getTime())) return null;

  const dayNumber = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY;
  if (dayNumber < yearStart(EARLIEST_YEAR) || dayNumber >= yearStart(LAST_YEAR + 1)) return null;

  let year = dayNumber >= FIRST_DAY
    ? FIRST_YEAR + Math.floor((dayNumber - FIRST_DAY) / 366)
    : FIRST_YEAR - Math.ceil((FIRST_DAY - dayNumber) / MEAN_YEAR) - 1;
  while (yearStart(year + 1) <= dayNumber) year += 1;
  while (yearStart(year) > dayNumber) year -= 1;

  const months = monthLengths(year);
  let rest = dayNumber - yearStart(year);
  let month = 0;
  while (rest >= months[month]) {
    rest -= months[month];
    month += 1;
  }

  return {
    year,
    month: month + 1,
    day: rest + 1,
    formatted: `${year}-${pad(month + 1)}-${pad(rest + 1)}`,
    formattedNepali: `${NEPALI_MONTHS[month]} ${rest + 1}, ${year}`,
    approximate: isApproximateBsYear(year),
  };
};

// Reads a date sent by the Data Entry form.
// A plain YYYY-MM-DD is a BS date, which is what the form's date picker produces.
export const parseDateInput = (dateInput) => {
  if (!dateInput) return { adDate: null, bsString: null };

  if (dateInput instanceof Date) {
    return { adDate: dateInput, bsString: null };
  }

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    const match = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (!match) return { adDate: null, bsString: null };

    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);

    if (isBsYear(year)) {
      const adDate = bsToAd(year, month, day);
      return { adDate, bsString: adDate ? trimmed : null };
    }

    // Outside the BS range it can only be an AD date
    const adDate = new Date(year, month - 1, day);
    if (!Number.isNaN(adDate.getTime())) {
      return { adDate, bsString: adToBs(adDate)?.formatted || null };
    }
  }

  return { adDate: null, bsString: null };
};
