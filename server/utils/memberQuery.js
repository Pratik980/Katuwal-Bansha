// utils/memberQuery.js
// One place that turns the filters of the Members page and the reports into a
// MongoDB query, so the list on screen and the exported file always agree.
import mongoose from 'mongoose';
import Family from '../models/Family.js';
import House from '../models/House.js';
import { containsText } from './text.js';

const NOTHING = { $in: [] };
const isId = (value) => mongoose.Types.ObjectId.isValid(String(value));

export const buildMemberQuery = async (params = {}) => {
  const {
    search, gender, status, generation, family, district, province, house,
    vanshaGenerationNumber, lineageRole,
  } = params;
  const verificationStatus = params.verificationStatus || params.verification;
  const query = {};

  if (search && String(search).trim()) {
    const text = containsText(search);
    query.$or = [
      'name', 'surname', 'memberNumber', 'vanshaGenerationNumber',
      'phone', 'email', 'citizenshipNumber', 'houseNumber',
    ].map((field) => ({ [field]: text }));
  }

  if (gender) query.gender = gender;

  // Living / deceased is what the "Is Alive" tick box records
  if (status === 'deceased') query.isAlive = false;
  else if (status === 'living' || status === 'active') query.isAlive = { $ne: false };
  else if (status) query.status = status;

  const generationNumber = parseInt(generation, 10);
  if (!Number.isNaN(generationNumber)) query.generation = generationNumber;

  if (verificationStatus) query.verificationStatus = verificationStatus;
  if (district) query.district = district;
  if (province) query.province = province;
  if (lineageRole) query.lineageRole = lineageRole;
  if (vanshaGenerationNumber && String(vanshaGenerationNumber).trim()) {
    query.vanshaGenerationNumber = containsText(vanshaGenerationNumber);
  }

  if (family) query.family = isId(family) ? family : NOTHING;

  // The house can be given as its id or as the house number people type
  if (house && String(house).trim()) {
    const houseIds = isId(house)
      ? [house]
      : await House.find({ houseNumber: String(house).trim() }).distinct('_id');
    const familiesInHouse = await Family.find({ house: { $in: houseIds } }).distinct('_id');

    if (!query.family) query.family = { $in: familiesInHouse };
    else if (!familiesInHouse.some((id) => String(id) === String(query.family))) query.family = NOTHING;
  }

  return query;
};
