import express from 'express';
import { trackingAudit } from '../controllers/trackingController.js';

const router = express.Router();

router.post('/audit/tracking', trackingAudit);

export default router;