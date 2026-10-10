// utils/lineageTree.js
// Turns a flat list of members into the forest drawn by the Family Tree pages.
//
// Every person is placed exactly once: either as the main card of a node, or as
// a spouse card beside it. A node is one "couple unit" (a person plus their
// spouses) and its children are the children of anyone in that unit.

import { typedSpouseNames } from './nameMatch.js';

const idOf = (ref) => {
  if (!ref) return null;
  if (typeof ref === 'object' && ref._id) return String(ref._id);
  return String(ref);
};

const timeOf = (value) => {
  const time = value ? new Date(value).getTime() : NaN;
  return Number.isNaN(time) ? Infinity : time;
};

const compareSiblings = (a, b) => {
  const orderA = Number(a.data.childBirthOrder) > 0 ? Number(a.data.childBirthOrder) : Infinity;
  const orderB = Number(b.data.childBirthOrder) > 0 ? Number(b.data.childBirthOrder) : Infinity;
  if (orderA !== orderB) return orderA - orderB;

  const dobA = timeOf(a.data.dob);
  const dobB = timeOf(b.data.dob);
  if (dobA !== dobB) return dobA - dobB;

  const createdA = timeOf(a.data.createdAt);
  const createdB = timeOf(b.data.createdAt);
  if (createdA !== createdB) return createdA - createdB;

  return a.id < b.id ? -1 : 1;
};

