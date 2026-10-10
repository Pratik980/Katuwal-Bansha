
import mongoose from 'mongoose';
import Member from '../models/Member.js';
import Family from '../models/Family.js';
import FamilyRelationship from '../models/FamilyRelationship.js';
import { io } from '../server.js';
import Notification from '../models/Notification.js';
import Counter from '../models/Counter.js';
import {
  linkSpouses,
  addWife,
  unlinkSpouses,
  forgetTypedSpouseName,
  repairSpouseLink,
  autoLinkSpouse,
  syncFamilyLinks,
  resolveGeneration,
} from '../services/relationshipService.js';
import { parseDateInput } from '../utils/nepaliCalendar.js';
import { escapeRegex } from '../utils/text.js';
import { deleteAsset } from '../utils/cloudinaryAssets.js';
import { buildMemberQuery } from '../utils/memberQuery.js';
import { PHOTO_FIELDS, FILE_FIELDS, BS_DATE_FIELDS, RELATION_FIELDS } from '../utils/memberFields.js';


const getNextMemberNumber = async () => {
  const counter = await Counter.findByIdAndUpdate(
    'memberNumber',
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `M${String(counter.seq).padStart(4, '0')}`;
};


const cleanArrayFields = (body) => {
  const arrayFields = [
    'sons', 'daughters', 'elderBrothers', 'youngerBrothers',
    'elderSisters', 'youngerSisters', 'grandsons', 'granddaughters',
    'sonInLaw', 'daughterInLaw'
  ];

  const cleaned = { ...body };
  arrayFields.forEach(field => {
    if (cleaned[field] !== undefined) {
      if (Array.isArray(cleaned[field])) {
        cleaned[field] = cleaned[field]
          .filter(id => id && typeof id === 'string' && id.trim() !== '')
          .map(id => id.trim());
      } else if (typeof cleaned[field] === 'string' && cleaned[field].trim() === '') {
        cleaned[field] = [];
      }
    }
  });
  return cleaned;
};


const cleanPhoneNumber = (phone) => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10 && cleaned.startsWith('9')) {
    return cleaned;
  }
  return phone;
};


const cleanFamilyId = (family) => {
  if (!family) return '';
  if (Array.isArray(family)) return family[0] || '';
  if (typeof family === 'object' && family !== null) {
    return family._id || family.id || '';
  }
  if (typeof family === 'string') return family;
  return String(family);
};


const isTrue = (value) => value === true || value === 'true';
const isFalse = (value) => value === false || value === 'false';

// Fixed-list fields: an empty choice from the form means "leave as it is"
const CHOICE_FIELDS = [
  'gender', 'bloodGroup', 'maritalStatus', 'lineageRole', 'parentRelationshipType',
  'generationMode', 'personStatus', 'status', 'verificationStatus',
];


// Someone with the same name already in this family. It may be the same person
// entered twice, or a grandson named after his grandfather: the form asks.
const findSameName = async ({ family, name, personStatus }, excludeId = null) => {
  if (!name || !name.trim() || personStatus === 'unknown_name') return null;
  return Member.findOne({
    family,
    name: { $regex: `^${escapeRegex(name.trim())}$`, $options: 'i' },
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  });
};

// A citizenship number belongs to one person only
const findCitizenshipOwner = async (citizenshipNumber, excludeId = null) => {
  if (!citizenshipNumber || !String(citizenshipNumber).trim()) return null;
  return Member.findOne({
    citizenshipNumber: String(citizenshipNumber).trim(),
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  });
};

const possibleDuplicate = (res, existing) =>
  res.status(409).json({
    success: false,
    code: 'POSSIBLE_DUPLICATE',
    message: `यो नामको व्यक्ति यस परिवारमा पहिले नै दर्ता छ: ${existing.name} (${existing.memberNumber})।`,
    existingMember: { _id: existing._id, name: existing.name, memberNumber: existing.memberNumber },
  });

const citizenshipTaken = (res, existing) =>
  res.status(409).json({
    success: false,
    code: 'DUPLICATE_CITIZENSHIP',
    message: `यो नागरिकता नम्बर अर्को सदस्यको हो: ${existing.name} (${existing.memberNumber})। कृपया जाँच गर्नुहोस्।`,
    existingMember: { _id: existing._id, name: existing.name, memberNumber: existing.memberNumber },
  });


