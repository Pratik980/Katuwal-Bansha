import Member from '../models/Member.js';
import Family from '../models/Family.js';
// import Donation from '../models/Donation.js';
// import Document from '../models/Document.js';
import Notification from '../models/Notification.js';

export const getDashboardStats = async (req, res) => {
  try {
    const [
      totalMembers,
      totalFamilies,
      genderStats,
      lifeStatusStats,
      recentMembers,
      recentNotifications,
    ] = await Promise.all([
      Member.countDocuments(),
      Family.countDocuments(),
      Member.aggregate([
        { $group: { _id: '$gender', count: { $sum: 1 } } },
      ]),
      Member.aggregate([
        { $group: { _id: '$isAlive', count: { $sum: 1 } } },
      ]),
      Member.find()
        .select('name photo gender isAlive createdAt')
        .sort({ createdAt: -1 })
        .limit(5),
      Notification.find()
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    const generations = await Member.aggregate([
      { $group: { _id: '$generation', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      summary: {
        totalMembers,
        totalFamilies,
        totalDonations: 0,
        totalDocuments: 0,
        totalDonationAmount: 0,
      },
      demographics: {
        gender: genderStats,
        lifeStatus: lifeStatusStats,
        generations: generations.map(g => ({
          generation: g._id,
          count: g.count,
        })),
      },
      recent: {
        members: recentMembers,
        donations: [],
        notifications: recentNotifications,
      },
      monthlyDonations: [],
    });
  } catch (error) {
    console.error("❌ Dashboard Stats Error:", error);
    console.error("Stack:", error.stack);
    res.status(500).json({ 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

export const getQuickStats = async (req, res) => {
  try {
    const [
      totalMembers,
      totalFamilies,
      totalGenerations,
      maleCount,
      femaleCount,
      livingCount,
      deceasedCount,
    ] = await Promise.all([
      Member.countDocuments(),
      Family.countDocuments(),
      Member.distinct('generation').then(gens => gens.filter(g => g !== undefined).length),
      Member.countDocuments({ gender: 'male' }),
      Member.countDocuments({ gender: 'female' }),
      Member.countDocuments({ isAlive: true }),
      Member.countDocuments({ isAlive: false }),
    ]);

    res.json({
      totalMembers,
      totalFamilies,
      totalGenerations,
      maleCount,
      femaleCount,
      livingCount,
      deceasedCount,
    });
  } catch (error) {
    console.error("❌ Quick Stats Error:", error);
    res.status(500).json({ message: error.message });
  }
};