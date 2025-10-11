import {
  launchBrowser,
  getRealisticUserAgent,
  BREAKPOINTS,
  calculateScore,
  detectSmallText,
  detectSmallClickAreas,
  checkMetaViewport,
  detectHorizontalScroll,
  detectOverflowingElements,
  analyzeForms as analyzeFormsUtil,
  detectHiddenElements as detectHiddenUtil,
  detectInaccessibleElements as detectInaccessibleUtil,
  checkColorContrast,
  generateIssuesSummary
} from '../utils/uxUtils.js';

// Analyse responsive avec différents breakpoints
export async function analyzeResponsive(url) {
  const browser = await launchBrowser();
  const results = {};

  // Utiliser les 3 principaux breakpoints
  const mainBreakpoints = {
    mobile: BREAKPOINTS.mobile,
    tablet: BREAKPOINTS.tablet,
    desktop: BREAKPOINTS.desktop
  };

  for (const [device, viewport] of Object.entries(mainBreakpoints)) {
    const page = await browser.newPage();
    await page.setUserAgent(getRealisticUserAgent());
    await page.setViewport(viewport);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    const issues = [];

    // Vérifier meta viewport
    const metaViewport = await checkMetaViewport(page);
    if (!metaViewport.exists) {
      issues.push('Meta viewport manquante');
    }

    // Vérifier scroll horizontal
    const scrollCheck = await detectHorizontalScroll(page);
    if (scrollCheck.hasScroll) {
      issues.push('Scroll horizontal détecté');
    }

    // Vérifier éléments débordants
    const overflowing = await detectOverflowingElements(page);
    if (overflowing.length > 0) {
      issues.push(`${overflowing.length} éléments débordent`);
    }

    // Vérifier texte trop petit
    const smallTextCount = await detectSmallText(page);
    if (smallTextCount > 0) {
      issues.push(`${smallTextCount} éléments avec texte < 12px`);
    }

    // Vérifier zones de clic
    const smallClickAreas = await detectSmallClickAreas(page);
    if (smallClickAreas.length > 0) {
      issues.push(`${smallClickAreas.length} zones de clic < 44x44px`);
    }

    results[device] = {
      name: viewport.name,
      width: viewport.width,
      height: viewport.height,
      metaViewport: metaViewport.content,
      scrollCheck,
      overflowingElements: overflowing,
      smallClickAreas,
      issues
    };

    await page.close();
  }

  await browser.close();

  // Calcul du score responsive
  const totalIssues = Object.values(results).reduce((sum, r) => sum + r.issues.length, 0);
  const score = calculateScore(totalIssues, 10);

  return {
    breakpoints: results,
    score
  };
}

// Analyse des formulaires
export async function analyzeForms(url) {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.setUserAgent(getRealisticUserAgent());
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

  const formsData = await analyzeFormsUtil(page);
  await browser.close();

  // Détection des problèmes
  const issues = [];
  formsData.forEach((form) => {
    if (!form.hasLabels) issues.push(`Formulaire ${form.index}: Labels manquants`);
    if (!form.hasValidation) issues.push(`Formulaire ${form.index}: Aucune validation`);
    if (form.inputs.some(i => i.type === 'email' && !i.hasAutocomplete)) {
      issues.push(`Formulaire ${form.index}: Autocomplete manquant sur email`);
    }
    if (form.totalInputs === 0) {
      issues.push(`Formulaire ${form.index}: Aucun champ détecté`);
    }
  });

  // Calcul du score
  const totalForms = formsData.length;
  const score = totalForms === 0 ? 100 : calculateScore(issues.length, 15);

  return {
    totalForms,
    forms: formsData,
    issues,
    score
  };
}

// Détection des éléments cachés/inaccessibles
export async function analyzeHiddenElements(url) {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.setUserAgent(getRealisticUserAgent());
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

  const hidden = await detectHiddenUtil(page);
  const inaccessible = await detectInaccessibleUtil(page);
  const lowContrast = await checkColorContrast(page);

  await browser.close();

  // Calcul du score
  const totalIssues = hidden.total + 
                     inaccessible.offScreen.length + 
                     inaccessible.tooSmall.length + 
                     inaccessible.negativeZIndex.length +
                     lowContrast.length;
  
  const score = calculateScore(totalIssues, 2);

  return {
    hiddenElements: hidden,
    inaccessibleElements: inaccessible,
    lowContrastElements: lowContrast,
    score
  };
}

// Audit complet UX
export async function runUXAudit(url) {
  try {
    const [responsive, forms, hiddenElements] = await Promise.all([
      analyzeResponsive(url),
      analyzeForms(url),
      analyzeHiddenElements(url),
    ]);

    // Score global
    const overallScore = Math.round(
      (responsive.score + forms.score + hiddenElements.score) / 3
    );

    // Générer le résumé des issues
    const issuesSummary = generateIssuesSummary(responsive, forms, hiddenElements);

    return {
      url,
      responsive,
      forms,
      hiddenElements,
      issuesSummary,
      overallScore,
      timestamp: new Date(),
    };
  } catch (error) {
    throw new Error(`Erreur lors de l'audit UX: ${error.message}`);
  }
}