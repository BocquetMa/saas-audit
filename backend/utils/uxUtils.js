import puppeteer from 'puppeteer';

export async function launchBrowser() {
  return await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Users\\mathe\\.cache\\puppeteer\\chrome\\win64-121.0.6167.85\\chrome-win64\\chrome.exe',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled'
    ]
  });
}


export function getRealisticUserAgent() {
  return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
}

export const BREAKPOINTS = {
  mobile: { width: 375, height: 667, name: 'iPhone SE' },
  mobileLarge: { width: 414, height: 896, name: 'iPhone 11 Pro Max' },
  tablet: { width: 768, height: 1024, name: 'iPad' },
  tabletLarge: { width: 1024, height: 1366, name: 'iPad Pro' },
  desktop: { width: 1920, height: 1080, name: 'Full HD' },
  desktopLarge: { width: 2560, height: 1440, name: '2K' }
};

/**
 * Calcule le score basé sur le nombre d'issues
 * @param {number} issuesCount - Nombre d'issues détectées
 * @param {number} penalty - Pénalité par issue (par défaut 10)
 * @returns {number} Score sur 100
 */
export function calculateScore(issuesCount, penalty = 10) {
  return Math.max(0, Math.min(100, 100 - issuesCount * penalty));
}

/**
 * Détecte les éléments avec texte trop petit
 * @param {Page} page - Page Puppeteer
 * @param {number} minSize - Taille minimale en px (par défaut 12)
 */
export async function detectSmallText(page, minSize = 12) {
  return await page.evaluate((minSize) => {
    const elements = Array.from(document.querySelectorAll('*'));
    return elements.filter(el => {
      const style = window.getComputedStyle(el);
      const fontSize = parseFloat(style.fontSize);
      const hasText = el.textContent?.trim().length > 0;
      return fontSize < minSize && hasText;
    }).length;
  }, minSize);
}

/**
 * Détecte les zones de clic trop petites
 * @param {Page} page - Page Puppeteer
 * @param {number} minSize - Taille minimale en px (par défaut 44)
 */
export async function detectSmallClickAreas(page, minSize = 44) {
  return await page.evaluate((minSize) => {
    const clickableSelectors = 'a, button, input[type="submit"], input[type="button"], [role="button"]';
    const elements = Array.from(document.querySelectorAll(clickableSelectors));
    
    return elements.filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width < minSize || rect.height < minSize;
    }).map(el => ({
      tag: el.tagName.toLowerCase(),
      width: Math.round(el.getBoundingClientRect().width),
      height: Math.round(el.getBoundingClientRect().height),
      text: el.textContent?.trim().substring(0, 30) || ''
    }));
  }, minSize);
}

export async function checkMetaViewport(page) {
  return await page.evaluate(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    return {
      exists: !!meta,
      content: meta?.getAttribute('content') || null
    };
  });
}

export async function detectHorizontalScroll(page) {
  return await page.evaluate(() => {
    return {
      hasScroll: document.body.scrollWidth > window.innerWidth,
      bodyWidth: document.body.scrollWidth,
      viewportWidth: window.innerWidth
    };
  });
}

export async function detectOverflowingElements(page) {
  return await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('*'));
    const overflowing = elements.filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.right > window.innerWidth || rect.left < 0;
    });

    return overflowing.map(el => ({
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      className: el.className || null,
      position: {
        left: Math.round(el.getBoundingClientRect().left),
        right: Math.round(el.getBoundingClientRect().right),
        width: Math.round(el.getBoundingClientRect().width)
      }
    })).slice(0, 10); 
  });
}

export async function analyzeForms(page) {
  return await page.evaluate(() => {
    const forms = Array.from(document.querySelectorAll('form'));

    return forms.map((form, index) => {
      const inputs = Array.from(form.querySelectorAll('input, textarea, select'));

      const inputDetails = inputs.map(input => {
        const label = input.labels?.[0] || document.querySelector(`label[for="${input.id}"]`);
        const ariaLabel = input.getAttribute('aria-label');
        
        return {
          type: input.getAttribute('type') || input.tagName.toLowerCase(),
          name: input.getAttribute('name') || null,
          id: input.getAttribute('id') || null,
          hasLabel: !!(label || ariaLabel),
          labelText: label?.textContent?.trim() || ariaLabel || null,
          hasPlaceholder: !!input.getAttribute('placeholder'),
          placeholder: input.getAttribute('placeholder') || null,
          required: input.hasAttribute('required'),
          hasAutocomplete: !!input.getAttribute('autocomplete'),
          autocomplete: input.getAttribute('autocomplete') || null
        };
      });

      return {
        index: index + 1,
        id: form.id || null,
        action: form.action || null,
        method: form.method || 'get',
        totalInputs: inputs.length,
        inputs: inputDetails,
        hasLabels: inputDetails.every(i => i.hasLabel),
        hasPlaceholders: inputDetails.some(i => i.hasPlaceholder),
        hasValidation: inputDetails.some(i => i.required),
        hasAutocomplete: inputDetails.some(i => i.hasAutocomplete)
      };
    });
  });
}

