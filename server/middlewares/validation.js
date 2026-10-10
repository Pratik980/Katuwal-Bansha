// middlewares/validation.js - COMPLETE FIXED FILE

import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';

export const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("Validation Errors:");
      console.log(errors.array());

      return res.status(400).json({
        errors: errors.array().map(err => ({
          field: err.path,
          message: err.msg,
        })),
      });
    }

    next();
  };
};

// House validation
export const houseValidation = [
  body('houseNumber')
    .optional()
    .trim()
    .matches(/^\d+$/)
    .withMessage('House number must be numeric'),
  body('houseName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('House name must be between 2 and 100 characters'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Address must be less than 200 characters'),
  body('district')
    .optional()
    .trim(),
  body('province')
    .optional()
    .trim(),
];

// Family validation
export const familyValidation = [
  body('familyName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Family name must be between 2 and 100 characters'),
  body('familyNumber')
    .optional()
    .trim(),
  body('house')
    .optional()
    .isMongoId()
    .withMessage('Invalid house ID'),
  body('houseNumber')
    .trim()
    .notEmpty()
    .withMessage('House number is required')
    .matches(/^\d+$/)
    .withMessage('House number must be numeric'),
  body('houseName')
    .optional()
    .trim(),
  body('vanshaGenerationNumber')
    .optional()
    .trim(),
  body('status')
    .optional()
    .isIn(['open', 'closed'])
    .withMessage('Invalid status'),
];

// Data Entry sends BS dates (YYYY-MM-DD, where a month can have 32 days); edits may resend an ISO date.
const isDateInput = (value) => {
  if (!value) return true;
  const text = String(value).trim();
  const match = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (match) {
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 32) return true;
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(text) && !Number.isNaN(new Date(text).getTime())) return true;
  throw new Error('Invalid date format');
};

