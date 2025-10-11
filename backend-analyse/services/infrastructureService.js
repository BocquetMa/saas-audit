import dns from 'dns/promises';
import fetch from 'node-fetch';
import whois from 'whois-json';
import { performance } from 'perf_hooks';

export const runInfrastructureAudit = async (url) => {
  const start = performance.now();
  const parsedUrl = new URL(url);
  const hostname = parsedUrl.hostname;

  // 1️⃣ Résolution DNS
  let dnsInfo = {};
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    dnsInfo = { addresses };
  } catch (err) {
    dnsInfo = { error: err.message };
  }

  // 2️⃣ Whois (hébergeur, registrar, date d’expiration)
  let whoisInfo = {};
  try {
    whoisInfo = await whois(hostname);
  } catch (err) {
    whoisInfo = { error: err.message };
  }

  // 3️⃣ Vérif headers serveur
  let serverHeaders = {};
  try {
    const res = await fetch(url);
    serverHeaders = {
      server: res.headers.get('server'),
      contentEncoding: res.headers.get('content-encoding'),
      cacheControl: res.headers.get('cache-control'),
      hsts: res.headers.get('strict-transport-security'),
      xFrame: res.headers.get('x-frame-options'),
      cdn: res.headers.get('via') || res.headers.get('x-cache') || 'none',
    };
  } catch (err) {
    serverHeaders = { error: err.message };
  }

  // 4️⃣ Latence réseau
  const latency = performance.now() - start;

  return {
    url,
    network: { latencyMs: latency.toFixed(2) },
    dns: dnsInfo,
    whois: {
      registrar: whoisInfo.registrar,
      creationDate: whoisInfo.creationDate,
      expirationDate: whoisInfo.expirationDate,
      organization: whoisInfo.orgName || whoisInfo.org || whoisInfo['Registrant Organization'],
      country: whoisInfo.country,
    },
    server: serverHeaders,
  };
};