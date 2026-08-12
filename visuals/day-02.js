(function (global) {
  'use strict';

  const TARGET_SLUG = 'day-02-caching';
  const { normalize, icon } = global.SWEVisualsCore;
  const { rules, genericVisual } = global.SWEChapter2Rules;
  const {
    designQuestions,
    staleRace,
    stalenessSpectrum,
    hotKey,
    expirationVsEviction,
    cacheKeyComposition,
    candidateMatrix,
    impactDashboard,
    interviewChecklist,
    cacheLayers,
    endpointCanvas
  } = global.SWEChapter2Visuals;

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

  function hideParagraphs(section, exactTexts) {
    const hidden = new Set(exactTexts);
    section.querySelectorAll('.section-body > p').forEach((paragraph) => {
      if (hidden.has(paragraph.textContent.trim())) paragraph.classList.add('vf-superseded-copy');
    });
  }

  function enhanceSection(section) {
    if (section.dataset.chapter2Visualized === 'true') return;
    const heading = section.querySelector(':scope > h2');
    if (!heading) return;

    const title = heading.textContent.trim();

    switch (title) {
      case 'Overview':
        insertVisuals(section, [designQuestions()], ':scope > .mermaid');
        break;
      case '4. The subtle stale-cache race':
        insertVisuals(section, [staleRace(), stalenessSpectrum()]);
        break;
      case '7. Hot keys':
        insertVisuals(section, [hotKey()]);
        break;
      case '10. Eviction versus expiration':
        insertVisuals(section, [expirationVsEviction()]);
        section.querySelectorAll('.code-block').forEach((block) => block.classList.add('vf-superseded-block'));
        hideParagraphs(section, ['Expiration:', 'Eviction:']);
        break;
      case '11. Cache key design':
        insertVisuals(section, [cacheKeyComposition()]);
        break;
      case '13. What should you cache?':
        insertVisuals(section, [candidateMatrix()]);
        break;
      case '14. Cache hit ratio can mislead you':
        insertVisuals(section, [impactDashboard()]);
        break;
      case '15. Interview scenario': {
        const originalList = section.querySelector('.section-body > ol');
        const visual = createNode(interviewChecklist());
        if (visual && originalList) originalList.insertAdjacentElement('beforebegin', visual);
        else if (visual) heading.insertAdjacentElement('afterend', visual);
        originalList?.classList.add('vf-superseded-list');
        break;
      }
      case 'Production mental model':
        insertVisuals(section, [cacheLayers()]);
        section.querySelectorAll('.code-block').forEach((block) => block.classList.add('vf-superseded-block'));
        hideParagraphs(section, ["Don't think:", 'Think:', 'Each layer answers different questions:']);
        break;
      case "Today's design exercise":
        insertVisuals(section, [endpointCanvas()]);
        break;
      default:
        break;
    }

    section.dataset.chapter2Visualized = 'true';
  }

  function enhance(root = document) {
    const hash = window.location.hash || '';
    const isTarget = hash.includes(TARGET_SLUG);

    root.classList?.toggle('visual-chapter-02', isTarget);
    root.classList?.toggle(
      'visual-prototype',
      isTarget || root.classList?.contains('visual-chapter-01')
    );

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
  global.SWEChapter2Enhancer = Object.freeze({ enhance });
  scheduleEnhance();
}(window));
