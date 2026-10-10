import Member from '../models/Member.js';
import Family from '../models/Family.js';
import { escapeRegex } from '../utils/text.js';

export const globalSearch = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ 
        message: 'Search query must be at least 2 characters long' 
      });
    }

    const searchRegex = new RegExp(escapeRegex(query.trim()), 'i');

   
    const members = await Member.find({
      $or: [
        { name: searchRegex },
        { familyNumber: searchRegex },
        { rollNumber: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
        { occupation: searchRegex },
        { education: searchRegex },
        { currentAddress: searchRegex },
        { permanentAddress: searchRegex },
      ],
    })
    .select('name familyNumber rollNumber generation gender photo phone email currentAddress occupation')
    .limit(20)
    .lean();

   
    const families = await Family.find({
      $or: [
        { familyName: searchRegex },
        { familyNumber: searchRegex },
        { clan: searchRegex },
        { origin: searchRegex },
        { currentAddress: searchRegex },
      ],
    })
    .select('familyName familyNumber clan totalMembers')
    .limit(10)
    .lean();

    res.json({
      query: query.trim(),
      results: {
        members: {
          count: members.length,
          data: members,
        },
        families: {
          count: families.length,
          data: families,
        },
        total: members.length + families.length,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const searchMembers = async (req, res) => {
  try {
    const { query, page = 1, limit = 10 } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ 
        message: 'Search query must be at least 2 characters long' 
      });
    }

    const searchRegex = new RegExp(escapeRegex(query.trim()), 'i');
    const skip = (page - 1) * limit;

    const searchQuery = {
      $or: [
        { name: searchRegex },
        { familyNumber: searchRegex },
        { rollNumber: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
        { occupation: searchRegex },
        { education: searchRegex },
        { currentAddress: searchRegex },
        { permanentAddress: searchRegex },
      ],
    };

    const [members, total] = await Promise.all([
      Member.find(searchQuery)
        .select('name familyNumber rollNumber generation gender photo phone email currentAddress occupation isAlive')
        .sort({ name: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Member.countDocuments(searchQuery),
    ]);

    res.json({
      query: query.trim(),
      data: members,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const searchFamilies = async (req, res) => {
  try {
    const { query, page = 1, limit = 10 } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ 
        message: 'Search query must be at least 2 characters long' 
      });
    }

    const searchRegex = new RegExp(escapeRegex(query.trim()), 'i');
    const skip = (page - 1) * limit;

    const searchQuery = {
      $or: [
        { familyName: searchRegex },
        { familyNumber: searchRegex },
        { clan: searchRegex },
        { origin: searchRegex },
        { currentAddress: searchRegex },
      ],
    };

    const [families, total] = await Promise.all([
      Family.find(searchQuery)
        .select('familyName familyNumber clan totalMembers currentAddress origin')
        .sort({ familyName: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Family.countDocuments(searchQuery),
    ]);

    res.json({
      query: query.trim(),
      data: families,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};