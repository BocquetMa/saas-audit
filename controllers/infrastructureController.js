import { runInfrastructureAudit } from '../services/infrastructureService.js';

export const auditInfrastructure = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL manquante' });
    }

    const result = await runInfrastructureAudit(url);
    res.json({ message: 'Infrastructure audit completed', result });
  } catch (error) {
    console.error('Erreur audit infrastructure:', error);
    res.status(500).json({ error: error.message });
  }
};