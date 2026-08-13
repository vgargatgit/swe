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

  function overviewQuestions() {
    return cardGrid({
      eyebrow: 'Production questions',
      title: 'Traffic distribution is only one part of the control plane',
      items: [
        { title: 'Routing', subtitle: 'Which backend receives the next request?', icon: 'route', tone: 'blue' },
        { title: 'Readiness', subtitle: 'Should this target receive new work?', icon: 'check', tone: 'green' },
        { title: 'Gray failure', subtitle: 'What if a target is alive but painfully slow?', icon: 'pulse', tone: 'amber' },
        { title: 'Connection lifecycle', subtitle: 'What happens during draining or replacement?', icon: 'clock', tone: 'violet' },
        { title: 'TLS boundary', subtitle: 'Where is traffic decrypted and re-encrypted?', icon: 'lock', tone: 'cyan' },
        { title: 'Client identity', subtitle: 'Which proxy-provided address can be trusted?', icon: 'fingerprint', tone: 'danger' },
        { title: 'Request cost', subtitle: 'Are requests short, expensive, or long-lived?', icon: 'scale', tone: 'amber' }
      ]
    });
  }

  function trafficDistributor() {
    return shell({
      eyebrow: 'Load-balancing control plane',
      title: 'One entry point distributes traffic while observing target state',
      className: 'vf-lb-overview-figure',
      body: `<div class="vf-lb-overview">
        <div class="vf-lb-clients">
          ${Array.from({ length: 6 }, (_, index) => `<span style="--vf-i:${index}">${icon('user')}</span>`).join('')}
          <strong>Clients</strong><small>requests and connections</small>
        </div>
        <span class="vf-lb-flow" aria-hidden="true"></span>
        <div class="vf-lb-core">${icon('scale')}<strong>Load balancer</strong><span>route · observe · drain</span></div>
        <div class="vf-lb-fanout" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
        <div class="vf-lb-targets">
          ${['A', 'B', 'C', 'D'].map((name, index) => `<article data-tone="${['blue', 'cyan', 'violet', 'green'][index]}">${icon('server')}<strong>Instance ${name}</strong><span>${index === 2 ? 'slow signal observed' : 'ready for traffic'}</span></article>`).join('')}
        </div>
      </div>`,
      caption: 'The balancer is both a router and a failure boundary; bad health or capacity decisions can amplify an incident.'
    });
  }

  function singleServerPath() {
    return pipeline({
      eyebrow: 'Single-server architecture',
      title: 'All traffic and failure concentrate on one application instance',
      stages: [
        { title: 'Client', subtitle: 'all requests enter one path', icon: 'user', tone: 'blue', volume: 100 },
        { title: 'Spring Boot', subtitle: '2,000 RPS capacity and one failure domain', icon: 'server', tone: 'danger', volume: 100 },
        { title: 'Database', subtitle: 'shared source of truth', icon: 'database', tone: 'amber', volume: 100 }
      ],
      caption: 'The application instance is simultaneously the throughput ceiling and a single point of failure.'
    });
  }

  function verticalScale() {
    return comparison({
      eyebrow: 'Scale-up limits',
      title: 'Vertical scaling buys time but keeps one failure domain',
      items: [
        { title: 'Before', value: '8 CPU · 16 GB', subtitle: 'lower capacity and cost', icon: 'server', tone: 'blue' },
        { title: 'After', value: '32 CPU · 64 GB', subtitle: 'higher capacity, but finite hardware and cost limits', icon: 'server', tone: 'amber' }
      ],
      caption: 'Scaling up does not remove the single-instance availability problem.'
    });
  }

  function horizontalCapacity() {
    return shell({
      eyebrow: 'Horizontal scaling',
      title: 'Split 8,000 requests per second across four equal instances',
      className: 'vf-capacity-split-figure',
      body: `<div class="vf-capacity-split">
        <div class="vf-capacity-source"><strong>8,000</strong><span>RPS</span></div>
        <span class="vf-capacity-funnel" aria-hidden="true"></span>
        <div class="vf-capacity-targets">
          ${['App 1', 'App 2', 'App 3', 'App 4'].map((name, index) => `<article data-tone="${['blue', 'cyan', 'violet', 'green'][index]}">${icon('server')}<strong>${name}</strong><b>≈ 2,000 RPS</b><span>equal estimated capacity</span></article>`).join('')}
        </div>
      </div>`,
      caption: 'This approximation works only while targets and requests have comparable cost.'
    });
  }

  function failureRedistribution() {
    return shell({
      eyebrow: 'Failure redistribution',
      title: 'Removing one target preserves routing but increases survivor load',
      className: 'vf-failure-redistribution-figure',
      body: `<div class="vf-failure-redistribution">
        ${[
          ['App 1', 'ready', 'green'],
          ['App 2', 'ready', 'green'],
          ['App 3', 'removed', 'danger'],
          ['App 4', 'ready', 'green']
        ].map(([name, state, tone]) => `<article data-tone="${tone}">${icon(state === 'removed' ? 'x' : 'server')}<strong>${name}</strong><span>${state}</span><i style="--vf-load:${state === 'removed' ? 0 : 33}%"></i></article>`).join('')}
        <div class="vf-failure-note">${icon('alert')}<div><strong>Load does not disappear</strong><span>the remaining targets must absorb it</span></div></div>
      </div>`,
      caption: 'A load balancer distributes both load and failure. Capacity headroom determines whether redistribution is safe.'
    });
  }

  function l4VsL7() {
    return comparison({
      eyebrow: 'Routing layer',
      title: 'L4 selects a connection destination; L7 interprets an application request',
      items: [
        {
          title: 'Layer 4',
          value: 'IP · TCP/UDP · port',
          subtitle: 'Fast, protocol-agnostic transport routing.',
          icon: 'route',
          tone: 'blue',
          lines: ['high throughput', 'low semantic overhead', 'supports non-HTTP traffic', 'cannot inspect HTTP paths naturally']
        },
        {
          title: 'Layer 7',
          value: 'host · path · method · headers',
          subtitle: 'HTTP-aware routing and policy.',
          icon: 'api',
          tone: 'violet',
          lines: ['path and host routing', 'header and cookie decisions', 'TLS termination', 'redirects and HTTP policy']
        }
      ]
    });
  }

  function routeExamples() {
    return policyBoard({
      eyebrow: 'Application-aware routing',
      title: 'L7 policies route by request meaning',
      groups: [
        { title: 'Path rules', icon: 'route', tone: 'blue', rows: [
          { label: '/products/*', value: 'Product Service' },
          { label: '/orders/*', value: 'Order Service' }
        ] },
        { title: 'Host rules', icon: 'api', tone: 'violet', rows: [
          { label: 'admin.example.com', value: 'Admin Backend' },
          { label: 'api.example.com', value: 'API Backend' }
        ] }
      ],
      caption: 'The same entry point can select entirely different backend pools from HTTP context.'
    });
  }

  function algorithmAtlas() {
    return cardGrid({
      eyebrow: 'Algorithm atlas',
      title: 'Each algorithm uses a different approximation of “best target”',
      items: [
        { title: 'Round robin', subtitle: 'cycle through targets; assumes similar request and server cost', icon: 'retry', tone: 'blue' },
        { title: 'Weighted round robin', subtitle: 'send proportionally more traffic to larger or preferred targets', icon: 'scale', tone: 'cyan' },
        { title: 'Least connections', subtitle: 'prefer the fewest active connections', icon: 'users', tone: 'violet' },
        { title: 'Least response time', subtitle: 'combine active load with observed latency', icon: 'pulse', tone: 'amber' },
        { title: 'Consistent hashing', subtitle: 'keep a routing key near the same server with limited remapping', icon: 'fingerprint', tone: 'green' }
      ]
    });
  }

  function roundRobin() {
    return shell({
      eyebrow: 'Round robin',
      title: 'Requests rotate through targets in a fixed sequence',
      className: 'vf-round-robin-figure',
      body: `<div class="vf-round-robin">
        ${['A', 'B', 'C', 'A', 'B'].map((target, index) => `<article><span>Request ${index + 1}</span><i aria-hidden="true"></i><strong>Server ${target}</strong></article>`).join('')}
      </div>`,
      caption: 'Simple rotation ignores whether an earlier request is still consuming significant work.'
    });
  }

  function requestCostSkew() {
    return comparison({
      eyebrow: 'Unequal request cost',
      title: 'An equal request count does not imply equal backend work',
      items: [
        { title: 'Request 1', value: '10 ms', subtitle: 'short request', icon: 'pulse', tone: 'green' },
        { title: 'Request 2', value: '30 seconds', subtitle: 'keeps its target busy long after rotation continues', icon: 'clock', tone: 'danger' },
        { title: 'Request 3', value: '20 ms', subtitle: 'short request', icon: 'pulse', tone: 'green' }
      ]
    });
  }

  function weightedRoundRobin() {
    return shell({
      eyebrow: 'Weighted round robin',
      title: 'Capacity weights change the share of requests',
      className: 'vf-weighted-figure',
      body: `<div class="vf-weighted-bars">
        ${[
          ['A', '4 CPU', 1, 17, 'blue'],
          ['B', '4 CPU', 1, 17, 'cyan'],
          ['C', '16 CPU', 4, 66, 'violet']
        ].map(([name, cpu, weight, share, tone]) => `<article data-tone="${tone}"><header><strong>Server ${name}</strong><span>${cpu}</span></header><div><i style="--vf-share:${share}%"></i></div><p><b>weight ${weight}</b><span>≈ ${share}% traffic</span></p></article>`).join('')}
      </div>`,
      caption: 'Weights can represent hardware capacity, deployment preference, or a canary percentage.'
    });
  }

  function canarySplit() {
    return shell({
      eyebrow: 'Canary weighting',
      title: 'Expose a new version to a controlled fraction of traffic',
      className: 'vf-canary-figure',
      body: `<div class="vf-canary-meter"><span class="vf-canary-v1"><b>v1 · 95%</b></span><span class="vf-canary-v2"><b>v2 · 5%</b></span></div>`,
      caption: 'A small v2 weight limits blast radius while real traffic validates the release.'
    });
  }

  function leastConnections() {
    return shell({
      eyebrow: 'Least connections',
      title: 'The next connection goes to the smallest visible count',
      className: 'vf-connections-figure',
      body: `<div class="vf-connection-bars">
        ${[
          ['A', 100, 'blue'],
          ['B', 20, 'green'],
          ['C', 70, 'violet']
        ].map(([name, count, tone]) => `<article data-tone="${tone}"><strong>Server ${name}</strong><div><i style="--vf-connections:${count}%"></i></div><b>${count}</b><span>active connections</span>${name === 'B' ? '<em>next target</em>' : ''}</article>`).join('')}
      </div>`,
      caption: 'Connection count helps when lifetimes vary, but it remains only a proxy for real resource usage.'
    });
  }

  function connectionCountTrap() {
    return comparison({
      eyebrow: 'Proxy metric trap',
      title: 'Fewer connections can still mean more actual work',
      items: [
        { title: 'Server A', value: '10 connections', subtitle: 'each runs an expensive ML job', icon: 'brain', tone: 'danger' },
        { title: 'Server B', value: '50 connections', subtitle: 'mostly idle WebSockets', icon: 'users', tone: 'green' }
      ],
      caption: 'Least-connections would choose A even though A may be more overloaded.'
    });
  }

  function adaptiveOscillation() {
    return timeline({
      eyebrow: 'Adaptive-balancing feedback loop',
      title: 'A poorly damped latency signal can make traffic oscillate',
      items: [
        { title: 'A slows', subtitle: 'latency rises', tone: 'danger' },
        { title: 'LB reduces traffic', subtitle: 'pressure falls', tone: 'amber' },
        { title: 'A recovers', subtitle: 'latency improves', tone: 'green' },
        { title: 'Traffic rises again', subtitle: 'algorithm sends more load', tone: 'blue' },
        { title: 'A overloads', subtitle: 'the cycle repeats', tone: 'danger' }
      ]
    });
  }

  function consistentHashRing() {
    return shell({
      eyebrow: 'Consistent hashing',
      title: 'A routing key maps onto a server ring with limited remapping',
      className: 'vf-hash-ring-figure',
      body: `<div class="vf-hash-ring">
        <div class="vf-hash-circle">
          <article class="vf-hash-node vf-hash-a">${icon('server')}<strong>A</strong></article>
          <article class="vf-hash-node vf-hash-b">${icon('server')}<strong>B</strong></article>
          <article class="vf-hash-node vf-hash-c">${icon('server')}<strong>C</strong></article>
          <div class="vf-hash-key">${icon('fingerprint')}<strong>userId 123</strong><span>hash → Server B</span></div>
        </div>
        <div class="vf-hash-note"><strong>Why a ring?</strong><span>Adding or removing one server moves only a nearby portion of keys rather than remapping everything.</span></div>
      </div>`,
      caption: 'Affinity is useful for caches, stateful processing, and long-lived connections, but it changes the failure model.'
    });
  }

  function stickyVsShared() {
    return comparison({
      eyebrow: 'Session state placement',
      title: 'Sticky routing couples a session to one instance; shared state restores routing freedom',
      items: [
        {
          title: 'Sticky session',
          value: 'session ABC → App A',
          subtitle: 'Simple for local state, but target failure can lose the session and create imbalance.',
          icon: 'lock',
          tone: 'amber'
        },
        {
          title: 'Shared or stateless',
          value: 'any request → any instance',
          subtitle: 'Session state lives in Redis/DB or the request carries sufficient identity.',
          icon: 'redis',
          tone: 'green'
        }
      ]
    });
  }

  function stickyImbalance() {
    return shell({
      eyebrow: 'Affinity imbalance',
      title: 'Sticky users can accumulate unevenly across otherwise identical targets',
      className: 'vf-sticky-imbalance-figure',
      body: `<div class="vf-sticky-bars">
        ${[
          ['App A', 20000, 100, 'danger'],
          ['App B', 5000, 25, 'blue'],
          ['App C', 8000, 40, 'violet']
        ].map(([name, users, width, tone]) => `<article data-tone="${tone}"><strong>${name}</strong><div><i style="--vf-users:${width}%"></i></div><b>${users.toLocaleString()} users</b></article>`).join('')}
      </div>`,
      caption: 'Affinity can defeat otherwise even traffic distribution.'
    });
  }

  function healthModel() {
    return cardGrid({
      eyebrow: 'Health semantics',
      title: '“Process is alive” and “safe for new traffic” are different questions',
      items: [
        { title: 'Liveness', subtitle: 'Should this process be restarted?', icon: 'pulse', tone: 'blue' },
        { title: 'Readiness', subtitle: 'Should the load balancer route new traffic here?', icon: 'check', tone: 'green' },
        { title: 'Dependency state', subtitle: 'Are database, pools, or downstream systems degraded?', icon: 'database', tone: 'amber' },
        { title: 'Saturation', subtitle: 'Are threads, heap, or connection pools exhausted?', icon: 'alert', tone: 'danger' }
      ],
      caption: 'A useful load-balancer check approximates readiness without making every transient dependency issue remove every target.'
    });
  }

  function slowGrayFailure() {
    return shell({
      eyebrow: 'Gray failure',
      title: 'A target can return 200 OK and still destroy tail latency',
      className: 'vf-latency-targets-figure',
      body: `<div class="vf-latency-targets">
        ${[
          ['A', '20 ms', 2, 'green'],
          ['B', '30 ms', 3, 'blue'],
          ['C', '25 s', 100, 'danger']
        ].map(([name, label, width, tone]) => `<article data-tone="${tone}"><header>${icon('server')}<strong>Server ${name}</strong><b>${label}</b></header><div><i style="--vf-latency:${width}%"></i></div><span>${name === 'C' ? 'technically healthy; operationally harmful' : 'normal response'}</span></article>`).join('')}
      </div>`,
      caption: 'Passive latency signals, outlier detection, and circuit breaking help detect behavior that a shallow 200-OK probe misses.'
    });
  }

  function thresholdStateMachine() {
    return shell({
      eyebrow: 'Health-check hysteresis',
      title: 'Require repeated evidence before removing or restoring a target',
      className: 'vf-threshold-figure',
      body: `<div class="vf-thresholds">
        <article data-tone="danger"><header>${icon('x')}<strong>Remove target</strong><span>UnhealthyThreshold = 3</span></header><div>${['failure', 'failure', 'failure'].map((label) => `<i><b>${label}</b></i>`).join('')}<em>out of rotation</em></div></article>
        <article data-tone="green"><header>${icon('check')}<strong>Restore target</strong><span>HealthyThreshold = 3</span></header><div>${['success', 'success', 'success'].map((label) => `<i><b>${label}</b></i>`).join('')}<em>back in rotation</em></div></article>
      </div>`,
      caption: 'Separate removal and recovery thresholds reduce flapping during transient failures.'
    });
  }

  function draining() {
    return shell({
      eyebrow: 'Connection draining',
      title: 'Stop new work first; let in-flight work finish before shutdown',
      className: 'vf-draining-figure',
      body: `<div class="vf-draining">
        <div class="vf-drain-time"><span>mark draining</span><span>in-flight completion</span><span>shutdown</span></div>
        <article class="vf-drain-a"><header>${icon('server')}<strong>App A</strong><b>draining</b></header><div><i class="vf-existing"></i><span>existing POST /payments completes</span></div><div><i class="vf-no-new"></i><span>no new requests</span></div></article>
        <article class="vf-drain-survivors"><header>${icon('route')}<strong>Apps B and C</strong><b>active</b></header><div><i></i><span>new requests are routed here</span></div></article>
      </div>`,
      caption: 'The load balancer drain timeout and application graceful-shutdown timeout must describe one compatible lifecycle.'
    });
  }

  function clientIpTrust() {
    return pipeline({
      eyebrow: 'Client-IP trust boundary',
      title: 'Forwarded identity becomes trustworthy only after a controlled edge sanitizes it',
      stages: [
        { title: 'Client', subtitle: 'can invent forwarding headers', icon: 'user', tone: 'danger', branch: 'untrusted input', volume: 100 },
        { title: 'CloudFront / trusted edge', subtitle: 'sanitize or overwrite identity metadata', icon: 'shield', tone: 'blue', volume: 100 },
        { title: 'Load balancer', subtitle: 'preserve controlled proxy chain', icon: 'scale', tone: 'cyan', volume: 100 },
        { title: 'Envoy', subtitle: 'known internal proxy hop', icon: 'gate', tone: 'violet', volume: 100 },
        { title: 'Spring', subtitle: 'resolve first untrusted address from configured trust ranges', icon: 'server', tone: 'green', volume: 100 }
      ],
      caption: 'A header is not authoritative merely because it exists. Direct paths around the trusted edge must be excluded or handled explicitly.'
    });
  }

  function tlsModes() {
    return comparison({
      eyebrow: 'TLS placement',
      title: 'Termination choices change trust, certificate ownership, and application work',
      items: [
        {
          title: 'Terminate at LB',
          value: 'HTTPS → LB → HTTP',
          subtitle: 'Central certificates and less app CPU; internal leg is plaintext.',
          icon: 'lock',
          tone: 'amber'
        },
        {
          title: 'Re-encrypt',
          value: 'HTTPS → LB → HTTPS',
          subtitle: 'Central policy plus encryption on both network legs.',
          icon: 'shield',
          tone: 'green'
        },
        {
          title: 'TLS passthrough',
          value: 'TLS → L4 LB → application',
          subtitle: 'Application owns termination; useful for end-to-end or protocol-specific needs.',
          icon: 'route',
          tone: 'violet'
        }
      ]
    });
  }

  function crossZone() {
    return shell({
      eyebrow: 'Cross-zone balancing',
      title: 'A 50/50 zone split is not an equal per-instance split',
      className: 'vf-cross-zone-figure',
      body: `<div class="vf-cross-zone">
        <article class="vf-zone" data-tone="blue"><header><strong>AZ-A</strong><b>50% traffic</b></header><div>${['A1', 'A2', 'A3'].map((name) => `<span>${icon('server')}<strong>${name}</strong><small>≈ 16.7%</small></span>`).join('')}</div></article>
        <article class="vf-zone vf-zone-hot" data-tone="danger"><header><strong>AZ-B</strong><b>50% traffic</b></header><div><span>${icon('server')}<strong>B1</strong><small>50%</small></span></div></article>
        <div class="vf-zone-result">${icon('scale')}<strong>With cross-zone balancing</strong><span>all four healthy targets can receive ≈ 25% each</span><small>better balance, possibly higher cross-AZ cost</small></div>
      </div>`,
      caption: 'Perfect balance and minimum network-transfer cost may pull the architecture in different directions.'
    });
  }

  function lbRedundancy() {
    return comparison({
      eyebrow: 'Load-balancer availability',
      title: 'Managed load balancing is distributed; one self-hosted proxy is still one failure domain',
      items: [
        {
          title: 'Managed / redundant',
          value: 'DNS → LB nodes A and B → targets',
          subtitle: 'Multiple front-end nodes hide failover and scaling complexity.',
          icon: 'layers',
          tone: 'green'
        },
        {
          title: 'Single proxy VM',
          value: 'Client → one NGINX → applications',
          subtitle: 'The proxy merely moves the single point of failure.',
          icon: 'alert',
          tone: 'danger'
        }
      ],
      caption: 'Self-hosted proxy tiers usually need multiple instances plus DNS, VIP/VRRP, or a managed balancer in front.'
    });
  }

  function cascadingFailure() {
    return shell({
      eyebrow: 'Overloaded-last-survivor',
      title: 'Redistribution raises per-target load until healthy survivors also fail',
      className: 'vf-cascade-figure',
      body: `<div class="vf-cascade">
        ${[
          ['4 targets', '875 RPS each', 88, 'green'],
          ['3 targets', '1,167 RPS each', 117, 'amber'],
          ['2 targets', '1,750 RPS each', 175, 'danger'],
          ['1 target', '3,500 RPS', 250, 'danger']
        ].map(([title, value, load, tone], index) => `<article data-tone="${tone}"><span>Stage ${index + 1}</span><strong>${title}</strong><b>${value}</b><div><i style="--vf-cascade-load:${Math.min(load, 100)}%"></i><em>${load > 100 ? 'over capacity' : 'within 1,000-RPS capacity'}</em></div></article>`).join('')}
        <div class="vf-cascade-principle">${icon('shield')}<strong>N+1 headroom</strong><span>Normal traffic must fit after losing an instance—and ideally an availability zone.</span></div>
      </div>`,
      caption: 'The load balancer can be working exactly as configured while its redistribution accelerates a cascading outage.'
    });
  }

  function unsafeRetry() {
    return shell({
      eyebrow: 'Retry ambiguity',
      title: 'A lost response does not prove that a non-idempotent operation failed',
      className: 'vf-retry-ambiguity-figure',
      body: `<div class="vf-retry-ambiguity">
        <div class="vf-retry-lane"><span>1</span>${icon('api')}<strong>POST /payments</strong><small>LB routes to Server A</small></div>
        <div class="vf-retry-lane"><span>2</span>${icon('check')}<strong>Server A commits Payment 1</strong><small>response is lost or times out</small></div>
        <div class="vf-retry-lane"><span>3</span>${icon('retry')}<strong>LB retries Server B</strong><small>failure timing is ambiguous</small></div>
        <div class="vf-retry-lane vf-retry-danger"><span>4</span>${icon('coins')}<strong>Payment 2 also commits</strong><small>duplicate side effect</small></div>
        <div class="vf-retry-safety">${icon('key')}<strong>Safe design</strong><span>Retry only when method semantics and an idempotency key make duplication harmless.</span></div>
      </div>`,
      caption: 'Proxy retries influence correctness, not merely availability.'
    });
  }

  function websocketLifecycle() {
    return timeline({
      eyebrow: 'WebSocket connection lifecycle',
      title: 'An established connection cannot be migrated to another server',
      items: [
        { title: 'Connect through LB', subtitle: 'client is assigned to Server A', tone: 'blue' },
        { title: 'Persistent session', subtitle: 'the TCP/WebSocket remains attached to A', tone: 'violet' },
        { title: 'A fails or drains', subtitle: 'existing connection disconnects', tone: 'danger' },
        { title: 'Client reconnects', subtitle: 'LB may choose Server B', tone: 'amber' },
        { title: 'Restore state', subtitle: 'session, subscriptions, and replay position recover', tone: 'green' }
      ],
      caption: 'Long-lived connections require explicit reconnection and state-restoration behavior.'
    });
  }

  function springResponsibilities() {
    return shell({
      eyebrow: 'Cloud responsibility split',
      title: 'Infrastructure balances traffic; the Spring application makes itself safe to balance',
      className: 'vf-spring-lb-figure',
      body: `<div class="vf-spring-lb">
        <div class="vf-spring-path">${['Internet', 'CloudFront / WAF', 'ALB / NLB', 'EKS / ECS / EC2', 'Spring Boot'].map((name, index) => `<span data-tone="${['blue', 'cyan', 'violet', 'amber', 'green'][index]}">${index === 4 ? icon('server') : icon(index === 0 ? 'user' : 'layers')}<strong>${name}</strong></span>`).join('<i aria-hidden="true"></i>')}</div>
        <div class="vf-spring-duties">
          ${[
            ['Stateless handling', 'api', 'blue'],
            ['Readiness endpoint', 'check', 'green'],
            ['Graceful shutdown', 'clock', 'violet'],
            ['Trusted headers', 'fingerprint', 'cyan'],
            ['Metrics', 'chart', 'amber']
          ].map(([title, iconName, tone]) => `<article data-tone="${tone}">${icon(iconName)}<strong>${title}</strong></article>`).join('')}
        </div>
      </div>`
    });
  }

  function lifecycleAlignment() {
    return comparison({
      eyebrow: 'Shutdown timing',
      title: 'Drain and graceful shutdown timeouts must describe the same lifecycle',
      items: [
        { title: 'Load balancer', value: 'drain timeout', subtitle: 'stops new traffic and waits for in-flight requests', icon: 'scale', tone: 'blue' },
        { title: 'Application', value: 'shutdown phase', subtitle: 'finishes work before terminating the process', icon: 'clock', tone: 'violet' }
      ],
      caption: 'A mismatched sequence can create intermittent 502/503 responses during an otherwise healthy deployment.'
    });
  }

  function kubernetesLayers() {
    return layerStack({
      title: 'Kubernetes commonly contains several independent balancing scopes',
      layers: [
        { title: 'Internet → cluster', subtitle: 'AWS ALB/NLB exposes the cluster', icon: 'shield', tone: 'blue' },
        { title: 'Ingress / Gateway', subtitle: 'host and path routing at cluster entry', icon: 'gate', tone: 'cyan' },
        { title: 'Kubernetes Service', subtitle: 'stable virtual endpoint for a changing pod set', icon: 'route', tone: 'violet' },
        { title: 'Service mesh', subtitle: 'optional service-to-service balancing and outlier policy', icon: 'layers', tone: 'amber' },
        { title: 'Pods', subtitle: 'dynamic application instances', icon: 'server', tone: 'green' }
      ],
      caption: 'Multiple balancing layers are not necessarily redundant; each owns a different routing scope.'
    });
  }

  function balancingScopes() {
    return cardGrid({
      eyebrow: 'Routing scopes',
      title: 'Name the boundary each balancing layer controls',
      items: [
        { title: 'Internet → cluster', subtitle: 'public entry and availability zones', icon: 'shield', tone: 'blue' },
        { title: 'Cluster → service', subtitle: 'Ingress or Gateway routing', icon: 'gate', tone: 'cyan' },
        { title: 'Service → pod', subtitle: 'Kubernetes Service endpoint selection', icon: 'route', tone: 'violet' },
        { title: 'Service → remote service', subtitle: 'client-side or mesh balancing', icon: 'layers', tone: 'amber' }
      ]
    });
  }

  function interviewChecklist() {
    return steps({
      eyebrow: 'System-design sequence',
      title: 'Reason from capacity and failure semantics before naming a product',
      items: [
        'Estimate per-instance capacity',
        'Run stateless instances across availability zones',
        'Choose L4 or L7 from protocol and policy needs',
        'Route only to ready targets',
        'Keep spare capacity for instance or AZ failure',
        'Drain connections during deployment and scale-in',
        'Choose the TLS termination boundary',
        'Define trusted proxy and client-IP handling',
        'Avoid sticky sessions unless the state model requires them',
        'Align LB, application, and downstream timeouts',
        'Audit automatic retries and idempotency',
        'Monitor latency, connections, errors, health, rejection, and per-target load'
      ]
    });
  }

  function productionFailure() {
    return shell({
      eyebrow: 'Production symptom',
      title: 'A shallow health check keeps a saturated target in rotation',
      className: 'vf-production-targets-figure',
      body: `<div class="vf-production-targets">
        ${[
          ['App A', '40%', '50 ms', 40, 'green'],
          ['App B', '45%', '55 ms', 45, 'green'],
          ['App C', '100%', '10 s', 100, 'danger']
        ].map(([name, cpu, latency, width, tone]) => `<article data-tone="${tone}"><header>${icon('server')}<strong>${name}</strong><b>${latency}</b></header><div><i style="--vf-cpu:${width}%"></i></div><p><span>CPU ${cpu}</span><em>health endpoint: 200 OK</em></p></article>`).join('')}
      </div>`,
      caption: 'Users randomly hit App C because “return OK” measures process existence rather than service readiness.'
    });
  }

  function healthTaxonomy() {
    return cardGrid({
      eyebrow: 'Health taxonomy',
      title: 'Related signals answer different operational questions',
      items: [
        { title: 'Liveness', subtitle: 'Should this process be restarted?', icon: 'pulse', tone: 'blue' },
        { title: 'Readiness', subtitle: 'Should new traffic be sent here?', icon: 'check', tone: 'green' },
        { title: 'Dependency health', subtitle: 'Is a downstream system degraded?', icon: 'database', tone: 'amber' },
        { title: 'Business health', subtitle: 'Can important operations actually succeed?', icon: 'coins', tone: 'violet' }
      ]
    });
  }

  function architectureConnection() {
    return cardGrid({
      eyebrow: 'Capacity architecture',
      title: 'Caching, load balancing, and autoscaling solve different parts of the same problem',
      items: [
        { title: 'Caching', subtitle: 'Can we avoid doing the work?', icon: 'redis', tone: 'green' },
        { title: 'Load balancing', subtitle: 'If work is necessary, where should it run?', icon: 'scale', tone: 'blue' },
        { title: 'Autoscaling', subtitle: 'How much capacity should exist right now?', icon: 'chart', tone: 'violet' }
      ],
      caption: 'Good capacity design combines reduced work, intelligent placement, and enough available compute.'
    });
  }

  function controlPlane() {
    return cardGrid({
      eyebrow: 'Traffic-control plane',
      title: 'A production load balancer coordinates routing at a failure boundary',
      items: [
        { title: 'Routing', subtitle: 'select target pools and individual targets', icon: 'route', tone: 'blue' },
        { title: 'Health detection', subtitle: 'decide whether new traffic is safe', icon: 'check', tone: 'green' },
        { title: 'Failure isolation', subtitle: 'eject harmful targets without cascading', icon: 'shield', tone: 'danger' },
        { title: 'Connection lifecycle', subtitle: 'manage long-lived and in-flight work', icon: 'clock', tone: 'violet' },
        { title: 'Deployment draining', subtitle: 'remove capacity gracefully', icon: 'filter', tone: 'cyan' },
        { title: 'TLS boundary', subtitle: 'terminate, re-encrypt, or pass through', icon: 'lock', tone: 'amber' },
        { title: 'Identity propagation', subtitle: 'carry client context across trusted proxies', icon: 'fingerprint', tone: 'blue' }
      ],
      caption: 'Algorithm choice matters, but headroom, draining, retries, and health semantics often determine incident behavior.'
    });
  }

  global.SWEChapter3Visuals = Object.freeze({
    overviewQuestions,
    trafficDistributor,
    singleServerPath,
    verticalScale,
    horizontalCapacity,
    failureRedistribution,
    l4VsL7,
    routeExamples,
    algorithmAtlas,
    roundRobin,
    requestCostSkew,
    weightedRoundRobin,
    canarySplit,
    leastConnections,
    connectionCountTrap,
    adaptiveOscillation,
    consistentHashRing,
    stickyVsShared,
    stickyImbalance,
    healthModel,
    slowGrayFailure,
    thresholdStateMachine,
    draining,
    clientIpTrust,
    tlsModes,
    crossZone,
    lbRedundancy,
    cascadingFailure,
    unsafeRetry,
    websocketLifecycle,
    springResponsibilities,
    lifecycleAlignment,
    kubernetesLayers,
    balancingScopes,
    interviewChecklist,
    productionFailure,
    healthTaxonomy,
    architectureConnection,
    controlPlane,
    pipeline,
    comparison,
    cardGrid,
    timeline,
    layerStack,
    policyBoard,
    escapeHtml
  });
}(window));
