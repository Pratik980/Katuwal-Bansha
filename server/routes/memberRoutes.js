// routes/memberRoutes.js
import express from 'express';
import {
  getMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  searchMembers,
  getMembersByFamily,
  getMemberStats,
  getMemberOptions,
  updateVerification,
} from '../controllers/memberController.js';
import { validate, memberValidation } from '../middlewares/validation.js';
import { uploadSinglePhoto, handleUpload } from '../middlewares/upload.js';

const router = express.Router();

// GET routes
router.get('/', getMembers);
router.get('/stats', getMemberStats);
router.get('/search', searchMembers);
router.get('/options', getMemberOptions);
router.get('/family/:familyId', getMembersByFamily);
router.get('/:id', getMemberById);

// POST routes with file upload
router.post(
  '/',
  handleUpload(uploadSinglePhoto),
  validate(memberValidation),
  createMember
);

// PUT routes with file upload
router.put(
  '/:id',
  handleUpload(uploadSinglePhoto),
  validate(memberValidation),
  updateMember
);

// Verification is its own small request, separate from the member form
router.put('/:id/verification', updateVerification);

// DELETE routes
router.delete('/:id', deleteMember);

export default router;