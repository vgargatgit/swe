(function (global) {
  'use strict';

  const { bySlug: profiles } = global.SWECourseProfiles;
  const { normalize, icon, comparison } = global.SWEVisualsCore;
  const {
    profileHero,
    questionLens,
    sectionAtlas,
    orderedSteps,
    profileTakeaway,
    failureCascade
  } = global.SWECourseVisuals;
  const { renderText, inferIcon, inferTone } = global.SWECourseRules;

  const MIN_DAY = 4;
  const MAX_DAY = 36;
  const MAX_BLOCK_VISUALS_PER_SECTION = 4;

  function createNode(markup) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = String(markup || '').trim();
    return wrapper.firstElementChild;
  }

  function insertVisuals(section, markups, anchor) {
    let current = anchor || section.querySelector(':scope > h2');
    if (!current) return 0;
    let inserted = 0;

    for (const markup of markups) {
      const node = createNode(markup);
      if (!node) continue;
      current.insertAdjacentElement('afterend', node);
      current = node;
      inserted += 1;
    }
    return inserted;
  }

  function lessonForHash(hash) {
    return (global.LESSONS || []).find((lesson) => hash.includes(lesson.slug));
  }

  function profileForHash(hash) {
    const lesson = lessonForHash(hash);
    if (!lesson || lesson.day < MIN_DAY || lesson.day > MAX_DAY) return null;
    return profiles[lesson.slug] || null;
  }

  function shortText(value, max = 96) {
    const normalized = String(value || '').replace(/\s+/g, ' ').trim();
    return normalized.length <= max ? normalized : `${normalized.slice(0, max - 1).trim()}…`;
  }

  function subtopics(section) {
    return Array.from(section.querySelectorAll('.section-body h3, .section-body h4'))
      .slice(0, 8)
      .map((heading, index) => {
        let sibling = heading.nextElementSibling;
        while (sibling && !['P', 'UL', 'OL'].includes(sibling.tagName)) sibling = sibling.nextElementSibling;
        const subtitle = sibling ? shortText(sibling.textContent) : 'A distinct production concern in this section.';
        return {
          title: shortText(heading.textContent, 52),
          subtitle,
          icon: inferIcon(`${heading.textContent} ${subtitle}`),
          tone: inferTone(`${heading.textContent} ${subtitle}`, index)
        };
      });
  }

  function directListItems(section, max = 8) {
    return Array.from(section.querySelectorAll('.section-body > ul > li, .section-body > ol > li'))
      .map((item) => shortText(item.textContent, 90))
      .filter((item) => item.length >= 3)
      .slice(0, max);
  }

  function hideOverviewDuplicate(section) {
    const firstConceptBlock = Array.from(section.querySelectorAll('.code-block')).find((block) => {
      const label = block.querySelector('.code-label')?.textContent.trim().toLowerCase();
      const text = block.querySelector('pre')?.textContent || '';
      return ['text', 'example'].includes(label) && /[→↓▼│├└]/.test(text);
    });
    if (firstConceptBlock) firstConceptBlock.classList.add('vf-superseded-block');
  }

  function enhanceOverview(section, profile) {
    const diagram = section.querySelector(':scope > .mermaid');
    diagram?.classList.add('vf-superseded-diagram');
    insertVisuals(section, [profileHero(profile), questionLens(profile)]);
    hideOverviewDuplicate(section);
  }

  function enhanceOrderedReasoning(section, title) {
    const list = section.querySelector('.section-body > ol');
    if (!list) return false;
    const items = Array.from(list.children)
      .map((item) => shortText(item.textContent, 130))
      .filter(Boolean);
    if (items.length < 4) return false;

    const visual = createNode(orderedSteps({
      title: `${title.replace(/^\d+\.\s*/, '')}: reasoning sequence`,
      items
    }));
    if (!visual) return false;
    list.insertAdjacentElement('beforebegin', visual);
    list.classList.add('vf-superseded-list');
    return true;
  }

  function enhanceComparisonHeading(section, title, profile) {
    const clean = title.replace(/^\d+\.\s*/, '');
    const parts = clean.split(/\s+(?:vs\.?|versus)\s+/i).map((part) => part.trim()).filter(Boolean);
    if (parts.length !== 2) return false;

    const visual = comparison({
      eyebrow: 'Compare operating models',
      title: clean,
      items: [
        {
          title: parts[0],
          subtitle: profile.dimensions[0]?.subtitle || 'first operating model',
          icon: inferIcon(parts[0]),
          tone: 'blue'
        },
        {
          title: parts[1],
          subtitle: profile.dimensions[1]?.subtitle || 'second operating model',
          icon: inferIcon(parts[1]),
          tone: 'amber'
        }
      ]
    });
    insertVisuals(section, [visual]);
    return true;
  }

  function enhanceFailureSection(section, title) {
    const items = directListItems(section, 7);
    if (items.length < 3) return false;
    insertVisuals(section, [failureCascade({
      title: `${title.replace(/^\d+\.\s*/, '')}: how the failure propagates`,
      items: items.map((item, index) => ({
        title: item,
        tone: inferTone(item, index)
      }))
    })]);
    return true;
  }

  function enhanceAtlas(section, title) {
    const topics = subtopics(section);
    if (topics.length < 2) return false;
    insertVisuals(section, [sectionAtlas({
      title: `${title.replace(/^\d+\.\s*/, '')}: concept map`,
      items: topics
    })]);
    return true;
  }

  function enhanceSection(section, profile) {
    if (section.dataset.courseSectionEnhanced === 'true') return;
    const heading = section.querySelector(':scope > h2');
    if (!heading) return;
    const title = heading.textContent.trim();
    const normalizedTitle = title.toLowerCase();

    if (title === 'Overview') {
      enhanceOverview(section, profile);
    } else {
      let inserted = false;

      if (/\b(interview|design exercise|reasoning sequence|checklist|review checklist)\b/i.test(title)) {
        inserted = enhanceOrderedReasoning(section, title);
      }

      if (!inserted && /\b(?:vs\.?|versus)\b/i.test(title)) {
        inserted = enhanceComparisonHeading(section, title, profile);
      }

      if (!inserted && /\b(failure|outage|incident|avalanche|stampede|overload|poison|conflict|problem)\b/i.test(title)) {
        inserted = enhanceFailureSection(section, title);
      }

      if (!inserted && /\b(algorithms?|strategies|types|patterns|approaches|states|modes|options)\b/i.test(title)) {
        inserted = enhanceAtlas(section, title);
      }

      if (/\b(mental model|key takeaway|architectural connection|production model|summary)\b/i.test(normalizedTitle)) {
        insertVisuals(section, [profileTakeaway(profile)]);
      } else if (!inserted) {
        const topics = subtopics(section);
        if (topics.length >= 4) enhanceAtlas(section, title);
      }
    }

    section.dataset.courseSectionEnhanced = 'true';
  }

  function processConceptBlocks(root, profile) {
    const counters = new Map();
    const blocks = Array.from(root.querySelectorAll('.code-block:not(.vf-superseded-block)'));

    for (const block of blocks) {
      const label = block.querySelector('.code-label');
      const pre = block.querySelector('pre');
      if (!label || !pre) continue;

      const labelText = label.textContent.trim().toLowerCase();
      if (!['text', 'example'].includes(labelText)) continue;
      if (block.dataset.visualChecked === 'true') continue;
      block.dataset.visualChecked = 'true';

      const section = block.closest('.lesson-section');
      const sectionTitle = section?.querySelector(':scope > h2')?.textContent.trim() || profile.title;
      const used = counters.get(section) || 0;
      if (used >= MAX_BLOCK_VISUALS_PER_SECTION) {
        block.classList.add('vf-notation-block');
        label.textContent = labelText === 'example' ? 'Trace' : 'Notation';
        continue;
      }

      const text = normalize(pre.textContent);
      const markup = renderText(text, { profile, sectionTitle });
      if (!markup) {
        block.classList.add('vf-notation-block');
        label.textContent = labelText === 'example' ? 'Trace' : 'Notation';
        continue;
      }

      const visual = createNode(markup);
      if (!visual) continue;
      block.replaceWith(visual);
      counters.set(section, used + 1);
    }
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
    const profile = profileForHash(hash);
    const isLesson = Boolean(lesson && lesson.day >= 1 && lesson.day <= MAX_DAY);

    root.classList?.toggle('visual-prototype', isLesson);
    root.classList?.toggle('visual-course', Boolean(profile));

    if (!profile) return;

    root.querySelectorAll('.lesson-section').forEach((section) => enhanceSection(section, profile));
    processConceptBlocks(root, profile);
    labelRemainingMermaid(root);
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
  global.SWECourseEnhancer = Object.freeze({ enhance, profileForHash });
  scheduleEnhance();
}(window));