// The other dates on the form are typed in BS like the date of birth.
// Each is stored as the AD date plus the BS text that was typed.
const applyBsDates = (body) => {
  BS_DATE_FIELDS.forEach((field) => {
    const value = body[field];
    if (typeof value !== 'string' || !/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(value.trim())) return;
    const parsed = parseDateInput(value);
    if (parsed.adDate) {
      body[field] = parsed.adDate;
      body[`${field}Nepali`] = parsed.bsString;
    }
  });
};


const getBanshaNumber = async (familyId, requestedBansha = null) => {

  if (requestedBansha && requestedBansha.trim() !== '') {
    return requestedBansha.trim();
  }

  const family = await Family.findById(familyId);
  return family?.vanshaGenerationNumber || null;
};


export const getMembers = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const query = await buildMemberQuery(req.query);

    const [members, total] = await Promise.all([
      Member.find(query)
        .populate({
          path: 'family',
          select: 'familyName familyNumber vanshaGenerationNumber house',
          populate: { path: 'house', select: 'houseNumber' },
        })
        .populate('father mother spouse', 'name photo memberNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Member.countDocuments(query),
    ]);

    res.json({
      data: members,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('getMembers Error:', error);
    res.status(500).json({ message: error.message });
  }
};


// Just enough of every member to fill the father / mother / spouse lists of the
// form, however many members there are.
export const getMemberOptions = async (req, res) => {
  try {
    const members = await Member.find()
      .select('name surname memberNumber gender family')
      .sort({ name: 1 })
      .lean();
    res.json({ data: members });
  } catch (error) {
    console.error('getMemberOptions Error:', error);
    res.status(500).json({ message: error.message });
  }
};


export const getMemberById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Member not found' });
    }

    const member = await Member.findById(req.params.id)
      .populate('family', 'familyName familyNumber vanshaGenerationNumber clan')
      .populate(
        'father mother husband wife spouse grandfather grandmother guardian fatherInLaw motherInLaw',
        'name photo memberNumber'
      )
      .populate(
        'sons daughters elderBrothers youngerBrothers elderSisters youngerSisters grandsons granddaughters sonInLaw daughterInLaw',
        'name photo memberNumber'
      );

    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    const memberObj = member.toObject();

    const relationships = await FamilyRelationship.find({
      $or: [
        { member: member._id },
        { relatedMember: member._id },
      ],
      isActive: true,
    }).populate('member relatedMember');

    res.json({
      ...memberObj,
      relationships,
    });
  } catch (error) {
    console.error('getMemberById Error:', error);
    res.status(500).json({ message: error.message });
  }
};


