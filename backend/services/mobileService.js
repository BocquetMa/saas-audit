import puppeteer from 'puppeteer';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';

// Devices mobiles à tester
const MOBILE_DEVICES = {
  'iPhone SE': { width: 375, height: 667, deviceScaleFactor: 2, mobile: true },
  'iPhone 12 Pro': { width: 390, height: 844, deviceScaleFactor: 3, mobile: true },
  'Pixel 5': { width: 393, height: 851, deviceScaleFactor: 2.75, mobile: true },
  'Samsung Galaxy S20': { width: 360, height: 800, deviceScaleFactor: 3, mobile: true },
  'iPad Mini': { width: 768, height: 1024, deviceScaleFactor: 2, mobile: true }
};

// Tests mobile-specific
export async function runMobileTests(url) {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Users\\mathe\\.cache\\puppeteer\\chrome\\win64-121.0.6167.85\\chrome-win64\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const results = {};

  for (const [deviceName, viewport] of Object.entries(MOBILE_DEVICES)) {
    const page = await browser.newPage();
    await page.setViewport(viewport);
    await page.setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
    );

    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

      const analysis = await page.evaluate(() => {
        // 1. Vérifier la meta viewport
        const metaViewport = document.querySelector('meta[name="viewport"]');
        const viewportContent = metaViewport?.getAttribute('content') || null;

        // 2. Détecter scroll horizontal
        const hasHorizontalScroll = document.body.scrollWidth > window.innerWidth;

        // 3. Éléments trop petits pour toucher (< 48x48px recommandé Apple)
        const touchTargets = Array.from(
          document.querySelectorAll('a, button, input, select, textarea')
        );
        const smallTouchTargets = touchTargets.filter(el => {
          const rect = el.getBoundingClientRect();
          return rect.width < 48 || rect.height < 48;
        }).length;

        // 4. Texte trop petit (< 16px pour mobile)
        const textElements = Array.from(document.querySelectorAll('p, span, div, li, td'));
        const smallText = textElements.filter(el => {
          const fontSize = parseFloat(window.getComputedStyle(el).fontSize);
          return fontSize < 16 && el.textContent?.trim().length > 0;
        }).length;

        // 5. Vérifier les images responsive
        const images = Array.from(document.querySelectorAll('img'));
        const nonResponsiveImages = images.filter(img => {
          return !img.hasAttribute('srcset') && !img.style.maxWidth;
        }).length;

        // 6. Orientation support
        const supportsOrientation = !!window.screen?.orientation;

        // 7. Touch events support
        const supportsTouchEvents = 'ontouchstart' in window;

        // 8. Détecter fixed positioning issues
        const fixedElements = Array.from(document.querySelectorAll('*')).filter(el => {
          return window.getComputedStyle(el).position === 'fixed';
        }).length;

        return {
          viewport: {
            hasMetaViewport: !!metaViewport,
            viewportContent,
            width: window.innerWidth,
            height: window.innerHeight
          },
          issues: {
            hasHorizontalScroll,
            smallTouchTargets,
            smallText,
            nonResponsiveImages,
            fixedElementsCount: fixedElements
          },
          support: {
            supportsOrientation,
            supportsTouchEvents
          }
        };
      });

      results[deviceName] = {
        viewport: viewport,
        ...analysis,
        tested: true
      };
    } catch (error) {
      results[deviceName] = {
        viewport: viewport,
        tested: false,
        error: error.message
      };
    }

    await page.close();
  }

  await browser.close();

  // Calculer le score global
  const testedDevices = Object.values(results).filter(r => r.tested);
  const totalIssues = testedDevices.reduce((sum, device) => {
    return sum + 
           (device.issues.hasHorizontalScroll ? 20 : 0) +
           (device.issues.smallTouchTargets * 2) +
           (device.issues.smallText * 1) +
           (device.issues.nonResponsiveImages * 3);
  }, 0);

  const score = Math.max(0, 100 - Math.min(totalIssues, 100));

  return {
    devices: results,
    score: Math.round(score)
  };
}

