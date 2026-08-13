(function (global) {
  'use strict';

  const TARGET_SLUG = 'day-03-load-balancing';
  const VISUAL_SLUGS = [
    'day-01-rate-limiting',
    'day-02-caching',
    TARGET_SLUG
  ];

  const { normalize, icon } = global.SWEVisualsCore;
  const { rules, genericVisual, flat } = global.SWEChapter3Rules;
  const {
    overviewQuestions,
    trafficDistributor,
    l4VsL7,
    routeExamples,
    algorithmAtlas,
    consistentHashRing,
    stickyVsShared,
    stickyImbalance,
    healthModel,
    slowGrayFailure,
    thresholdStateMachine,
    draining,
    clientIpTrust,
    tlsModes,
    crossZone,
    lbRedundancy,
    cascadingFailure,
    unsafeRetry,
    websocketLifecycle,
    springResponsibilities,
    lifecycleAlignment,
    kubernetesLayers,
    balancingScopes,
    interviewChecklist,
    productionFailure,
    healthTaxonomy,
    architectureConnection,
    controlPlane
  } = global.SWEChapter3Visuals;

  function createNode(markup) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = String(markup).trim();
    return wrapper.firstElementChild;
  }

  function insertVisuals(section, markups, anchorSelector = ':scope > h2') {
    let anchor = section.querySelector(anchorSelector) || section.querySelector(':scope > h2');
    if (!anchor) return;

    for (const markup of markups) {
      const node = createNode(markup);
      if (!node) continue;
      anchor.insertAdjacentElement('afterend', node);
      anchor = node;
    }
  }

  function hideConceptBlocks(section) {
    section.querySelectorAll('.code-block').forEach((block) => {
      const label = block.querySelector('.code-label')?.textContent.trim().toLowerCase();
      if (label === 'text' || label === 'example') {
        block.classList.add('vf-superseded-block');
      }
    });
  }

  function hideParagraphs(section, exactTexts) {
    const hidden = new Set(exactTexts);
    section.querySelectorAll('.section-body > p').forEach((paragraph) => {
      if (hidden.has(paragraph.textContent.trim())) {
        paragraph.classList.add('vf-superseded-copy');
        paragraph.hidden = true;
      }
    });
  }

  function hideMatchingBlock(section, predicate) {
    section.querySelectorAll('.code-block').forEach((block) => {
      const label = block.querySelector('.code-label')?.textContent.trim().toLowerCase();
      const pre = block.querySelector('pre');
      if (!pre || (label !== 'text' && label !== 'example')) return;
      if (predicate(normalize(pre.textContent), flat(pre.textContent))) {
        block.classList.add('vf-superseded-block');
      }
    });
  }

  function enhanceSection(section) {
    if (section.dataset.chapter3Visualized === 'true') return;
    const heading = section.querySelector(':scope > h2');
    if (!heading) return;

    const title = heading.textContent.trim();

    switch (title) {
      case 'Overview': {
        const diagram = section.querySelector(':scope > .mermaid');
        diagram?.classList.add('vf-superseded-diagram');
        insertVisuals(section, [trafficDistributor(), overviewQuestions()]);
        hideConceptBlocks(section);
        hideParagraphs(section, ['A useful mental model is:']);
        break;
      }
      case '1. Why do we need a load balancer?':
        hideMatchingBlock(section, (_text, value) => value.includes('8,000 rps') && value.includes('4 instances') && value.includes('~2,000 rps each'));
        break;
      case '2. Layer 4 vs Layer 7 load balancing':
        insertVisuals(section, [l4VsL7(), routeExamples()]);
        hideConceptBlocks(section);
        hideParagraphs(section, ['Conceptually:', 'For example:', 'Or:', 'This gives us:']);
        break;
      case '3. Load-balancing algorithms':
        insertVisuals(section, [algorithmAtlas(), consistentHashRing()]);
        break;
      case '4. Sticky sessions':
        insertVisuals(section, [stickyVsShared(), stickyImbalance()]);
        hideConceptBlocks(section);
        hideParagraphs(section, [
          'One workaround is session affinity/sticky sessions:',
          'If App A dies:',
          'It also creates uneven distribution:',
          'A more scalable design is usually:',
          'Then:'
        ]);
        break;
      case "5. Health checks: the load balancer's view of reality":
        insertVisuals(section, [healthModel()]);
        break;
      case '6. Slow servers are harder than dead servers':
        insertVisuals(section, [slowGrayFailure()]);
        hideConceptBlocks(section);
        break;
      case '7. Health-check thresholds matter':
        insertVisuals(section, [thresholdStateMachine()]);
        hideConceptBlocks(section);
        hideParagraphs(section, ['Imagine:', 'Instead:', 'Meaning:', "Likewise, don't immediately restore it:"]);
        break;
      case '8. Connection draining':
        insertVisuals(section, [draining()]);
        hideConceptBlocks(section);
        hideParagraphs(section, ['Instead use connection draining:', 'App A marked draining', 'After:', 'drain timeout']);
        break;
      case '9. Load balancer and the real client IP':
        insertVisuals(section, [clientIpTrust()]);
        hideConceptBlocks(section);
        hideParagraphs(section, ['Suppose:', 'Correct reasoning:']);
        break;
      case '10. TLS termination':
        insertVisuals(section, [tlsModes()]);
        hideConceptBlocks(section);
        hideParagraphs(section, ['At the load balancer', 'Alternative:', 'Another architecture:']);
        break;
      case '11. Cross-zone balancing':
        insertVisuals(section, [crossZone()]);
        hideConceptBlocks(section);
        hideParagraphs(section, ['Traffic arriving:']);
        break;
      case '12. Load balancers can themselves fail':
        insertVisuals(section, [lbRedundancy()]);
        hideConceptBlocks(section);
        hideParagraphs(section, ['Drawing:']);
        break;
      case '13. The overloaded-last-survivor problem':
        insertVisuals(section, [cascadingFailure()]);
        hideConceptBlocks(section);
        break;
      case '14. A subtle retry problem':
        insertVisuals(section, [unsafeRetry()]);
        hideConceptBlocks(section);
        hideParagraphs(section, ['Suppose:', 'Now:']);
        break;
      case '15. Load balancing WebSockets':
        insertVisuals(section, [websocketLifecycle()]);
        hideConceptBlocks(section);
        break;
      case '16. Spring Boot implementation pattern':
        insertVisuals(section, [springResponsibilities(), lifecycleAlignment()]);
        hideConceptBlocks(section);
        hideParagraphs(section, ['Instead:']);
        break;
      case '17. Load balancing in Kubernetes':
        insertVisuals(section, [kubernetesLayers(), balancingScopes()]);
        hideConceptBlocks(section);
        hideParagraphs(section, [
          "When we eventually reach Kubernetes, you'll see several layers:",
          'With AWS EKS, you might have:',
          'And with a service mesh:'
        ]);
        break;
      case '18. Interview-style scenario': {
        const originalList = section.querySelector('.section-body > ol');
        const visual = createNode(interviewChecklist());
        if (visual && originalList) originalList.insertAdjacentElement('beforebegin', visual);
        else if (visual) heading.insertAdjacentElement('afterend', visual);
        originalList?.classList.add('vf-superseded-list');
        break;
      }
      case '19. Production failure scenario':
        insertVisuals(section, [productionFailure(), healthTaxonomy()]);
        hideConceptBlocks(section);
        hideParagraphs(section, ['Imagine:']);
        break;
      case 'The architectural connection':
        insertVisuals(section, [architectureConnection()]);
        hideConceptBlocks(section);
        hideParagraphs(section, ['Yesterday:', 'Today:', 'Together:']);
        break;
      case "Today's key takeaway":
        insertVisuals(section, [controlPlane()]);
        hideConceptBlocks(section);
        hideParagraphs(section, [
          'A production load balancer is not merely:',
          'Think of it as a traffic-control plane at a failure boundary:'
        ]);
        break;
      default:
        break;
    }

    section.dataset.chapter3Visualized = 'true';
  }

  function enhance(root = document) {
    const hash = window.location.hash || '';
    const isTarget = hash.includes(TARGET_SLUG);
    const isVisualChapter = VISUAL_SLUGS.some((slug) => hash.includes(slug));

    root.classList?.toggle('visual-chapter-03', isTarget);
    root.classList?.toggle('visual-prototype', isVisualChapter);

    if (!isTarget) return;

    root.querySelectorAll('.lesson-section').forEach(enhanceSection);

    const blocks = Array.from(root.querySelectorAll('.code-block:not(.vf-superseded-block)'));
    for (const block of blocks) {
      const label = block.querySelector('.code-label');
      const pre = block.querySelector('pre');
      if (!label || !pre) continue;

      const labelText = label.textContent.trim().toLowerCase();
      if (!['text', 'example'].includes(labelText)) continue;
      if (block.dataset.visualChecked === 'true') continue;
      block.dataset.visualChecked = 'true';

      const text = normalize(pre.textContent);
      const rule = rules.find((candidate) => candidate.test(text));
      const markup = rule ? rule.render(text) : genericVisual(text);

      if (!markup) {
        block.classList.add('vf-notation-block');
        label.textContent = labelText === 'example' ? 'Trace' : 'Notation';
        continue;
      }

      const visual = createNode(markup);
      if (visual) block.replaceWith(visual);
    }

    root.querySelectorAll('.mermaid:not(.vf-superseded-diagram)').forEach((diagram) => {
      const section = diagram.closest('.lesson-section');
      if (section && !diagram.previousElementSibling?.classList.contains('vf-mermaid-label')) {
        const label = document.createElement('div');
        label.className = 'vf-mermaid-label';
        label.innerHTML = `${icon('layers')}<span>Architecture view</span>`;
        diagram.before(label);
      }
    });
  }

  let scheduled = false;
  function scheduleEnhance() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      const app = document.getElementById('app');
      if (app) enhance(app);
    });
  }

  const app = document.getElementById('app');
  if (app) {
    const observer = new MutationObserver(scheduleEnhance);
    observer.observe(app, { childList: true, subtree: true });
  }

  window.addEventListener('hashchange', scheduleEnhance);
  global.SWEChapter3Enhancer = Object.freeze({ enhance });
  scheduleEnhance();
}(window));