export const createMember = async (req, res) => {
  try {
    const files = req.files || {};
    const body = { ...req.body };
    const confirmDuplicate = isTrue(body.confirmDuplicate);
    delete body.confirmDuplicate;


    const familyId = cleanFamilyId(body.family);
    console.log('📝 Creating member with family ID:', familyId);

    if (!familyId) {
      return res.status(400).json({
        success: false,
        message: 'Family is required. Please select a family.',
      });
    }

    const family = await Family.findById(familyId);
    if (!family) {
      return res.status(404).json({
        success: false,
        message: 'Family not found. Please select a valid family.',
      });
    }

    if (family.status === 'closed') {
      return res.status(403).json({
        success: false,
        message: 'Family is closed. Please reopen to add members.'
      });
    }

    body.family = familyId;


    if (body.phone) {
      body.phone = cleanPhoneNumber(body.phone);
    }


    let dobAd = null;
    let dobNepali = null;

    if (body.dob) {
      const parsed = parseDateInput(body.dob);
      dobAd = parsed.adDate;
      dobNepali = parsed.bsString;
    }


    if (body.dobNepali && !dobNepali) {
      dobNepali = body.dobNepali;
      const parsed = parseDateInput(body.dobNepali);
      if (parsed.adDate) {
        dobAd = parsed.adDate;
      }
    }


    // A woman may be added as another wife of a man who is already married.
    // Any other choice of an already married person is refused.
    let joinsAsAnotherWife = false;
    if (body.spouse) {
      const chosen = await Member.findById(body.spouse).select('spouse gender');
      if (chosen?.spouse) {
        joinsAsAnotherWife = body.gender === 'female' && chosen.gender === 'male';
        if (!joinsAsAnotherWife) {
          return res.status(400).json({
            success: false,
            message: 'This person is already married to someone else. Remove existing spouse first.'
          });
        }
      }
    }


    const cleanedBody = cleanArrayFields(body);
    CHOICE_FIELDS.forEach((field) => {
      if (cleanedBody[field] === '') delete cleanedBody[field];
    });


    const citizenshipOwner = await findCitizenshipOwner(cleanedBody.citizenshipNumber);
    if (citizenshipOwner) {
      return citizenshipTaken(res, citizenshipOwner);
    }

    if (!confirmDuplicate) {
      const sameName = await findSameName({
        family: familyId,
        name: cleanedBody.name,
        personStatus: cleanedBody.personStatus,
      });
      if (sameName) {
        console.log('⚠️ Potential duplicate member found:', sameName.name);
        return possibleDuplicate(res, sameName);
      }
    }


    const vanshaNumber = await getBanshaNumber(familyId, cleanedBody.vanshaGenerationNumber);


    const personStatus = cleanedBody.personStatus || 'known';
    let memberName = cleanedBody.name;

    if (personStatus === 'unknown_name') {
      memberName = memberName || 'नाम अज्ञात';
    }


    const generationMode = cleanedBody.generationMode || 'auto';
    const generation = await resolveGeneration({
      mode: generationMode,
      submitted: cleanedBody.generation,
      father: cleanedBody.father,
      mother: cleanedBody.mother,
      spouse: cleanedBody.spouse,
    });

    applyBsDates(cleanedBody);

    const memberData = {
      ...cleanedBody,
      name: memberName,
      dob: dobAd,
      dobNepali,
      vanshaGenerationNumber: vanshaNumber,
      generation,
      generationMode,
      family: familyId,
      status: isFalse(cleanedBody.isAlive) ? 'deceased' : 'active',
      verificationStatus: 'pending',
      personStatus,
      createdBy: req.user?._id || null,
      updatedBy: req.user?._id || null,
    };

    PHOTO_FIELDS.forEach((field) => {
      memberData[field] = files[field]?.[0]?.path || null;
    });
    FILE_FIELDS.filter((field) => !PHOTO_FIELDS.includes(field)).forEach((field) => {
      if (files[field]?.[0]?.path) memberData[field] = files[field][0].path;
    });

    Object.keys(memberData).forEach(key => {
      if (memberData[key] === undefined) {
        delete memberData[key];
      }
    });

    // The member number is only taken once the record is known to be valid
    const member = new Member(memberData);
    await member.validate();
    member.memberNumber = await getNextMemberNumber();
    await member.save();

    // Relationships: link the chosen spouse, or find the one already in this family
    if (cleanedBody.spouse) {
      if (joinsAsAnotherWife) {
        await addWife(cleanedBody.spouse, member._id);
      } else {
        await linkSpouses(member._id, cleanedBody.spouse);
      }
    } else {
      await autoLinkSpouse(member._id);
    }
    await syncFamilyLinks(member);


    await Family.findByIdAndUpdate(familyId, {
      $inc: { totalMembers: 1 },
    });


    if (family.recalculateGenerations) {
      await family.recalculateGenerations();
    }

    const populatedMember = await Member.findById(member._id)
      .populate('family', 'familyName familyNumber vanshaGenerationNumber')
      .populate('spouse', 'name memberNumber');

    const notification = new Notification({
      type: 'member_added',
      title: 'New Member Added',
      message: `${member.name} (${member.memberNumber}) has been added to family ${family.familyName}.`,
      data: { memberId: member._id },
      createdBy: req.user?._id || null,
    });
    await notification.save();

    io.emit('member:created', populatedMember);
    io.emit('notification:new', notification);

    res.status(201).json(populatedMember);
  } catch (error) {
    console.error("❌ Create Member Error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Unknown Error",
      errors: error.errors || null,
    });
  }
};


