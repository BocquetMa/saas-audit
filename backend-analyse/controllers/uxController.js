import { runUXAudit } from '../services/uxService.js';

export async function uxAuditController(req, res) {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL manquante' });
  }

  try {
    const result = await runUXAudit(url);
    res.json({ 
      message: 'UX audit completed', 
      result 
    });
  } catch (err) {
    console.error('UX audit error:', err);
    res.status(500).json({ error: err.message });
  }
}