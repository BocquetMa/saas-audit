// backend/utils/zapRunner.js
import fetch from 'node-fetch';

const ZAP_BASE = process.env.ZAP_API_BASE || 'http://localhost:8090';

async function zapRequest(path, params = {}) {
  const url = new URL(`${ZAP_BASE}${path}`);
  Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  return res.json();
}

export async function runZapScan(target) {
  try {
    // 1) Spider
    await zapRequest('/JSON/spider/action/scan/', { url: target, recurse: true });
    // 2) Wait / poll spider status (simplified)
    await new Promise(r => setTimeout(r, 15_000));
    // 3) Active scan
    await zapRequest('/JSON/ascan/action/scan/', { url: target, recurse: true });
    // 4) Poll until finished (simplified delay)
    await new Promise(r => setTimeout(r, 60_000));

    // 5) Get alerts
    const alerts = await zapRequest('/JSON/core/view/alerts/', { baseurl: target, count: 9999 });
    return { alerts };
  } catch (err) {
    return { error: err.message };
  }
}