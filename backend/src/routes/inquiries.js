import express from 'express';
import {
  listInquiries,
  getInquiryById,
  createInquiry,
  updateInquiryStatus,
  assignInquiry
} from '../controllers/inquiryController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken); // Protect all inquiry endpoints

router.get('/', listInquiries);
router.post('/', createInquiry);
router.get('/:id', getInquiryById);
router.patch('/:id/status', updateInquiryStatus);
router.patch('/:id/assign', assignInquiry);

export default router;
