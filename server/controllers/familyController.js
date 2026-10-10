import Family from '../models/Family.js';
import House from '../models/House.js';
import Member from '../models/Member.js';
import { io } from '../server.js';
import Notification from '../models/Notification.js';
import { buildFamilyTree } from '../utils/lineageTree.js';
import { containsText, escapeRegex } from '../utils/text.js';
import { deleteAsset } from '../utils/cloudinaryAssets.js';


export const getFamilies = async (req, res) => {
  try {
    const { page = 1, limit = 1000, search, house } = req.query; // Increased limit for dropdown
    const skip = (page - 1) * limit;

    let query = {};
    if (search) {
      const text = containsText(search);
      query = {
        $or: [
          { familyName: text },
          { familyNumber: text },
          { clan: text },
          { vanshaGenerationNumber: text },
        ],
      };
    }
    if (house) {
      query.house = house;
    }

    const [families, total] = await Promise.all([
      Family.find(query)
        .populate('house', 'houseNumber houseName')
        .populate('familyHead', 'name photo memberNumber')
        .populate('headOfFamily', 'name photo memberNumber')
        .sort({ house: 1, familyNumber: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Family.countDocuments(query),
    ]);

 
    const counts = await Member.aggregate([
      { $match: { family: { $in: families.map((family) => family._id) } } },
      { $group: { _id: '$family', memberCount: { $sum: 1 }, generations: { $addToSet: '$generation' } } },
    ]);
    const countsByFamily = new Map(counts.map((entry) => [String(entry._id), entry]));

    const familiesWithCounts = families.map((family) => {
      const familyObj = family.toObject();
      const entry = countsByFamily.get(String(family._id));

      if (familyObj.house && familyObj.house.houseIdentifier) {
        familyObj.houseIdentifier = familyObj.house.houseIdentifier;
      } else if (!familyObj.houseIdentifier) {
        familyObj.houseIdentifier = familyObj.houseIdentifier || null;
      }

      return {
        ...familyObj,
        memberCount: entry?.memberCount || 0,
        generationCount: entry?.generations.length || 0,
      };
    });

    res.json({
      data: familiesWithCounts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('getFamilies Error:', error);
    res.status(500).json({ message: error.message });
  }
};


export const getFamilyTreeByFamily = async (req, res) => {
  try {
    const { familyId } = req.params;

    if (!familyId) {
      return res.status(400).json({
        success: false,
        message: 'Family ID is required',
      });
    }

    const family = await Family.findById(familyId).populate('house', 'houseNumber houseName');

    if (!family) {
      return res.status(404).json({
        success: false,
        message: 'Family not found',
      });
    }

    const members = await Member.find({ family: familyId })
      .populate({
        path: 'father',
        select: 'name photo memberNumber vanshaGenerationNumber generation gender isAlive',
      })
      .populate({
        path: 'mother',
        select: 'name photo memberNumber vanshaGenerationNumber generation gender isAlive',
      })
      .populate({
        path: 'spouse',
        select: 'name photo memberNumber vanshaGenerationNumber generation gender isAlive',
      })
      .populate({
        path: 'grandfather',
        select: 'name photo memberNumber vanshaGenerationNumber generation gender isAlive',
      })
      .populate({
        path: 'grandmother',
        select: 'name photo memberNumber vanshaGenerationNumber generation gender isAlive',
      })
      .populate({
        path: 'guardian',
        select: 'name photo memberNumber vanshaGenerationNumber generation gender isAlive',
      })
      .lean();

    // A husband or wife who is registered under another family still belongs beside their spouse
    const familyIds = members.map((m) => m._id);
    const inFamily = new Set(familyIds.map(String));
    const linkedIds = members
      .flatMap((m) => [m.spouse, m.husband, m.wife, ...(m.wives || [])])
      .map((ref) => ref?._id || ref)
      .filter((id) => id && !inFamily.has(String(id)));

    const externalMembers = await Member.find({
      family: { $ne: familyId },
      $or: [
        { _id: { $in: linkedIds } },
        { spouse: { $in: familyIds } },
        { husband: { $in: familyIds } },
        { wife: { $in: familyIds } },
        { wives: { $in: familyIds } },
      ],
    })
      .select(
        'name surname photo memberNumber vanshaGenerationNumber generation gender isAlive dob dobNepali dod relationship lineageRole personStatus maritalStatus family spouse husband wife wives'
      )
      .lean();

    const { roots: treeData, stats } = buildFamilyTree(members, {
      externalMembers,
      familyHeadId: family.familyHead,
    });

    res.status(200).json({
      success: true,
      count: members.length,
      data: treeData,
      stats,
      family: {
        id: family._id,
        name: family.familyName,
        number: family.familyNumber,
        vanshaGenerationNumber: family.vanshaGenerationNumber,
        status: family.status,
      },
    });
  } catch (error) {
    console.error('Family Tree Error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const getFamilyById = async (req, res) => {
  try {
    const family = await Family.findById(req.params.id)
      .populate('house', 'houseNumber houseName')
      .populate('familyHead', 'name photo memberNumber phone email')
      .populate('headOfFamily', 'name photo memberNumber phone email');

    if (!family) {
      return res.status(404).json({ message: 'Family not found' });
    }

    const members = await Member.find({ family: family._id })
      .select(
        'name photo memberNumber vanshaGenerationNumber gender dob isAlive generation relationship'
      )
      .sort({ createdAt: -1 })
      .limit(100);

    const memberCount = await Member.countDocuments({ family: family._id });
    const generations = await Member.distinct('generation', { family: family._id });

    res.json({
      ...family.toObject(),
      members,
      memberCount,
      generationCount: generations.length,
    });
  } catch (error) {
    console.error('getFamilyById Error:', error);
    res.status(500).json({ message: error.message });
  }
};


export const createFamily = async (req, res) => {
  try {
    const familyData = {
      ...req.body,
      familyPhoto: req.file?.path || null,
    };

    let house = null;

    if (familyData.houseNumber) {
      house = await House.findOne({ houseNumber: familyData.houseNumber });

      if (!house) {
        house = new House({
          houseNumber: familyData.houseNumber,
          houseName: familyData.houseName || '',
          address: familyData.currentAddress || '',
          district: familyData.district || '',
          province: familyData.province || '',
          country: 'Nepal',
          status: 'active',
        });
        await house.save();
        console.log(`🏠 New house created: ${house.houseNumber}`);
      } else {
        console.log(`🏠 Existing house found: ${house.houseNumber}`);
      }

      familyData.house = house._id;
      delete familyData.houseNumber;
      delete familyData.houseName;
    }

    if (!familyData.house) {
      return res.status(400).json({
        success: false,
        message: 'House is required. Please provide a house number.',
      });
    }

    const houseExists = await House.findById(familyData.house);
    if (!houseExists) {
      return res.status(400).json({
        success: false,
        message: 'House not found',
      });
    }

    if (familyData.familyName && familyData.house) {
      const existingFamily = await Family.findOne({
        familyName: { $regex: `^${escapeRegex(familyData.familyName.trim())}$`, $options: 'i' },
        house: familyData.house,
        status: 'open',
      });

      if (existingFamily) {
        console.log(`⚠️ Duplicate family found: ${existingFamily.familyName}`);
        return res.status(409).json({
          success: false,
          message: `यो परिवार पहिले नै यस घरमा दर्ता भइसकेको छ: ${existingFamily.familyName} (परिवार नं. ${existingFamily.familyNumber})। कृपया जाँच गर्नुहोस्।`,
          existingFamily: {
            _id: existingFamily._id,
            familyName: existingFamily.familyName,
            familyNumber: existingFamily.familyNumber,
          },
        });
      }
    }

    const duplicateCheck = await Family.findOne({
      house: familyData.house,
      familyName: { $regex: `^${escapeRegex(familyData.familyName.trim())}$`, $options: 'i' },
    });

    if (duplicateCheck) {
      return res.status(409).json({
        success: false,
        message: `यो परिवार पहिले नै यस घरमा अवस्थित छ: ${duplicateCheck.familyName}`,
      });
    }

    // The family number is generated by the server; a typed one is not used
    delete familyData.familyNumber;

    let family = null;
    let retries = 5;
    while (retries > 0) {
      try {
        const candidate = new Family(familyData);
        await candidate.save();
        family = candidate;
        break;
      } catch (err) {
        if (err.code === 11000 && err.keyPattern?.familyNumber) {
          // Someone else took that number a moment ago: take the next free one
          familyData.familyNumber = await Family.nextFamilyNumber(familyData.house);
          retries--;
          console.log(`⚠️ Duplicate familyNumber, retrying with: ${familyData.familyNumber}`);
        } else {
          throw err;
        }
      }
    }

    if (!family) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate unique family number. Please retry.',
      });
    }

    if (family.house) {
      await House.findByIdAndUpdate(family.house, {
        $inc: { familyCount: 1 },
      });
    }

    const notification = new Notification({
      type: 'family_added',
      title: 'New Family Added',
      message: `Family "${family.familyName}" has been added to the system.`,
      data: { familyId: family._id },
      createdBy: req.user?._id || null,
    });
    await notification.save();

    io.emit('family:created', family);
    io.emit('notification:new', notification);

    res.status(201).json(family);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'यो परिवार नम्बर यस घरमा पहिले नै अवस्थित छ। कृपया फरक नाम प्रयोग गर्नुहोस्।',
      });
    }
    console.error('createFamily Error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};


export const updateFamily = async (req, res) => {
  try {
    const family = await Family.findById(req.params.id);
    if (!family) {
      return res.status(404).json({ message: 'Family not found' });
    }

    if (family.status === 'closed') {
      return res.status(403).json({
        message: 'Family is closed and cannot be modified. Please reopen to edit.',
      });
    }

    const updateData = { ...req.body };

    if (updateData.houseNumber) {
      let house = await House.findOne({ houseNumber: updateData.houseNumber });

      if (!house) {
        house = new House({
          houseNumber: updateData.houseNumber,
          houseName: updateData.houseName || '',
          address: updateData.currentAddress || '',
          district: updateData.district || '',
          province: updateData.province || '',
          country: 'Nepal',
          status: 'active',
        });
        await house.save();
        console.log(`🏠 New house created: ${house.houseNumber}`);
      }

      updateData.house = house._id;
      delete updateData.houseNumber;
      delete updateData.houseName;
    }

    if (req.file && family.familyPhoto) {
      await deleteAsset(family.familyPhoto);
    }

    const updatedFamily = await Family.findByIdAndUpdate(
      req.params.id,
      {
        ...updateData,
        familyPhoto: req.file?.path || family.familyPhoto,
      },
      { new: true, runValidators: true }
    );

    const notification = new Notification({
      type: 'family_updated',
      title: 'Family Updated',
      message: `Family "${updatedFamily.familyName}" has been updated.`,
      data: { familyId: updatedFamily._id },
      createdBy: req.user?._id || null,
    });
    await notification.save();

    io.emit('family:updated', updatedFamily);
    io.emit('notification:new', notification);

    res.json(updatedFamily);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Family number already exists in this house' });
    }
    console.error('updateFamily Error:', error);
    res.status(400).json({ message: error.message });
  }
};

export const deleteFamily = async (req, res) => {
  try {
    const family = await Family.findById(req.params.id);
    if (!family) {
      return res.status(404).json({ message: 'Family not found' });
    }

    const memberCount = await Member.countDocuments({ family: family._id });
    if (memberCount > 0) {
      return res.status(400).json({
        message: 'Cannot delete family with members. Transfer members first.',
      });
    }

    if (family.familyPhoto) {
      await deleteAsset(family.familyPhoto);
    }

    if (family.house) {
      await House.findByIdAndUpdate(family.house, {
        $inc: { familyCount: -1 },
      });
    }

    await family.deleteOne();

    io.emit('family:deleted', { id: req.params.id });

    res.json({ message: 'Family deleted successfully' });
  } catch (error) {
    console.error('deleteFamily Error:', error);
    res.status(500).json({ message: error.message });
  }
};


export const closeFamily = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const family = await Family.findById(id);
    if (!family) {
      return res.status(404).json({ message: 'Family not found' });
    }

    if (family.status === 'closed') {
      return res.status(400).json({ message: 'Family is already closed' });
    }

    family.status = 'closed';
    family.closedAt = new Date();
    family.closedReason = reason || 'No reason provided';

    await family.save();

    const notification = new Notification({
      type: 'family_closed',
      title: 'Family Closed',
      message: `Family "${family.familyName}" has been closed.`,
      data: { familyId: family._id },
      createdBy: req.user?._id || null,
    });
    await notification.save();

    io.emit('family:closed', family);
    io.emit('notification:new', notification);

    res.json({
      message: 'Family closed successfully',
      family,
    });
  } catch (error) {
    console.error('closeFamily Error:', error);
    res.status(500).json({ message: error.message });
  }
};


