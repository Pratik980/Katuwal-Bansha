
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const familyRelationshipSchema = new mongoose.Schema({
  uuid: {
    type: String,
    default: uuidv4,
    unique: true,
  },
  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true,
    index: true,
  },
  relatedMember: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true,
    index: true,
  },
  relationshipType: {
    type: String,
    enum: ['spouse', 'child', 'parent', 'sibling', 'grandparent', 'grandchild', 'aunt_uncle', 'cousin', 'other'],
    required: true,
  },
  isBidirectional: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },
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

// Compound index to prevent duplicate relationships
familyRelationshipSchema.index(
  { member: 1, relatedMember: 1, relationshipType: 1 },
  { unique: true }
);

// ✅ ADD THIS: Prevent duplicate spouse relationships
familyRelationshipSchema.index(
  { 
    member: 1, 
    relatedMember: 1, 
    relationshipType: 1 
  },
  { 
    unique: true,
    partialFilterExpression: { 
      relationshipType: { $in: ['spouse', 'husband', 'wife'] } 
    }
  }
);

// Indexes for performance
familyRelationshipSchema.index({ member: 1, relationshipType: 1 });
familyRelationshipSchema.index({ relatedMember: 1, relationshipType: 1 });

export default mongoose.model('FamilyRelationship', familyRelationshipSchema);