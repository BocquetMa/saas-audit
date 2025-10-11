import express from 'express';
import { accessibilityAuditController } from '../controllers/accessibilityController.js';

const router = express.Router();
router.post('/audit/accessibility/scan', accessibilityAuditController);

export default router;