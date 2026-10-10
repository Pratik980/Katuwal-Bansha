
import mongoose from 'mongoose';
import Member from '../models/Member.js';
import Family from '../models/Family.js';
import { Parser } from 'json2csv';
import XLSX from 'xlsx';
import { buildMemberQuery } from '../utils/memberQuery.js';
import { buildFamilyTree } from '../utils/lineageTree.js';


// ============================================================
// HELPERS
// ============================================================
const formatDate = (date) => {
  if (!date) return '';
  try {
    return new Date(date).toLocaleDateString('en-US');
  } catch {
    return '';
  }
};

// A file name in a response header must be plain ASCII. The real name (which is
// often Nepali) is sent alongside it in the form browsers decode.
const setDownloadName = (res, filename) => {
  const ascii = filename.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`
  );
};

const sendCsv = (res, rows, filename, fields = []) => {
  // A report with no rows still downloads, with just its column titles
  const columns = rows.length > 0 ? Object.keys(rows[0]) : fields;
  const csv = new Parser({ fields: columns }).parse(rows);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  setDownloadName(res, filename);
  return res.send(csv);
};

// Excel allows 31 characters in a sheet name and none of : \ / ? * [ ]
const sheetName = (name) => String(name).replace(/[:\\/?*[\]]/g, ' ').slice(0, 31) || 'Sheet';

const sendExcel = (res, sheets, filename) => {
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, rows, columnWidth }) => {
    const ws = XLSX.utils.json_to_sheet(rows);
    if (columnWidth && rows.length > 0) {
      ws['!cols'] = Object.keys(rows[0]).map((key) => ({ wch: Math.max(key.length, columnWidth) }));
    }
    XLSX.utils.book_append_sheet(wb, ws, sheetName(name));
  });
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  setDownloadName(res, filename);
  return res.send(buffer);
};

// Aggregations do not convert text to an id by themselves the way find() does
const familyMatch = (familyId) => {
  if (!familyId) return {};
  return mongoose.Types.ObjectId.isValid(familyId)
    ? { family: new mongoose.Types.ObjectId(String(familyId)) }
    : { _id: null };
};

const lifeStatus = (member) => (member.isAlive === false ? 'Deceased' : 'Living');


// ============================================================
// GENEALOGY
// ============================================================
export const generateGenealogyReport = async (req, res) => {
  try {
    const { format = 'json', familyId } = req.query;

    const query = await buildMemberQuery({ family: familyId });

    const members = await Member.find(query)
      .populate('family', 'familyName familyNumber')
      .populate('father mother husband wife spouse', 'name memberNumber')
      .lean();

    const reportData = members.map(m => ({
      'Member ID': m.memberNumber || '',
      'Full Name': m.name || '',
      'Surname': m.surname || '',
      'Family Number': m.family?.familyNumber || '',
      'Generation': m.generation || '',
      'Gender': m.gender || '',
      'Date of Birth (BS)': m.dobNepali || '',
      'Date of Birth': formatDate(m.dob),
      'Is Alive': m.isAlive === false ? 'No' : 'Yes',
      'Date of Death (BS)': m.dodNepali || '',
      'Date of Death': formatDate(m.dod),
      'Family': m.family?.familyName || '',
      'Father': m.father?.name || '',
      'Father ID': m.father?.memberNumber || '',
      'Mother': m.mother?.name || '',
      'Mother ID': m.mother?.memberNumber || '',
      'Spouse': m.spouse?.name || '',
      'Spouse ID': m.spouse?.memberNumber || '',
      'Phone': m.phone || '',
      'Email': m.email || '',
      'District': m.district || '',
      'Current Address': m.currentAddress || '',
      'Permanent Address': m.permanentAddress || '',
      'Occupation': m.occupation || '',
      'Education': m.education || '',
    }));

    if (format === 'csv') {
      return sendCsv(res, reportData, 'genealogy-report.csv', ['Member ID', 'Full Name']);
    }

    if (format === 'excel') {
      return sendExcel(res, [{ name: 'Genealogy', rows: reportData }], 'genealogy-report.xlsx');
    }

    res.json({
      total: reportData.length,
      data: reportData,
    });
  } catch (error) {
    console.error('generateGenealogyReport Error:', error);
    res.status(500).json({ message: error.message });
  }
};


// ============================================================
// ONE FAMILY
// ============================================================
export const generateFamilyReport = async (req, res) => {
  try {
    const { familyId, format = 'excel' } = req.query;

    if (!familyId) {
      return res.status(400).json({ message: 'Family ID is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(familyId)) {
      return res.status(404).json({ message: 'Family not found' });
    }

    const family = await Family.findById(familyId)
      .populate('familyHead', 'name memberNumber phone')
      .populate('headOfFamily', 'name memberNumber phone')
      .lean();

    if (!family) {
      return res.status(404).json({ message: 'Family not found' });
    }

    const members = await Member.find({ family: familyId })
      .select('name surname memberNumber gender dob dobNepali isAlive generation relationship phone email district occupation education')
      .sort({ generation: 1, name: 1 })
      .lean();

    const head = family.familyHead || family.headOfFamily;
    const totalMembers = members.length;
    const maleCount = members.filter(m => m.gender === 'male').length;
    const femaleCount = members.filter(m => m.gender === 'female').length;
    const livingCount = members.filter(m => m.isAlive !== false).length;
    const deceasedCount = members.filter(m => m.isAlive === false).length;

    const generationMap = {};
    members.forEach(m => {
      const gen = m.generation || 'Unknown';
      generationMap[gen] = (generationMap[gen] || 0) + 1;
    });

    const reportData = {
      'Family Information': {
        'Family Name': family.familyName || '',
        'Family Number': family.familyNumber || '',
        'Clan': family.clan || '',
        'Origin': family.origin || '',
        'Current Address': family.currentAddress || '',
        'Head of Family': head?.name || family.familyHeadName || '',
        'Head Member ID': head?.memberNumber || '',
        'Total Members': totalMembers,
      },
      'Statistics': {
        'Total Members': totalMembers,
        'Male': maleCount,
        'Female': femaleCount,
        'Living': livingCount,
        'Deceased': deceasedCount,
      },
      'Generation Distribution': generationMap,
      'Members': members.map(m => ({
        'Member ID': m.memberNumber || '',
        'Name': m.name || '',
        'Surname': m.surname || '',
        'Gender': m.gender || '',
        'Generation': m.generation || '',
        'Relationship': m.relationship || '',
        'Date of Birth (BS)': m.dobNepali || '',
        'Is Alive': m.isAlive === false ? 'No' : 'Yes',
        'Phone': m.phone || '',
        'Email': m.email || '',
        'District': m.district || '',
        'Occupation': m.occupation || '',
        'Education': m.education || '',
      })),
    };

    if (format === 'csv') {
      return sendCsv(res, reportData.Members, `${family.familyName}-report.csv`, ['Member ID', 'Name']);
    }

    if (format === 'excel') {
      return sendExcel(
        res,
        [
          {
            name: 'Family Info',
            rows: Object.entries(reportData['Family Information']).map(([key, value]) => ({ Field: key, Value: value })),
          },
          {
            name: 'Statistics',
            rows: Object.entries(reportData.Statistics).map(([key, value]) => ({ Metric: key, Count: value })),
          },
          {
            name: 'Generations',
            rows: Object.entries(reportData['Generation Distribution']).map(([gen, count]) => ({ Generation: gen, Count: count })),
          },
          { name: 'Members', rows: reportData.Members },
        ],
        `${family.familyName}-report.xlsx`
      );
    }

    res.json(reportData);
  } catch (error) {
    console.error('generateFamilyReport Error:', error);
    res.status(500).json({ message: error.message });
  }
};


// ============================================================
// ALL MEMBERS (the "Export All" button: follows the filters on screen)
// ============================================================
export const exportAllMembers = async (req, res) => {
  try {
    const query = await buildMemberQuery(req.query);

    const members = await Member.find(query)
      .populate({
        path: 'family',
        select: 'familyName familyNumber vanshaGenerationNumber house',
        populate: { path: 'house', select: 'houseNumber' },
      })
      .populate('father mother spouse', 'name memberNumber')
      .sort({ createdAt: -1 })
      .lean();

    const reportData = members.map(m => ({
      'Member ID': m.memberNumber || '',
      'Full Name': m.name || '',
      'Surname': m.surname || '',
      'Gender': m.gender || '',
      'Date of Birth (BS)': m.dobNepali || '',
      'Date of Birth': formatDate(m.dob),
      'Generation': m.generation || '',
      'Vansha/Generation': m.vanshaGenerationNumber || '',
      'House Number': m.family?.house?.houseNumber || m.houseNumber || '',
      'Family': m.family?.familyName || '',
      'Family Number': m.family?.familyNumber || '',
      'Status': lifeStatus(m),
      'Verification': m.verificationStatus || 'pending',
      'Phone': m.phone || '',
      'Email': m.email || '',
      'District': m.district || '',
      'Province': m.province || '',
      'Father': m.father?.name || '',
      'Mother': m.mother?.name || '',
      'Spouse': m.spouse?.name || '',
      'Occupation': m.occupation || '',
      'Education': m.education || '',
      'Citizenship': m.citizenshipNumber || '',
    }));

    return sendExcel(
      res,
      [{ name: 'All Members', rows: reportData, columnWidth: 20 }],
      `Members_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  } catch (error) {
    console.error('exportAllMembers Error:', error);
    res.status(500).json({ message: error.message });
  }
};


