// services/relationshipService.js
// Keeps the two sides of every family relationship in step when a member is
// saved from Data Entry: husband <-> wife, parent <-> child, grandparent <-> grandchild.
//
// Nothing here deletes or recreates a member. Links are written with targeted
// $set / $addToSet / $pull updates so unrelated data on a record is never touched.

import Member from '../models/Member.js';
import { namesMatch, typedSpouseNames } from '../utils/nameMatch.js';

const SPOUSE_RELATIONSHIPS = ['श्रीमती', 'श्रीमान', 'श्रीमान्'];

const idOf = (ref) => {
  if (!ref) return null;
  if (typeof ref === 'object' && ref._id) return String(ref._id);
  return String(ref);
};

const sameId = (a, b) => !!idOf(a) && idOf(a) === idOf(b);

const isParentOrChild = (a, b) =>
  sameId(a.father, b._id) || sameId(a.mother, b._id) || sameId(b.father, a._id) || sameId(b.mother, a._id);

// ============================================================
// SPOUSES
// ============================================================

// A married-in spouse (no parents on record, generation never set) sits in the
// same generation as the partner who belongs to the lineage.
const generationToFollow = (self, partner) => {
  const partnerIsInLineage = partner.father || partner.mother || partner.lineageRole === 'lineage_head';
  const follows =
    self.generationMode !== 'manual' &&
    !self.father &&
    !self.mother &&
    (self.generation || 1) === 1 &&
    partnerIsInLineage &&
    (partner.generation || 1) > 1;
  return follows ? partner.generation : null;
};

// Links two existing members as husband and wife, in both directions.
export const linkSpouses = async (memberA, memberB) => {
  const [a, b] = await Promise.all([
    Member.findById(idOf(memberA)).lean(),
    Member.findById(idOf(memberB)).lean(),
  ]);

  if (!a || !b || sameId(a._id, b._id) || isParentOrChild(a, b)) return false;

  const updateFor = (self, partner) => {
    const set = { spouse: partner._id };
    const unset = {};

    const role =
      self.gender === 'male' && partner.gender === 'female'
        ? 'wife'
        : self.gender === 'female' && partner.gender === 'male'
          ? 'husband'
          : null;
    if (role) set[role] = partner._id;

    ['husband', 'wife'].forEach((field) => {
      if (field !== role && sameId(self[field], partner._id)) unset[field] = 1;
    });

    const isNewLink = !sameId(self.spouse, partner._id);
    if (isNewLink && (!self.maritalStatus || self.maritalStatus === 'single')) {
      set.maritalStatus = 'married';
    }

    const generation = generationToFollow(self, partner);
    if (generation !== null) set.generation = generation;

    return Object.keys(unset).length > 0 ? { $set: set, $unset: unset } : { $set: set };
  };

  await Promise.all([
    Member.updateOne({ _id: a._id }, updateFor(a, b)),
    Member.updateOne({ _id: b._id }, updateFor(b, a)),
  ]);

  console.log(`🔗 Linked spouses: ${a.name} ↔ ${b.name}`);
  return true;
};

// A man who already has a wife takes another one. His first wife stays his
// "spouse"; every wife is listed in "wives", and each wife points to him.
export const addWife = async (husbandRef, wifeRef) => {
  const [husband, wife] = await Promise.all([
    Member.findById(idOf(husbandRef)).lean(),
    Member.findById(idOf(wifeRef)).lean(),
  ]);
  if (!husband || !wife || sameId(husband._id, wife._id) || isParentOrChild(husband, wife)) return false;

  const set = { spouse: husband._id, husband: husband._id };
  if (!wife.maritalStatus || wife.maritalStatus === 'single') set.maritalStatus = 'married';
  const generation = generationToFollow(wife, husband);
  if (generation !== null) set.generation = generation;

  const wives = [husband.wife || husband.spouse, wife._id].filter(Boolean);
  await Promise.all([
    Member.updateOne({ _id: wife._id }, { $set: set }),
    Member.updateOne({ _id: husband._id }, { $addToSet: { wives: { $each: wives } } }),
  ]);

  console.log(`🔗 Added wife: ${husband.name} ↔ ${wife.name}`);
  return true;
};

