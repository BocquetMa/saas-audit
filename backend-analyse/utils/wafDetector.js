// backend/utils/wafDetector.js
import fetch from 'node-fetch';

export async function detectWaf(url) {
  try {
    const res = await fetch(url, { method: 'GET' });
    const server = res.headers.get('server') || '';
    const via = res.headers.get('via') || '';
    const xwaf = res.headers.get('x-waf') || '';
    const xcdn = res.headers.get('x-cache') || res.headers.get('cf-ray') || null;
    const candidates = [];
    const lower = `${server} ${via} ${xwaf} ${xcdn}`.toLowerCase();

    if (lower.includes('cloudflare')) candidates.push('Cloudflare');
    if (lower.includes('akamai')) candidates.push('Akamai');
    if (lower.includes('cloudfront') || lower.includes('amazon')) candidates.push('AWS CloudFront');
    if (lower.includes('fastly')) candidates.push('Fastly');

    return { detected: candidates.length ? candidates : ['none detected'], rawHeaders: Object.fromEntries(res.headers.entries()) };
  } catch (err) {
    return { error: err.message };
  }
}