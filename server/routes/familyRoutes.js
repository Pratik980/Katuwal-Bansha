// routes/familyRoutes.js - UPDATED

import express from 'express';
import {
  getFamilies,
  getFamilyTreeByFamily,
  getFamilyById,
  createFamily,
  updateFamily,
  deleteFamily,
  getFamilyStats,
  closeFamily,
  reopenFamily,
  getNextFamilyNumber,
  getNextVanshaNumber,
  getFamilyBanshaNumbers, // ⭐ NEW
} from '../controllers/familyController.js';
import { validate, familyValidation } from '../middlewares/validation.js';
import { uploadSingleFamilyPhoto, handleUpload } from '../middlewares/upload.js';

const router = express.Router();

// GET routes - ORDER MATTERS! Put specific routes before parameter routes
router.get('/', getFamilies);
router.get('/stats', getFamilyStats);
router.get('/next-number/:houseId', getNextFamilyNumber);
router.get('/next-vansha/:familyId', getNextVanshaNumber);
// ⭐ NEW: Get Bansha numbers for a family
router.get('/:familyId/bansha-numbers', getFamilyBanshaNumbers);
router.get('/:familyId/tree', getFamilyTreeByFamily);
router.get('/:id', getFamilyById);

// POST routes with file upload
router.post(
  '/',
  handleUpload(uploadSingleFamilyPhoto),
  validate(familyValidation),
  createFamily
);

// PUT routes with file upload
router.put(
  '/:id',
  handleUpload(uploadSingleFamilyPhoto),
  validate(familyValidation),
  updateFamily
);

// DELETE routes
router.delete('/:id', deleteFamily);

// Close/Reopen routes
router.post('/:id/close', closeFamily);
router.post('/:id/reopen', reopenFamily);

export default router;