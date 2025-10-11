import express from 'express';
import { uxAuditController } from '../controllers/uxController.js';

const router = express.Router();

router.post('/audit/ux', uxAuditController);

export default router;