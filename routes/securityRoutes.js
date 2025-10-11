// backend/routes/securityRoutes.js
import express from 'express';
import { runSecurityAudit } from '../controllers/securityController.js';

const router = express.Router();
router.post('/audit/security/scan', runSecurityAudit);

export default router;
