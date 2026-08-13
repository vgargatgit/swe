(function (global) {
  'use strict';

  const n = (title, subtitle = '', icon = 'layers', tone = 'blue', extra = {}) => ({
    title, subtitle, icon, tone, ...extra
  });

  const x = (match, fallback, spec, hide = [], options = {}) => ({
    match, fallback, spec, hide, ...options
  });

  const base = (type, title, payload = {}, caption = '', eyebrow = '') => ({
    type, title, ...payload, ...(caption ? { caption } : {}), ...(eyebrow ? { eyebrow } : {})
  });

  const p = (title, stages, caption = '', eyebrow = 'System flow') => base('pipeline', title, { stages }, caption, eyebrow);
  const grid = (title, items, caption = '', eyebrow = 'Concept atlas') => base('cardGrid', title, { items }, caption, eyebrow);
  const c = (title, items, caption = '', eyebrow = 'Compare operating models') => base('comparison', title, { items }, caption, eyebrow);
  const t = (title, items, caption = '', eyebrow = 'Sequence over time') => base('timeline', title, { items }, caption, eyebrow);
  const sm = (title, states, transitions = [], caption = '', eyebrow = 'State machine') => base('stateMachine', title, { states, transitions }, caption, eyebrow);
  const sq = (title, actors, events, caption = '', eyebrow = 'Interaction sequence') => base('sequence', title, { actors, events }, caption, eyebrow);
  const fo = (title, source, hub, targets, caption = '', eyebrow = 'Fan-out topology') => base('fanout', title, { source, hub, targets }, caption, eyebrow);
  const tp = (title, center, nodes, caption = '', eyebrow = 'System topology') => base('topology', title, { center, nodes }, caption, eyebrow);
  const tr = (title, left, right, axis, caption = '', eyebrow = 'Trade-off') => base('tradeoff', title, { left, right, axis }, caption, eyebrow);
  const d = (title, question, options, caption = '', eyebrow = 'Decision flow') => base('decision', title, { question, options }, caption, eyebrow);
  const fc = (title, items, caption = '', eyebrow = 'Failure cascade') => base('failureCascade', title, { items }, caption, eyebrow);
  const mb = (title, metrics, caption = '', eyebrow = 'Operational values') => base('metricBoard', title, { metrics }, caption, eyebrow);
  const rm = (title, routes, caption = '', eyebrow = 'Routing map') => base('routeMap', title, { routes }, caption, eyebrow);
  const bi = (title, left, right, middle = 'persistent channel', caption = '', eyebrow = 'Bidirectional connection') => base('bidirectional', title, { left, right, middle }, caption, eyebrow);
  const ls = (title, layers, caption = '', eyebrow = 'Layered model') => base('layerStack', title, { layers }, caption, eyebrow);
  const steps = (title, items, caption = '', eyebrow = 'Reasoning sequence') => base('steps', title, { items }, caption, eyebrow);
  const pb = (title, groups, caption = '', eyebrow = 'Production review') => base('policyBoard', title, { groups }, caption, eyebrow);

  global.SWEBespokeDSL = Object.freeze({ n, x, p, grid, c, t, sm, sq, fo, tp, tr, d, fc, mb, rm, bi, ls, steps, pb });
}(window));
