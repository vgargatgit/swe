const app = document.getElementById('app');
const bySlug = Object.fromEntries((window.LESSONS || []).map((lesson) => [lesson.slug, lesson]));

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function slugForDay(day, title) {
  const base = String(title).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `day-${String(day).padStart(2, '0')}-${base}`;
}

function renderMermaid(source) {
  if (!source) return '';
  return `<div class="mermaid">${esc(source)}</div>`;
}

function hasFullLesson(lesson) {
  return Boolean((window.FULL_LESSONS || {})[lesson.slug]);
}

function statusPill(lesson) {
  if (hasFullLesson(lesson)) return '<span class="status status-expanded">Full text</span>';
  if (lesson.day <= 36) return '<span class="status status-published">Needs transcript</span>';
  return '<span class="status status-upcoming">Upcoming</span>';
}

function route() {
  const raw = location.hash.replace(/^#\/?/, '') || '';
  if (!raw) return renderHome();
  if (raw === 'roadmap') return renderRoadmap();
  if (raw === 'about') return renderAbout();
  if (bySlug[raw]) return renderLesson(raw);
  renderNotFound(raw);
}

function renderHome() {
  const published = LESSONS.filter((lesson) => lesson.day <= 36);
  const fullCount = published.filter((lesson) => hasFullLesson(lesson)).length;
  const next = ROADMAP.slice(36, 48);
  app.innerHTML = `
    <section class="hero">
      <div>
        <div class="eyebrow">Practical backend / system design</div>
        <h1>SWE Field Guide</h1>
        <p class="lead">A one-topic-per-day production course for backend architecture, reliability, data systems, scaling, security, and operational judgment.</p>
        <div class="search-row">
          <input id="lessonSearch" placeholder="Search lessons: locking, replica, retry, cache..." aria-label="Search lessons" />
          <button id="clearSearch">Clear</button>
        </div>
      </div>
      <aside class="hero-card">
        <div class="eyebrow">Course status</div>
        <div class="metrics">
          <div class="metric"><strong>${published.length}</strong><span>lessons taught so far</span></div>
          <div class="metric"><strong>${fullCount}</strong><span>full-text lessons imported</span></div>
          <div class="metric"><strong>${ROADMAP.length}</strong><span>total planned topics</span></div>
        </div>
      </aside>
    </section>
    <section class="stage">
      <div class="stage-heading"><h2>Lessons</h2><p>Cards stay compact; lesson pages carry the depth.</p></div>
      <div class="grid" id="lessonGrid">${published.map(renderLessonCard).join('')}</div>
    </section>
    <section class="stage">
      <div class="stage-heading"><h2>Coming next</h2><p>The next scheduled topics in sequence.</p></div>
      <ol class="topic-list">${next.map((title, idx) => `<li>Day ${idx + 37} — ${esc(title)}</li>`).join('')}</ol>
    </section>`;

  const input = document.getElementById('lessonSearch');
  const grid = document.getElementById('lessonGrid');
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    const filtered = published.filter((lesson) => `${lesson.title} ${lesson.summary}`.toLowerCase().includes(q));
    grid.innerHTML = filtered.map(renderLessonCard).join('') || '<p class="lead">No lesson matched that search.</p>';
  });
  document.getElementById('clearSearch').addEventListener('click', () => {
    input.value = '';
    grid.innerHTML = published.map(renderLessonCard).join('');
  });
  renderDiagrams();
}

function renderLessonCard(lesson) {
  return `<article class="card published-card">
    <div class="card-row"><span class="day">Day ${lesson.day}</span>${statusPill(lesson)}</div>
    <h3><a href="#/${lesson.slug}">${esc(lesson.title)}</a></h3>
    <p>${esc(lesson.summary)}</p>
  </article>`;
}

