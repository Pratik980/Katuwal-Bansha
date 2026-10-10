// src/utils/treeLabels.js
// Relationship text shown on family tree cards.

export const RELATIONSHIP_LABELS = {
  spouse: 'श्रीमान/श्रीमती', husband: 'श्रीमान', wife: 'श्रीमती',
  father: 'बुबा', mother: 'आमा', son: 'छोरा', daughter: 'छोरी',
  grandfather: 'हजुरबा', grandmother: 'हजुरआमा',
  grandson: 'नाति', granddaughter: 'नातिनी',
  brother: 'दाजु/भाइ', sister: 'दिदी/बहिनी',
  elderBrother: 'दाजु', youngerBrother: 'भाइ',
  elderSister: 'दिदी', youngerSister: 'बहिनी',
  member: 'सदस्य', lineage_head: 'घरमुली', lineage_member: 'सदस्य',
  family_head: 'घरमुली', child: 'सन्तान', parent: 'आमा/बुवा',
  sibling: 'दाजु/भाइ/दिदी/बहिनी', grandparent: 'हजुरबा/हजुरआमा',
  grandchild: 'नाति/नातिनी', other: 'अन्य',
};

const DEFAULT_RELATIONSHIPS = ['सदस्य', 'member', 'lineage_member'];

// A husband is never labelled "श्रीमती": the spouse label follows the person's own gender.
export const getSpouseLabel = (person) => {
  if (person?.gender === 'male') return 'श्रीमान्';
  if (person?.gender === 'female') return 'श्रीमती';
  return 'जीवनसाथी';
};

// The relationship chosen in Data Entry, or a sensible label when none was chosen.
export const getRelationLabel = (person) => {
  if (!person) return 'सदस्य';
  if (person.lineageRole === 'lineage_head') return 'घरमुली';

  const relationship = (person.relationship || '').trim();
  if (relationship && !DEFAULT_RELATIONSHIPS.includes(relationship)) {
    return RELATIONSHIP_LABELS[relationship] || relationship;
  }

  return person.isSpouseCard ? getSpouseLabel(person) : 'सदस्य';
};

// Any of the other dates (death, citizenship, passport ...) as it was typed in BS.
// Records saved before the BS text was kept hold those same BS digits in the date itself.
export const getBsDateLabel = (record, field) => {
  if (!record) return '';
  if (record[`${field}Nepali`]) return record[`${field}Nepali`];
  const value = record[field];
  if (!value) return '';
  return typeof value === 'string' ? value.slice(0, 10) : new Date(value).toISOString().slice(0, 10);
};

// Date of birth as entered (BS) when the record has it.
export const getBirthDateLabel = (person) => {
  if (person?.dobNepali) return person.dobNepali;
  if (!person?.dob) return '';
  const date = new Date(person.dob);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('ne-NP');
};
