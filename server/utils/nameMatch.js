// utils/nameMatch.js
// Compares a spouse name typed as free text (wifeName / husbandName) with a member record.

const UNKNOWN_NAME = 'नाम अज्ञात';

export const normalizeName = (name) =>
  String(name || '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

export const namesMatch = (typedName, member) => {
  const typed = normalizeName(typedName);
  const name = normalizeName(member?.name);
  if (!typed || !name || name === UNKNOWN_NAME) return false;

  const fullName = normalizeName(`${member.name} ${member.surname || ''}`);

  return (
    typed === name ||
    typed === fullName ||
    typed.startsWith(`${name} `) ||
    name.startsWith(`${typed} `)
  );
};

// Names of spouses that were typed on a member instead of being linked to a member record.
export const typedSpouseNames = (member) => {
  if (!member) return [];
  const typed = [];

  if (member.gender === 'female') {
    if (member.husbandName) {
      typed.push({ name: member.husbandName, dob: member.husbandDob || null, gender: 'male' });
    }
  } else {
    if (member.wifeName) {
      typed.push({ name: member.wifeName, dob: member.wifeDob || null, gender: 'female' });
    }
    (member.wifeNames || []).forEach((wife) => {
      if (wife?.name) typed.push({ name: wife.name, dob: wife.dob || null, gender: 'female' });
    });
  }

  const seen = new Set();
  return typed.filter((entry) => {
    const key = normalizeName(entry.name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
