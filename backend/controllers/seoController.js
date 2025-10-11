import { seoAudit } from '../services/seoService.js';  // <-- extension .js obligatoire

export async function seoAuditController(req, res) {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  try {
    const result = await seoAudit(url);
    res.json({ message: 'SEO audit completed', result });
  } catch (err) {
    console.error('SEO audit error:', err);
    res.status(500).json({ error: err.message });
  }
}
