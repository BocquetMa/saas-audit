// backend/utils/tlsChecker.js
import tls from 'tls';
import { URL } from 'url';

export async function checkTls(targetUrl, timeout = 10000) {
  const hostname = new URL(targetUrl).hostname;
  return new Promise((resolve) => {
    const socket = tls.connect(443, hostname, { servername: hostname, rejectUnauthorized: false }, () => {
      try {
        const cert = socket.getPeerCertificate(true);
        const protocol = socket.getProtocol();
        const cipher = socket.getCipher();
        socket.end();
        resolve({
          valid_from: cert.valid_from,
          valid_to: cert.valid_to,
          subject: cert.subject,
          issuer: cert.issuer,
          subjectaltname: cert.subjectaltname,
          protocol,
          cipher
        });
      } catch (err) {
        resolve({ error: err.message });
      }
    });
    socket.setTimeout(timeout, () => {
      socket.destroy();
      resolve({ error: 'tls timeout' });
    });
    socket.on('error', (err) => resolve({ error: err.message }));
  });
}