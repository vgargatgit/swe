(function (global) {
  'use strict';

  const {
    failureCascade,
    metricBoard,
    routeMap,
    bidirectional,
    stateMachine,
    fanout,
    timeline,
    pipeline,
    layerStack,
    cardGrid,
    comparison
  } = global.SWECourseVisuals;

  const ARROW = /(?:<[-=]+>|↔|⇄|⇆|⟷|→|⇒|⟶|--?>|↓|▼|⇩)/;
  const BRANCH = /[├└┌┬┤┐╰╭╮╯]/;
  const FAILURE_WORDS = /\b(fail(?:ure|ed|ing)?|error|timeout|overload|exhaust|storm|cascade|unhealthy|poison|reject|drop|disconnect|stale|conflict|partition|lost|lag|retry storm|unavailable)\b/i;
  const STATE_WORDS = /\b(CLOSED|OPEN|HALF[_ -]?OPEN|FOLLOWER|CANDIDATE|LEADER|PENDING|RUNNING|COMPLETED|FAILED|COMPENSATING|CANCELLED|READY|NOT[_ -]?READY|HEALTHY|UNHEALTHY|ACTIVE|IDLE|DRAINING)\b/gi;

  function flat(text) {
    return String(text)
      .replace(/[│┃▼▽▲△┌┐└┘├┤┬┴┼─━═\\/]+/g, ' ')
      .replace(/[→⇒⟶↓⇩↔⇄⇆⟷]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function cleanLine(line) {
    return String(line)
      .replace(/[┌┐└┘├┤┬┴┼│┃─━═]+/g, ' ')
      .replace(/^\s*(?:[•*+-]|\d+[.)])\s*/, '')
      .replace(/^\s*(?:→|⇒|⟶|↓|▼|⇩)+\s*/, '')
      .replace(/\s*(?:→|⇒|⟶|↓|▼|⇩)+\s*$/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function cleanLines(text) {
    const noise = /^(?:\.{3,}|[-=+|/\\]+|OR|AND|YES|NO|HIT|MISS)$/i;
    const lines = String(text)
      .split(/\r?\n/)
      .map(cleanLine)
      .filter(Boolean)
      .filter((line) => !noise.test(line))
      .filter((line) => line.length <= 140);

    return Array.from(new Set(lines));
  }

  function isCodeLike(text) {
    const value = String(text);
    const lines = value.split(/\r?\n/);
    if (lines.length > 22 || lines.some((line) => line.length > 180)) return true;

    const strongSignals = [
      /[{};]/,
      /<\/?[a-z][^>]*>/i,
      /^\s*(?:public|private|protected|class|interface|record|enum|if|else|for|while|switch|try|catch|finally|return|throw|new)\b/m,
      /\b(?:SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|MERGE|EXPLAIN|ANALYZE|FROM|JOIN|WHERE|GROUP BY|ORDER BY)\b/i,
      /^\s*(?:docker|kubectl|helm|curl|aws|git|mvn|gradle|java|python|npm|yarn)\s+[-\w]/m,
      /HTTP\/\d(?:\.\d)?|Content-Type:|Authorization:|Set-Cookie:|X-Forwarded-|Forwarded:/i,
      /\b(?:Duration\.|ThreadLocalRandom|redis\.|request\.|response\.|@Transactional|CallNotPermittedException)\b/,
      /^\s*[\w.-]+:\s*$\n\s{2,}[\w.-]+:/m,
      /\$\{[^}]+\}|\b[A-Z_]{3,}\s*=\s*[^\s]+/,
      /\b(?:localhost|https?:\/\/|jdbc:|arn:aws:)\b/i
    ];

    const score = strongSignals.reduce((total, pattern) => total + Number(pattern.test(value)), 0);
    return score >= 1;
  }

  function parseMetrics(text) {
    const metrics = [];
    for (const line of cleanLines(text)) {
      const match = line.match(/^([^:=]{1,54}?)\s*(?:=|:)\s*(.+)$/);
      if (!match) continue;
      const label = match[1].trim();
      const value = match[2].trim();
      if (/^(?:http|https|host|content-type|authorization|x-forwarded-for)$/i.test(label)) continue;
      if (value.length > 65) continue;
      metrics.push({ label, value });
    }
    return metrics;
  }

  function parseInlineChain(text) {
    const lines = String(text).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length !== 1) return [];
    const parts = lines[0]
      .split(/\s*(?:--?>|→|⇒|⟶|↓|▼|⇩)\s*/)
      .map(cleanLine)
      .filter(Boolean);
    return parts.length >= 3 && parts.length <= 9 ? parts : [];
  }

  function parseRoutes(text) {
    const routes = [];
    const routePattern = /^(.+?)\s*(?:--?>|→|⇒|⟶)\s*(.+)$/;
    const bidiPattern = /^(.+?)\s*(?:<[-=]+>|↔|⇄|⇆|⟷)\s*(.+)$/;
    for (const raw of String(text).split(/\r?\n/)) {
      const line = cleanLine(raw);
      if (!line) continue;
      let match = line.match(bidiPattern);
      if (match) {
        routes.push({ from: match[1].trim(), to: match[2].trim(), bidirectional: true });
        continue;
      }
      match = line.match(routePattern);
      if (match) routes.push({ from: match[1].trim(), to: match[2].trim(), bidirectional: false });
    }
    return routes;
  }

  function stateNames(text, profile) {
    const names = [];
    const source = String(text);
    const profileStates = profile?.states?.map((state) => state.title) || [];
    for (const candidate of profileStates) {
      if (source.toLowerCase().includes(candidate.toLowerCase())) names.push(candidate);
    }
    for (const match of source.matchAll(STATE_WORDS)) {
      const normalized = match[0].replace(/[_ -]+/g, '_').toUpperCase();
      if (!names.includes(normalized)) names.push(normalized);
    }
    return names;
  }

  function shortNodes(text) {
    const lines = cleanLines(text)
      .map((line) => line.replace(/^(?:new requests|existing requests|client|server|application|database|queue|topic)\s*:\s*/i, (match) => match.trim()))
      .filter((line) => !/^\d+(?:\.\d+)?\s*(?:ms|s|sec|seconds?|minutes?|rps|%)$/i.test(line));
    return lines.filter((line) => line.length >= 2 && line.length <= 72);
  }

  function inferIcon(text, fallback = 'layers') {
    const value = String(text).toLowerCase();
    if (/database|postgres|mysql|table|row|primary|replica|shard/.test(value)) return 'database';
    if (/queue|topic|broker|event|message/.test(value)) return 'queue';
    if (/client|browser|user|caller|producer/.test(value)) return 'user';
    if (/server|service|application|app|pod|container|node/.test(value)) return 'server';
    if (/lock|version|idempot|leader|fenc/.test(value)) return 'lock';
    if (/retry|replay|recover|compensat/.test(value)) return 'retry';
    if (/timeout|wait|ttl|delay|deadline|clock/.test(value)) return 'clock';
    if (/fail|error|unhealthy|reject|drop|conflict/.test(value)) return 'alert';
    if (/route|proxy|gateway|dns|load balancer|lb/.test(value)) return 'route';
    if (/metric|latency|cpu|memory|count|rate|percent/.test(value)) return 'chart';
    if (/auth|tls|security|trusted|shield/.test(value)) return 'shield';
    if (/success|complete|allowed|healthy/.test(value)) return 'check';
    return fallback;
  }

  function inferTone(text, index = 0) {
    const value = String(text).toLowerCase();
    if (/fail|error|unhealthy|reject|drop|conflict|overload|poison|stale|lost/.test(value)) return 'danger';
    if (/wait|retry|timeout|lag|pending|drain|half/.test(value)) return 'amber';
    if (/success|complete|healthy|ready|allowed|winner|primary/.test(value)) return 'green';
    return ['blue', 'violet', 'cyan', 'amber'][index % 4];
  }

  function renderMetrics(metrics, context) {
    return metricBoard({
      eyebrow: 'Values that shape behavior',
      title: context.sectionTitle || 'Operational parameters',
      metrics: metrics.slice(0, 8).map((metric, index) => ({
        ...metric,
        icon: inferIcon(metric.label),
        tone: inferTone(`${metric.label} ${metric.value}`, index)
      }))
    });
  }

  function renderStates(text, names, context) {
    const routes = parseRoutes(text);
    const states = names.slice(0, 7).map((name, index) => ({
      title: name,
      subtitle: index === 0 ? 'current or starting state' : 'state transition outcome',
      icon: inferIcon(name, 'pulse'),
      tone: inferTone(name, index)
    }));
    const transitions = routes
      .filter((route) => names.some((name) => name.toLowerCase() === route.from.toLowerCase()) && names.some((name) => name.toLowerCase() === route.to.toLowerCase()))
      .map((route) => [route.from, route.to, 'condition satisfied']);

    return stateMachine({
      eyebrow: 'State transition',
      title: context.sectionTitle || `${context.profile?.title || 'System'} lifecycle`,
      states,
      transitions
    });
  }

  function renderFanout(text, nodes, context) {
    const routes = parseRoutes(text);
    const counts = new Map();
    for (const route of routes) counts.set(route.from, (counts.get(route.from) || 0) + 1);
    const commonSource = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

    if (commonSource && (counts.get(commonSource) || 0) >= 2) {
      const targets = routes.filter((route) => route.from === commonSource).map((route, index) => ({
        title: route.to,
        subtitle: 'independent destination',
        icon: inferIcon(route.to),
        tone: inferTone(route.to, index)
      }));
      return fanout({
        eyebrow: 'One-to-many flow',
        title: context.sectionTitle || 'One source distributes work to multiple destinations',
        source: { title: 'Caller / producer', subtitle: 'initiates the operation', icon: 'user', tone: 'blue' },
        hub: { title: commonSource, subtitle: 'routes or publishes', icon: inferIcon(commonSource, 'route'), tone: 'violet' },
        targets
      });
    }

    const hubIndex = nodes.findIndex((node) => /load balancer|\blb\b|gateway|proxy|topic|broker|queue|router|service|ingress/i.test(node));
    const sourceIndex = nodes.findIndex((node) => /client|caller|producer|publisher|internet|application/i.test(node));
    const hubTitle = nodes[hubIndex >= 0 ? hubIndex : Math.min(1, nodes.length - 1)];
    const sourceTitle = nodes[sourceIndex >= 0 ? sourceIndex : 0];
    const targets = nodes.filter((node) => node !== hubTitle && node !== sourceTitle).slice(0, 6);
    if (targets.length < 2) return null;

    return fanout({
      eyebrow: 'Fan-out',
      title: context.sectionTitle || 'Traffic branches to multiple destinations',
      source: { title: sourceTitle, subtitle: 'source', icon: inferIcon(sourceTitle), tone: 'blue' },
      hub: { title: hubTitle, subtitle: 'distribution point', icon: inferIcon(hubTitle, 'route'), tone: 'violet' },
      targets: targets.map((target, index) => ({
        title: target,
        subtitle: 'destination',
        icon: inferIcon(target),
        tone: inferTone(target, index)
      }))
    });
  }

  function renderFailure(nodes, context) {
    return failureCascade({
      eyebrow: 'Failure propagation',
      title: context.sectionTitle || 'One local problem amplifies across the system',
      items: nodes.slice(0, 8).map((node, index) => ({
        title: node,
        icon: inferIcon(node),
        tone: inferTone(node, index)
      })),
      caption: 'The architecture must interrupt this chain before the final system-wide outcome.'
    });
  }

  function renderTimeline(nodes, context) {
    return timeline({
      eyebrow: 'Sequence over time',
      title: context.sectionTitle || 'Behavior unfolds across repeated attempts or state changes',
      items: nodes.slice(0, 8).map((node, index) => ({
        title: node,
        subtitle: index === 0 ? 'start' : index === nodes.length - 1 ? 'outcome' : 'next step',
        tone: inferTone(node, index)
      }))
    });
  }

  function renderPipeline(nodes, context) {
    return pipeline({
      eyebrow: 'System flow',
      title: context.sectionTitle || 'Follow the operation through the system',
      stages: nodes.slice(0, 8).map((node, index) => ({
        title: node,
        subtitle: index === 0 ? 'entry point' : index === nodes.length - 1 ? 'result or protected resource' : 'processing stage',
        icon: inferIcon(node),
        tone: inferTone(node, index),
        volume: Math.max(48, 100 - index * 7)
      }))
    });
  }

  function renderRoutes(routes, context) {
    if (routes.length === 1 && routes[0].bidirectional) {
      return bidirectional({
        eyebrow: 'Two-way channel',
        title: context.sectionTitle || 'Both sides can communicate independently',
        left: { title: routes[0].from, subtitle: 'endpoint A', icon: inferIcon(routes[0].from), tone: 'blue' },
        right: { title: routes[0].to, subtitle: 'endpoint B', icon: inferIcon(routes[0].to), tone: 'violet' }
      });
    }

    const sameSource = routes.length >= 2 && routes.every((route) => route.from === routes[0].from);
    if (sameSource) return renderFanout(routes.map((route) => `${route.from} → ${route.to}`).join('\n'), [], context);

    return routeMap({
      eyebrow: 'Routing rules',
      title: context.sectionTitle || 'Different inputs take different paths',
      routes: routes.slice(0, 8).map((route, index) => ({
        from: route.from,
        to: route.to,
        tone: inferTone(`${route.from} ${route.to}`, index)
      }))
    });
  }

  function renderShortList(nodes, context) {
    if (nodes.length < 3 || nodes.length > 8) return null;
    return cardGrid({
      eyebrow: 'Concept set',
      title: context.sectionTitle || 'Key concepts in this section',
      items: nodes.map((node, index) => ({
        title: node,
        subtitle: 'part of the production design',
        icon: inferIcon(node),
        tone: inferTone(node, index)
      }))
    });
  }

  function renderText(text, context = {}) {
    const source = String(text).trim();
    if (!source || isCodeLike(source)) return null;

    const metrics = parseMetrics(source);
    const routes = parseRoutes(source);
    const inlineChain = parseInlineChain(source);
    const nodes = shortNodes(source);
    const states = stateNames(source, context.profile);
    const hasArrows = ARROW.test(source) || /[│┃▼]/.test(source);
    const hasBranches = BRANCH.test(source);
    const isFailure = FAILURE_WORDS.test(source) || /failure|incident|outage|overload|storm|poison|conflict/i.test(context.sectionTitle || '');
    const isTimed = /\b(?:attempt|retry|delay|backoff|wait|timeout|seconds?|minutes?|milliseconds?|ms|t\+\d+)\b/i.test(source);

    if (states.length >= 3) return renderStates(source, states, context);
    if (metrics.length >= 2 && metrics.length <= 8) return renderMetrics(metrics, context);
    if (inlineChain.length >= 3) {
      if (isFailure) return renderFailure(inlineChain, context);
      if (isTimed) return renderTimeline(inlineChain, context);
      return renderPipeline(inlineChain, context);
    }
    if (routes.length >= 1) return renderRoutes(routes, context);
    if ((hasBranches || /fan[- ]?out|broadcast|subscriber|consumer|shard|replica/i.test(source)) && nodes.length >= 3) {
      const visual = renderFanout(source, nodes, context);
      if (visual) return visual;
    }
    if (hasArrows && isFailure && nodes.length >= 3) return renderFailure(nodes, context);
    if (hasArrows && isTimed && nodes.length >= 3) return renderTimeline(nodes, context);
    if (hasArrows && nodes.length >= 2) return renderPipeline(nodes, context);

    const plusParts = source.split(/\n\s*\+\s*\n|\s+\+\s+/).map(cleanLine).filter(Boolean);
    if (plusParts.length >= 2 && plusParts.length <= 7) {
      return cardGrid({
        eyebrow: 'Combined responsibilities',
        title: context.sectionTitle || 'The production behavior is the sum of several controls',
        items: plusParts.map((part, index) => ({
          title: part,
          subtitle: 'required responsibility',
          icon: inferIcon(part),
          tone: inferTone(part, index)
        }))
      });
    }

    if (/\b(?:vs\.?|versus)\b/i.test(source) && nodes.length >= 2) {
      return comparison({
        eyebrow: 'Comparison',
        title: context.sectionTitle || 'Compare the two behaviors',
        items: nodes.slice(0, 4).map((node, index) => ({
          title: node,
          subtitle: 'distinct operating model',
          icon: inferIcon(node),
          tone: index === 0 ? 'blue' : 'amber'
        }))
      });
    }

    return renderShortList(nodes, context);
  }

  global.SWECourseRules = Object.freeze({
    flat,
    cleanLines,
    isCodeLike,
    parseMetrics,
    parseInlineChain,
    parseRoutes,
    stateNames,
    renderText,
    inferIcon,
    inferTone
  });
}(window));