// ============================================================
// FAMILY TREE DATA
// ============================================================
export const exportFamilyTree = async (req, res) => {
  try {
    const { familyId } = req.query;

    if (!familyId) {
      return res.status(400).json({ message: 'Family ID is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(familyId)) {
      return res.status(404).json({ message: 'Family not found' });
    }

    const family = await Family.findById(familyId)
      .populate('house', 'houseNumber houseName');

    if (!family) {
      return res.status(404).json({ message: 'Family not found' });
    }

    const members = await Member.find({ family: familyId })
      .populate('father mother spouse', 'name photo memberNumber vanshaGenerationNumber generation gender isAlive')
      .lean();

    const { roots: treeData } = buildFamilyTree(members, { familyHeadId: family.familyHead });

    res.json({
      success: true,
      family: {
        id: family._id,
        name: family.familyName,
        number: family.familyNumber,
        vanshaGenerationNumber: family.vanshaGenerationNumber,
        house: family.house,
      },
      treeData,
      memberCount: members.length,
      generationCount: [...new Set(members.map(m => m.generation))].length,
    });
  } catch (error) {
    console.error('exportFamilyTree Error:', error);
    res.status(500).json({ message: error.message });
  }
};


// ============================================================
// GENERATIONS
// ============================================================
export const generateGenerationReport = async (req, res) => {
  try {
    const { format = 'json', familyId } = req.query;

    const generationStats = await Member.aggregate([
      { $match: familyMatch(familyId) },
      {
        $group: {
          _id: '$generation',
          count: { $sum: 1 },
          males: {
            $sum: { $cond: [{ $eq: ['$gender', 'male'] }, 1, 0] },
          },
          females: {
            $sum: { $cond: [{ $eq: ['$gender', 'female'] }, 1, 0] },
          },
          deceased: {
            $sum: { $cond: [{ $eq: ['$isAlive', false] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const reportData = generationStats.map(g => ({
      'Generation': g._id || 'Unknown',
      'Total Members': g.count,
      'Male': g.males,
      'Female': g.females,
      'Living': g.count - g.deceased,
      'Deceased': g.deceased,
    }));

    if (format === 'csv') {
      return sendCsv(res, reportData, 'generation-report.csv', ['Generation', 'Total Members', 'Male', 'Female', 'Living', 'Deceased']);
    }

    if (format === 'excel') {
      return sendExcel(res, [{ name: 'Generations', rows: reportData }], 'generation-report.xlsx');
    }

    res.json(reportData);
  } catch (error) {
    console.error('generateGenerationReport Error:', error);
    res.status(500).json({ message: error.message });
  }
};


// ============================================================
// DONATIONS (the donation module is switched off: an empty report)
// ============================================================
export const generateDonationReport = async (req, res) => {
  try {
    const { format = 'json' } = req.query;

    const reportData = [];

    if (format === 'csv') {
      return sendCsv(res, reportData, 'donation-report.csv', ['Donor', 'Amount', 'Date']);
    }

    if (format === 'excel') {
      return sendExcel(res, [{ name: 'Donations', rows: reportData }], 'donation-report.xlsx');
    }

    res.json({
      summary: {
        totalDonations: 0,
        totalAmount: 0,
        averageAmount: 0,
      },
      data: reportData,
    });
  } catch (error) {
    console.error('generateDonationReport Error:', error);
    res.status(500).json({ message: error.message });
  }
};


// ============================================================
// DEMOGRAPHICS
// ============================================================
export const generateDemographicReport = async (req, res) => {
  try {
    const { format = 'json', familyId } = req.query;
    const matchQuery = familyMatch(familyId);

    const groupBy = (field, extra = []) =>
      Member.aggregate([
        { $match: matchQuery },
        { $group: { _id: field, count: { $sum: 1 } } },
        ...extra,
      ]);

    const [genderStats, lifeStatusStats, maritalStats, bloodGroupStats, occupationStats] = await Promise.all([
      groupBy('$gender'),
      groupBy('$isAlive'),
      groupBy('$maritalStatus'),
      groupBy('$bloodGroup'),
      groupBy('$occupation', [{ $sort: { count: -1 } }, { $limit: 10 }]),
    ]);

    const reportData = {
      'Gender Distribution': genderStats,
      'Life Status': lifeStatusStats.map((item) => ({ _id: item._id === false ? 'Deceased' : 'Living', count: item.count })),
      'Marital Status': maritalStats,
      'Blood Groups': bloodGroupStats,
      'Top Occupations': occupationStats,
    };

    if (format === 'csv') {
      const flatData = [];
      Object.entries(reportData).forEach(([category, items]) => {
        items.forEach(item => {
          flatData.push({
            Category: category,
            'Group': item._id || 'Unknown',
            Count: item.count,
          });
        });
      });
      return sendCsv(res, flatData, 'demographic-report.csv', ['Category', 'Group', 'Count']);
    }

    if (format === 'excel') {
      return sendExcel(
        res,
        Object.entries(reportData).map(([category, items]) => ({
          name: category,
          rows: items.map(item => ({ 'Group': item._id || 'Unknown', 'Count': item.count })),
        })),
        'demographic-report.xlsx'
      );
    }

    res.json(reportData);
  } catch (error) {
    console.error('generateDemographicReport Error:', error);
    res.status(500).json({ message: error.message });
  }
};


// ============================================================
// QR / ID LIST
// ============================================================
export const generateQRReport = async (req, res) => {
  try {
    const members = await Member.find()
      .select('name memberNumber generation family photo')
      .populate('family', 'familyName familyNumber')
      .lean();

    const reportData = members.map(m => ({
      'Name': m.name,
      'Member ID': m.memberNumber || '',
      'Family': m.family?.familyName || '',
      'Family Number': m.family?.familyNumber || '',
      'Generation': m.generation || '',
      'QR Code URL': m.photo || '',
    }));

    if (req.query.format === 'csv') {
      return sendCsv(res, reportData, 'qr-report.csv', ['Name', 'Member ID']);
    }

    if (req.query.format === 'excel') {
      return sendExcel(res, [{ name: 'QR Codes', rows: reportData }], 'qr-report.xlsx');
    }

    res.json(reportData);
  } catch (error) {
    console.error('generateQRReport Error:', error);
    res.status(500).json({ message: error.message });
  }
};


// ============================================================
// ALL FAMILIES
// ============================================================
export const generateAllFamiliesReport = async (req, res) => {
  try {
    const { format = 'excel' } = req.query;

    const [families, allMembers] = await Promise.all([
      Family.find()
        .populate('familyHead', 'name memberNumber phone')
        .populate('headOfFamily', 'name memberNumber phone')
        .lean(),
      Member.find()
        .select('family name surname memberNumber gender dob dobNepali dod dodNepali isAlive generation relationship phone email district occupation education')
        .sort({ generation: 1, name: 1 })
        .lean(),
    ]);

    const membersByFamily = new Map();
    allMembers.forEach((m) => {
      const key = String(m.family);
      if (!membersByFamily.has(key)) membersByFamily.set(key, []);
      membersByFamily.get(key).push(m);
    });

    const reportData = [];

    for (const family of families) {
      const members = membersByFamily.get(String(family._id)) || [];
      const head = family.familyHead || family.headOfFamily;

      reportData.push({
        'Family Name': family.familyName || '',
        'Family Number': family.familyNumber || '',
        'Head of Family': head?.name || family.familyHeadName || '',
        'Total Members': members.length,
        'Member ID': '',
        'Member Name': '',
        'Gender': '',
        'Generation': '',
        'Status': '',
        'Phone': '',
        'District': '',
        'Email': '',
        'Occupation': '',
        'Education': '',
        'Date of Birth (BS)': '',
        'Date of Birth': '',
        'Date of Death': '',
        'Relationship': '',
      });

      members.forEach(m => {
        reportData.push({
          'Family Name': '',
          'Family Number': '',
          'Head of Family': '',
          'Total Members': '',
          'Member ID': m.memberNumber || '',
          'Member Name': m.name || '',
          'Gender': m.gender || '',
          'Generation': m.generation || '',
          'Status': lifeStatus(m),
          'Phone': m.phone || '',
          'District': m.district || '',
          'Email': m.email || '',
          'Occupation': m.occupation || '',
          'Education': m.education || '',
          'Date of Birth (BS)': m.dobNepali || '',
          'Date of Birth': formatDate(m.dob),
          'Date of Death': m.dodNepali || formatDate(m.dod),
          'Relationship': m.relationship || '',
        });
      });

      reportData.push({});
    }

    if (format === 'excel') {
      return sendExcel(res, [{ name: 'All Families', rows: reportData }], 'all-families-report.xlsx');
    }

    res.json(reportData);
  } catch (error) {
    console.error('generateAllFamiliesReport Error:', error);
    res.status(500).json({ message: error.message });
  }
};


// ============================================================
// MEMBERS (with the filters of the Reports page)
// ============================================================
export const generateMemberReport = async (req, res) => {
  try {
    const { format = 'excel', dateRange } = req.query;

    const query = await buildMemberQuery(req.query);

    if (dateRange) {
      const [start, end] = dateRange.split(',');
      if (start && end) {
        query.createdAt = {
          $gte: new Date(start),
          $lte: new Date(end)
        };
      }
    }

    const members = await Member.find(query)
      .populate('family', 'familyName familyNumber')
      .lean();

    const reportData = members.map(m => ({
      'Member ID': m.memberNumber || '',
      'Name': m.name || '',
      'Surname': m.surname || '',
      'Gender': m.gender || '',
      'Generation': m.generation || '',
      'Family': m.family?.familyName || '',
      'Family Number': m.family?.familyNumber || '',
      'Status': lifeStatus(m),
      'Verification': m.verificationStatus || 'pending',
      'Phone': m.phone || '',
      'Email': m.email || '',
      'District': m.district || '',
      'Province': m.province || '',
      'Occupation': m.occupation || '',
      'Education': m.education || '',
      'Date of Birth (BS)': m.dobNepali || '',
      'Date of Birth': formatDate(m.dob),
      'Date of Death': m.dodNepali || formatDate(m.dod),
      'Marital Status': m.maritalStatus || '',
      'Blood Group': m.bloodGroup || '',
      'Relationship': m.relationship || '',
    }));

    if (format === 'csv') {
      return sendCsv(res, reportData, 'members-report.csv', ['Member ID', 'Name']);
    }

    if (format === 'excel') {
      return sendExcel(res, [{ name: 'Members', rows: reportData }], 'members-report.xlsx');
    }

    res.json({
      total: reportData.length,
      data: reportData,
    });
  } catch (error) {
    console.error('generateMemberReport Error:', error);
    res.status(500).json({ message: error.message });
  }
};


// ============================================================
// BIRTHDAYS
// ============================================================
export const generateBirthdayReport = async (req, res) => {
  try {
    const { format = 'excel', month } = req.query;

    let query = {};
    if (month) {
      const monthNum = parseInt(month);
      query.$expr = {
        $eq: [{ $month: '$dob' }, monthNum]
      };
    }

    const members = await Member.find(query)
      .populate('family', 'familyName familyNumber')
      .lean();

    const reportData = members.map(m => ({
      'Name': m.name || '',
      'Member ID': m.memberNumber || '',
      'Date of Birth (BS)': m.dobNepali || '',
      'Date of Birth': formatDate(m.dob),
      'Family': m.family?.familyName || '',
      'Gender': m.gender || '',
      'Phone': m.phone || '',
      'Email': m.email || '',
      'Status': lifeStatus(m),
    }));

    if (format === 'excel') {
      return sendExcel(res, [{ name: 'Birthdays', rows: reportData }], 'birthday-report.xlsx');
    }

    res.json(reportData);
  } catch (error) {
    console.error('generateBirthdayReport Error:', error);
    res.status(500).json({ message: error.message });
  }
};


export default {
  generateGenealogyReport,
  generateFamilyReport,
  generateAllFamiliesReport,
  generateMemberReport,
  generateGenerationReport,
  generateDonationReport,
  generateDemographicReport,
  generateQRReport,
  generateBirthdayReport,
  exportAllMembers,
  exportFamilyTree,
};
