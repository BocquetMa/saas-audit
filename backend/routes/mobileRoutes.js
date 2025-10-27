import express from 'express';
import { mobileAuditController } from '../controllers/mobileController.js';

const router = express.Router();

router.post('/audit/mobile', mobileAuditController);

export default router;