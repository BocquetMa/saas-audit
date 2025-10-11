import express from 'express';
import { createAudit } from '../controllers/performanceController.js';

const router = express.Router();

router.post('/audit/performance/scan', createAudit);

export default router;