// ⭐ FIXED: Member validation - relationship accepts any Nepali value
export const memberValidation = [
  // A person whose name is not known is saved as "नाम अज्ञात"
  body('name')
    .if((value, { req }) => req.body.personStatus !== 'unknown_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('gender')
    .isIn(['male', 'female', 'other'])
    .withMessage('Invalid gender'),
  body('rollNumber')
    .optional()
    .trim(),
  body('vanshaGenerationNumber')
    .optional()
    .trim(),
  // ⭐ FIXED: Accept any relationship value, no enum restriction
  body('relationship')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Relationship must be between 1 and 50 characters'),
  body('phone')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      if (!value) return true;
      const cleaned = String(value).replace(/\D/g, '');
      if (cleaned.length === 10) return true;
      if (cleaned.length === 0) return true;
      if (cleaned.length >= 7 && cleaned.length <= 15) return true;
      throw new Error('Invalid phone number - must be 10 digits');
    }),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Invalid email address'),
  body('dob')
    .optional()
    .custom(isDateInput),
  body('dod')
    .optional()
    .custom(isDateInput),
  // The house comes from the selected family, so the member form does not send one
  body('houseNumber')
    .optional()
    .trim(),
  body('district')
    .trim()
    .notEmpty()
    .withMessage('District is required'),
  body('country')
    .trim()
    .notEmpty()
    .withMessage('Country is required'),
  body('family')
    .optional()
    .isMongoId()
    .withMessage('Invalid family ID'),
  body('father')
    .optional()
    .custom((value) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid father ID');
      }
      return true;
    }),
  body('mother')
    .optional()
    .custom((value) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid mother ID');
      }
      return true;
    }),
  body('spouse')
    .optional()
    .custom((value) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid spouse ID');
      }
      return true;
    }),
  body('generation')
    .optional({ checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage('Generation must be a positive number'),
  body('parentRelationshipType')
    .optional({ checkFalsy: true })
    .isIn(['biological', 'adoptive', 'step', 'guardian', 'other'])
    .withMessage('Invalid parent relationship type'),
  body('childBirthOrder')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Child birth order must be a positive number'),
  body('lineageRole')
    .optional({ checkFalsy: true })
    .isIn(['lineage_head', 'lineage_member', 'spouse', 'other'])
    .withMessage('Invalid lineage role'),
  body('sons')
    .optional()
    .custom((value) => {
      if (!value) return true;
      if (Array.isArray(value)) {
        for (const id of value) {
          if (id && typeof id === 'string' && id.trim() !== '' && !mongoose.Types.ObjectId.isValid(id.trim())) {
            throw new Error('Invalid son ID format');
          }
        }
      }
      return true;
    }),
  body('daughters')
    .optional()
    .custom((value) => {
      if (!value) return true;
      if (Array.isArray(value)) {
        for (const id of value) {
          if (id && typeof id === 'string' && id.trim() !== '' && !mongoose.Types.ObjectId.isValid(id.trim())) {
            throw new Error('Invalid daughter ID format');
          }
        }
      }
      return true;
    }),
];

// ... existing code ...

export const donationValidation = [
  body('donorType')
    .isIn(['member', 'family', 'external'])
    .withMessage('Invalid donor type'),
  body('donorId')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      if (!value) return true;
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid donor ID format');
      }
      return true;
    }),
  body('donorName')
    .if(body('donorType').equals('external'))
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Donor name must be between 2 and 100 characters'),
  body('donorName')
    .if(body('donorType').not().equals('external'))
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Donor name must be between 2 and 100 characters'),
  body('donorPhone')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^[0-9]{10,15}$/)
    .withMessage('Invalid phone number'),
  body('donorEmail')
    .optional({ nullable: true, checkFalsy: true })
    .isEmail()
    .withMessage('Invalid email address'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('paymentMethod')
    .isIn(['qr', 'cash', 'bank_transfer', 'cheque'])
    .withMessage('Invalid payment method'),
  body('category')
    .optional()
    .isIn(['general', 'temple', 'education', 'emergency', 'event', 'other'])
    .withMessage('Invalid category'),
  body('donationDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
  // ❌ REMOVED: purpose validation
  body('remarks')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Remarks must be less than 500 characters'),
  body('isAnonymous')
    .optional()
    .isBoolean()
    .withMessage('isAnonymous must be a boolean'),
  body('qrPaymentCompleted')
    .optional()
    .isBoolean()
    .withMessage('qrPaymentCompleted must be a boolean'),
  // ⭐ UPDATED: paymentStatus with 'paid'
  body('paymentStatus')
    .optional()
    .isIn(['pending', 'paid', 'failed'])
    .withMessage('Invalid payment status'),
];

// ... existing code ...

export const relationshipValidation = [
  body('memberId')
    .isMongoId()
    .withMessage('Invalid member ID'),
  body('relatedMemberId')
    .isMongoId()
    .withMessage('Invalid related member ID')
    .custom((value, { req }) => {
      if (value === req.body.memberId) {
        throw new Error('Cannot relate a member to themselves');
      }
      return true;
    }),
  body('relationshipType')
    .isIn(['spouse', 'child', 'parent', 'sibling', 'grandparent', 'grandchild', 'aunt_uncle', 'cousin', 'other'])
    .withMessage('Invalid relationship type'),
];

export const documentValidation = [
  body('memberId')
    .isMongoId()
    .withMessage('Invalid member ID'),
  body('documentType')
    .isIn(['citizenship', 'birth_certificate', 'marriage_certificate', 'death_certificate', 'migration_certificate', 'educational_certificate', 'passport', 'photo_album', 'other'])
    .withMessage('Invalid document type'),
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
];

export const chatValidation = [
  body('room')
    .notEmpty()
    .withMessage('Room is required'),
  body('message')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters'),
];

export const notificationValidation = [
  body('type')
    .isIn(['member_added', 'member_updated', 'member_deleted', 'donation_added', 'document_uploaded', 'report_generated', 'family_added', 'family_updated', 'general'])
    .withMessage('Invalid notification type'),
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('message')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Message must be between 1 and 500 characters'),
];

export const draftValidation = [
  body('module')
    .isIn(['member', 'family', 'donation'])
    .withMessage('Invalid module'),
  body('data')
    .isObject()
    .withMessage('Data must be an object'),
];

// middlewares/validation.js - UPDATED with phone validation fix

// import { body, param, query, validationResult } from 'express-validator';
// import mongoose from 'mongoose';

// export const validate = (validations) => {
//   return async (req, res, next) => {
//     await Promise.all(validations.map(validation => validation.run(req)));

//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       console.log("Validation Errors:");
//       console.log(errors.array());

//       return res.status(400).json({
//         errors: errors.array().map(err => ({
//           field: err.path,
//           message: err.msg,
//         })),
//       });
//     }

//     next();
//   };
// };

// // House validation
// export const houseValidation = [
//   body('houseNumber')
//     .optional()
//     .trim()
//     .matches(/^\d+$/)
//     .withMessage('House number must be numeric'),
//   body('houseName')
//     .optional()
//     .trim()
//     .isLength({ min: 2, max: 100 })
//     .withMessage('House name must be between 2 and 100 characters'),
//   body('address')
//     .optional()
//     .trim()
//     .isLength({ max: 200 })
//     .withMessage('Address must be less than 200 characters'),
//   body('district')
//     .optional()
//     .trim(),
//   body('province')
//     .optional()
//     .trim(),
// ];
// // middlewares/validation.js - UPDATED familyValidation

// // Family validation - MODIFIED to accept houseNumber instead of house ID
// export const familyValidation = [
//   body('familyName')
//     .trim()
//     .isLength({ min: 2, max: 100 })
//     .withMessage('Family name must be between 2 and 100 characters'),
//   body('familyNumber')
//     .optional()
//     .trim(),
//   // ⭐ CHANGED: house is now optional, houseNumber is required
//   body('house')
//     .optional()
//     .isMongoId()
//     .withMessage('Invalid house ID'),
//   body('houseNumber')
//     .trim()
//     .notEmpty()
//     .withMessage('House number is required')
//     .matches(/^\d+$/)
//     .withMessage('House number must be numeric'),
//   body('houseName')
//     .optional()
//     .trim(),
//   body('vanshaGenerationNumber')
//     .optional()
//     .trim(),
//   body('status')
//     .optional()
//     .isIn(['open', 'closed'])
//     .withMessage('Invalid status'),
// ];
// // // Member validation - FIXED phone validation
// // export const memberValidation = [
// //   body('name')
// //     .trim()
// //     .isLength({ min: 2, max: 100 })
// //     .withMessage('Name must be between 2 and 100 characters'),
// //   body('gender')
// //     .isIn(['male', 'female', 'other'])
// //     .withMessage('Invalid gender'),
// //   body('rollNumber')
// //     .optional()
// //     .trim(),
// //   body('vanshaGenerationNumber')
// //     .optional()
// //     .trim(),
// //   body('relationship')
// //     .optional()
// //     .isIn(['member', 'spouse', 'child', 'parent', 'sibling', 'grandparent', 'grandchild', 'other'])
// //     .withMessage('Invalid relation'),
// //   body('phone')
// //     .optional({ nullable: true, checkFalsy: true })
// //     .custom((value) => {
// //       if (!value) return true;
// //       // Remove any non-digit characters
// //       const cleaned = String(value).replace(/\D/g, '');
// //       // Accept 10-digit numbers (Nepali mobile) or empty
// //       if (cleaned.length === 10) return true;
// //       if (cleaned.length === 0) return true;
// //       // Accept any phone with reasonable length (allow international)
// //       if (cleaned.length >= 7 && cleaned.length <= 15) return true;
// //       throw new Error('Invalid phone number - must be 10 digits');
// //     }),
// //   body('email')
// //     .optional()
// //     .isEmail()
// //     .withMessage('Invalid email address'),
// //   body('dob')
// //     .optional()
// //     .isISO8601()
// //     .withMessage('Invalid date format'),
// //   body('houseNumber')
// //     .trim()
// //     .notEmpty()
// //     .withMessage('House number is required'),
// //   body('district')
// //     .trim()
// //     .notEmpty()
// //     .withMessage('District is required'),
// //   body('country')
// //     .trim()
// //     .notEmpty()
// //     .withMessage('Country is required'),
// //   body('family')
// //     .optional()
// //     .isMongoId()
// //     .withMessage('Invalid family ID'),
// //   body('father')
// //     .optional()
// //     .custom((value) => {
// //       if (value && !mongoose.Types.ObjectId.isValid(value)) {
// //         throw new Error('Invalid father ID');
// //       }
// //       return true;
// //     }),
// //   body('mother')
// //     .optional()
// //     .custom((value) => {
// //       if (value && !mongoose.Types.ObjectId.isValid(value)) {
// //         throw new Error('Invalid mother ID');
// //       }
// //       return true;
// //     }),
// //   body('spouse')
// //     .optional()
// //     .custom((value) => {
// //       if (value && !mongoose.Types.ObjectId.isValid(value)) {
// //         throw new Error('Invalid spouse ID');
// //       }
// //       return true;
// //     }),
// //   body('generation')
// //     .optional()
// //     .isInt({ min: 0 })
// //     .withMessage('Generation must be a positive number'),
// //   body('parentRelationshipType')
// //     .optional()
// //     .isIn(['biological', 'adoptive', 'step', 'guardian', 'other'])
// //     .withMessage('Invalid parent relationship type'),
// //   body('childBirthOrder')
// //     .optional()
// //     .isInt({ min: 1 })
// //     .withMessage('Child birth order must be a positive number'),
// //   body('lineageRole')
// //     .optional()
// //     .isIn(['lineage_head', 'lineage_member', 'spouse', 'other'])
// //     .withMessage('Invalid lineage role'),
// //   // Array fields - ensure they are arrays of valid ObjectIds
// //   body('sons')
// //     .optional()
// //     .custom((value) => {
// //       if (!value) return true;
// //       if (Array.isArray(value)) {
// //         for (const id of value) {
// //           if (id && typeof id === 'string' && id.trim() !== '' && !mongoose.Types.ObjectId.isValid(id.trim())) {
// //             throw new Error('Invalid son ID format');
// //           }
// //         }
// //       }
// //       return true;
// //     }),
// //   body('daughters')
// //     .optional()
// //     .custom((value) => {
// //       if (!value) return true;
// //       if (Array.isArray(value)) {
// //         for (const id of value) {
// //           if (id && typeof id === 'string' && id.trim() !== '' && !mongoose.Types.ObjectId.isValid(id.trim())) {
// //             throw new Error('Invalid daughter ID format');
// //           }
// //         }
// //       }
// //       return true;
// //     }),
// // ];

// export const memberValidation = [
//   body('name')
//     .trim()
//     .isLength({ min: 2, max: 100 })
//     .withMessage('Name must be between 2 and 100 characters'),
//   body('gender')
//     .isIn(['male', 'female', 'other'])
//     .withMessage('Invalid gender'),
//   body('rollNumber')
//     .optional()
//     .trim(),
//   body('vanshaGenerationNumber')
//     .optional()
//     .trim(),
//   // ⭐ UPDATED: Relationship - allow any string, no enum restriction
//   body('relationship')
//     .optional()
//     .trim()
//     .isLength({ min: 1, max: 50 })
//     .withMessage('Relationship must be between 1 and 50 characters'),
//   body('phone')
//     .optional({ nullable: true, checkFalsy: true })
//     .custom((value) => {
//       if (!value) return true;
//       const cleaned = String(value).replace(/\D/g, '');
//       if (cleaned.length === 10) return true;
//       if (cleaned.length === 0) return true;
//       if (cleaned.length >= 7 && cleaned.length <= 15) return true;
//       throw new Error('Invalid phone number - must be 10 digits');
//     }),
//   body('email')
//     .optional()
//     .isEmail()
//     .withMessage('Invalid email address'),
//   body('dob')
//     .optional()
//     .isISO8601()
//     .withMessage('Invalid date format'),
//   body('houseNumber')
//     .trim()
//     .notEmpty()
//     .withMessage('House number is required'),
//   body('district')
//     .trim()
//     .notEmpty()
//     .withMessage('District is required'),
//   body('country')
//     .trim()
//     .notEmpty()
//     .withMessage('Country is required'),
//   body('family')
//     .optional()
//     .isMongoId()
//     .withMessage('Invalid family ID'),
//   body('father')
//     .optional()
//     .custom((value) => {
//       if (value && !mongoose.Types.ObjectId.isValid(value)) {
//         throw new Error('Invalid father ID');
//       }
//       return true;
//     }),
//   body('mother')
//     .optional()
//     .custom((value) => {
//       if (value && !mongoose.Types.ObjectId.isValid(value)) {
//         throw new Error('Invalid mother ID');
//       }
//       return true;
//     }),
//   body('spouse')
//     .optional()
//     .custom((value) => {
//       if (value && !mongoose.Types.ObjectId.isValid(value)) {
//         throw new Error('Invalid spouse ID');
//       }
//       return true;
//     }),
//   body('generation')
//     .optional()
//     .isInt({ min: 0 })
//     .withMessage('Generation must be a positive number'),
//   body('parentRelationshipType')
//     .optional()
//     .isIn(['biological', 'adoptive', 'step', 'guardian', 'other'])
//     .withMessage('Invalid parent relationship type'),
//   body('childBirthOrder')
//     .optional()
//     .isInt({ min: 1 })
//     .withMessage('Child birth order must be a positive number'),
//   body('lineageRole')
//     .optional()
//     .isIn(['lineage_head', 'lineage_member', 'spouse', 'other'])
//     .withMessage('Invalid lineage role'),
//   body('sons')
//     .optional()
//     .custom((value) => {
//       if (!value) return true;
//       if (Array.isArray(value)) {
//         for (const id of value) {
//           if (id && typeof id === 'string' && id.trim() !== '' && !mongoose.Types.ObjectId.isValid(id.trim())) {
//             throw new Error('Invalid son ID format');
//           }
//         }
//       }
//       return true;
//     }),
//   body('daughters')
//     .optional()
//     .custom((value) => {
//       if (!value) return true;
//       if (Array.isArray(value)) {
//         for (const id of value) {
//           if (id && typeof id === 'string' && id.trim() !== '' && !mongoose.Types.ObjectId.isValid(id.trim())) {
//             throw new Error('Invalid daughter ID format');
//           }
//         }
//       }
//       return true;
//     }),
// ];


// // Rest of validation functions...
// export const donationValidation = [
//   body('donorType')
//     .isIn(['member', 'family', 'external'])
//     .withMessage('Invalid donor type'),
//   body('donorId')
//     .optional({ nullable: true, checkFalsy: true })
//     .custom((value) => {
//       if (!value) return true;
//       if (!mongoose.Types.ObjectId.isValid(value)) {
//         throw new Error('Invalid donor ID format');
//       }
//       return true;
//     }),
//   body('donorName')
//     .if(body('donorType').equals('external'))
//     .trim()
//     .isLength({ min: 2, max: 100 })
//     .withMessage('Donor name must be between 2 and 100 characters'),
//   body('donorName')
//     .if(body('donorType').not().equals('external'))
//     .optional()
//     .trim()
//     .isLength({ min: 2, max: 100 })
//     .withMessage('Donor name must be between 2 and 100 characters'),
//   body('donorPhone')
//     .optional({ nullable: true, checkFalsy: true })
//     .matches(/^[0-9]{10,15}$/)
//     .withMessage('Invalid phone number'),
//   body('donorEmail')
//     .optional({ nullable: true, checkFalsy: true })
//     .isEmail()
//     .withMessage('Invalid email address'),
//   body('amount')
//     .isFloat({ min: 0.01 })
//     .withMessage('Amount must be greater than 0'),
//   body('paymentMethod')
//     .isIn(['qr', 'cash', 'bank_transfer', 'cheque'])
//     .withMessage('Invalid payment method'),
//   body('category')
//     .optional()
//     .isIn(['general', 'temple', 'education', 'emergency', 'event', 'other'])
//     .withMessage('Invalid category'),
//   body('donationDate')
//     .optional()
//     .isISO8601()
//     .withMessage('Invalid date format'),
//   body('purpose')
//     .optional()
//     .trim()
//     .isLength({ max: 200 })
//     .withMessage('Purpose must be less than 200 characters'),
//   body('remarks')
//     .optional()
//     .trim()
//     .isLength({ max: 500 })
//     .withMessage('Remarks must be less than 500 characters'),
//   body('isAnonymous')
//     .optional()
//     .isBoolean()
//     .withMessage('isAnonymous must be a boolean'),
//   body('qrPaymentCompleted')
//     .optional()
//     .isBoolean()
//     .withMessage('qrPaymentCompleted must be a boolean'),
//   body('paymentStatus')
//     .optional()
//     .isIn(['pending', 'completed', 'failed'])
//     .withMessage('Invalid payment status'),
// ];

// export const relationshipValidation = [
//   body('memberId')
//     .isMongoId()
//     .withMessage('Invalid member ID'),
//   body('relatedMemberId')
//     .isMongoId()
//     .withMessage('Invalid related member ID')
//     .custom((value, { req }) => {
//       if (value === req.body.memberId) {
//         throw new Error('Cannot relate a member to themselves');
//       }
//       return true;
//     }),
//   body('relationshipType')
//     .isIn(['spouse', 'child', 'parent', 'sibling', 'grandparent', 'grandchild', 'aunt_uncle', 'cousin', 'other'])
//     .withMessage('Invalid relationship type'),
// ];

// export const documentValidation = [
//   body('memberId')
//     .isMongoId()
//     .withMessage('Invalid member ID'),
//   body('documentType')
//     .isIn(['citizenship', 'birth_certificate', 'marriage_certificate', 'death_certificate', 'migration_certificate', 'educational_certificate', 'passport', 'photo_album', 'other'])
//     .withMessage('Invalid document type'),
//   body('title')
//     .trim()
//     .isLength({ min: 1, max: 200 })
//     .withMessage('Title must be between 1 and 200 characters'),
// ];

// export const chatValidation = [
//   body('room')
//     .notEmpty()
//     .withMessage('Room is required'),
//   body('message')
//     .trim()
//     .isLength({ min: 1, max: 1000 })
//     .withMessage('Message must be between 1 and 1000 characters'),
// ];

// export const notificationValidation = [
//   body('type')
//     .isIn(['member_added', 'member_updated', 'member_deleted', 'donation_added', 'document_uploaded', 'report_generated', 'family_added', 'family_updated', 'general'])
//     .withMessage('Invalid notification type'),
//   body('title')
//     .trim()
//     .isLength({ min: 1, max: 200 })
//     .withMessage('Title must be between 1 and 200 characters'),
//   body('message')
//     .trim()
//     .isLength({ min: 1, max: 500 })
//     .withMessage('Message must be between 1 and 500 characters'),
// ];

// export const draftValidation = [
//   body('module')
//     .isIn(['member', 'family', 'donation'])
//     .withMessage('Invalid module'),
//   body('data')
//     .isObject()
//     .withMessage('Data must be an object'),
// ];


// // middlewares/validation.js - UPDATED with array field handling

// import { body, param, query, validationResult } from 'express-validator';
// import mongoose from 'mongoose';

// export const validate = (validations) => {
//   return async (req, res, next) => {
//     await Promise.all(validations.map(validation => validation.run(req)));

//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       console.log("Validation Errors:");
//       console.log(errors.array());

//       return res.status(400).json({
//         errors: errors.array().map(err => ({
//           field: err.path,
//           message: err.msg,
//         })),
//       });
//     }

//     next();
//   };
// };

// // House validation
// export const houseValidation = [
//   body('houseNumber')
//     .optional()
//     .trim()
//     .matches(/^\d+$/)
//     .withMessage('House number must be numeric'),
//   body('houseName')
//     .optional()
//     .trim()
//     .isLength({ min: 2, max: 100 })
//     .withMessage('House name must be between 2 and 100 characters'),
//   body('address')
//     .optional()
//     .trim()
//     .isLength({ max: 200 })
//     .withMessage('Address must be less than 200 characters'),
//   body('district')
//     .optional()
//     .trim(),
//   body('province')
//     .optional()
//     .trim(),
// ];

// // Updated Family validation
// export const familyValidation = [
//   body('familyName')
//     .trim()
//     .isLength({ min: 2, max: 100 })
//     .withMessage('Family name must be between 2 and 100 characters'),
//   body('familyNumber')
//     .optional()
//     .trim(),
//   body('house')
//     .isMongoId()
//     .withMessage('Invalid house ID'),
//   body('vanshaGenerationNumber')
//     .optional()
//     .trim(),
//   body('status')
//     .optional()
//     .isIn(['open', 'closed'])
//     .withMessage('Invalid status'),
// ];

// // Updated Member validation with array field handling
// export const memberValidation = [
//   body('name')
//     .trim()
//     .isLength({ min: 2, max: 100 })
//     .withMessage('Name must be between 2 and 100 characters'),
//   body('gender')
//     .isIn(['male', 'female', 'other'])
//     .withMessage('Invalid gender'),
//   body('rollNumber')
//     .optional()
//     .trim(),
//   body('vanshaGenerationNumber')
//     .optional()
//     .trim(),
//   body('relationship')
//     .optional()
//     .isIn(['member', 'spouse', 'child', 'parent', 'sibling', 'grandparent', 'grandchild', 'other'])
//     .withMessage('Invalid relation'),
//   body('phone')
//     .optional()
//     .matches(/^[0-9]{10,15}$/)
//     .withMessage('Invalid phone number'),
//   body('email')
//     .optional()
//     .isEmail()
//     .withMessage('Invalid email address'),
//   body('dob')
//     .optional()
//     .isISO8601()
//     .withMessage('Invalid date format'),
//   body('houseNumber')
//     .trim()
//     .notEmpty()
//     .withMessage('House number is required'),
//   body('district')
//     .trim()
//     .notEmpty()
//     .withMessage('District is required'),
//   body('country')
//     .trim()
//     .notEmpty()
//     .withMessage('Country is required'),
//   body('family')
//     .optional()
//     .isMongoId()
//     .withMessage('Invalid family ID'),
//   body('father')
//     .optional()
//     .custom((value) => {
//       if (value && !mongoose.Types.ObjectId.isValid(value)) {
//         throw new Error('Invalid father ID');
//       }
//       return true;
//     }),
//   body('mother')
//     .optional()
//     .custom((value) => {
//       if (value && !mongoose.Types.ObjectId.isValid(value)) {
//         throw new Error('Invalid mother ID');
//       }
//       return true;
//     }),
//   body('spouse')
//     .optional()
//     .custom((value) => {
//       if (value && !mongoose.Types.ObjectId.isValid(value)) {
//         throw new Error('Invalid spouse ID');
//       }
//       return true;
//     }),
//   body('generation')
//     .optional()
//     .isInt({ min: 0 })
//     .withMessage('Generation must be a positive number'),
//   body('parentRelationshipType')
//     .optional()
//     .isIn(['biological', 'adoptive', 'step', 'guardian', 'other'])
//     .withMessage('Invalid parent relationship type'),
//   body('childBirthOrder')
//     .optional()
//     .isInt({ min: 1 })
//     .withMessage('Child birth order must be a positive number'),
//   body('lineageRole')
//     .optional()
//     .isIn(['lineage_head', 'lineage_member', 'spouse', 'other'])
//     .withMessage('Invalid lineage role'),
//   // Array fields - ensure they are arrays of valid ObjectIds
//   body('sons')
//     .optional()
//     .custom((value) => {
//       if (!value) return true;
//       if (Array.isArray(value)) {
//         for (const id of value) {
//           if (id && typeof id === 'string' && id.trim() !== '' && !mongoose.Types.ObjectId.isValid(id.trim())) {
//             throw new Error('Invalid son ID format');
//           }
//         }
//       }
//       return true;
//     }),
//   body('daughters')
//     .optional()
//     .custom((value) => {
//       if (!value) return true;
//       if (Array.isArray(value)) {
//         for (const id of value) {
//           if (id && typeof id === 'string' && id.trim() !== '' && !mongoose.Types.ObjectId.isValid(id.trim())) {
//             throw new Error('Invalid daughter ID format');
//           }
//         }
//       }
//       return true;
//     }),
// ];

// // Rest of validation functions remain the same...
// export const donationValidation = [
//   body('donorType')
//     .isIn(['member', 'family', 'external'])
//     .withMessage('Invalid donor type'),
//   body('donorId')
//     .optional({ nullable: true, checkFalsy: true })
//     .custom((value) => {
//       if (!value) return true;
//       if (!mongoose.Types.ObjectId.isValid(value)) {
//         throw new Error('Invalid donor ID format');
//       }
//       return true;
//     }),
//   body('donorName')
//     .if(body('donorType').equals('external'))
//     .trim()
//     .isLength({ min: 2, max: 100 })
//     .withMessage('Donor name must be between 2 and 100 characters'),
//   body('donorName')
//     .if(body('donorType').not().equals('external'))
//     .optional()
//     .trim()
//     .isLength({ min: 2, max: 100 })
//     .withMessage('Donor name must be between 2 and 100 characters'),
//   body('donorPhone')
//     .optional({ nullable: true, checkFalsy: true })
//     .matches(/^[0-9]{10,15}$/)
//     .withMessage('Invalid phone number'),
//   body('donorEmail')
//     .optional({ nullable: true, checkFalsy: true })
//     .isEmail()
//     .withMessage('Invalid email address'),
//   body('amount')
//     .isFloat({ min: 0.01 })
//     .withMessage('Amount must be greater than 0'),
//   body('paymentMethod')
//     .isIn(['qr', 'cash', 'bank_transfer', 'cheque'])
//     .withMessage('Invalid payment method'),
//   body('category')
//     .optional()
//     .isIn(['general', 'temple', 'education', 'emergency', 'event', 'other'])
//     .withMessage('Invalid category'),
//   body('donationDate')
//     .optional()
//     .isISO8601()
//     .withMessage('Invalid date format'),
//   body('purpose')
//     .optional()
//     .trim()
//     .isLength({ max: 200 })
//     .withMessage('Purpose must be less than 200 characters'),
//   body('remarks')
//     .optional()
//     .trim()
//     .isLength({ max: 500 })
//     .withMessage('Remarks must be less than 500 characters'),
//   body('isAnonymous')
//     .optional()
//     .isBoolean()
//     .withMessage('isAnonymous must be a boolean'),
//   body('qrPaymentCompleted')
//     .optional()
//     .isBoolean()
//     .withMessage('qrPaymentCompleted must be a boolean'),
//   body('paymentStatus')
//     .optional()
//     .isIn(['pending', 'completed', 'failed'])
//     .withMessage('Invalid payment status'),
// ];

// export const relationshipValidation = [
//   body('memberId')
//     .isMongoId()
//     .withMessage('Invalid member ID'),
//   body('relatedMemberId')
//     .isMongoId()
//     .withMessage('Invalid related member ID')
//     .custom((value, { req }) => {
//       if (value === req.body.memberId) {
//         throw new Error('Cannot relate a member to themselves');
//       }
//       return true;
//     }),
//   body('relationshipType')
//     .isIn(['spouse', 'child', 'parent', 'sibling', 'grandparent', 'grandchild', 'aunt_uncle', 'cousin', 'other'])
//     .withMessage('Invalid relationship type'),
// ];

// export const documentValidation = [
//   body('memberId')
//     .isMongoId()
//     .withMessage('Invalid member ID'),
//   body('documentType')
//     .isIn(['citizenship', 'birth_certificate', 'marriage_certificate', 'death_certificate', 'migration_certificate', 'educational_certificate', 'passport', 'photo_album', 'other'])
//     .withMessage('Invalid document type'),
//   body('title')
//     .trim()
//     .isLength({ min: 1, max: 200 })
//     .withMessage('Title must be between 1 and 200 characters'),
// ];

// export const chatValidation = [
//   body('room')
//     .notEmpty()
//     .withMessage('Room is required'),
//   body('message')
//     .trim()
//     .isLength({ min: 1, max: 1000 })
//     .withMessage('Message must be between 1 and 1000 characters'),
// ];

// export const notificationValidation = [
//   body('type')
//     .isIn(['member_added', 'member_updated', 'member_deleted', 'donation_added', 'document_uploaded', 'report_generated', 'family_added', 'family_updated', 'general'])
//     .withMessage('Invalid notification type'),
//   body('title')
//     .trim()
//     .isLength({ min: 1, max: 200 })
//     .withMessage('Title must be between 1 and 200 characters'),
//   body('message')
//     .trim()
//     .isLength({ min: 1, max: 500 })
//     .withMessage('Message must be between 1 and 500 characters'),
// ];

// export const draftValidation = [
//   body('module')
//     .isIn(['member', 'family', 'donation'])
//     .withMessage('Invalid module'),
//   body('data')
//     .isObject()
//     .withMessage('Data must be an object'),
// ];

// // middlewares/validation.js - UPDATED
// import { body, param, query, validationResult } from 'express-validator';
// import mongoose from 'mongoose';

// export const validate = (validations) => {
//   return async (req, res, next) => {
//     await Promise.all(validations.map(validation => validation.run(req)));

//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       console.log("Validation Errors:");
//       console.log(errors.array());

//       return res.status(400).json({
//         errors: errors.array().map(err => ({
//           field: err.path,
//           message: err.msg,
//         })),
//       });
//     }

//     next();
//   };
// };

// // House validation
// export const houseValidation = [
//   body('houseNumber')
//     .optional()
//     .trim()
//     .matches(/^\d+$/)
//     .withMessage('House number must be numeric'),
//   body('houseName')
//     .optional()
//     .trim()
//     .isLength({ min: 2, max: 100 })
//     .withMessage('House name must be between 2 and 100 characters'),
//   body('address')
//     .optional()
//     .trim()
//     .isLength({ max: 200 })
//     .withMessage('Address must be less than 200 characters'),
//   body('district')
//     .optional()
//     .trim(),
//   body('province')
//     .optional()
//     .trim(),
// ];

// // Updated Family validation
// export const familyValidation = [
//   body('familyName')
//     .trim()
//     .isLength({ min: 2, max: 100 })
//     .withMessage('Family name must be between 2 and 100 characters'),
//   body('familyNumber')
//     .optional()
//     .trim(),
//   body('house')
//     .isMongoId()
//     .withMessage('Invalid house ID'),
//   body('vanshaGenerationNumber')
//     .optional()
//     .trim(),
//   body('status')
//     .optional()
//     .isIn(['open', 'closed'])
//     .withMessage('Invalid status'),
// ];

// // Updated Member validation
// export const memberValidation = [
//   body('name')
//     .trim()
//     .isLength({ min: 2, max: 100 })
//     .withMessage('Name must be between 2 and 100 characters'),
//   body('gender')
//     .isIn(['male', 'female', 'other'])
//     .withMessage('Invalid gender'),
//   body('rollNumber')
//     .optional()
//     .trim(),
//   body('vanshaGenerationNumber')
//     .optional()
//     .trim(),
//   body('relationship')
//     .optional()
//     .isIn(['member', 'spouse', 'child', 'parent', 'sibling', 'grandparent', 'grandchild', 'other'])
//     .withMessage('Invalid relation'),
//   body('phone')
//     .optional()
//     .matches(/^[0-9]{10,15}$/)
//     .withMessage('Invalid phone number'),
//   body('email')
//     .optional()
//     .isEmail()
//     .withMessage('Invalid email address'),
//   body('dob')
//     .optional()
//     .isISO8601()
//     .withMessage('Invalid date format'),
//   body('houseNumber')
//     .trim()
//     .notEmpty()
//     .withMessage('House number is required'),
//   body('district')
//     .trim()
//     .notEmpty()
//     .withMessage('District is required'),
//   body('country')
//     .trim()
//     .notEmpty()
//     .withMessage('Country is required'),
//   body('family')
//     .optional()
//     .isMongoId()
//     .withMessage('Invalid family ID'),
//   body('father')
//     .optional()
//     .custom((value) => {
//       if (value && !mongoose.Types.ObjectId.isValid(value)) {
//         throw new Error('Invalid father ID');
//       }
//       return true;
//     }),
//   body('mother')
//     .optional()
//     .custom((value) => {
//       if (value && !mongoose.Types.ObjectId.isValid(value)) {
//         throw new Error('Invalid mother ID');
//       }
//       return true;
//     }),
//   body('spouse')
//     .optional()
//     .custom((value) => {
//       if (value && !mongoose.Types.ObjectId.isValid(value)) {
//         throw new Error('Invalid spouse ID');
//       }
//       return true;
//     }),
//   body('generation')
//     .optional()
//     .isInt({ min: 0 })
//     .withMessage('Generation must be a positive number'),
//   body('parentRelationshipType')
//     .optional()
//     .isIn(['biological', 'adoptive', 'step', 'guardian', 'other'])
//     .withMessage('Invalid parent relationship type'),
//   body('childBirthOrder')
//     .optional()
//     .isInt({ min: 1 })
//     .withMessage('Child birth order must be a positive number'),
//   body('lineageRole')
//     .optional()
//     .isIn(['lineage_head', 'lineage_member', 'spouse', 'other'])
//     .withMessage('Invalid lineage role'),
// ];

// // Rest of validation functions remain the same...
// export const donationValidation = [
//   body('donorType')
//     .isIn(['member', 'family', 'external'])
//     .withMessage('Invalid donor type'),
//   body('donorId')
//     .optional({ nullable: true, checkFalsy: true })
//     .custom((value) => {
//       if (!value) return true;
//       if (!mongoose.Types.ObjectId.isValid(value)) {
//         throw new Error('Invalid donor ID format');
//       }
//       return true;
//     }),
//   body('donorName')
//     .if(body('donorType').equals('external'))
//     .trim()
//     .isLength({ min: 2, max: 100 })
//     .withMessage('Donor name must be between 2 and 100 characters'),
//   body('donorName')
//     .if(body('donorType').not().equals('external'))
//     .optional()
//     .trim()
//     .isLength({ min: 2, max: 100 })
//     .withMessage('Donor name must be between 2 and 100 characters'),
//   body('donorPhone')
//     .optional({ nullable: true, checkFalsy: true })
//     .matches(/^[0-9]{10,15}$/)
//     .withMessage('Invalid phone number'),
//   body('donorEmail')
//     .optional({ nullable: true, checkFalsy: true })
//     .isEmail()
//     .withMessage('Invalid email address'),
//   body('amount')
//     .isFloat({ min: 0.01 })
//     .withMessage('Amount must be greater than 0'),
//   body('paymentMethod')
//     .isIn(['qr', 'cash', 'bank_transfer', 'cheque'])
//     .withMessage('Invalid payment method'),
//   body('category')
//     .optional()
//     .isIn(['general', 'temple', 'education', 'emergency', 'event', 'other'])
//     .withMessage('Invalid category'),
//   body('donationDate')
//     .optional()
//     .isISO8601()
//     .withMessage('Invalid date format'),
//   body('purpose')
//     .optional()
//     .trim()
//     .isLength({ max: 200 })
//     .withMessage('Purpose must be less than 200 characters'),
//   body('remarks')
//     .optional()
//     .trim()
//     .isLength({ max: 500 })
//     .withMessage('Remarks must be less than 500 characters'),
//   body('isAnonymous')
//     .optional()
//     .isBoolean()
//     .withMessage('isAnonymous must be a boolean'),
//   body('qrPaymentCompleted')
//     .optional()
//     .isBoolean()
//     .withMessage('qrPaymentCompleted must be a boolean'),
//   body('paymentStatus')
//     .optional()
//     .isIn(['pending', 'completed', 'failed'])
//     .withMessage('Invalid payment status'),
// ];

// export const relationshipValidation = [
//   body('memberId')
//     .isMongoId()
//     .withMessage('Invalid member ID'),
//   body('relatedMemberId')
//     .isMongoId()
//     .withMessage('Invalid related member ID')
//     .custom((value, { req }) => {
//       if (value === req.body.memberId) {
//         throw new Error('Cannot relate a member to themselves');
//       }
//       return true;
//     }),
//   body('relationshipType')
//     .isIn(['spouse', 'child', 'parent', 'sibling', 'grandparent', 'grandchild', 'aunt_uncle', 'cousin', 'other'])
//     .withMessage('Invalid relationship type'),
// ];

// export const documentValidation = [
//   body('memberId')
//     .isMongoId()
//     .withMessage('Invalid member ID'),
//   body('documentType')
//     .isIn(['citizenship', 'birth_certificate', 'marriage_certificate', 'death_certificate', 'migration_certificate', 'educational_certificate', 'passport', 'photo_album', 'other'])
//     .withMessage('Invalid document type'),
//   body('title')
//     .trim()
//     .isLength({ min: 1, max: 200 })
//     .withMessage('Title must be between 1 and 200 characters'),
// ];

// export const chatValidation = [
//   body('room')
//     .notEmpty()
//     .withMessage('Room is required'),
//   body('message')
//     .trim()
//     .isLength({ min: 1, max: 1000 })
//     .withMessage('Message must be between 1 and 1000 characters'),
// ];

// export const notificationValidation = [
//   body('type')
//     .isIn(['member_added', 'member_updated', 'member_deleted', 'donation_added', 'document_uploaded', 'report_generated', 'family_added', 'family_updated', 'general'])
//     .withMessage('Invalid notification type'),
//   body('title')
//     .trim()
//     .isLength({ min: 1, max: 200 })
//     .withMessage('Title must be between 1 and 200 characters'),
//   body('message')
//     .trim()
//     .isLength({ min: 1, max: 500 })
//     .withMessage('Message must be between 1 and 500 characters'),
// ];

// export const draftValidation = [
//   body('module')
//     .isIn(['member', 'family', 'donation'])
//     .withMessage('Invalid module'),
//   body('data')
//     .isObject()
//     .withMessage('Data must be an object'),
// ];

// // middlewares/validation.js
// import { body, param, query, validationResult } from 'express-validator';

// export const validate = (validations) => {
//   return async (req, res, next) => {
//     await Promise.all(validations.map(validation => validation.run(req)));

//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       console.log("Validation Errors:");
//       console.log(errors.array());

//       return res.status(400).json({
//         errors: errors.array().map(err => ({
//           field: err.path,
//           message: err.msg,
//         })),
//       });
//     }

//     // Only proceed to next if no errors
//     next();
//   };
// };

// // Rest of your validation functions remain the same...
// export const memberValidation = [
//   body('name')
//     .trim()
//     .isLength({ min: 2, max: 100 })
//     .withMessage('Name must be between 2 and 100 characters'),
//   body('gender')
//     .isIn(['male', 'female', 'other'])
//     .withMessage('Invalid gender'),
//   body('relation')
//     .optional()
//     .isIn(['member', 'spouse', 'child', 'parent', 'sibling', 'grandparent', 'grandchild', 'other'])
//     .withMessage('Invalid relation'),
//   body('phone')
//     .optional()
//     .matches(/^[0-9]{10,15}$/)
//     .withMessage('Invalid phone number'),
//   body('email')
//     .optional()
//     .isEmail()
//     .withMessage('Invalid email address'),
//   body('dob')
//     .optional()
//     .isISO8601()
//     .withMessage('Invalid date format'),
//   body('familyNumber')
//     .optional()
//     .trim(),
//   body('generation')
//     .optional()
//     .isInt({ min: 0 })
//     .withMessage('Generation must be a positive number'),
// ];



// // Donation Validation - FIXED
// export const donationValidation = [
//   // Donor Information
//   body('donorType')
//     .isIn(['member', 'family', 'external'])
//     .withMessage('Invalid donor type'),
  
//   body('donorId')
//     .optional({ nullable: true, checkFalsy: true })
//     .custom((value) => {
//       // Skip validation if value is null, undefined, or empty string
//       if (!value) return true;
//       // Validate MongoDB ObjectId
//       if (!mongoose.Types.ObjectId.isValid(value)) {
//         throw new Error('Invalid donor ID format');
//       }
//       return true;
//     }),
  
//   body('donorName')
//     .if(body('donorType').equals('external'))
//     .trim()
//     .isLength({ min: 2, max: 100 })
//     .withMessage('Donor name must be between 2 and 100 characters'),
  
//   body('donorName')
//     .if(body('donorType').not().equals('external'))
//     .optional()
//     .trim()
//     .isLength({ min: 2, max: 100 })
//     .withMessage('Donor name must be between 2 and 100 characters'),
  
//   body('donorPhone')
//     .optional({ nullable: true, checkFalsy: true })
//     .matches(/^[0-9]{10,15}$/)
//     .withMessage('Invalid phone number'),
  
//   body('donorEmail')
//     .optional({ nullable: true, checkFalsy: true })
//     .isEmail()
//     .withMessage('Invalid email address'),
  
//   // Donation Details
//   body('amount')
//     .isFloat({ min: 0.01 })
//     .withMessage('Amount must be greater than 0'),
  
//   body('paymentMethod')
//     .isIn(['qr', 'cash', 'bank_transfer', 'cheque'])
//     .withMessage('Invalid payment method'),
  
//   body('category')
//     .optional()
//     .isIn(['general', 'temple', 'education', 'emergency', 'event', 'other'])
//     .withMessage('Invalid category'),
  
//   body('donationDate')
//     .optional()
//     .isISO8601()
//     .withMessage('Invalid date format'),
  
//   body('purpose')
//     .optional()
//     .trim()
//     .isLength({ max: 200 })
//     .withMessage('Purpose must be less than 200 characters'),
  
//   body('remarks')
//     .optional()
//     .trim()
//     .isLength({ max: 500 })
//     .withMessage('Remarks must be less than 500 characters'),
  
//   body('isAnonymous')
//     .optional()
//     .isBoolean()
//     .withMessage('isAnonymous must be a boolean'),
  
//   body('qrPaymentCompleted')
//     .optional()
//     .isBoolean()
//     .withMessage('qrPaymentCompleted must be a boolean'),
  
//   body('paymentStatus')
//     .optional()
//     .isIn(['pending', 'completed', 'failed'])
//     .withMessage('Invalid payment status'),
// ]; 

// export const relationshipValidation = [
//   body('memberId')
//     .isMongoId()
//     .withMessage('Invalid member ID'),
//   body('relatedMemberId')
//     .isMongoId()
//     .withMessage('Invalid related member ID')
//     .custom((value, { req }) => {
//       if (value === req.body.memberId) {
//         throw new Error('Cannot relate a member to themselves');
//       }
//       return true;
//     }),
//   body('relationshipType')
//     .isIn(['spouse', 'child', 'parent', 'sibling', 'grandparent', 'grandchild', 'aunt_uncle', 'cousin', 'other'])
//     .withMessage('Invalid relationship type'),
// ];

// // export const donationValidation = [
// //   body('donor')
// //     .isMongoId()
// //     .withMessage('Invalid donor ID'),
// //   body('amount')
// //     .isFloat({ min: 0 })
// //     .withMessage('Amount must be a positive number'),
// //   body('purpose')
// //     .optional()
// //     .isIn(['general', 'education', 'medical', 'emergency', 'event', 'other'])
// //     .withMessage('Invalid purpose'),
// //   body('date')
// //     .optional()
// //     .isISO8601()
// //     .withMessage('Invalid date format'),
// // ];

// export const familyValidation = [
//   body('familyName')
//     .trim()
//     .isLength({ min: 2, max: 100 })
//     .withMessage('Family name must be between 2 and 100 characters'),
//   body('familyNumber')
//     .trim()
//     .notEmpty()
//     .withMessage('Family number is required'),
// ];

// export const documentValidation = [
//   body('memberId')
//     .isMongoId()
//     .withMessage('Invalid member ID'),
//   body('documentType')
//     .isIn(['citizenship', 'birth_certificate', 'marriage_certificate', 'death_certificate', 'migration_certificate', 'educational_certificate', 'passport', 'photo_album', 'other'])
//     .withMessage('Invalid document type'),
//   body('title')
//     .trim()
//     .isLength({ min: 1, max: 200 })
//     .withMessage('Title must be between 1 and 200 characters'),
// ];

// export const chatValidation = [
//   body('room')
//     .notEmpty()
//     .withMessage('Room is required'),
//   body('message')
//     .trim()
//     .isLength({ min: 1, max: 1000 })
//     .withMessage('Message must be between 1 and 1000 characters'),
// ];

// export const notificationValidation = [
//   body('type')
//     .isIn(['member_added', 'member_updated', 'member_deleted', 'donation_added', 'document_uploaded', 'report_generated', 'family_added', 'family_updated', 'general'])
//     .withMessage('Invalid notification type'),
//   body('title')
//     .trim()
//     .isLength({ min: 1, max: 200 })
//     .withMessage('Title must be between 1 and 200 characters'),
//   body('message')
//     .trim()
//     .isLength({ min: 1, max: 500 })
//     .withMessage('Message must be between 1 and 500 characters'),
// ];

// export const draftValidation = [
//   body('module')
//     .isIn(['member', 'family', 'donation'])
//     .withMessage('Invalid module'),
//   body('data')
//     .isObject()
//     .withMessage('Data must be an object'),
// ];