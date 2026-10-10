
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const familySchema = new mongoose.Schema(
  {
    uuid: {
      type: String,
      default: uuidv4,
      unique: true,
      index: true,
    },
    familyName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    familyNumber: {
      type: String,
      trim: true,
      index: true,
    },
    // ⭐ House Identifier - S1, S2, S3, etc.
    houseIdentifier: {
      type: String,
      trim: true,
      index: true,
    },
    house: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'House',
      required: true,
      index: true,
    },
    // ⭐ MANUAL ENTRY - user controls this value
    vanshaGenerationNumber: {
      type: String,
      trim: true,
      index: true,
    },
    // ⭐ Family Head - can be ObjectId OR manual text
    familyHead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      index: true,
    },
    // ⭐ NEW: Manual family head name (when not in DB)
    familyHeadName: {
      type: String,
      trim: true,
    },
    clan: {
      type: String,
      trim: true,
    },
    origin: {
      type: String,
      trim: true,
    },
    currentAddress: {
      type: String,
      trim: true,
    },
    headOfFamily: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
    },
    totalMembers: {
      type: Number,
      default: 0,
    },
    // ⭐ CALCULATED from actual tree - not manually entered
    totalGenerations: {
      type: Number,
      default: 0,
    },
    familyPhoto: {
      type: String,
      default: null,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open',
    },
    closedAt: {
      type: Date,
      default: null,
    },
    closedReason: {
      type: String,
      trim: true,
    },
    reopenedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for house + familyNumber uniqueness
familySchema.index({ house: 1, familyNumber: 1 }, { unique: true });

// Indexes for performance
familySchema.index({ familyName: 'text' });
familySchema.index({ status: 1 });
familySchema.index({ clan: 1 });
familySchema.index({ houseIdentifier: 1 });
familySchema.index({ vanshaGenerationNumber: 1 });

// Virtual populate: Family -> Members
familySchema.virtual('members', {
  ref: 'Member',
  localField: '_id',
  foreignField: 'family',
});

familySchema.set('toJSON', { virtuals: true });
familySchema.set('toObject', { virtuals: true });

// ============================================================
// STATICS: next free numbers
// The values are text ("9", "10", "S10"), so the largest is found by number.
// Sorting them as text would put "9" after "10" and hand out "10" again.
// ============================================================
const largestNumber = (values, pattern) =>
  values.reduce((largest, value) => {
    const match = String(value ?? '').match(pattern);
    const number = match ? parseInt(match[1], 10) : NaN;
    return Number.isNaN(number) ? largest : Math.max(largest, number);
  }, 0);

familySchema.statics.nextFamilyNumber = async function (houseId) {
  const used = await this.find({ house: houseId }).distinct('familyNumber');
  return String(largestNumber(used, /^(\d+)$/) + 1);
};

familySchema.statics.nextHouseIdentifier = async function () {
  const used = await this.find().distinct('houseIdentifier');
  return `S${largestNumber(used, /^S(\d+)$/) + 1}`;
};

// ============================================================
// PRE-SAVE: Auto-generate familyNumber and houseIdentifier
// ============================================================
familySchema.pre('save', async function() {
  if (this.isNew && !this.familyNumber) {
    this.familyNumber = await this.constructor.nextFamilyNumber(this.house);
    console.log(`📝 Auto-generated familyNumber: ${this.familyNumber} for house: ${this.house}`);
  }

  // Auto-generate houseIdentifier (S1, S2, S3, ...)
  if (this.isNew && !this.houseIdentifier) {
    this.houseIdentifier = await this.constructor.nextHouseIdentifier();
    console.log(`📝 Auto-generated houseIdentifier: ${this.houseIdentifier}`);
  }
});

// ============================================================
// METHOD: Recalculate totalGenerations from members
// ============================================================
familySchema.methods.recalculateGenerations = async function() {
  const Member = mongoose.model('Member');
  
  const members = await Member.find({ family: this._id })
    .select('generation generationMode')
    .lean();

  if (members.length === 0) {
    this.totalGenerations = 0;
  } else {
    // Use the maximum effective generation
    const maxGen = Math.max(
      ...members.map(m => m.generation || 1)
    );
    this.totalGenerations = maxGen;
  }

  await this.save();
  return this.totalGenerations;
};

export default mongoose.model('Family', familySchema);