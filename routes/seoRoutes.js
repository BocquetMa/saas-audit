import express from 'express';
import { seoAuditController } from '../controllers/seoController.js'; // <-- utiliser {} pour un export nommé

const router = express.Router();
router.post('/audit/seo/scan', seoAuditController);

export default router;