
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const memberSchema = new mongoose.Schema({
  uuid: {
    type: String,
    default: uuidv4,
    unique: true,
  },

  // ============================================================
  // BASIC INFORMATION
  // ============================================================
  name: {
    type: String,
    required: function () {
      return this.personStatus !== 'unknown_name';
    },
    trim: true,
    default: 'नाम अज्ञात',
  },
  surname: {
    type: String,
    trim: true,
    // ⭐ NOT REQUIRED - kept for backward compatibility
  },
  familyLine: {
    type: String,
    trim: true,
  },

  vanshaGenerationNumber: {
    type: String,
    trim: true,
    index: true,
    // ⭐ MANUAL ENTRY - user controls this value
  },

  // ⭐ GENERATION with mode
  generation: {
    type: Number,
    default: 1,
  },
  generationMode: {
    type: String,
    enum: ['auto', 'manual'],
    default: 'auto',
  },

  genealogyPageNumber: {
    type: String,
    trim: true,
  },

  relationship: {
    type: String,
    trim: true,
    default: 'सदस्य',
  },

  parentRelationshipType: {
    type: String,
    enum: ['biological', 'adoptive', 'step', 'guardian', 'other'],
    default: 'biological',
  },

  childBirthOrder: {
    type: Number,
    default: null,
  },

  lineageRole: {
    type: String,
    enum: ['lineage_head', 'lineage_member', 'spouse', 'other'],
    default: 'lineage_member',
  },

  memberNumber: {
    type: String,
    trim: true,
    unique: true,
    sparse: true,
  },

  // ============================================================
  // PERSONAL DETAILS
  // ============================================================
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: true,
  },
  dob: {
    type: Date,
    required: function () {
      return this.personStatus !== 'unknown_name';
    },
  },
  dobNepali: {
    type: String,
    trim: true,
    // ⭐ Store the BS date string for display consistency
  },
  placeOfBirth: {
    type: String,
    trim: true,
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'],
    default: 'unknown',
  },
  education: {
    type: String,
    trim: true,
  },
  occupation: {
    type: String,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  citizenshipNumber: {
    type: String,
    trim: true,
  },
  maritalStatus: {
    type: String,
    enum: ['single', 'married', 'divorced', 'widowed', 'other'],
    default: 'single',
  },

  // Multiple wives support
  wives: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
    },
  ],
  wifeNames: [
    {
      name: { type: String, trim: true },
      dob: { type: Date },
    },
  ],

  wifeName: {
    type: String,
    trim: true,
  },
  wifeDob: {
    type: Date,
  },

  // Husband entered as text on a married woman, until his own member record is linked
  husbandName: {
    type: String,
    trim: true,
  },
  husbandDob: {
    type: Date,
  },

  // BS text of the dates above and below, exactly as typed on the form.
  // The Date fields themselves hold the matching AD date.
  dodNepali: { type: String, trim: true },
  wifeDobNepali: { type: String, trim: true },
  husbandDobNepali: { type: String, trim: true },
  citizenshipIssueDateNepali: { type: String, trim: true },
  nationalIdIssueDateNepali: { type: String, trim: true },
  passportIssueDateNepali: { type: String, trim: true },
  passportExpiryDateNepali: { type: String, trim: true },
  drivingLicenseIssueDateNepali: { type: String, trim: true },
  drivingLicenseExpiryDateNepali: { type: String, trim: true },

  // ============================================================
  // PERSON STATUS (Missing/Unknown)
  // ============================================================
  personStatus: {
    type: String,
    enum: ['known', 'missing', 'unknown_name'],
    default: 'known',
  },

  unknownNameNote: {
    type: String,
    trim: true,
  },

  isMarriedDaughter: {
    type: Boolean,
    default: false,
  },

  // ============================================================
  // ADDRESS
  // ============================================================
  currentAddress: {
    type: String,
    trim: true,
  },
  permanentAddress: {
    type: String,
    trim: true,
  },

  religion: {
    type: String,
    trim: true,
  },
  casteEthnicity: {
    type: String,
    trim: true,
    // ⭐ गोत्र: माण्डप is the expected value
  },
  nationality: {
    type: String,
    default: 'Nepali',
    trim: true,
  },

  alternatePhone: {
    type: String,
    trim: true,
  },

  // ⭐ House Number OPTIONAL (comes from Family)
  houseNumber: {
    type: String,
    trim: true,
    default: null,
  },
  wardNumber: {
    type: String,
    trim: true,
  },
  toleVillage: {
    type: String,
    trim: true,
  },
  municipality: {
    type: String,
    trim: true,
  },
  district: {
    type: String,
    trim: true,
    // ⭐ NOT REQUIRED - comes from family/house
  },
  province: {
    type: String,
    trim: true,
  },
  country: {
    type: String,
    default: 'Nepal',
    trim: true,
  },
  postalCode: {
    type: String,
    trim: true,
  },

  // ============================================================
  // FAMILY RELATIONSHIPS
  // ============================================================
  family: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Family',
    index: true,
  },
  father: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
  },
  mother: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
  },
  grandfather: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
  },
  grandmother: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
  },
  spouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
  },
  guardian: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
  },
  familyContact: {
    type: String,
    trim: true,
  },

  // ============================================================
  // IDENTIFICATION
  // ============================================================
  citizenshipIssueDate: {
    type: Date,
  },
  citizenshipIssueDistrict: {
    type: String,
    trim: true,
  },
  citizenshipFront: {
    type: String,
    default: null,
  },
  citizenshipBack: {
    type: String,
    default: null,
  },
  nationalIdNumber: {
    type: String,
    trim: true,
  },
  nationalIdIssueDate: {
    type: Date,
  },
  nationalIdFront: {
    type: String,
    default: null,
  },

  // Passport
  passportNumber: {
    type: String,
    trim: true,
  },
  passportIssueDate: {
    type: Date,
  },
  passportExpiryDate: {
    type: Date,
  },
  passportPhoto: {
    type: String,
    default: null,
  },

  // Driving License
  drivingLicenseNumber: {
    type: String,
    trim: true,
  },
  drivingLicenseCategory: {
    type: String,
    trim: true,
  },
  drivingLicenseIssueDate: {
    type: Date,
  },
  drivingLicenseExpiryDate: {
    type: Date,
  },
  drivingLicensePhoto: {
    type: String,
    default: null,
  },

  // ============================================================
  // DOCUMENTS
  // ============================================================
  birthCertificate: {
    type: String,
    trim: true,
  },
  marriageCertificate: {
    type: String,
    trim: true,
  },
  deathCertificate: {
    type: String,
    trim: true,
  },
  panCard: {
    type: String,
    trim: true,
  },
  voterId: {
    type: String,
    trim: true,
  },

  // ============================================================
  // ADDITIONAL INFORMATION
  // ============================================================
  biography: {
    type: String,
    trim: true,
  },
  notes: {
    type: String,
    trim: true,
  },
  specialRemarks: {
    type: String,
    trim: true,
  },
  medicalNotes: {
    type: String,
    trim: true,
  },
  disabilityInfo: {
    type: String,
    trim: true,
  },

  // ============================================================
  // STATUS
  // ============================================================
  status: {
    type: String,
    enum: ['active', 'inactive', 'deceased'],
    default: 'active',
  },
  verificationStatus: {
    type: String,
    enum: ['verified', 'pending', 'rejected'],
    default: 'pending',
  },

  isAlive: {
    type: Boolean,
    default: true,
  },
  dod: {
    type: Date,
    default: null,
  },

  // ============================================================
  // BIDIRECTIONAL RELATIONSHIPS
  // ============================================================
  husband: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
  },
  wife: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
  },
  sons: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
    },
  ],
  daughters: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
    },
  ],
  elderBrothers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Member' }],
  youngerBrothers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Member' }],
  elderSisters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Member' }],
  youngerSisters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Member' }],
  grandsons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Member' }],
  granddaughters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Member' }],
  fatherInLaw: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
  motherInLaw: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
  sonInLaw: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Member' }],
  daughterInLaw: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Member' }],

  // ============================================================
  // MEDIA
  // ============================================================
  photo: {
    type: String,
    default: null,
  },

  // ============================================================
  // METADATA
  // ============================================================
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
}, {
  timestamps: true,
});

