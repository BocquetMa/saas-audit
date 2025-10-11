import { accessibilityAudit } from '../services/accessibilityService.js';

export async function accessibilityAuditController(req, res) {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  try {
    const result = await accessibilityAudit(url);
    res.json({ message: 'Accessibility audit completed', result });
  } catch (err) {
    console.error('Accessibility audit error:', err);
    res.status(500).json({ error: err.message });
  }
}