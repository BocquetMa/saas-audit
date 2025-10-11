import express from 'express';
import { auditInfrastructure } from '../controllers/infrastructureController.js';

const router = express.Router();

router.post('/audit/infrastructure', auditInfrastructure);

export default router;
