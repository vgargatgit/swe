(function (global) {
  'use strict';

  const TARGET_SLUG = 'day-01-rate-limiting';
  const DIAGRAM_SCRIPTS = [
    'visuals/day-01-diagram-design-core.js',
    'visuals/day-01-diagram-layered.js',
    'visuals/day-01-diagram-token-bucket.js',
    'visuals/day-01-diagram-distributed.js',
    'visuals/day-01-diagram-trusted-proxy.js',
    'visuals/day-01-diagram-request.js'
  ];
  const DIAGRAM_STYLESHEET = 'visuals/day-01-diagram-design.css';
  const { normalize, icon, pipeline, layerStack, cardGrid, comparison, timeline, steps, policyBoard } = global.SWEVisualsCore;
  const { rules, genericVisual } = global.SWEChapter1Rules;

  const editorialSections = new Map([
    ['Where rate limiting can be applied', 'layeredEnforcement'],
    ['Token bucket example', 'tokenBucketProcess'],
    ['Practical Redis implementation', 'distributedLimiter'],
    ['Choosing the rate limit key', 'trustedProxyRoad'],
    ['A practical Spring Boot design', 'requestEvaluation']
  ]);

  const representedSourceRules = [
    {
      section: 'Where rate limiting can be applied',
      test: (text) => text.startsWith('WAF/CDN') && text.includes('Database/job')
    },
    {
      section: 'Token bucket example',
      test: (text) => text.includes('capacity = 10') && text.includes('refill rate = 1 token/second')
    },
    {
      section: 'Token bucket example',
      test: (text) => text === 'Small burst? Fine.\nSustained abuse? Blocked.'
    },
    {
      section: 'Practical Redis implementation',
      test: (text) => text === 'App-1\nApp-2\nApp-3'
        || text.includes('App instances -> Redis -> shared rate limit counters')
    },
    {
      section: 'Choosing the rate limit key',
      test: (text) => text.includes('Client -> CloudFront -> ALB -> NGINX -> Tomcat')
        || (text.includes('Walk from right to left') && text.includes('First untrusted IP'))
    },
    {
      section: 'A practical Spring Boot design',
      test: (text) => text.includes('RateLimitFilter') && text.includes('RedisTokenBucketRateLimiter')
    },
    {
      section: 'A practical Spring Boot design',
      test: (text) => /^1\. Identify route\/action\./.test(text) && text.includes('Emit metric/log')
    }
  ];

  function sectionTitleFor(element) {
    return element.closest('.lesson-section')
      ?.querySelector(':scope > h2')
      ?.textContent
      ?.trim() || '';
  }

  function sourceIsRepresented(sectionTitle, text) {
    return representedSourceRules.some((rule) => rule.section === sectionTitle && rule.test(text));
  }

  function ensureStylesheet() {
    if (document.querySelector(`link[href="${DIAGRAM_STYLESHEET}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = DIAGRAM_STYLESHEET;
    link.dataset.day01DiagramDesign = 'true';
    document.head.appendChild(link);
  }

  function loadDiagramScript(source) {
    const existing = document.querySelector(`script[src="${source}"]`);
    if (existing?.dataset.loaded === 'true') return Promise.resolve();
    if (existing) {
      return new Promise((resolve, reject) => {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
      });
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = source;
      script.async = false;
      script.dataset.day01DiagramDesign = 'true';
      script.addEventListener('load', () => {
        script.dataset.loaded = 'true';
        resolve();
      }, { once: true });
      script.addEventListener('error', () => reject(new Error(`Unable to load ${source}`)), { once: true });
      document.body.appendChild(script);
    });
  }

  async function ensureDiagramScripts() {
    if (global.SWEDay1DiagramDesign?.requestEvaluation) return;
    for (const source of DIAGRAM_SCRIPTS) {
      await loadDiagramScript(source);
    }
  }

  function installEditorialDiagrams(root) {
    const diagramLibrary = global.SWEDay1DiagramDesign;
    if (!diagramLibrary) return;

    root.querySelectorAll('.lesson-section').forEach((section) => {
      const heading = section.querySelector(':scope > h2');
      if (!heading) return;
      const sectionTitle = heading.textContent.trim();
      const rendererName = editorialSections.get(sectionTitle);
      if (!rendererName || section.dataset.diagramDesignInstalled === 'true') return;

      const renderer = diagramLibrary[rendererName];
      if (typeof renderer !== 'function') return;

      heading.insertAdjacentHTML('afterend', renderer());
      section.dataset.diagramDesignInstalled = 'true';
      section.dataset.diagramType = section.querySelector(':scope > .dd-figure')?.dataset.diagramType || '';

      const diagram = section.querySelector(':scope > .mermaid');
      if (diagram) {
        diagram.classList.add('vf-superseded-diagram');
        const previous = diagram.previousElementSibling;
        if (previous?.classList.contains('vf-mermaid-label')) previous.remove();
      }
    });
  }

  function enhance(root = document) {
    const hash = window.location.hash || '';
    const isTarget = hash.includes(TARGET_SLUG);
    root.classList?.toggle('visual-chapter-01', isTarget);
    root.classList?.toggle(
      'visual-prototype',
      isTarget || root.classList?.contains('visual-chapter-02')
    );
    if (!isTarget) return;

    installEditorialDiagrams(root);

    const blocks = Array.from(root.querySelectorAll('.code-block'));
    for (const block of blocks) {
      const label = block.querySelector('.code-label');
      const pre = block.querySelector('pre');
      if (!label || !pre || label.textContent.trim().toLowerCase() !== 'text') continue;
      if (block.dataset.visualChecked === 'true') continue;
      block.dataset.visualChecked = 'true';

      const text = normalize(pre.textContent);
      const sectionTitle = sectionTitleFor(block);
      if (sourceIsRepresented(sectionTitle, text)) {
        block.classList.add('dd-source-summary');
        continue;
      }

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

  function start() {
    const app = document.getElementById('app');
    if (app) {
      const observer = new MutationObserver(scheduleEnhance);
      observer.observe(app, { childList: true, subtree: true });
    }

    window.addEventListener('hashchange', scheduleEnhance);
    window.SWEVisuals = Object.freeze({ enhance, pipeline, layerStack, cardGrid, comparison, timeline, steps, policyBoard });
    scheduleEnhance();
  }

  ensureStylesheet();
  ensureDiagramScripts()
    .catch((error) => console.error('Day 1 editorial diagrams failed to load; keeping the legacy visual treatment.', error))
    .finally(start);
}(window));