export const buildFamilyTree = (members = [], options = {}) => {
  const { externalMembers = [], familyHeadId = null } = options;
  const headId = idOf(familyHeadId);

  const people = new Map();
  const addPerson = (data, inFamily) => {
    const id = idOf(data);
    if (!id || people.has(id)) return;
    people.set(id, { id, data, inFamily, parents: new Set(), children: new Set(), partners: new Set() });
  };
  members.forEach((m) => m && addPerson(m, true));
  externalMembers.forEach((m) => m && addPerson(m, false));

  const familyPeople = [...people.values()].filter((p) => p.inFamily);

  // ---- Parent -> child links (only between members of this family) ----
  const addParent = (childId, parentId) => {
    const child = people.get(childId);
    const parent = people.get(parentId);
    if (!child || !parent || child === parent || !child.inFamily || !parent.inFamily) return;
    child.parents.add(parent.id);
    parent.children.add(child.id);
  };

  familyPeople.forEach((p) => {
    addParent(p.id, idOf(p.data.father));
    addParent(p.id, idOf(p.data.mother));
  });

  // Older records sometimes only list the child on the parent (sons / daughters).
  familyPeople.forEach((p) => {
    [...(p.data.sons || []), ...(p.data.daughters || [])].forEach((childRef) => {
      const child = people.get(idOf(childRef));
      if (child && !child.data.father && !child.data.mother) addParent(child.id, p.id);
    });
  });

  // ---- Husband <-> wife links (either direction counts) ----
  const addPartner = (aId, bId) => {
    const a = people.get(aId);
    const b = people.get(bId);
    if (!a || !b || a === b || (!a.inFamily && !b.inFamily)) return;
    // A parent and their own child are never drawn as a couple.
    if (a.parents.has(b.id) || b.parents.has(a.id)) return;
    a.partners.add(b.id);
    b.partners.add(a.id);
  };

  people.forEach((p) => {
    [p.data.spouse, p.data.husband, p.data.wife, ...(p.data.wives || [])].forEach((ref) =>
      addPartner(p.id, idOf(ref))
    );
  });

  // The father and mother named on the same child are a couple even if nobody linked them.
  familyPeople.forEach((p) => {
    const fatherId = idOf(p.data.father);
    const motherId = idOf(p.data.mother);
    if (fatherId && motherId && p.parents.has(fatherId) && p.parents.has(motherId)) {
      addPartner(fatherId, motherId);
    }
  });

  // ---- Couple units: who is the main card and who stands beside them ----
  const isHead = (p) => p.id === headId || p.data.lineageRole === 'lineage_head';
  const score = (p) =>
    (p.parents.size > 0 ? 100 : 0) +
    (isHead(p) ? 50 : 0) +
    (p.data.lineageRole === 'spouse' ? -20 : 0) +
    Math.min(p.partners.size, 4) * 5 +
    (p.data.gender === 'male' ? 2 : 0);

  const byScore = [...familyPeople].sort((a, b) => score(b) - score(a) || compareSiblings(a, b));

  const unitOf = new Map();
  const units = [];
  byScore.forEach((primary) => {
    if (unitOf.has(primary.id)) return;
    const unit = { primary, partners: [], parentUnit: null, childUnits: [] };
    unitOf.set(primary.id, unit);
    [...primary.partners]
      .map((id) => people.get(id))
      .sort(compareSiblings)
      .forEach((partner) => {
        if (unitOf.has(partner.id)) return;
        unit.partners.push(partner);
        unitOf.set(partner.id, unit);
      });
    units.push(unit);
  });

  // ---- One home per child: under the father's node, otherwise the mother's ----
  const isDescendantOf = (unit, ancestor) => {
    for (let current = unit; current; current = current.parentUnit) {
      if (current === ancestor) return true;
    }
    return false;
  };

  units.forEach((unit) => {
    const child = unit.primary;
    const preferred = [idOf(child.data.father), idOf(child.data.mother), ...child.parents];
    for (const parentId of preferred) {
      if (!parentId || !child.parents.has(parentId)) continue;
      const parentUnit = unitOf.get(parentId);
      // Guards against broken data where two people are each other's ancestor.
      if (!parentUnit || parentUnit === unit || isDescendantOf(parentUnit, unit)) continue;
      unit.parentUnit = parentUnit;
      parentUnit.childUnits.push(unit);
      break;
    }
  });

  const sizeOf = (unit) =>
    1 + unit.partners.length + unit.childUnits.reduce((sum, child) => sum + sizeOf(child), 0);

  const roots = units
    .filter((unit) => !unit.parentUnit)
    .map((unit) => ({ unit, size: sizeOf(unit) }))
    .sort(
      (a, b) =>
        Number(isHead(b.unit.primary)) - Number(isHead(a.unit.primary)) ||
        (a.unit.primary.data.generation || 1) - (b.unit.primary.data.generation || 1) ||
        b.size - a.size ||
        compareSiblings(a.unit.primary, b.unit.primary)
    )
    .map(({ unit }) => unit);

  // ---- Output ----
  let placed = 0;
  let couples = 0;

  const toNode = (unit, level) => {
    const { primary } = unit;

    const spouses = unit.partners.map((partner) => ({
      ...partner.data,
      _id: partner.id,
      level,
      isSpouseCard: true,
      isExternal: !partner.inFamily,
      partnerOf: primary.id,
    }));

    // A spouse who was only typed as a name still gets a card, until a member record is linked.
    if (unit.partners.length === 0) {
      typedSpouseNames(primary.data).forEach((typed, index) => {
        spouses.push({
          _id: `placeholder-${primary.id}-${index}`,
          name: typed.name,
          gender: typed.gender,
          dob: typed.dob,
          generation: primary.data.generation,
          isAlive: true,
          level,
          isSpouseCard: true,
          isPlaceholder: true,
          partnerOf: primary.id,
        });
      });
    }

    placed += 1 + unit.partners.filter((partner) => partner.inFamily).length;
    if (spouses.length > 0) couples += 1;

    return {
      ...primary.data,
      _id: primary.id,
      level,
      spouses,
      children: [...unit.childUnits]
        .sort((a, b) => compareSiblings(a.primary, b.primary))
        .map((child) => toNode(child, level + 1)),
    };
  };

  const tree = roots.map((unit) => toNode(unit, 0));

  return {
    roots: tree,
    stats: { members: familyPeople.length, placed, couples, roots: tree.length },
  };
};

export default buildFamilyTree;
