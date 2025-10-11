import { checkTls } from '../utils/tlsChecker.js';
import { checkSecurityHeaders } from '../utils/headerChecker.js';
import { runZapScan } from '../utils/zapRunner.js';
import { detectWaf } from '../utils/wafDetector.js';
import { scanDependencies } from '../utils/dependencyScanner.js';

export async function runSecurityAudit(url) {
  // Lancer checks principaux en parallèle
  const results = await Promise.allSettled([
    checkTls(url),
    checkSecurityHeaders(url),
    detectWaf(url),
    scanDependencies()
  ]);

  const [tlsResult, headersResult, wafResult, depsResult] = results.map(r =>
    r.status === 'fulfilled' ? r.value : { error: r.reason?.message || String(r.reason) }
  );

  // ZAP est plus lent, on attend le résultat mais capture l'erreur si ZAP n'est pas lancé
  let zapReport = {};
  try {
    zapReport = await runZapScan(url);
  } catch (err) {
    zapReport = { error: err.message || 'ZAP scan failed (ensure ZAP is running)' };
  }

  return {
    url,
    tls: tlsResult,
    headers: headersResult,
    waf: wafResult,
    dependencies: depsResult,
    zapReport
  };
}