// backend/controllers/securityController.js
import { runSecurityAudit as runService } from '../services/securityService.js';

export async function runSecurityAudit(req, res) {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  try {
    const result = await runService(url);
    res.json({ message: 'Security audit completed', result });
  } catch (err) {
    console.error('Security audit error:', err);
    res.status(500).json({ error: err.message });
  }
}