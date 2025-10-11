import { exec } from 'child_process';

/**
 * Scanne les dépendances du projet pour détecter :
 * - Les packages obsolètes
 * - Les vulnérabilités connues (npm audit)
 */
export async function scanDependencies() {
  return new Promise((resolve) => {
    exec('npm audit --json', (error, stdout) => {
      let vulnerabilities = [];
      if (!error && stdout) {
        try {
          const auditData = JSON.parse(stdout);
          if (auditData.vulnerabilities) {
            vulnerabilities = Object.values(auditData.vulnerabilities).map(adv => ({
              module: adv.name,
              severity: adv.severity,
              title: adv.title,
              url: adv.url,
              vulnerable_versions: adv.vulnerable_versions,
              patched_versions: adv.patched_versions
            }));
          }
        } catch {}
      }

      // npm outdated
      exec('npm outdated --json', (errOutdated, stdoutOutdated) => {
        let outdated = [];
        if (!errOutdated && stdoutOutdated) {
          try {
            const out = JSON.parse(stdoutOutdated);
            outdated = Object.keys(out).map(pkg => ({
              package: pkg,
              current: out[pkg].current,
              wanted: out[pkg].wanted,
              latest: out[pkg].latest
            }));
          } catch {}
        }

        resolve({ vulnerabilities, outdated });
      });
    });
  });
}