// Score performance mobile avec Lighthouse
export async function getMobilePerformanceScore(url) {
  const chrome = await launch({
    chromeFlags: ['--headless', '--disable-gpu']
  });

  try {
    const options = {
      port: chrome.port,
      onlyCategories: ['performance'],
      formFactor: 'mobile',
      throttling: {
        rttMs: 150,
        throughputKbps: 1.6 * 1024,
        cpuSlowdownMultiplier: 4
      },
      screenEmulation: {
        mobile: true,
        width: 375,
        height: 667,
        deviceScaleFactor: 2
      }
    };

    const runnerResult = await lighthouse(url, options);
    await chrome.kill();

    const performanceScore = runnerResult.lhr.categories.performance.score * 100;
    
    // Extraire les métriques clés
    const metrics = {
      firstContentfulPaint: runnerResult.lhr.audits['first-contentful-paint'].numericValue,
      speedIndex: runnerResult.lhr.audits['speed-index'].numericValue,
      largestContentfulPaint: runnerResult.lhr.audits['largest-contentful-paint'].numericValue,
      timeToInteractive: runnerResult.lhr.audits['interactive'].numericValue,
      totalBlockingTime: runnerResult.lhr.audits['total-blocking-time'].numericValue,
      cumulativeLayoutShift: runnerResult.lhr.audits['cumulative-layout-shift'].numericValue
    };

    return {
      score: Math.round(performanceScore),
      metrics,
      throttling: options.throttling
    };
  } catch (error) {
    await chrome.kill();
    throw new Error(`Lighthouse mobile error: ${error.message}`);
  }
}

// Check viewport & meta mobile
export async function checkViewportConfig(url) {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Users\\mathe\\.cache\\puppeteer\\chrome\\win64-121.0.6167.85\\chrome-win64\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

  const viewportInfo = await page.evaluate(() => {
    const metaViewport = document.querySelector('meta[name="viewport"]');
    
    if (!metaViewport) {
      return {
        exists: false,
        issues: ['Meta viewport tag is missing'],
        recommendations: ['Add <meta name="viewport" content="width=device-width, initial-scale=1.0">']
      };
    }

    const content = metaViewport.getAttribute('content') || '';
    const issues = [];
    const recommendations = [];

    // Vérifications
    if (!content.includes('width=device-width')) {
      issues.push('Missing width=device-width');
      recommendations.push('Add width=device-width to viewport content');
    }

    if (!content.includes('initial-scale')) {
      issues.push('Missing initial-scale');
      recommendations.push('Add initial-scale=1.0 to viewport content');
    }

    if (content.includes('maximum-scale=1') || content.includes('user-scalable=no')) {
      issues.push('Zoom disabled (accessibility issue)');
      recommendations.push('Remove maximum-scale=1 and user-scalable=no');
    }

    // Vérifier d'autres meta tags mobiles
    const appleMobileWebAppCapable = document.querySelector('meta[name="apple-mobile-web-app-capable"]');
    const appleMobileWebAppStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    const themeColor = document.querySelector('meta[name="theme-color"]');

    return {
      exists: true,
      content,
      issues,
      recommendations,
      additionalTags: {
        appleMobileWebAppCapable: !!appleMobileWebAppCapable,
        appleMobileWebAppStatusBar: !!appleMobileWebAppStatusBar,
        themeColor: themeColor?.getAttribute('content') || null
      }
    };
  });

  await browser.close();

  return viewportInfo;
}

// Audit mobile complet
export async function runMobileAudit(url) {
  try {
    const [mobileTests, performanceScore, viewportConfig] = await Promise.all([
      runMobileTests(url),
      getMobilePerformanceScore(url),
      checkViewportConfig(url)
    ]);

    // Score global (moyenne pondérée)
    const overallScore = Math.round(
      (mobileTests.score * 0.4) +        // 40% compatibilité devices
      (performanceScore.score * 0.4) +   // 40% performance mobile
      (viewportConfig.exists ? 20 : 0)   // 20% configuration viewport
    );

    return {
      url,
      mobileTests,
      performanceScore,
      viewportConfig,
      overallScore,
      timestamp: new Date()
    };
  } catch (error) {
    throw new Error(`Erreur lors de l'audit mobile: ${error.message}`);
  }
}