// After two people are unlinked, a spouse name typed earlier that names the same
// person is dropped too. Otherwise the next save would link them straight back.
export const forgetTypedSpouseName = async (memberRef, formerSpouseRef) => {
  const [member, former] = await Promise.all([
    Member.findById(idOf(memberRef)).select('name surname wifeName husbandName').lean(),
    Member.findById(idOf(formerSpouseRef)).select('name surname wifeName husbandName').lean(),
  ]);
  if (!member || !former) return;

  const forget = async (holder, other) => {
    const unset = {};
    ['wifeName', 'husbandName'].forEach((field) => {
      if (holder[field] && namesMatch(holder[field], other)) unset[field] = 1;
    });
    if (unset.wifeName) unset.wifeDob = 1;
    if (unset.husbandName) unset.husbandDob = 1;
    if (Object.keys(unset).length > 0) await Member.updateOne({ _id: holder._id }, { $unset: unset });
  };
  await Promise.all([forget(member, former), forget(former, member)]);
};

// Completes a link that exists on one side only, unless the other person is
// already linked to someone else.
export const repairSpouseLink = async (memberRef) => {
  const member = await Member.findById(idOf(memberRef)).select('spouse').lean();
  if (!member?.spouse) return false;

  const partner = await Member.findById(member.spouse).select('spouse').lean();
  if (!partner || (partner.spouse && !sameId(partner.spouse, member._id))) return false;

  return linkSpouses(member._id, partner._id);
};

// Removes the link between two members, in both directions. Both records are kept.
export const unlinkSpouses = async (memberA, memberB) => {
  const aId = idOf(memberA);
  const bId = idOf(memberB);
  if (!aId || !bId) return;

  const pairs = [
    [aId, bId],
    [bId, aId],
  ];
  await Promise.all(
    pairs.flatMap(([selfId, partnerId]) => [
      ...['spouse', 'husband', 'wife'].map((field) =>
        Member.updateOne({ _id: selfId, [field]: partnerId }, { $unset: { [field]: 1 } })
      ),
      Member.updateOne({ _id: selfId, wives: partnerId }, { $pull: { wives: partnerId } }),
    ])
  );
};

// People who share an ancestor on record (parent, sibling, cousin, ...) are never spouses.
const buildAncestry = (familyMembers) => {
  const byId = new Map(familyMembers.map((m) => [String(m._id), m]));
  const cache = new Map();

  const ancestorsOf = (id) => {
    if (cache.has(id)) return cache.get(id);
    const result = new Set([id]);
    cache.set(id, result);
    const person = byId.get(id);
    if (person) {
      [idOf(person.father), idOf(person.mother)].filter(Boolean).forEach((parentId) => {
        ancestorsOf(parentId).forEach((ancestorId) => result.add(ancestorId));
      });
    }
    return result;
  };

  return (aId, bId) => {
    const ancestorsOfB = ancestorsOf(String(bId));
    return [...ancestorsOf(String(aId))].some((id) => ancestorsOfB.has(id));
  };
};

// When a married member has no linked spouse yet, looks for the spouse who is
// already in the same family (entered earlier, or named as free text) and links
// them instead of leaving two unconnected cards in the tree.
export const autoLinkSpouse = async (memberRef) => {
  const member = await Member.findById(idOf(memberRef)).lean();
  if (!member || member.spouse || !member.family) return null;

  const familyMembers = await Member.find({ family: member.family })
    .select(
      'name surname gender father mother spouse maritalStatus lineageRole relationship vanshaGenerationNumber wifeName wifeNames husbandName'
    )
    .lean();

  const areRelated = buildAncestry(familyMembers);

  const eligible = familyMembers.filter(
    (candidate) =>
      !sameId(candidate._id, member._id) &&
      !candidate.spouse &&
      candidate.gender !== member.gender &&
      !areRelated(member._id, candidate._id)
  );

  // 1. By name: this member names the spouse, or the spouse names this member.
  const namedByMember = typedSpouseNames(member);
  const byName = eligible.filter(
    (candidate) =>
      namedByMember.some((typed) => namesMatch(typed.name, candidate)) ||
      typedSpouseNames(candidate).some((typed) => namesMatch(typed.name, member))
  );

  let partner = byName.length === 1 ? byName[0] : null;

  // 2. A member entered as "श्रीमती / श्रीमान्" joins the only married, still unlinked
  //    person of the same vansha number.
  if (!partner && byName.length === 0 && SPOUSE_RELATIONSHIPS.includes(member.relationship)) {
    const byVansha = eligible.filter(
      (candidate) =>
        String(candidate.vanshaGenerationNumber || '') === String(member.vanshaGenerationNumber || '') &&
        (candidate.maritalStatus === 'married' || candidate.lineageRole === 'lineage_head') &&
        typedSpouseNames(candidate).length === 0
    );
    if (byVansha.length === 1) partner = byVansha[0];
  }

  if (!partner) return null;

  const linked = await linkSpouses(member._id, partner._id);
  return linked ? partner : null;
};