export const updateMember = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Member not found' });
    }

    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    const body = { ...req.body };
    const confirmDuplicate = isTrue(body.confirmDuplicate);
    delete body.confirmDuplicate;


    if (body.family) {
      const familyId = cleanFamilyId(body.family);
      if (familyId) {
        const family = await Family.findById(familyId);
        if (!family) {
          return res.status(404).json({
            success: false,
            message: 'Family not found. Please select a valid family.',
          });
        }
        if (family.status === 'closed') {
          return res.status(403).json({
            success: false,
            message: 'Family is closed. Please reopen to update members.'
          });
        }
        body.family = familyId;
      }
    } else {
      delete body.family;
    }

    const currentFamily = await Family.findById(member.family);
    if (currentFamily && currentFamily.status === 'closed') {
      return res.status(403).json({
        success: false,
        message: 'Family is closed. Please reopen to update members.'
      });
    }

    const files = req.files || {};

    if (body.phone) {
      body.phone = cleanPhoneNumber(body.phone);
    }


    if (body.dob) {
      const parsed = parseDateInput(body.dob);
      if (parsed.adDate) {
        body.dob = parsed.adDate;
        body.dobNepali = parsed.bsString;
      }
    }

    // ---- What the form emptied: an empty value means "remove this" ----
    const unset = {};

    RELATION_FIELDS.forEach((field) => {
      if (body[field] === '') {
        unset[field] = 1;
        delete body[field];
      }
    });
    if (unset.spouse) {
      unset.husband = 1;
      unset.wife = 1;
      delete body.husband;
      delete body.wife;
    }

    BS_DATE_FIELDS.forEach((field) => {
      if (body[field] === '') {
        unset[field] = 1;
        unset[`${field}Nepali`] = 1;
        delete body[field];
        delete body[`${field}Nepali`];
      }
    });

    if (body.childBirthOrder === '') {
      unset.childBirthOrder = 1;
      delete body.childBirthOrder;
    }

    // A date of birth can only be removed from a person whose name is unknown
    if (body.dob === '') {
      delete body.dob;
      if ((body.personStatus || member.personStatus) === 'unknown_name') {
        unset.dob = 1;
        unset.dobNepali = 1;
        delete body.dobNepali;
      }
    }

    CHOICE_FIELDS.forEach((field) => {
      if (body[field] === '') delete body[field];
    });
    if (body.generation === '') delete body.generation;

    // A removed photo or document
    const removedFiles = FILE_FIELDS.filter((field) => body[field] === '' && !files[field]?.[0]?.path);
    removedFiles.forEach((field) => {
      unset[field] = 1;
    });

    // ---- Spouse ----
    const previousSpouseId = member.spouse ? String(member.spouse) : null;
    const newSpouseId = body.spouse ? String(body.spouse) : null;
    const spouseChanged = !!newSpouseId && newSpouseId !== previousSpouseId;

    let joinsAsAnotherWife = false;
    if (spouseChanged) {
      const chosen = await Member.findById(newSpouseId).select('spouse gender');
      if (chosen?.spouse && String(chosen.spouse) !== String(member._id)) {
        joinsAsAnotherWife = (body.gender || member.gender) === 'female' && chosen.gender === 'male';
        if (!joinsAsAnotherWife) {
          return res.status(400).json({
            success: false,
            message: 'This person is already married to someone else. Remove existing spouse first.'
          });
        }
      }
    }

    const cleanedBody = cleanArrayFields(body);


    // ---- Duplicates: only what this edit actually changed ----
    const newCitizenship = String(cleanedBody.citizenshipNumber || '').trim();
    if (newCitizenship && newCitizenship !== String(member.citizenshipNumber || '').trim()) {
      const citizenshipOwner = await findCitizenshipOwner(newCitizenship, member._id);
      if (citizenshipOwner) {
        return citizenshipTaken(res, citizenshipOwner);
      }
    }

    const newName = String(cleanedBody.name || '').trim();
    const nameOrFamilyChanged =
      (newName && newName.toLowerCase() !== String(member.name || '').trim().toLowerCase()) ||
      (cleanedBody.family && String(cleanedBody.family) !== String(member.family));
    if (nameOrFamilyChanged && !confirmDuplicate) {
      const sameName = await findSameName({
        family: cleanedBody.family || member.family,
        name: newName || member.name,
        personStatus: cleanedBody.personStatus || member.personStatus,
      }, member._id);
      if (sameName) {
        return possibleDuplicate(res, sameName);
      }
    }

    applyBsDates(cleanedBody);

    const updateData = {
      ...cleanedBody,
      updatedBy: req.user?._id || null,
    };

    // A new file replaces the stored one; otherwise the stored link is left alone
    const replacedFiles = [];
    FILE_FIELDS.forEach((field) => {
      const uploaded = files[field]?.[0]?.path;
      if (uploaded) {
        if (member[field]) replacedFiles.push(member[field]);
        updateData[field] = uploaded;
      } else {
        delete updateData[field];
      }
    });

    if (cleanedBody.isAlive !== undefined) {
      if (isFalse(cleanedBody.isAlive)) updateData.status = 'deceased';
      else if (member.status === 'deceased') updateData.status = 'active';
    }

    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const father = unset.father ? null : cleanedBody.father || member.father;
    const mother = unset.mother ? null : cleanedBody.mother || member.mother;
    const parentChanged =
      String(father || '') !== String(member.father || '') ||
      String(mother || '') !== String(member.mother || '');

    updateData.generation = await resolveGeneration({
      mode: cleanedBody.generationMode || member.generationMode || 'auto',
      submitted: cleanedBody.generation,
      current: member.generation || 1,
      father,
      mother,
      parentChanged: parentChanged && !!(father || mother),
    });


    const arrayFields = [
      'sons', 'daughters', 'elderBrothers', 'youngerBrothers',
      'elderSisters', 'youngerSisters', 'grandsons', 'granddaughters',
      'sonInLaw', 'daughterInLaw'
    ];

    arrayFields.forEach(field => {
      if (updateData[field] !== undefined) {
        if (!Array.isArray(updateData[field])) {
          updateData[field] = [];
        }
        updateData[field] = updateData[field]
          .filter(id => id && typeof id === 'string' && id.trim() !== '' && id.trim().length === 24)
          .map(id => id.trim());
      }
    });

    await Member.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
        returnDocument: 'after',
      }
    );

    if (Object.keys(unset).length > 0) {
      await Member.updateOne({ _id: member._id }, { $unset: unset });
    }

    // Files that are no longer used
    await Promise.all([
      ...replacedFiles.map((url) => deleteAsset(url)),
      ...removedFiles.filter((field) => member[field]).map((field) => deleteAsset(member[field])),
    ]);


    if (unset.spouse) {
      if (previousSpouseId) {
        await unlinkSpouses(member._id, previousSpouseId);
        await forgetTypedSpouseName(member._id, previousSpouseId);
      }
    } else if (spouseChanged) {
      if (previousSpouseId) {
        await unlinkSpouses(member._id, previousSpouseId);
      }
      if (joinsAsAnotherWife) {
        await addWife(newSpouseId, member._id);
      } else {
        await linkSpouses(member._id, newSpouseId);
      }
    } else if (previousSpouseId) {
      await repairSpouseLink(member._id);
    } else {
      await autoLinkSpouse(member._id);
    }

    const updatedMember = await Member.findById(member._id)
      .populate('family', 'familyName familyNumber vanshaGenerationNumber');

    // `member` is the record as it was before this edit
    await syncFamilyLinks(updatedMember, member);


    if (currentFamily && currentFamily.recalculateGenerations) {
      await currentFamily.recalculateGenerations();
    }

    // Keep each family's stored member total right when a member moves
    const newFamilyId = String(updatedMember.family?._id || updatedMember.family || '');
    if (newFamilyId && member.family && newFamilyId !== String(member.family)) {
      await Promise.all([
        Family.findByIdAndUpdate(member.family, { $inc: { totalMembers: -1 } }),
        Family.findByIdAndUpdate(newFamilyId, { $inc: { totalMembers: 1 } }),
      ]);
    }

    const notification = new Notification({
      type: "member_updated",
      title: "Member Updated",
      message: `${updatedMember.name}'s profile has been updated.`,
      data: { memberId: updatedMember._id },
      createdBy: req.user?._id || null,
    });

    await notification.save();

    io.emit("member:updated", updatedMember);
    io.emit("notification:new", notification);

    res.json(updatedMember);
  } catch (error) {
    console.error("❌ Update Member Error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Duplicate entry",
      });
    }

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


