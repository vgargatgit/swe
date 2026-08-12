(function (global) {
  'use strict';

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const normalize = (value) => String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+$/g, ''))
    .join('\n')
    .trim();

  const iconPaths = {
    shield: '<path d="M12 3 19 6v5c0 4.7-2.8 8-7 10-4.2-2-7-5.3-7-10V6l7-3Z"/><path d="m9 12 2 2 4-4"/>',
    gate: '<path d="M5 21V5l7-2 7 2v16"/><path d="M9 21V9h6v12M3 21h18"/>',
    brain: '<path d="M9.5 4.5A3 3 0 0 0 6 7.4 3.2 3.2 0 0 0 4.5 13 3.3 3.3 0 0 0 8 18.5V20h4V7.5a3 3 0 0 0-2.5-3Z"/><path d="M14.5 4.5A3 3 0 0 1 18 7.4a3.2 3.2 0 0 1 1.5 5.6 3.3 3.3 0 0 1-3.5 5.5V20h-4V7.5a3 3 0 0 1 2.5-3ZM8 9h4m0 5h4M7 14h2m6-5h2"/>',
    database: '<ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 8-8m-3 3 3 3m-6 0 3 3"/>',
    route: '<circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><path d="M6 16V9a4 4 0 0 1 4-4h5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    coins: '<ellipse cx="9" cy="6" rx="5" ry="2.5"/><path d="M4 6v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V6M4 10v4c0 1.4 2.2 2.5 5 2.5 1 0 2-.2 2.8-.5"/><path d="M14 12.5c3 0 5 1.1 5 2.5s-2 2.5-5 2.5-5-1.1-5-2.5 2-2.5 5-2.5Zm-5 2.5v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-4"/>',
    alert: '<path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v5m0 3h.01"/>',
    chart: '<path d="M4 19V9m6 10V5m6 14v-7m4 7H2"/>',
    redis: '<path d="m12 3 8 4-8 4-8-4 8-4Z"/><path d="m4 11 8 4 8-4M4 15l8 4 8-4"/>',
    server: '<rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/><path d="M7 7h.01M7 17h.01"/>',
    retry: '<path d="M20 7v5h-5"/><path d="M4 17v-5h5"/><path d="M6.1 8a7 7 0 0 1 11.7-2.6L20 7M4 17l2.2 1.6A7 7 0 0 0 18 16"/>',
    queue: '<path d="M5 6h14M5 12h10M5 18h6"/><path d="m16 15 3 3-3 3"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    pulse: '<path d="M3 12h4l2-6 4 12 2-6h6"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    x: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z"/>',
    api: '<path d="M8 9 4 12l4 3m8-6 4 3-4 3m-2-9-4 12"/>',
    fingerprint: '<path d="M7 12a5 5 0 0 1 10 0c0 4-1 7-2 9M4 13a8 8 0 0 1 16-1c0 2-.2 4-.7 6M10 21c1-2 1.5-5.5 1.5-9a.5.5 0 0 1 1 0c0 2.5-.2 4.7-.7 6.5M6 18c.5-1.7.7-3.8.7-6"/>',
    scale: '<path d="M12 3v18M5 6h14M5 6l-3 6h6L5 6Zm14 0-3 6h6l-3-6ZM8 21h8"/>'
  };

  function icon(name) {
    const path = iconPaths[name] || iconPaths.layers;
    return `<svg class="vf-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  }

  function shell({ eyebrow = 'Visual model', title, body, caption = '', className = '' }) {
    return `<figure class="vf-visual ${className}">
      <figcaption class="vf-heading">
        <span class="vf-eyebrow">${escapeHtml(eyebrow)}</span>
        <strong class="vf-title">${escapeHtml(title)}</strong>
      </figcaption>
      ${body}
      ${caption ? `<p class="vf-caption">${escapeHtml(caption)}</p>` : ''}
    </figure>`;
  }

  function stageCard(stage, index) {
    const volume = Math.max(10, Math.min(100, Number(stage.volume ?? 100)));
    return `<div class="vf-stage" data-tone="${escapeHtml(stage.tone || 'blue')}">
      <div class="vf-stage-top">
        <span class="vf-icon-wrap">${icon(stage.icon || 'layers')}</span>
        <span class="vf-step">0${index + 1}</span>
      </div>
      <strong>${escapeHtml(stage.title)}</strong>
      <span>${escapeHtml(stage.subtitle)}</span>
      ${stage.branch ? `<small class="vf-branch">${escapeHtml(stage.branch)}</small>` : ''}
      <div class="vf-volume-track" title="Illustrative traffic remaining">
        <span style="--vf-volume:${volume}%"></span>
      </div>
    </div>`;
  }

  function pipeline({ title, stages, eyebrow = 'Progressive filtering', caption = '', topLabel = '', bottomLabel = '' }) {
    const nodes = stages.map((stage, index) => `${stageCard(stage, index)}${index < stages.length - 1 ? '<span class="vf-connector" aria-hidden="true"></span>' : ''}`).join('');
    return shell({
      eyebrow,
      title,
      className: 'vf-pipeline-figure',
      caption,
      body: `${topLabel ? `<div class="vf-axis vf-axis-top"><span>${escapeHtml(topLabel)}</span><i></i></div>` : ''}
        <div class="vf-pipeline" style="--vf-stage-count:${stages.length}">${nodes}</div>
        ${bottomLabel ? `<div class="vf-axis vf-axis-bottom"><i></i><span>${escapeHtml(bottomLabel)}</span></div>` : ''}`
    });
  }

  function layerStack({ title, layers, caption = '' }) {
    const rows = layers.map((layer, index) => `<div class="vf-layer" data-tone="${escapeHtml(layer.tone || 'blue')}" style="--vf-inset:${index * 5}%">
      <span class="vf-icon-wrap">${icon(layer.icon || 'layers')}</span>
      <div><strong>${escapeHtml(layer.title)}</strong><span>${escapeHtml(layer.subtitle)}</span></div>
    </div>`).join('');
    return shell({
      eyebrow: 'Defense in depth',
      title,
      className: 'vf-layer-figure',
      caption,
      body: `<div class="vf-layer-stack">${rows}</div>`
    });
  }

  function cardGrid({ title, items, eyebrow = 'Decision lenses', caption = '', className = '' }) {
    const cards = items.map((item) => `<article class="vf-card" data-tone="${escapeHtml(item.tone || 'blue')}">
      <div class="vf-card-icon">${icon(item.icon || 'layers')}</div>
      <strong>${escapeHtml(item.title)}</strong>
      ${item.value ? `<b>${escapeHtml(item.value)}</b>` : ''}
      ${item.subtitle ? `<span>${escapeHtml(item.subtitle)}</span>` : ''}
      ${Array.isArray(item.lines) ? `<ul>${item.lines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>` : ''}
    </article>`).join('');
    return shell({
      eyebrow,
      title,
      className: `vf-card-figure ${className}`,
      caption,
      body: `<div class="vf-card-grid" style="--vf-card-count:${Math.min(items.length, 4)}">${cards}</div>`
    });
  }

  function comparison({ title, items, eyebrow = 'Compare the behaviors', caption = '' }) {
    const cards = items.map((item) => `<article class="vf-compare-card" data-tone="${escapeHtml(item.tone || 'blue')}">
      <div class="vf-card-icon">${icon(item.icon || 'layers')}</div>
      <strong>${escapeHtml(item.title)}</strong>
      ${item.value ? `<b>${escapeHtml(item.value)}</b>` : ''}
      <p>${escapeHtml(item.subtitle || '')}</p>
      ${Array.isArray(item.lines) ? `<ul>${item.lines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>` : ''}
    </article>`).join('');
    return shell({
      eyebrow,
      title,
      className: 'vf-comparison-figure',
      caption,
      body: `<div class="vf-comparison" style="--vf-compare-count:${items.length}">${cards}</div>`
    });
  }

  function timeline({ title, items, eyebrow = 'Sequence over time', caption = '' }) {
    const entries = items.map((item, index) => `<div class="vf-timeline-item" data-tone="${escapeHtml(item.tone || 'blue')}">
      <span class="vf-timeline-dot">${index + 1}</span>
      <strong>${escapeHtml(item.title)}</strong>
      <span>${escapeHtml(item.subtitle || '')}</span>
    </div>`).join('');
    return shell({
      eyebrow,
      title,
      className: 'vf-timeline-figure',
      caption,
      body: `<div class="vf-timeline">${entries}</div>`
    });
  }

  function steps({ title, items, eyebrow = 'Execution flow', caption = '' }) {
    const entries = items.map((item, index) => `<li><span>${index + 1}</span><div><strong>${escapeHtml(item.title || item)}</strong>${item.subtitle ? `<small>${escapeHtml(item.subtitle)}</small>` : ''}</div></li>`).join('');
    return shell({
      eyebrow,
      title,
      className: 'vf-steps-figure',
      caption,
      body: `<ol class="vf-steps">${entries}</ol>`
    });
  }

  function policyBoard({ title, groups, eyebrow = 'Policy board', caption = '' }) {
    const cards = groups.map((group) => `<article class="vf-policy" data-tone="${escapeHtml(group.tone || 'blue')}">
      <header><span class="vf-icon-wrap">${icon(group.icon || 'api')}</span><strong>${escapeHtml(group.title)}</strong></header>
      <div>${group.rows.map((row) => `<p><span>${escapeHtml(row.label)}</span><b>${escapeHtml(row.value)}</b></p>`).join('')}</div>
    </article>`).join('');
    return shell({
      eyebrow,
      title,
      className: 'vf-policy-figure',
      caption,
      body: `<div class="vf-policy-grid">${cards}</div>`
    });
  }

  global.SWEVisualsCore = Object.freeze({
    escapeHtml, normalize, icon, shell, pipeline, layerStack, cardGrid,
    comparison, timeline, steps, policyBoard
  });
}(window));
