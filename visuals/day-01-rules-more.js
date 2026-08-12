(function (global) {
  'use strict';

  const { pipeline, layerStack, cardGrid, comparison, timeline, steps, policyBoard } = global.SWEVisualsCore;
  const { weightedCosts, observabilityBoard, designCanvas } = global.SWEChapter1Visuals;

  global.SWEChapter1RuleSet.push(...[
    {
      test: (text) => text.includes('retry after 1s') && text.includes('random jitter'),
      render: () => timeline({
        eyebrow: 'Backoff with jitter',
        title: 'Retries become progressively farther apart',
        items: [
          { title: '1 second', subtitle: 'first retry', tone: 'blue' },
          { title: '2 seconds', subtitle: 'second retry', tone: 'cyan' },
          { title: '4 seconds', subtitle: 'third retry', tone: 'violet' },
          { title: '+ jitter', subtitle: 'randomize to avoid synchronized clients', tone: 'green' }
        ]
      })
    },
    {
      test: (text) => text.includes('GET /health') && text.includes('GET /reports/export'),
      render: () => comparison({
        eyebrow: 'Request cost',
        title: 'Equal request counts can create radically different downstream load',
        items: [
          { title: 'GET /health', subtitle: 'tiny, cached, operational read', icon: 'pulse', tone: 'green' },
          { title: 'GET /reports/export', subtitle: 'large query, transformation, storage, and delivery', icon: 'database', tone: 'amber' }
        ],
        caption: 'Rate-limit policy should account for resource cost, not merely request frequency.'
      })
    },
    {
      test: (text) => text.includes('/search costs 1 token') && text.includes('/bulk-upload costs 50 tokens'),
      render: weightedCosts
    },
    {
      test: (text) => text.includes('critical security endpoints -> fail closed') && text.includes('normal product APIs'),
      render: () => comparison({
        eyebrow: 'Dependency failure policy',
        title: 'Choose availability or protection according to operation risk',
        items: [
          { title: 'Security-critical', subtitle: 'fail closed or use a strict local fallback', icon: 'lock', tone: 'danger' },
          { title: 'Normal product API', subtitle: 'fail open temporarily and alert', icon: 'api', tone: 'green' },
          { title: 'Expensive operation', subtitle: 'fail closed or queue the work', icon: 'database', tone: 'amber' }
        ]
      })
    },
    {
      test: (text) => text.includes('If Redis is down, use small in-memory local limiter temporarily'),
      render: () => pipeline({
        eyebrow: 'Degraded mode',
        title: 'Keep a bounded local guard while shared enforcement is unavailable',
        stages: [
          { title: 'Redis failure', subtitle: 'shared state unavailable', icon: 'redis', tone: 'danger', volume: 100 },
          { title: 'Local fallback', subtitle: 'small temporary in-memory limit', icon: 'server', tone: 'amber', volume: 55 },
          { title: 'High-severity alert', subtitle: 'restore distributed enforcement', icon: 'alert', tone: 'violet', volume: 35 }
        ]
      })
    },
    {
      test: (text) => text.includes('Rate limit: 100/minute') && text.includes('Quota: 1 million/month'),
      render: () => comparison({
        eyebrow: 'Three control planes',
        title: 'Production APIs often combine frequency, lifetime usage, and pacing',
        items: [
          { title: 'Rate limit', value: '100 / minute', subtitle: 'frequency ceiling', icon: 'clock', tone: 'blue' },
          { title: 'Quota', value: '1M / month', subtitle: 'long-period allowance', icon: 'coins', tone: 'violet' },
          { title: 'Throttle', value: 'stable queue rate', subtitle: 'smooth excess work', icon: 'queue', tone: 'amber' }
        ]
      })
    },
    {
      test: (text) => text.includes('Per IP:') && text.includes('10,000 requests/minute service-wide'),
      render: () => policyBoard({
        title: 'Anonymous API: constrain the caller, risky routes, and total service load',
        groups: [
          { title: 'Caller', icon: 'route', tone: 'blue', rows: [{ label: 'IP', value: '60 / minute' }] },
          { title: 'Sensitive routes', icon: 'lock', tone: 'danger', rows: [
            { label: '/login', value: '5 / minute' },
            { label: '/otp', value: '3 / minute' },
            { label: '/search', value: '30 / minute' }
          ] },
          { title: 'Service-wide', icon: 'layers', tone: 'amber', rows: [{ label: 'Global', value: '10,000 / minute' }] }
        ]
      })
    },
    {
      test: (text) => text.includes('Per user:') && text.includes('5000 requests/minute') && text.includes('/bulk-upload'),
      render: () => policyBoard({
        title: 'Authenticated SaaS API: protect individuals, tenants, and costly operations',
        groups: [
          { title: 'User fairness', icon: 'user', tone: 'blue', rows: [{ label: 'User', value: '100 / minute' }] },
          { title: 'Tenant fairness', icon: 'users', tone: 'violet', rows: [{ label: 'Tenant', value: '5,000 / minute' }] },
          { title: 'Expensive routes', icon: 'database', tone: 'amber', rows: [
            { label: '/export', value: '5 / hour / user' },
            { label: '/bulk-upload', value: '20 / day / tenant' }
          ] }
        ]
      })
    },
    {
      test: (text) => text.includes('rate limiting + idempotency + retry-safe design'),
      render: () => cardGrid({
        eyebrow: 'Payment safety',
        title: 'Three controls must cooperate',
        items: [
          { title: 'Rate limiting', subtitle: 'bounds pressure and abuse', icon: 'filter', tone: 'blue' },
          { title: 'Idempotency', subtitle: 'prevents duplicate financial effects', icon: 'key', tone: 'violet' },
          { title: 'Retry-safe design', subtitle: 'lets clients recover safely', icon: 'retry', tone: 'green' }
        ]
      })
    },
    {
      test: (text) => text.includes('RateLimitFilter') && text.includes('RedisTokenBucketRateLimiter'),
      render: () => pipeline({
        eyebrow: 'Spring Boot component flow',
        title: 'Separate request interception, identity, policy, and distributed enforcement',
        stages: [
          { title: 'RateLimitFilter', subtitle: 'intercept request', icon: 'filter', tone: 'blue', volume: 100 },
          { title: 'Key resolver', subtitle: 'who is calling?', icon: 'fingerprint', tone: 'cyan', volume: 92 },
          { title: 'Policy resolver', subtitle: 'which rule applies?', icon: 'layers', tone: 'violet', volume: 84 },
          { title: 'RateLimiter', subtitle: 'evaluate allowance', icon: 'scale', tone: 'amber', volume: 72 },
          { title: 'Redis bucket', subtitle: 'atomic shared state', icon: 'redis', tone: 'green', volume: 62 }
        ]
      })
    },
    {
      test: (text) => /^1\. Identify route\/action\./.test(text) && text.includes('Emit metric/log'),
      render: () => steps({
        title: 'Evaluate every request in a deterministic order',
        items: [
          'Identify the route or action',
          'Resolve the caller identity',
          'Load the matching policy',
          'Check the Redis-backed limiter',
          'Continue when allowed',
          'Return HTTP 429 when blocked',
          'Emit a metric and structured log'
        ]
      })
    },
    {
      test: (text) => text.includes('rate_limit_allowed_total') && text.includes('top_blocked_endpoints'),
      render: () => observabilityBoard('metrics')
    },
    {
      test: (text) => text.includes('429 rate suddenly spikes') && text.includes('OTP blocks spike'),
      render: () => observabilityBoard('alerts')
    },
    {
      test: (text) => text.includes('Edge protects infrastructure') && text.includes('Database/job queues protect'),
      render: () => layerStack({
        title: 'Each layer protects the next, more expensive layer',
        layers: [
          { title: 'Edge', subtitle: 'absorbs broad infrastructure abuse', icon: 'shield', tone: 'blue' },
          { title: 'Gateway', subtitle: 'protects services and routes', icon: 'gate', tone: 'cyan' },
          { title: 'Application', subtitle: 'enforces user, tenant, and business rules', icon: 'brain', tone: 'violet' },
          { title: 'Database / jobs', subtitle: 'guards the valuable and expensive core', icon: 'database', tone: 'amber' }
        ]
      })
    },
    {
      test: (text) => text.startsWith('Who?') && text.includes('What response?'),
      render: () => cardGrid({
        eyebrow: 'Five design questions',
        title: 'A rate-limit policy is a multidimensional decision',
        items: [
          { title: 'Who?', subtitle: 'IP, user, tenant, or API key', icon: 'user', tone: 'blue' },
          { title: 'What?', subtitle: 'endpoint, operation, or resource', icon: 'route', tone: 'cyan' },
          { title: 'How costly?', subtitle: 'read, query, write, or export', icon: 'coins', tone: 'violet' },
          { title: 'How long?', subtitle: 'second, minute, hour, day, or month', icon: 'clock', tone: 'amber' },
          { title: 'What response?', subtitle: 'allow, delay, reject, queue, or degrade', icon: 'filter', tone: 'green' }
        ]
      })
    },
    {
      test: (text) => text.includes('POST /login') && text.includes('POST /api/v1/export'),
      render: () => cardGrid({
        eyebrow: 'Endpoint set',
        title: 'One API surface contains very different risk and cost profiles',
        items: [
          { title: 'POST /login', subtitle: 'credential attack surface', icon: 'lock', tone: 'danger' },
          { title: 'POST /otp/send', subtitle: 'abuse and direct cost', icon: 'key', tone: 'amber' },
          { title: 'GET /user/current', subtitle: 'cheap authenticated read', icon: 'user', tone: 'green' },
          { title: 'GET /search', subtitle: 'variable query cost', icon: 'route', tone: 'blue' },
          { title: 'POST /payment', subtitle: 'financial side effect', icon: 'coins', tone: 'violet' },
          { title: 'POST /export', subtitle: 'expensive asynchronous work', icon: 'database', tone: 'amber' }
        ]
      })
    },
    {
      test: (text) => text === 'identity key\nalgorithm\nlimit\nwindow\nresponse behavior\nwhether to fail open or fail closed',
      render: designCanvas
    }
  ]);

  global.SWEChapter1Rules = Object.freeze({
    rules: global.SWEChapter1RuleSet,
    genericVisual: global.SWEChapter1GenericVisual
  });
}(window));