// Verified / pending / rejected, set from the Members list
export const updateVerification = async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!['verified', 'pending', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Verification status must be verified, pending or rejected' });
    }
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Member not found' });
    }

    const member = await Member.findByIdAndUpdate(
      req.params.id,
      { verificationStatus: status, updatedBy: req.user?._id || null },
      { new: true }
    ).populate('family', 'familyName familyNumber vanshaGenerationNumber');

    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    io.emit('member:updated', member);
    res.json(member);
  } catch (error) {
    console.error('updateVerification Error:', error);
    res.status(500).json({ message: error.message });
  }
};


export const deleteMember = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Member not found' });
    }

    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    const family = await Family.findById(member.family);
    if (family && family.status === 'closed') {
      return res.status(403).json({
        message: 'Family is closed. Please reopen to delete members.'
      });
    }

    await removeFromRelationships(member);

    if (member.family) {
      await Family.findByIdAndUpdate(member.family, {
        $inc: { totalMembers: -1 },
      });
    }

    await FamilyRelationship.deleteMany({
      $or: [
        { member: member._id },
        { relatedMember: member._id },
      ],
    });

    await Member.findByIdAndDelete(req.params.id);

    // The member's photo and documents go with the member
    await Promise.all(FILE_FIELDS.filter((field) => member[field]).map((field) => deleteAsset(member[field])));

    if (member.family) {
      const updatedFamily = await Family.findById(member.family);
      if (updatedFamily && updatedFamily.recalculateGenerations) {
        await updatedFamily.recalculateGenerations();
      }
    }

    const notification = new Notification({
      type: 'member_deleted',
      title: 'Member Deleted',
      message: `${member.name} has been removed from the system.`,
      data: { memberId: req.params.id },
      createdBy: req.user?._id || null,
    });
    await notification.save();

    io.emit('member:deleted', { id: req.params.id });
    io.emit('notification:new', notification);

    res.json({ message: 'Member deleted successfully' });
  } catch (error) {
    console.error('deleteMember Error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const searchMembers = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const members = await Member.find({
      $text: { $search: query },
    })
      .populate('family', 'familyName familyNumber')
      .sort({ score: { $meta: 'textScore' } })
      .limit(20);

    res.json(members);
  } catch (error) {
    console.error('searchMembers Error:', error);
    res.status(500).json({ message: error.message });
  }
};


