import { runMobileAudit } from '../services/mobileService.js';

export async function mobileAuditController(req, res) {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL manquante' });
  }

  try {
    const result = await runMobileAudit(url);
    res.json({ 
      message: 'Mobile audit completed', 
      result 
    });
  } catch (err) {
    console.error('Mobile audit error:', err);
    res.status(500).json({ error: err.message });
  }
}