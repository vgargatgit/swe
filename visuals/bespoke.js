(function (global) {
  'use strict';

  const profiles = global.SWECourseProfiles?.bySlug || {};
  const visuals = global.SWECourseVisuals || {};
  const rules = global.SWECourseRules || {};
  const { normalize, icon } = global.SWEVisualsCore;
  const blueprintList = global.SWEBespokeBlueprintData || [];
  const blueprints = Object.freeze(Object.fromEntries(blueprintList.map((item) => [item.slug, Object.freeze(item)])));
  const MAX_AUTO_VISUALS_PER_SECTION = 2;

  function createNode(markup, className = '') {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = String(markup || '').trim();
    const node = wrapper.firstElementChild;
    if (node && className) node.classList.add(className);
    return node;
  }

  function lessonForHash(hash) {
    return (global.LESSONS || []).find((lesson) => hash.includes(lesson.slug));
  }

  function renderSpec(spec) {
    if (!spec || !spec.type) return '';
    const renderer = {
      pipeline: visuals.pipeline,
      layerStack: visuals.layerStack,
      cardGrid: visuals.cardGrid,
      comparison: visuals.comparison,
      timeline: visuals.timeline,
      steps: visuals.steps,
      policyBoard: visuals.policyBoard,
      stateMachine: visuals.stateMachine,
      fanout: visuals.fanout,
      sequence: visuals.sequence,
      topology: visuals.topology,
      tradeoff: visuals.tradeoff,
      decision: visuals.decision,
      failureCascade: visuals.failureCascade,
      metricBoard: visuals.metricBoard,
      routeMap: visuals.routeMap,
      bidirectional: visuals.bidirectional
    }[spec.type];

    if (typeof renderer !== 'function') {
      console.warn('Unknown bespoke visual type', spec.type, spec.title);
      return '';
    }
    return renderer(spec);
  }

  function sectionTitle(section) {
    return section.querySelector(':scope > h2')?.textContent.trim() || '';
  }

  function findSection(sections, directive, usedSections) {
    let matched = null;
    if (directive.match) {
      try {
        const pattern = new RegExp(directive.match, 'i');
        matched = sections.find((section) => pattern.test(sectionTitle(section)) && !usedSections.has(section));
        if (!matched) matched = sections.find((section) => pattern.test(sectionTitle(section)));
      } catch (error) {
        console.error('Invalid bespoke section matcher', directive.match, error);
      }
    }

    if (!matched && Number.isInteger(directive.fallback)) {
      matched = sections[Math.max(0, Math.min(sections.length - 1, directive.fallback))];
    }
    return matched || sections[sections.length - 1] || null;
  }

  function insertAfterSectionHeading(section, markup, marker) {
    const node = createNode(markup, 'vf-bespoke');
    if (!node) return null;
    if (marker) node.dataset.bespokeMarker = marker;

    const existing = Array.from(section.children).filter((child) => child.classList?.contains('vf-bespoke'));
    const anchor = existing[existing.length - 1] || section.querySelector(':scope > h2');
    anchor?.insertAdjacentElement('afterend', node);
    return node;
  }

  function conceptBlocks(section) {
    return Array.from(section.querySelectorAll('.code-block')).filter((block) => {
      const label = block.querySelector('.code-label')?.textContent.trim().toLowerCase();
      return ['text', 'example'].includes(label);
    });
  }

  function hideCoveredConcept(section, directive) {
    const blocks = conceptBlocks(section).filter((block) => !block.classList.contains('vf-superseded-block'));
    if (!blocks.length) return;

    let hidden = false;
    if (Array.isArray(directive.hide) && directive.hide.length) {
      for (const block of blocks) {
        const text = normalize(block.querySelector('pre')?.textContent || '');
        if (directive.hide.some((pattern) => {
          try { return new RegExp(pattern, 'i').test(text); } catch { return text.toLowerCase().includes(String(pattern).toLowerCase()); }
        })) {
          block.classList.add('vf-superseded-block');
          hidden = true;
        }
      }
    }

    if (!hidden && directive.hideFirst !== false) {
      const candidate = blocks.find((block) => {
        const text = block.querySelector('pre')?.textContent || '';
        return /[→↓▼│├└┌↔]/.test(text) || text.split('\n').filter(Boolean).length <= 8;
      });
      candidate?.classList.add('vf-superseded-block');
    }
  }

  function enhanceOverview(root, blueprint, profile) {
    const overview = root.querySelector('.lesson-section');
    if (!overview || overview.dataset.bespokeOverview === 'true') return;

    const diagram = overview.querySelector(':scope > .mermaid');
    diagram?.classList.add('vf-superseded-diagram');

    const hero = visuals.profileHero?.(profile);
    const lens = visuals.questionLens?.(profile);
    if (hero) insertAfterSectionHeading(overview, hero, `${blueprint.slug}:hero`);
    if (lens) insertAfterSectionHeading(overview, lens, `${blueprint.slug}:questions`);

    const firstConcept = conceptBlocks(overview).find((block) => {
      const text = block.querySelector('pre')?.textContent || '';
      return /[→↓▼│├└┌↔]/.test(text);
    });
    firstConcept?.classList.add('vf-superseded-block');
    overview.dataset.bespokeOverview = 'true';
  }

  function enhanceBlueprintSections(root, blueprint) {
    const sections = Array.from(root.querySelectorAll('.lesson-section'));
    const usedSections = new Set();

    blueprint.sections.forEach((directive, index) => {
      const section = findSection(sections, directive, usedSections);
      if (!section) return;
      const marker = `${blueprint.slug}:${index}`;
      if (section.querySelector(`[data-bespoke-marker="${marker}"]`)) return;

      const markup = renderSpec(directive.spec);
      if (!markup) return;
      insertAfterSectionHeading(section, markup, marker);
      hideCoveredConcept(section, directive);
      usedSections.add(section);
    });
  }

  function processRemainingConceptBlocks(root, profile) {
    const perSection = new Map();
    const blocks = Array.from(root.querySelectorAll('.code-block:not(.vf-superseded-block)'));

    for (const block of blocks) {
      if (block.dataset.visualChecked === 'true') continue;
      const label = block.querySelector('.code-label');
      const pre = block.querySelector('pre');
      if (!label || !pre) continue;

      const labelText = label.textContent.trim().toLowerCase();
      if (!['text', 'example'].includes(labelText)) continue;
      block.dataset.visualChecked = 'true';

      const section = block.closest('.lesson-section');
      const used = perSection.get(section) || 0;
      if (used >= MAX_AUTO_VISUALS_PER_SECTION || typeof rules.renderText !== 'function') {
        block.classList.add('vf-notation-block');
        label.textContent = labelText === 'example' ? 'Trace' : 'Notation';
        continue;
      }

      const text = normalize(pre.textContent);
      const markup = rules.renderText(text, {
        profile,
        sectionTitle: section ? sectionTitle(section) : profile.title
      });
      if (!markup) {
        block.classList.add('vf-notation-block');
        label.textContent = labelText === 'example' ? 'Trace' : 'Notation';
        continue;
      }

      const node = createNode(markup, 'vf-bespoke-auto');
      if (!node) continue;
      block.replaceWith(node);
      perSection.set(section, used + 1);
    }
  }

  function addTakeaway(root, blueprint, profile) {
    if (root.querySelector(`[data-bespoke-marker="${blueprint.slug}:takeaway"]`)) return;
    const sections = Array.from(root.querySelectorAll('.lesson-section'));
    const target = sections.find((section) => /key takeaway|mental model|architectural connection|production model|summary/i.test(sectionTitle(section)))
      || sections[sections.length - 1];
    if (!target || typeof visuals.profileTakeaway !== 'function') return;
    const markup = visuals.profileTakeaway(profile);
    insertAfterSectionHeading(target, markup, `${blueprint.slug}:takeaway`);
  }

  function labelRemainingMermaid(root) {
    root.querySelectorAll('.mermaid:not(.vf-superseded-diagram)').forEach((diagram) => {
      const section = diagram.closest('.lesson-section');
      if (!section || diagram.previousElementSibling?.classList.contains('vf-mermaid-label')) return;
      const label = document.createElement('div');
      label.className = 'vf-mermaid-label';
      label.innerHTML = `${icon('layers')}<span>Architecture view</span>`;
      diagram.before(label);
    });
  }

  function enhance(root = document) {
    const hash = global.location?.hash || '';
    const lesson = lessonForHash(hash);
    const blueprint = lesson ? blueprints[lesson.slug] : null;
    const profile = lesson ? profiles[lesson.slug] : null;
    const isLesson = Boolean(lesson && lesson.day >= 1 && lesson.day <= 36);

    root.classList?.toggle('visual-prototype', isLesson);
    root.classList?.toggle('visual-bespoke', Boolean(blueprint));

    if (!blueprint || !profile) return;
    if (root.dataset.bespokeEnhancedSlug === blueprint.slug) return;

    enhanceOverview(root, blueprint, profile);
    enhanceBlueprintSections(root, blueprint);
    processRemainingConceptBlocks(root, profile);
    addTakeaway(root, blueprint, profile);
    labelRemainingMermaid(root);
    root.dataset.bespokeEnhancedSlug = blueprint.slug;
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

  global.addEventListener('hashchange', scheduleEnhance);
  global.SWEBespokeBlueprints = blueprints;
  global.SWEBespokeEnhancer = Object.freeze({ enhance, renderSpec, blueprints });
  scheduleEnhance();
}(window));