function renderLesson(slug) {
  const summary = bySlug[slug];
  const full = FULL_LESSONS[slug];
  if (!full) return renderCompactLesson(summary);

  app.innerHTML = `
    <div class="breadcrumbs"><a href="#/">Course</a> / Day ${summary.day}</div>
    <header class="lesson-header">
      <div class="eyebrow">Day ${full.day}</div>
      <h1>${esc(full.title)}</h1>
      <p class="lead">${esc(full.subtitle)}</p>
      <div class="meta">${full.tags.map((tag) => `<span class="pill">${esc(tag)}</span>`).join('')}</div>
    </header>
    <div class="layout">
      <main class="content">
        <aside class="quote-card"><small>Core principle</small><p>${esc(full.core)}</p></aside>
        ${full.sections.map((section, index) => renderSection(section, index)).join('')}
        ${Array.isArray(full.keyTakeaways) && full.keyTakeaways.length ? `<section class="lesson-section" id="key-takeaways"><h2>Key takeaways</h2><div class="section-body"><ul class="checklist">${full.keyTakeaways.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></div></section>` : ''}
        ${renderNav(summary)}
      </main>
      <aside class="sidebar">
        <div class="card toc-card">
          <div class="eyebrow">On this page</div>
          <ul>
            ${full.sections.map((section, index) => `<li><a href="#section-${index + 1}">${esc(section.title)}</a></li>`).join('')}
            ${Array.isArray(full.keyTakeaways) && full.keyTakeaways.length ? '<li><a href="#key-takeaways">Key takeaways</a></li>' : ''}
          </ul>
        </div>
      </aside>
    </div>`;
  renderDiagrams();
}

function renderSection(section, index) {
  return `<section class="lesson-section" id="section-${index + 1}">
    <h2>${esc(section.title)}</h2>
    ${renderMermaid(section.diagram)}
    <div class="section-body">${section.body}</div>
  </section>`;
}

function renderCompactLesson(lesson) {
  app.innerHTML = `
    <div class="breadcrumbs"><a href="#/">Course</a> / Day ${lesson.day}</div>
    <header class="lesson-header">
      <div class="eyebrow">Day ${lesson.day}</div>
      <h1>${esc(lesson.title)}</h1>
      <p class="lead">${esc(lesson.summary)}</p>
      <div class="meta"><span class="pill">Full transcript needed</span><span class="pill">Compact placeholder</span></div>
    </header>
    <div class="layout">
      <main class="content">
        <section class="diagram-card">
          <h2>Core diagram</h2>
          ${renderMermaid(lesson.diagram)}
        </section>
        <section class="lesson-section">
          <h2>Awaiting original chat content</h2>
          <div class="section-body"><p>This page is intentionally not marked as fully converted. It still needs the original scheduled-chat lesson text imported so the website preserves the full lesson, not a summary.</p></div>
        </section>
        ${renderNav(lesson)}
      </main>
      <aside class="sidebar"><div class="card"><div class="eyebrow">Status</div><p>Compact placeholder only. Import the full scheduled-chat transcript for this day.</p></div></aside>
    </div>`;
  renderDiagrams();
}

function renderNav(lesson) {
  const prev = LESSONS.find((item) => item.day === lesson.day - 1);
  const next = LESSONS.find((item) => item.day === lesson.day + 1);
  return `<nav class="lesson-nav" aria-label="Lesson navigation">
    ${prev ? `<a href="#/${prev.slug}"><span class="kicker">Previous</span>${esc(prev.title)}</a>` : '<span></span>'}
    ${next ? `<a href="#/${next.slug}"><span class="kicker">Next</span>${esc(next.title)}</a>` : `<a href="#/roadmap"><span class="kicker">Next planned</span>${esc(ROADMAP[lesson.day] || 'Roadmap')}</a>`}
  </nav>`;
}

function renderRoadmap() {
  app.innerHTML = `<section class="lesson-header"><div class="eyebrow">Roadmap</div><h1>Course roadmap</h1><p class="lead">The complete sequence. Published lessons are converted first; later topics remain planned.</p></section><ol class="topic-list">${ROADMAP.map((title, idx) => `<li>Day ${idx + 1} — ${esc(title)}</li>`).join('')}</ol>`;
}

function renderAbout() {
  app.innerHTML = `<section class="lesson-header"><div class="eyebrow">How to use</div><h1>Study like a production engineer</h1><p class="lead">Each lesson should be read as a production review checklist, not just an interview note.</p></section><section class="lesson-section"><h2>Suggested loop</h2><div class="section-body"><ol><li>Start with the diagram and explain it aloud.</li><li>Read the implementation sections and identify where you have seen the same pattern at work.</li><li>Use the incident patterns as debugging prompts.</li><li>Practice the interview answers, but keep them grounded in trade-offs.</li><li>Before designing a system, run the checklist.</li></ol></div></section>`;
}

function renderNotFound(raw) {
  app.innerHTML = `<section class="lesson-header"><div class="eyebrow">Not found</div><h1>Missing route</h1><p class="lead">No page exists for <span class="inline-code">${esc(raw)}</span>.</p><p><a href="#/">Return to the course home.</a></p></section>`;
}

async function renderDiagrams() {
  if (!window.mermaid) return;
  document.querySelectorAll('.mermaid').forEach((node, idx) => {
    if (node.dataset.processed) return;
    node.dataset.processed = 'true';
    node.removeAttribute('data-processed');
  });
  try {
    await window.mermaid.run({ querySelector: '.mermaid' });
  } catch (error) {
    console.error('Mermaid render failed', error);
  }
}

window.addEventListener('hashchange', route);
route();