// ============================================================
// INDEXES
// ============================================================
memberSchema.index({
  name: 'text',
  surname: 'text',
  memberNumber: 'text',
  vanshaGenerationNumber: 'text',
  phone: 'text',
  email: 'text',
  citizenshipNumber: 'text',
});

memberSchema.index({ memberNumber: 1 }, { unique: true, sparse: true });
memberSchema.index({ phone: 1 });
memberSchema.index({ email: 1 });
memberSchema.index({ vanshaGenerationNumber: 1 });
memberSchema.index({ generation: 1 });
memberSchema.index({ generationMode: 1 });
memberSchema.index({ isAlive: 1 });
memberSchema.index({ gender: 1 });
memberSchema.index({ family: 1 });
memberSchema.index({ status: 1 });
memberSchema.index({ verificationStatus: 1 });
memberSchema.index({ citizenshipNumber: 1 });
memberSchema.index({ personStatus: 1 });
memberSchema.index({ family: 1, generation: 1 });
memberSchema.index({ family: 1, isAlive: 1 });

// ============================================================
// VIRTUALS
// ============================================================
memberSchema.virtual('fullName').get(function () {
  return this.surname ? `${this.name} ${this.surname}` : this.name;
});

memberSchema.virtual('age').get(function () {
  if (!this.dob) return null;
  const age = new Date().getFullYear() - this.dob.getFullYear();
  return age;
});

memberSchema.set('toJSON', { virtuals: true });
memberSchema.set('toObject', { virtuals: true });

// ============================================================
// PRE-SAVE: Generate M0001 format
// ============================================================
memberSchema.pre('save', async function () {
  if (this.isNew && !this.memberNumber) {
    const Counter = mongoose.model('Counter');
    const counter = await Counter.findByIdAndUpdate(
      'memberNumber',
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.memberNumber = `M${String(counter.seq).padStart(4, '0')}`;
  }
});

// ============================================================
// STATIC: Find existing member (duplicate prevention)
// ============================================================
memberSchema.statics.findExistingMember = async function (name, dob, familyId) {
  const query = {
    name: { $regex: new RegExp(`^${name}$`, 'i') },
  };

  if (dob) {
    query.dob = dob;
  }

  if (familyId) {
    query.family = familyId;
  }

  return this.findOne(query);
};

// ============================================================
// STATIC: Safe create with duplicate check
// ============================================================
memberSchema.statics.safeCreate = async function (memberData) {
  if (memberData.name && memberData.family) {
    const existing = await this.findOne({
      name: { $regex: new RegExp(`^${memberData.name}$`, 'i') },
      family: memberData.family,
      isAlive: true,
    });

    if (existing && !memberData.forceCreate) {
      throw new Error(`Member "${memberData.name}" already exists in this family`);
    }
  }

  const member = new this(memberData);
  await member.save();
  return member;
};

export default mongoose.model('Member', memberSchema);