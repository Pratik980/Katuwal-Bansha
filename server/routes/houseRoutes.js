// routes/houseRoutes.js
import express from 'express';
import {
  getHouses,
  getHouseById,
  createHouse,
  updateHouse,
  deleteHouse,
  getNextHouseNumber,
  getHouseStats,
} from '../controllers/houseController.js';

const router = express.Router();

// GET routes
router.get('/', getHouses);
router.get('/stats', getHouseStats);
router.get('/next-number', getNextHouseNumber);
router.get('/:id', getHouseById);

// POST routes
router.post('/', createHouse);

// PUT routes
router.put('/:id', updateHouse);

// DELETE routes
router.delete('/:id', deleteHouse);

export default router;