// ============================================================
// PARENTS, CHILDREN, GRANDPARENTS
// ============================================================

const listedChildren = (member) =>
  [...(member?.sons || []), ...(member?.daughters || [])].map(idOf).filter(Boolean);

// `previous` is the member as it was before an edit; omit it for a new member.
// Only links that actually changed are rewritten.
export const syncFamilyLinks = async (member, previous = null) => {
  const memberId = member._id;
  const isMale = member.gender === 'male';

  // ---- This member in their parents' sons / daughters ----
  const childField = isMale ? 'sons' : 'daughters';
  const otherChildField = isMale ? 'daughters' : 'sons';
  const parents = [idOf(member.father), idOf(member.mother)].filter(Boolean);
  const previousParents = previous ? [idOf(previous.father), idOf(previous.mother)].filter(Boolean) : [];
  const droppedParents = previousParents.filter((id) => !parents.includes(id));

  if (droppedParents.length > 0) {
    await Member.updateMany(
      { _id: { $in: droppedParents } },
      { $pull: { sons: memberId, daughters: memberId } }
    );
  }
  if (parents.length > 0) {
    await Member.updateMany(
      { _id: { $in: parents } },
      { $addToSet: { [childField]: memberId }, $pull: { [otherChildField]: memberId } }
    );
  }

  // ---- Children picked on this member's own form ----
  const parentField = isMale ? 'father' : member.gender === 'female' ? 'mother' : null;
  if (parentField) {
    const children = listedChildren(member).filter((id) => id !== String(memberId));
    const previousChildren = listedChildren(previous);
    const added = children.filter((id) => !previousChildren.includes(id));
    const removed = previousChildren.filter((id) => !children.includes(id));

    if (added.length > 0) {
      await Member.updateMany({ _id: { $in: added } }, { $set: { [parentField]: memberId } });
      // A child whose generation was never set moves one below this parent
      await Member.updateMany(
        { _id: { $in: added }, generationMode: { $ne: 'manual' }, generation: { $in: [1, null] } },
        { $set: { generation: (member.generation || 1) + 1 } }
      );
    }
    if (removed.length > 0) {
      await Member.updateMany(
        { _id: { $in: removed }, [parentField]: memberId },
        { $unset: { [parentField]: 1 } }
      );
    }
  }

  // ---- Grandparents ----
  const grandchildField = isMale ? 'grandsons' : 'granddaughters';
  for (const field of ['grandfather', 'grandmother']) {
    const current = idOf(member[field]);
    const before = previous ? idOf(previous[field]) : null;

    if (before && before !== current) {
      await Member.updateOne({ _id: before }, { $pull: { grandsons: memberId, granddaughters: memberId } });
    }
    if (current) {
      await Member.updateOne({ _id: current }, { $addToSet: { [grandchildField]: memberId } });
    }
  }
};

// ============================================================
// GENERATION
// ============================================================

// Auto mode: one below the parent; a new member with no parent on record starts
// level with their spouse. A number the user typed, and a number already stored
// on an existing member, are kept. `current` is null for a new member.
export const resolveGeneration = async ({
  mode = 'auto',
  submitted,
  current = null,
  father,
  mother,
  spouse,
  parentChanged = false,
}) => {
  const typed = Number(submitted) > 0 ? Number(submitted) : null;
  const isNew = current === null;

  if (mode === 'manual') return typed ?? current ?? 1;

  const userTyped = typed !== null && typed !== 1 && typed !== current;
  if (userTyped) return typed;

  let derived = null;
  const parentId = idOf(father) || idOf(mother);
  if (parentId) {
    const parent = await Member.findById(parentId).select('generation').lean();
    if (parent) derived = (parent.generation || 1) + 1;
  } else if (isNew && idOf(spouse)) {
    const partner = await Member.findById(idOf(spouse)).select('generation').lean();
    if (partner) derived = partner.generation || 1;
  }

  const stored = typed ?? current;
  if (derived !== null && (isNew || parentChanged || stored === 1)) return derived;

  return stored ?? 1;
};