export const reopenFamily = async (req, res) => {
  try {
    const { id } = req.params;

    const family = await Family.findById(id);
    if (!family) {
      return res.status(404).json({ message: 'Family not found' });
    }

    if (family.status === 'open') {
      return res.status(400).json({ message: 'Family is already open' });
    }

    family.status = 'open';
    family.reopenedAt = new Date();

    await family.save();

    const notification = new Notification({
      type: 'family_reopened',
      title: 'Family Reopened',
      message: `Family "${family.familyName}" has been reopened.`,
      data: { familyId: family._id },
      createdBy: req.user?._id || null,
    });
    await notification.save();

    io.emit('family:reopened', family);
    io.emit('notification:new', notification);

    res.json({
      message: 'Family reopened successfully',
      family,
    });
  } catch (error) {
    console.error('reopenFamily Error:', error);
    res.status(500).json({ message: error.message });
  }
};


export const getNextFamilyNumber = async (req, res) => {
  try {
    const { houseId } = req.params;

    const house = await House.findById(houseId);
    if (!house) {
      return res.status(404).json({ message: 'House not found' });
    }

    res.json({
      houseId,
      houseNumber: house.houseNumber,
      nextFamilyNumber: await Family.nextFamilyNumber(houseId),
    });
  } catch (error) {
    console.error('getNextFamilyNumber Error:', error);
    res.status(500).json({ message: error.message });
  }
};


