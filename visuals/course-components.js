(function (global) {
  'use strict';

  const {
    escapeHtml,
    icon,
    shell,
    pipeline,
    layerStack,
    cardGrid,
    comparison,
    timeline,
    steps,
    policyBoard
  } = global.SWEVisualsCore;

  function stateMachine({ title, states, transitions = [], eyebrow = 'State machine', caption = '' }) {
    const stateNodes = states.map((state, index) => {
      const transition = index < states.length - 1
        ? transitions.find((item) => item[0] === state.title && item[1] === states[index + 1].title)
        : null;
      return `<div class="vf-course-state-wrap">
        <article class="vf-course-state" data-tone="${escapeHtml(state.tone || 'blue')}">
          <span class="vf-icon-wrap">${icon(state.icon || 'layers')}</span>
          <strong>${escapeHtml(state.title)}</strong>
          <small>${escapeHtml(state.subtitle || '')}</small>
        </article>
        ${index < states.length - 1 ? `<div class="vf-course-state-link"><i></i><span>${escapeHtml(transition?.[2] || 'transition')}</span></div>` : ''}
      </div>`;
    }).join('');

    const extraTransitions = transitions.filter((transition) => {
      const fromIndex = states.findIndex((state) => state.title === transition[0]);
      const toIndex = states.findIndex((state) => state.title === transition[1]);
      return toIndex !== fromIndex + 1;
    });

    return shell({
      eyebrow,
      title,
      className: 'vf-course-state-figure',
      caption,
      body: `<div class="vf-course-state-machine">${stateNodes}</div>
        ${extraTransitions.length ? `<div class="vf-course-transition-list">${extraTransitions.map((item) => `<span><b>${escapeHtml(item[0])}</b><i>→</i><b>${escapeHtml(item[1])}</b><small>${escapeHtml(item[2])}</small></span>`).join('')}</div>` : ''}`
    });
  }

  function fanout({ title, source, hub, targets, eyebrow = 'Fan-out topology', caption = '' }) {
    return shell({
      eyebrow,
      title,
      className: 'vf-course-fanout-figure',
      caption,
      body: `<div class="vf-course-fanout">
        <article class="vf-course-fan-source" data-tone="${escapeHtml(source.tone || 'blue')}">
          <span class="vf-icon-wrap">${icon(source.icon || 'api')}</span>
          <strong>${escapeHtml(source.title)}</strong>
          <small>${escapeHtml(source.subtitle || '')}</small>
        </article>
        <span class="vf-course-fan-link" aria-hidden="true"></span>
        <article class="vf-course-fan-hub" data-tone="${escapeHtml(hub.tone || 'violet')}">
          <span class="vf-icon-wrap">${icon(hub.icon || 'queue')}</span>
          <strong>${escapeHtml(hub.title)}</strong>
          <small>${escapeHtml(hub.subtitle || '')}</small>
        </article>
        <div class="vf-course-fan-branches" aria-hidden="true"><i></i><i></i><i></i></div>
        <div class="vf-course-fan-targets">${targets.map((target) => `<article data-tone="${escapeHtml(target.tone || 'blue')}">
          <span class="vf-icon-wrap">${icon(target.icon || 'server')}</span>
          <strong>${escapeHtml(target.title)}</strong>
          <small>${escapeHtml(target.subtitle || '')}</small>
        </article>`).join('')}</div>
      </div>`
    });
  }

  function sequence({ title, actors, events, eyebrow = 'Interaction sequence', caption = '' }) {
    const actorIndex = Object.fromEntries(actors.map((actor, index) => [actor, index]));
    const rows = events.map((event, index) => {
      const from = actorIndex[event[0]] ?? 0;
      const to = actorIndex[event[1]] ?? Math.min(from + 1, actors.length - 1);
      const left = Math.min(from, to);
      const span = Math.abs(to - from) + 1;
      const reverse = to < from;
      return `<div class="vf-course-sequence-row">
        <span class="vf-course-sequence-number">${index + 1}</span>
        <div class="vf-course-sequence-event ${reverse ? 'is-reverse' : ''}" style="--vf-seq-left:${left + 1};--vf-seq-span:${span}">
          <i aria-hidden="true"></i><b>${escapeHtml(event[2])}</b>
        </div>
      </div>`;
    }).join('');

    return shell({
      eyebrow,
      title,
      className: 'vf-course-sequence-figure',
      caption,
      body: `<div class="vf-course-sequence" style="--vf-actor-count:${actors.length}">
        <div class="vf-course-sequence-actors">${actors.map((actor) => `<strong>${escapeHtml(actor)}</strong>`).join('')}</div>
        <div class="vf-course-sequence-lanes">${actors.map(() => '<i></i>').join('')}</div>
        <div class="vf-course-sequence-events">${rows}</div>
      </div>`
    });
  }

  function topology({ title, center, nodes, eyebrow = 'Topology', caption = '' }) {
    return shell({
      eyebrow,
      title,
      className: 'vf-course-topology-figure',
      caption,
      body: `<div class="vf-course-topology">
        <article class="vf-course-topology-center" data-tone="${escapeHtml(center.tone || 'violet')}">
          <span class="vf-icon-wrap">${icon(center.icon || 'layers')}</span>
          <strong>${escapeHtml(center.title)}</strong>
          <small>${escapeHtml(center.subtitle || '')}</small>
        </article>
        <div class="vf-course-topology-links" aria-hidden="true">${nodes.map(() => '<i></i>').join('')}</div>
        <div class="vf-course-topology-nodes">${nodes.map((node) => `<article data-tone="${escapeHtml(node.tone || 'blue')}">
          <span class="vf-icon-wrap">${icon(node.icon || 'server')}</span>
          <strong>${escapeHtml(node.title)}</strong>
          <small>${escapeHtml(node.subtitle || '')}</small>
        </article>`).join('')}</div>
      </div>`
    });
  }

  function tradeoff({ title, left, right, axis, eyebrow = 'Trade-off', caption = '' }) {
    return shell({
      eyebrow,
      title,
      className: 'vf-course-tradeoff-figure',
      caption,
      body: `<div class="vf-course-tradeoff">
        <article data-tone="${escapeHtml(left.tone || 'blue')}">
          <span class="vf-icon-wrap">${icon(left.icon || 'layers')}</span>
          <strong>${escapeHtml(left.title)}</strong>
          <small>${escapeHtml(left.subtitle || '')}</small>
        </article>
        <div class="vf-course-tradeoff-axis"><i></i><b>${escapeHtml(axis || 'choose deliberately')}</b><i></i></div>
        <article data-tone="${escapeHtml(right.tone || 'amber')}">
          <span class="vf-icon-wrap">${icon(right.icon || 'layers')}</span>
          <strong>${escapeHtml(right.title)}</strong>
          <small>${escapeHtml(right.subtitle || '')}</small>
        </article>
      </div>`
    });
  }

  function decision({ title, question, options, eyebrow = 'Decision flow', caption = '' }) {
    return shell({
      eyebrow,
      title,
      className: 'vf-course-decision-figure',
      caption,
      body: `<div class="vf-course-decision">
        <article class="vf-course-decision-question" data-tone="${escapeHtml(question.tone || 'violet')}">
          <span class="vf-icon-wrap">${icon(question.icon || 'filter')}</span>
          <strong>${escapeHtml(question.title)}</strong>
          <small>${escapeHtml(question.subtitle || '')}</small>
        </article>
        <div class="vf-course-decision-branches" aria-hidden="true">${options.map(() => '<i></i>').join('')}</div>
        <div class="vf-course-decision-options">${options.map((option, index) => `<article data-tone="${escapeHtml(option.tone || 'blue')}">
          <b>${String.fromCharCode(65 + index)}</b>
          <span class="vf-icon-wrap">${icon(option.icon || 'route')}</span>
          <strong>${escapeHtml(option.title)}</strong>
          <small>${escapeHtml(option.subtitle || '')}</small>
        </article>`).join('')}</div>
      </div>`
    });
  }

  function failureCascade({ title, items, eyebrow = 'Failure cascade', caption = '' }) {
    return shell({
      eyebrow,
      title,
      className: 'vf-course-cascade-figure',
      caption,
      body: `<div class="vf-course-cascade">${items.map((item, index) => `<article data-tone="${escapeHtml(item.tone || (index === items.length - 1 ? 'danger' : 'amber'))}">
          <span>${index + 1}</span>
          <div><strong>${escapeHtml(item.title || item)}</strong>${item.subtitle ? `<small>${escapeHtml(item.subtitle)}</small>` : ''}</div>
        </article>${index < items.length - 1 ? '<i aria-hidden="true"></i>' : ''}`).join('')}</div>`
    });
  }

  function metricBoard({ title, metrics, eyebrow = 'Operational values', caption = '' }) {
    return shell({
      eyebrow,
      title,
      className: 'vf-course-metrics-figure',
      caption,
      body: `<div class="vf-course-metrics">${metrics.map((metric) => `<article data-tone="${escapeHtml(metric.tone || 'blue')}">
        <span class="vf-icon-wrap">${icon(metric.icon || 'chart')}</span>
        <strong>${escapeHtml(metric.label)}</strong>
        <b>${escapeHtml(metric.value)}</b>
        ${metric.note ? `<small>${escapeHtml(metric.note)}</small>` : ''}
      </article>`).join('')}</div>`
    });
  }

  function routeMap({ title, routes, eyebrow = 'Routing map', caption = '' }) {
    return shell({
      eyebrow,
      title,
      className: 'vf-course-routes-figure',
      caption,
      body: `<div class="vf-course-routes">${routes.map((route, index) => `<article data-tone="${escapeHtml(route.tone || ['blue', 'violet', 'amber', 'green'][index % 4])}">
        <div><strong>${escapeHtml(route.from)}</strong>${route.fromNote ? `<small>${escapeHtml(route.fromNote)}</small>` : ''}</div>
        <i aria-hidden="true"></i>
        <div><strong>${escapeHtml(route.to)}</strong>${route.toNote ? `<small>${escapeHtml(route.toNote)}</small>` : ''}</div>
      </article>`).join('')}</div>`
    });
  }

  function bidirectional({ title, left, right, middle = 'persistent channel', eyebrow = 'Bidirectional connection', caption = '' }) {
    return shell({
      eyebrow,
      title,
      className: 'vf-course-bidirectional-figure',
      caption,
      body: `<div class="vf-course-bidirectional">
        <article data-tone="${escapeHtml(left.tone || 'blue')}">${icon(left.icon || 'user')}<strong>${escapeHtml(left.title)}</strong><small>${escapeHtml(left.subtitle || '')}</small></article>
        <div><i></i><b>${escapeHtml(middle)}</b><i></i></div>
        <article data-tone="${escapeHtml(right.tone || 'violet')}">${icon(right.icon || 'server')}<strong>${escapeHtml(right.title)}</strong><small>${escapeHtml(right.subtitle || '')}</small></article>
      </div>`
    });
  }

  function profileHero(profile) {
    const title = `${profile.title}: the production mental model`;
    switch (profile.mode) {
      case 'state':
        return stateMachine({
          title,
          states: profile.states,
          transitions: profile.transitions,
          eyebrow: profile.eyebrow,
          caption: profile.caption
        });
      case 'fanout':
        return fanout({
          title,
          source: profile.source,
          hub: profile.hub,
          targets: profile.targets,
          eyebrow: profile.eyebrow,
          caption: profile.caption
        });
      case 'sequence':
        return sequence({
          title,
          actors: profile.actors,
          events: profile.sequence,
          eyebrow: profile.eyebrow,
          caption: profile.caption
        });
      case 'topology':
        return topology({
          title,
          center: profile.center,
          nodes: profile.nodes,
          eyebrow: profile.eyebrow,
          caption: profile.caption
        });
      case 'tradeoff':
        return tradeoff({
          title,
          left: profile.left,
          right: profile.right,
          axis: profile.axis,
          eyebrow: profile.eyebrow,
          caption: profile.caption
        });
      case 'decision':
        return decision({
          title,
          question: profile.question,
          options: profile.options,
          eyebrow: profile.eyebrow,
          caption: profile.caption
        });
      case 'layers':
        return layerStack({
          title,
          layers: profile.layers,
          caption: profile.caption
        });
      case 'flow':
      default:
        return pipeline({
          title,
          eyebrow: profile.eyebrow,
          stages: profile.stages.map((stage, index) => ({ ...stage, volume: Math.max(42, 100 - index * 8) })),
          caption: profile.caption
        });
    }
  }

  function questionLens(profile) {
    return cardGrid({
      eyebrow: 'Architecture questions',
      title: `What a production design for ${profile.title.toLowerCase()} must decide`,
      items: profile.dimensions,
      className: 'vf-course-question-lens'
    });
  }

  function sectionAtlas({ title, items, caption = '' }) {
    return cardGrid({
      eyebrow: 'Concept atlas',
      title,
      items: items.map((item, index) => ({
        title: item.title,
        subtitle: item.subtitle,
        icon: item.icon || ['layers', 'route', 'scale', 'clock', 'alert', 'check'][index % 6],
        tone: item.tone || ['blue', 'violet', 'amber', 'cyan', 'danger', 'green'][index % 6]
      })),
      caption,
      className: 'vf-course-section-atlas'
    });
  }

  function orderedSteps({ title, items, caption = '' }) {
    return steps({
      eyebrow: 'Reasoning sequence',
      title,
      items: items.map((item) => typeof item === 'string' ? item : item),
      caption
    });
  }

  function profileTakeaway(profile) {
    return policyBoard({
      eyebrow: 'Production review',
      title: `${profile.title}: four checks before shipping`,
      groups: profile.dimensions.map((dimension) => ({
        title: dimension.title,
        icon: dimension.icon,
        tone: dimension.tone,
        rows: [{ label: 'Check', value: dimension.subtitle }]
      }))
    });
  }

  global.SWECourseVisuals = Object.freeze({
    stateMachine,
    fanout,
    sequence,
    topology,
    tradeoff,
    decision,
    failureCascade,
    metricBoard,
    routeMap,
    bidirectional,
    profileHero,
    questionLens,
    sectionAtlas,
    orderedSteps,
    profileTakeaway,
    pipeline,
    layerStack,
    cardGrid,
    comparison,
    timeline,
    steps,
    policyBoard
  });
}(window));
