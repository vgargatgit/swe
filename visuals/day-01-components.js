(function (global) {
  'use strict';

  const { icon, shell, pipeline, layerStack, cardGrid, comparison, timeline, policyBoard } = global.SWEVisualsCore;

  function trustChain() {
    const nodes = [
      { title: 'Client', subtitle: 'Untrusted source', icon: 'user', tone: 'danger' },
      { title: 'CloudFront', subtitle: 'Trusted edge', icon: 'shield', tone: 'blue' },
      { title: 'ALB', subtitle: 'Trusted hop', icon: 'filter', tone: 'cyan' },
      { title: 'NGINX', subtitle: 'Trusted proxy', icon: 'gate', tone: 'violet' },
      { title: 'Tomcat', subtitle: 'Resolve identity', icon: 'server', tone: 'amber' }
    ];
    return pipeline({
      title: 'Trust is established hop by hop',
      eyebrow: 'Trusted proxy boundary',
      stages: nodes.map((node, index) => ({ ...node, volume: 100 - index * 7 })),
      topLabel: 'Forwarded identity accumulates →',
      bottomLabel: 'Inspect the chain from the application back toward the client',
      caption: 'Only headers supplied or sanitized by infrastructure you control should influence client identity.'
    });
  }

  function forwardedChain() {
    return shell({
      eyebrow: 'X-Forwarded-For',
      title: 'Walk right to left; stop at the first untrusted address',
      className: 'vf-trust-walk-figure',
      body: `<div class="vf-trust-walk">
        <div class="vf-address" data-trust="client"><span>client</span><strong>203.0.113.42</strong><small>first untrusted IP</small></div>
        <span class="vf-hop">←</span>
        <div class="vf-address" data-trust="proxy"><span>proxy 1</span><strong>10.0.14.8</strong><small>trusted</small></div>
        <span class="vf-hop">←</span>
        <div class="vf-address" data-trust="proxy"><span>proxy 2</span><strong>10.0.2.19</strong><small>trusted</small></div>
      </div>`,
      caption: 'The leftmost value is not automatically trustworthy. Trust is based on your known proxy ranges and immediate sender.'
    });
  }

  function redisCluster() {
    return shell({
      eyebrow: 'Distributed enforcement',
      title: 'Every application instance must consult one shared counter',
      className: 'vf-redis-figure',
      body: `<div class="vf-redis-cluster">
        <div class="vf-server-stack">
          ${['App 1', 'App 2', 'App 3'].map((name) => `<div>${icon('server')}<strong>${name}</strong><span>partial traffic</span></div>`).join('')}
        </div>
        <div class="vf-stream-lines" aria-hidden="true"><i></i><i></i><i></i></div>
        <div class="vf-redis-core">${icon('redis')}<strong>Shared Redis state</strong><span>one distributed decision</span><b>Atomic Lua check</b></div>
      </div>`,
      caption: 'Local counters diverge when traffic is load-balanced. Shared state produces one coherent limit.'
    });
  }

  function localCounters() {
    return comparison({
      eyebrow: 'Why local state fails',
      title: 'Load balancing creates three partial and conflicting views',
      items: [
        { title: 'App 1', value: '37 requests', subtitle: 'sees only the traffic routed here', icon: 'server', tone: 'blue' },
        { title: 'App 2', value: '41 requests', subtitle: 'maintains a different local counter', icon: 'server', tone: 'cyan' },
        { title: 'App 3', value: '29 requests', subtitle: 'cannot see requests handled elsewhere', icon: 'server', tone: 'violet' }
      ],
      caption: 'A caller may exceed the intended global limit while every instance still believes the caller is below it.'
    });
  }

  function tokenBucket() {
    return shell({
      eyebrow: 'Token bucket',
      title: 'Burst capacity and sustained rate are separate controls',
      className: 'vf-bucket-figure',
      body: `<div class="vf-bucket-layout">
        <div class="vf-bucket">
          <div class="vf-token-fill"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
          <strong>100-token capacity</strong>
        </div>
        <div class="vf-refill">${icon('clock')}<strong>+10 tokens/sec</strong><span>refill rate</span></div>
        <div class="vf-consume">${icon('api')}<strong>−1 token</strong><span>per request</span></div>
      </div>`,
      caption: 'Idle time restores burst room. Sustained callers are constrained by the refill rate.'
    });
  }

  function boundaryBurst() {
    return timeline({
      eyebrow: 'Fixed-window weakness',
      title: 'Two legal windows can create one illegal-looking spike',
      items: [
        { title: '12:00:59', subtitle: '100 requests consume the first window', tone: 'amber' },
        { title: 'Window resets', subtitle: 'counter returns to zero', tone: 'violet' },
        { title: '12:01:00', subtitle: 'another 100 requests arrive', tone: 'danger' },
        { title: 'Observed load', subtitle: '200 requests in roughly one second', tone: 'danger' }
      ],
      caption: 'The stated limit is 100 per minute, but the boundary permits a concentrated burst.'
    });
  }

  function slidingWindow() {
    return shell({
      eyebrow: 'Sliding-window counter',
      title: 'Blend the previous and current windows',
      className: 'vf-window-figure',
      body: `<div class="vf-window-model">
        <div class="vf-window previous"><span>Previous minute</span><strong>80</strong><div><i style="width:75%"></i></div><small>75% still contributes</small></div>
        <div class="vf-plus">+</div>
        <div class="vf-window current"><span>Current minute</span><strong>30</strong><div><i style="width:30%"></i></div><small>25% elapsed</small></div>
        <div class="vf-equals">=</div>
        <div class="vf-window result"><span>Effective count</span><strong>90</strong><small>30 + 80 × 0.75</small></div>
      </div>`,
      caption: 'This smooths the fixed-window boundary without storing every request timestamp.'
    });
  }

  function weightedCosts() {
    return cardGrid({
      eyebrow: 'Weighted token cost',
      title: 'Charge by downstream work, not only by request count',
      items: [
        { title: '/search', value: '1 token', subtitle: 'cheap interactive read', icon: 'route', tone: 'green' },
        { title: '/export', value: '20 tokens', subtitle: 'large query and file generation', icon: 'database', tone: 'amber' },
        { title: '/bulk-upload', value: '50 tokens', subtitle: 'validation and batch writes', icon: 'queue', tone: 'danger' }
      ],
      caption: 'A weighted bucket protects scarce resources more accurately than one-request-one-token accounting.'
    });
  }

  function observabilityBoard(kind) {
    if (kind === 'metrics') {
      return cardGrid({
        eyebrow: 'Operational dashboard',
        title: 'Measure decisions, dependency health, latency, and concentration',
        className: 'vf-observability',
        items: [
          { title: 'Allowed', value: 'rate_limit_allowed_total', icon: 'check', tone: 'green' },
          { title: 'Blocked', value: 'rate_limit_blocked_total', icon: 'x', tone: 'danger' },
          { title: 'Redis errors', value: 'rate_limit_redis_errors_total', icon: 'redis', tone: 'amber' },
          { title: 'Decision latency', value: 'rate_limit_latency_ms', icon: 'pulse', tone: 'violet' },
          { title: 'Hot identities', value: 'top blocked IPs/users', icon: 'users', tone: 'blue' },
          { title: 'Hot routes', value: 'top blocked endpoints', icon: 'route', tone: 'cyan' }
        ]
      });
    }
    return cardGrid({
      eyebrow: 'Alert signals',
      title: 'Alert on sudden change, not merely on non-zero blocking',
      items: [
        { title: '429 spike', subtitle: 'attack, bug, or overly strict policy', icon: 'chart', tone: 'danger' },
        { title: 'Limiter unavailable', subtitle: 'Redis or network dependency failure', icon: 'redis', tone: 'amber' },
        { title: 'Tenant anomaly', subtitle: 'one tenant dominates capacity', icon: 'users', tone: 'violet' },
        { title: 'Auth abuse spike', subtitle: 'login or OTP blocks accelerate', icon: 'lock', tone: 'danger' }
      ]
    });
  }

  function designCanvas() {
    return cardGrid({
      eyebrow: 'Exercise canvas',
      title: 'Design each endpoint across six independent choices',
      items: [
        { title: 'Identity key', subtitle: 'IP, user, tenant, device, or combination', icon: 'fingerprint', tone: 'blue' },
        { title: 'Algorithm', subtitle: 'token bucket, sliding window, or quota', icon: 'filter', tone: 'cyan' },
        { title: 'Limit', subtitle: 'how much usage is permitted', icon: 'scale', tone: 'violet' },
        { title: 'Window', subtitle: 'second, minute, hour, day, or month', icon: 'clock', tone: 'amber' },
        { title: 'Response', subtitle: 'allow, delay, reject, queue, or degrade', icon: 'route', tone: 'green' },
        { title: 'Failure mode', subtitle: 'fail open, fail closed, or local fallback', icon: 'alert', tone: 'danger' }
      ]
    });
  }

  function parseGroupedText(text) {
    const groups = text.split(/\n\s*\n/).map((chunk) => chunk.trim()).filter(Boolean);
    return groups.map((chunk, index) => {
      const lines = chunk.split('\n').map((line) => line.trim()).filter(Boolean);
      const heading = (lines.shift() || `Group ${index + 1}`).replace(/:$/, '');
      return {
        title: heading,
        icon: index % 3 === 0 ? 'user' : index % 3 === 1 ? 'route' : 'layers',
        tone: ['blue', 'violet', 'amber', 'cyan'][index % 4],
        rows: lines.map((line) => {
          const match = line.match(/^([^:]+):\s*(.+)$/);
          return match ? { label: match[1], value: match[2] } : { label: 'Rule', value: line };
        })
      };
    });
  }

  global.SWEChapter1Visuals = Object.freeze({
    trustChain, forwardedChain, redisCluster, localCounters, tokenBucket,
    boundaryBurst, slidingWindow, weightedCosts, observabilityBoard,
    designCanvas, parseGroupedText
  });
}(window));