export const getNextVanshaNumber = async (req, res) => {
  try {
    const { familyId } = req.params;

    const members = await Member.find({ family: familyId })
      .select('vanshaGenerationNumber')
      .lean();

    let maxNumber = 0;
    members.forEach((m) => {
      if (m.vanshaGenerationNumber) {
        const num = parseInt(m.vanshaGenerationNumber, 10);
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      }
    });

    const nextNumber = maxNumber + 1;

    res.json({
      familyId,
      nextVanshaNumber: String(nextNumber),
      suggestion: `Auto: ${nextNumber}`,
    });
  } catch (error) {
    console.error('getNextVanshaNumber Error:', error);
    res.status(500).json({ message: error.message });
  }
};


export const getFamilyStats = async (req, res) => {
  try {
    const [totalFamilies, memberStats] = await Promise.all([
      Family.countDocuments(),
      Member.aggregate([
        {
          $group: {
            _id: '$family',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const familiesWithMembers = memberStats.length;

    res.json({
      totalFamilies,
      familiesWithMembers,
      averageMembersPerFamily:
        totalFamilies > 0
          ? Math.round(memberStats.reduce((acc, curr) => acc + curr.count, 0) / totalFamilies)
          : 0,
    });
  } catch (error) {
    console.error('getFamilyStats Error:', error);
    res.status(500).json({ message: error.message });
  }
};


export const getFamilyBanshaNumbers = async (req, res) => {
  try {
    const { familyId } = req.params;

    if (!familyId) {
      return res.status(400).json({
        success: false,
        message: 'Family ID is required',
      });
    }

    const family = await Family.findById(familyId);
    if (!family) {
      return res.status(404).json({
        success: false,
        message: 'Family not found',
      });
    }

    const members = await Member.find({ family: familyId })
      .select('vanshaGenerationNumber')
      .lean();

    const banshaNumbers = [
      ...new Set(
        members
          .map((m) => m.vanshaGenerationNumber)
          .filter((num) => num && num.trim() !== '')
      ),
    ].sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.localeCompare(b);
    });

    if (
      family.vanshaGenerationNumber &&
      !banshaNumbers.includes(family.vanshaGenerationNumber)
    ) {
      banshaNumbers.push(family.vanshaGenerationNumber);
    }

    res.json({
      success: true,
      data: banshaNumbers,
      family: {
        id: family._id,
        name: family.familyName,
        number: family.familyNumber,
        houseIdentifier: family.houseIdentifier,
        defaultBansha: family.vanshaGenerationNumber,
      },
    });
  } catch (error) {
    console.error('getFamilyBanshaNumbers Error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export default {
  getFamilies,
  getFamilyById,
  getFamilyTreeByFamily,
  createFamily,
  updateFamily,
  deleteFamily,
  closeFamily,
  reopenFamily,
  getNextFamilyNumber,
  getNextVanshaNumber,
  getFamilyStats,
  getFamilyBanshaNumbers,
};