export const getMembersByFamily = async (req, res) => {
  try {
    const { familyId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(familyId)) {
      return res.status(404).json({ message: 'Family not found' });
    }

    const family = await Family.findById(familyId);
    if (!family) {
      return res.status(404).json({ message: 'Family not found' });
    }

    const members = await Member.find({ family: familyId })
      .select('name surname photo gender dob dobNepali isAlive relationship generation generationMode memberNumber vanshaGenerationNumber lineageRole')
      .sort({ generation: 1, name: 1 });

    res.json({
      family: {
        id: family._id,
        name: family.familyName,
        number: family.familyNumber,
        vanshaGenerationNumber: family.vanshaGenerationNumber,
        totalGenerations: family.totalGenerations,
        status: family.status,
      },
      total: members.length,
      data: members,
    });
  } catch (error) {
    console.error('getMembersByFamily Error:', error);
    res.status(500).json({ message: error.message });
  }
};


export const getMemberStats = async (req, res) => {
  try {
    const [total, byGender, byStatus, byGeneration, byVansha] = await Promise.all([
      Member.countDocuments(),
      Member.aggregate([{ $group: { _id: '$gender', count: { $sum: 1 } } }]),
      Member.aggregate([{ $group: { _id: '$isAlive', count: { $sum: 1 } } }]),
      Member.aggregate([
        { $group: { _id: '$generation', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Member.aggregate([
        { $group: { _id: '$vanshaGenerationNumber', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $limit: 20 },
      ]),
    ]);

    res.json({
      total,
      byGender: byGender.reduce((acc, curr) => {
        acc[curr._id || 'unknown'] = curr.count;
        return acc;
      }, {}),
      byStatus: byStatus.reduce((acc, curr) => {
        acc[curr._id ? 'living' : 'deceased'] = curr.count;
        return acc;
      }, {}),
      byGeneration: byGeneration.map(g => ({
        generation: g._id || 'unknown',
        count: g.count,
      })),
      byVansha: byVansha.map(v => ({
        vansha: v._id || 'unknown',
        count: v.count,
      })),
    });
  } catch (error) {
    console.error('getMemberStats Error:', error);
    res.status(500).json({ message: error.message });
  }
};


// Before a member is deleted: every record that points to them lets go.
// Only records that really point to this member are touched.
const removeFromRelationships = async (member) => {
  const memberId = member._id;

  await Promise.all([
    Member.updateMany(
      { $or: [{ sons: memberId }, { daughters: memberId }] },
      { $pull: { sons: memberId, daughters: memberId } }
    ),
    Member.updateMany(
      { $or: [{ grandsons: memberId }, { granddaughters: memberId }] },
      { $pull: { grandsons: memberId, granddaughters: memberId } }
    ),
    Member.updateMany({ wives: memberId }, { $pull: { wives: memberId } }),
    ...['spouse', 'husband', 'wife', 'father', 'mother', 'grandfather', 'grandmother', 'guardian'].map((field) =>
      Member.updateMany({ [field]: memberId }, { $unset: { [field]: 1 } })
    ),
  ]);
};


export default {
  getMembers,
  getMemberOptions,
  getMemberById,
  createMember,
  updateMember,
  updateVerification,
  deleteMember,
  searchMembers,
  getMembersByFamily,
  getMemberStats,
};
