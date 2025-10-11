// backend/utils/headerChecker.js
import fetch from 'node-fetch';

export async function checkSecurityHeaders(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    const headers = res.headers;

    const report = {
      contentSecurityPolicy: headers.get('content-security-policy') || null,
      xContentTypeOptions: headers.get('x-content-type-options') || null,
      referrerPolicy: headers.get('referrer-policy') || null,
      xFrameOptions: headers.get('x-frame-options') || null,
      strictTransportSecurity: headers.get('strict-transport-security') || null,
      permissionsPolicy: headers.get('permissions-policy') || null
    };

    // règles basiques
    const issues = [];
    if (!report.contentSecurityPolicy) issues.push('Missing CSP');
    if (!report.xContentTypeOptions) issues.push('Missing X-Content-Type-Options');
    if (!report.referrerPolicy) issues.push('Missing Referrer-Policy');

    return { headers: report, issues };
  } catch (err) {
    return { error: err.message };
  }
}