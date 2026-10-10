
import House from '../models/House.js';
import Family from '../models/Family.js';
import Member from '../models/Member.js';
import { io } from '../server.js';
import Notification from '../models/Notification.js';
import { containsText } from '../utils/text.js';

export const getHouses = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (search) {
      const text = containsText(search);
      query = {
        $or: [
          { houseNumber: text },
          { houseName: text },
          { address: text },
          { district: text },
        ],
      };
    }

    const [houses, total] = await Promise.all([
      House.find(query)
        .sort({ houseNumber: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      House.countDocuments(query),
    ]);

 
    const housesWithCounts = await Promise.all(houses.map(async (house) => {
      const familyCount = await Family.countDocuments({ house: house._id });
      const memberCount = await Member.countDocuments({ family: { $in: await Family.find({ house: house._id }).distinct('_id') } });
      return {
        ...house.toObject(),
        familyCount,
        memberCount,
      };
    }));

    res.json({
      data: housesWithCounts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('getHouses Error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getHouseById = async (req, res) => {
  try {
    const house = await House.findById(req.params.id);
    if (!house) {
      return res.status(404).json({ message: 'House not found' });
    }

    const families = await Family.find({ house: house._id })
      .populate('familyHead', 'name memberNumber photo')
      .sort({ familyNumber: 1 });

    const memberCount = await Member.countDocuments({
      family: { $in: families.map(f => f._id) }
    });

    res.json({
      ...house.toObject(),
      families,
      memberCount,
      familyCount: families.length,
    });
  } catch (error) {
    console.error('getHouseById Error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const createHouse = async (req, res) => {
  try {
    const houseData = {
      ...req.body,
      createdBy: req.user?._id || null,
      updatedBy: req.user?._id || null,
    };

    const house = new House(houseData);
    await house.save();

    const notification = new Notification({
      type: 'house_added',
      title: 'New House Added',
      message: `House No. ${house.houseNumber} has been added to the system.`,
      data: { houseId: house._id },
      createdBy: req.user?._id || null,
    });
    await notification.save();

    io.emit('house:created', house);
    io.emit('notification:new', notification);

    res.status(201).json(house);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'House number already exists' });
    }
    console.error('createHouse Error:', error);
    res.status(400).json({ message: error.message });
  }
};

export const updateHouse = async (req, res) => {
  try {
    const house = await House.findById(req.params.id);
    if (!house) {
      return res.status(404).json({ message: 'House not found' });
    }

    const updatedHouse = await House.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedBy: req.user?._id || null,
      },
      { new: true, runValidators: true }
    );

    const notification = new Notification({
      type: 'house_updated',
      title: 'House Updated',
      message: `House No. ${updatedHouse.houseNumber} has been updated.`,
      data: { houseId: updatedHouse._id },
      createdBy: req.user?._id || null,
    });
    await notification.save();

    io.emit('house:updated', updatedHouse);
    io.emit('notification:new', notification);

    res.json(updatedHouse);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'House number already exists' });
    }
    console.error('updateHouse Error:', error);
    res.status(400).json({ message: error.message });
  }
};

export const deleteHouse = async (req, res) => {
  try {
    const house = await House.findById(req.params.id);
    if (!house) {
      return res.status(404).json({ message: 'House not found' });
    }

    const familyCount = await Family.countDocuments({ house: house._id });
    if (familyCount > 0) {
      return res.status(400).json({
        message: 'Cannot delete house with families. Transfer families first.'
      });
    }

    await house.deleteOne();

    io.emit('house:deleted', { id: req.params.id });

    res.json({ message: 'House deleted successfully' });
  } catch (error) {
    console.error('deleteHouse Error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getNextHouseNumber = async (req, res) => {
  try {
    // House numbers are text, so the largest is found by number ("9" sorts after "10" as text)
    const used = await House.find().distinct('houseNumber');
    const largest = used.reduce((max, value) => {
      const number = parseInt(value, 10);
      return Number.isNaN(number) ? max : Math.max(max, number);
    }, 0);
    res.json({ nextHouseNumber: String(largest + 1) });
  } catch (error) {
    console.error('getNextHouseNumber Error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getHouseStats = async (req, res) => {
  try {
    const [totalHouses, familyStats] = await Promise.all([
      House.countDocuments(),
      Family.aggregate([
        {
          $group: {
            _id: '$house',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    res.json({
      totalHouses,
      housesWithFamilies: familyStats.length,
      averageFamiliesPerHouse: totalHouses > 0 ?
        Math.round(familyStats.reduce((acc, curr) => acc + curr.count, 0) / totalHouses) : 0,
    });
  } catch (error) {
    console.error('getHouseStats Error:', error);
    res.status(500).json({ message: error.message });
  }
};