export async function detectHiddenElements(page) {
  return await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('*'));
    
    const hidden = elements.filter(el => {
      const style = window.getComputedStyle(el);
      return (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        parseFloat(style.opacity) === 0
      );
    });

    const categorized = {
      displayNone: [],
      visibilityHidden: [],
      opacityZero: []
    };

    hidden.forEach(el => {
      const style = window.getComputedStyle(el);
      const elementInfo = {
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        className: el.className || null
      };

      if (style.display === 'none') categorized.displayNone.push(elementInfo);
      else if (style.visibility === 'hidden') categorized.visibilityHidden.push(elementInfo);
      else if (parseFloat(style.opacity) === 0) categorized.opacityZero.push(elementInfo);
    });

    return {
      total: hidden.length,
      displayNone: categorized.displayNone.slice(0, 20),
      visibilityHidden: categorized.visibilityHidden.slice(0, 20),
      opacityZero: categorized.opacityZero.slice(0, 20)
    };
  });
}

export async function detectInaccessibleElements(page) {
  return await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('*'));

    const inaccessible = {
      offScreen: [],
      tooSmall: [],
      negativeZIndex: [],
      behindOthers: []
    };

    elements.forEach(el => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const isClickable = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName);

      const elementInfo = {
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        className: el.className || null,
        text: el.textContent?.trim().substring(0, 30) || null
      };

      if (rect.bottom < 0 || rect.right < 0 || rect.top > window.innerHeight || rect.left > window.innerWidth) {
        inaccessible.offScreen.push(elementInfo);
      }

      if (isClickable && (rect.width < 10 || rect.height < 10)) {
        inaccessible.tooSmall.push({
          ...elementInfo,
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        });
      }

      const zIndex = parseInt(style.zIndex);
      if (!isNaN(zIndex) && zIndex < 0) {
        inaccessible.negativeZIndex.push({
          ...elementInfo,
          zIndex
        });
      }
    });

    return {
      offScreen: inaccessible.offScreen.slice(0, 20),
      tooSmall: inaccessible.tooSmall.slice(0, 20),
      negativeZIndex: inaccessible.negativeZIndex.slice(0, 20)
    };
  });
}

export async function checkColorContrast(page) {
  return await page.evaluate(() => {
    function getLuminance(r, g, b) {
      const [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    }

    function getContrastRatio(l1, l2) {
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      return (lighter + 0.05) / (darker + 0.05);
    }

    const elements = Array.from(document.querySelectorAll('*'));
    const lowContrastElements = [];

    elements.forEach(el => {
      if (!el.textContent?.trim()) return;

      const style = window.getComputedStyle(el);
      const color = style.color;
      const bgColor = style.backgroundColor;

      if (!color || !bgColor || bgColor === 'rgba(0, 0, 0, 0)') return;

      const colorMatch = color.match(/\d+/g);
      const bgMatch = bgColor.match(/\d+/g);

      if (colorMatch && bgMatch) {
        const textLum = getLuminance(+colorMatch[0], +colorMatch[1], +colorMatch[2]);
        const bgLum = getLuminance(+bgMatch[0], +bgMatch[1], +bgMatch[2]);
        const ratio = getContrastRatio(textLum, bgLum);

        const fontSize = parseFloat(style.fontSize);
        const minRatio = fontSize >= 18 ? 3 : 4.5;

        if (ratio < minRatio) {
          lowContrastElements.push({
            tag: el.tagName.toLowerCase(),
            text: el.textContent.trim().substring(0, 30),
            ratio: ratio.toFixed(2),
            required: minRatio,
            color,
            backgroundColor: bgColor
          });
        }
      }
    });

    return lowContrastElements.slice(0, 20);
  });
}

export async function analyzeLoadPerformance(page) {
  return await page.evaluate(() => {
    const perfData = window.performance.timing;
    const paintData = window.performance.getEntriesByType('paint');

    return {
      domContentLoaded: perfData.domContentLoadedEventEnd - perfData.navigationStart,
      loadComplete: perfData.loadEventEnd - perfData.navigationStart,
      firstPaint: paintData.find(p => p.name === 'first-paint')?.startTime || null,
      firstContentfulPaint: paintData.find(p => p.name === 'first-contentful-paint')?.startTime || null
    };
  });
}

export function generateIssuesSummary(responsive, forms, hiddenElements) {
  const allIssues = [];

  Object.entries(responsive.breakpoints).forEach(([device, data]) => {
    data.issues.forEach(issue => {
      allIssues.push({
        category: 'Responsive',
        severity: issue.includes('scroll') ? 'high' : 'medium',
        device,
        message: issue
      });
    });
  });

  forms.issues.forEach(issue => {
    allIssues.push({
      category: 'Formulaires',
      severity: issue.includes('Labels') ? 'high' : 'medium',
      message: issue
    });
  });

  if (hiddenElements.hiddenElements.length > 10) {
    allIssues.push({
      category: 'Accessibilité',
      severity: 'low',
      message: `${hiddenElements.hiddenElements.length} éléments cachés détectés`
    });
  }

  if (hiddenElements.inaccessibleElements.length > 0) {
    allIssues.push({
      category: 'Accessibilité',
      severity: 'medium',
      message: `${hiddenElements.inaccessibleElements.length} éléments inaccessibles`
    });
  }

  return {
    total: allIssues.length,
    high: allIssues.filter(i => i.severity === 'high').length,
    medium: allIssues.filter(i => i.severity === 'medium').length,
    low: allIssues.filter(i => i.severity === 'low').length,
    issues: allIssues
  };
}