(function (global) {
  'use strict';

  const TARGET_SLUG = 'day-01-rate-limiting';
  const { normalize, icon, pipeline, layerStack, cardGrid, comparison, timeline, steps, policyBoard } = global.SWEVisualsCore;
  const { rules, genericVisual } = global.SWEChapter1Rules;

  function enhance(root = document) {
    const hash = window.location.hash || '';
    const isTarget = hash.includes(TARGET_SLUG);
    root.classList?.toggle('visual-prototype', isTarget);
    if (!isTarget) return;

    const supersededSections = new Set([
      'Practical Redis implementation',
      'A practical Spring Boot design'
    ]);
    root.querySelectorAll('.lesson-section').forEach((section) => {
      const heading = section.querySelector(':scope > h2');
      const diagram = section.querySelector(':scope > .mermaid');
      if (heading && diagram && supersededSections.has(heading.textContent.trim())) {
        diagram.classList.add('vf-superseded-diagram');
        const previous = diagram.previousElementSibling;
        if (previous?.classList.contains('vf-mermaid-label')) previous.remove();
      }
    });

    const blocks = Array.from(root.querySelectorAll('.code-block'));
    for (const block of blocks) {
      const label = block.querySelector('.code-label');
      const pre = block.querySelector('pre');
      if (!label || !pre || label.textContent.trim().toLowerCase() !== 'text') continue;
      if (block.dataset.visualChecked === 'true') continue;
      block.dataset.visualChecked = 'true';

      const text = normalize(pre.textContent);
      const rule = rules.find((candidate) => candidate.test(text));
      const markup = rule ? rule.render(text) : genericVisual(text);
      if (!markup) {
        block.classList.add('vf-notation-block');
        label.textContent = 'Notation';
        continue;
      }

      const wrapper = document.createElement('div');
      wrapper.innerHTML = markup.trim();
      const visual = wrapper.firstElementChild;
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
  window.SWEVisuals = Object.freeze({ enhance, pipeline, layerStack, cardGrid, comparison, timeline, steps, policyBoard });
  scheduleEnhance();
}(window));
