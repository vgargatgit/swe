(function (global) {
  'use strict';

  const { shell, pipeline, layerStack, cardGrid, comparison, timeline, steps, policyBoard } = global.SWEVisualsCore;
  const { trustChain, forwardedChain, redisCluster, localCounters, tokenBucket, boundaryBurst, slidingWindow, weightedCosts, observabilityBoard, designCanvas, parseGroupedText } = global.SWEChapter1Visuals;

  function genericVisual(text) {
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
    const blankGroups = text.split(/\n\s*\n/).filter((part) => part.trim());

    if (/\b(INCR|EXPIRE|rl:|current_count|effective_count|request\.getRemoteAddr|RemoteIpValve|ForwardedHeaderFilter)\b/.test(text)) {
      return null;
    }

    if (blankGroups.length > 1 && blankGroups.some((group) => /:\s*$/.test(group.split('\n')[0].trim()))) {
      return policyBoard({
        title: 'Turn the written policy into visible scopes',
        groups: parseGroupedText(text),
        caption: 'Each card is enforced independently; a request must satisfy every applicable scope.'
      });
    }

    if (lines.length >= 3 && lines.every((line, index) => /^\d+[.)]\s/.test(line) || index > 0)) {
      const numbered = lines.filter((line) => /^\d+[.)]\s/.test(line));
      if (numbered.length >= 3) {
        return steps({
          title: 'Request evaluation sequence',
          items: numbered.map((line) => line.replace(/^\d+[.)]\s*/, ''))
        });
      }
    }

    if (lines.some((line) => line.includes('->'))) {
      const chain = lines.join(' ').split(/\s*->\s*/).filter(Boolean);
      if (chain.length >= 2 && chain.length <= 7) {
        return pipeline({
          eyebrow: 'Flow',
          title: 'Follow the request through the system',
          stages: chain.map((item, index) => ({
            title: item,
            subtitle: index === 0 ? 'source' : index === chain.length - 1 ? 'protected destination' : 'processing stage',
            icon: index === 0 ? 'user' : index === chain.length - 1 ? 'database' : 'filter',
            tone: ['blue', 'cyan', 'violet', 'amber'][Math.min(index, 3)],
            volume: 100 - index * 12
          }))
        });
      }
    }

    return null;
  }

  const rules = [
    {
      test: (text) => text.startsWith('WAF/CDN') && text.includes('Database/job'),
      render: () => pipeline({
        title: 'Four gates protect increasingly expensive work',
        stages: [
          { title: 'WAF / CDN', subtitle: 'block obvious abuse', icon: 'shield', tone: 'blue', branch: 'bots and reputation blocks', volume: 100 },
          { title: 'NGINX / Gateway', subtitle: 'coarse endpoint and IP limits', icon: 'gate', tone: 'cyan', branch: 'burst traffic throttled', volume: 72 },
          { title: 'Application', subtitle: 'user, tenant, and business limits', icon: 'brain', tone: 'violet', branch: 'policy violations rejected', volume: 43 },
          { title: 'Database / job', subtitle: 'protect expensive operations', icon: 'database', tone: 'amber', branch: 'queue, defer, or reject', volume: 21 }
        ],
        topLabel: 'More identity and business context →',
        bottomLabel: 'Fewer requests remain, but each request is more expensive →',
        caption: 'Apply cheap, broad protection early and context-aware protection close to the resource.'
      })
    },
    {
      test: (text) => text.includes('/login:') && text.includes('/search:') && text.includes('/export:'),
      render: () => policyBoard({
        title: 'Limits should follow risk, identity, and operation cost',
        groups: [
          { title: 'Login', icon: 'lock', tone: 'danger', rows: [
            { label: 'IP', value: '5 / minute' },
            { label: 'Username', value: '10 / hour' },
            { label: 'Device', value: '50 / hour' }
          ] },
          { title: 'Search', icon: 'route', tone: 'blue', rows: [
            { label: 'User', value: '60 / minute' },
            { label: 'Tenant', value: '1,000 / minute' }
          ] },
          { title: 'Export', icon: 'database', tone: 'amber', rows: [
            { label: 'User', value: '3 / hour' },
            { label: 'Tenant', value: '20 / day' }
          ] }
        ],
        caption: 'A request may be constrained by several independent counters at once.'
      })
    },
    {
      test: (text) => text.includes('Allow 5 requests per minute per client IP') && text.includes('burst up to 10'),
      render: () => cardGrid({
        eyebrow: 'NGINX rule decoded',
        title: 'One configuration expresses rate, burst room, and overflow behavior',
        items: [
          { title: 'Base rate', value: '5 / minute / IP', subtitle: 'the sustained allowance', icon: 'clock', tone: 'blue' },
          { title: 'Burst room', value: '10 requests', subtitle: 'brief spikes are absorbed', icon: 'pulse', tone: 'green' },
          { title: 'Overflow', value: 'reject or delay', subtitle: 'once burst capacity is exhausted', icon: 'filter', tone: 'danger' }
        ]
      })
    },
    {
      test: (text) => text.includes('100 requests at 12:00:59') && text.includes('12:01:00'),
      render: boundaryBurst
    },
    {
      test: (text) => text.includes('Previous minute count = 80') && text.includes('Current minute progress'),
      render: slidingWindow
    },
    {
      test: (text) => text.includes('Bucket capacity = 100 tokens') && text.includes('Refill rate = 10 tokens/second'),
      render: tokenBucket
    },
    {
      test: (text) => text.includes('capacity = 10') && text.includes('refill rate = 1 token/second'),
      render: () => cardGrid({
        eyebrow: 'Worked example',
        title: 'The two token-bucket controls answer different questions',
        items: [
          { title: 'Capacity', value: '10 tokens', subtitle: 'maximum immediate burst', icon: 'coins', tone: 'violet' },
          { title: 'Refill', value: '1 token / second', subtitle: 'sustained recovery rate', icon: 'clock', tone: 'blue' }
        ]
      })
    },
    {
      test: (text) => text === 'Small burst? Fine.\nSustained abuse? Blocked.',
      render: () => comparison({
        title: 'Token bucket permits natural bursts without permitting sustained overload',
        items: [
          { title: 'Short burst', subtitle: 'Saved tokens absorb a brief spike.', icon: 'pulse', tone: 'green' },
          { title: 'Sustained abuse', subtitle: 'The bucket empties and requests are rejected or delayed.', icon: 'alert', tone: 'danger' }
        ]
      })
    },
    {
      test: (text) => text === 'App-1\nApp-2\nApp-3' || (text.includes('App-1') && text.includes('App-3')),
      render: localCounters
    },
    {
      test: (text) => text.includes('App instances -> Redis -> shared rate limit counters'),
      render: redisCluster
    },
    {
      test: (text) => text === 'userId\ntenantId\nuserId + endpoint\ntenantId + endpoint',
      render: () => cardGrid({
        title: 'Resolve identity at the strongest available scope',
        items: [
          { title: 'User', subtitle: 'fairness for one authenticated caller', icon: 'user', tone: 'blue' },
          { title: 'Tenant', subtitle: 'protect shared SaaS capacity', icon: 'users', tone: 'violet' },
          { title: 'User + route', subtitle: 'different behavior per operation', icon: 'route', tone: 'cyan' },
          { title: 'Tenant + route', subtitle: 'business-aware aggregate control', icon: 'layers', tone: 'amber' }
        ]
      })
    },
    {
      test: (text) => text === 'school\noffice\nmobile network\ncorporate proxy',
      render: () => cardGrid({
        eyebrow: 'Shared public IP',
        title: 'One address may represent many legitimate users',
        items: [
          { title: 'School', icon: 'users', tone: 'blue' },
          { title: 'Office', icon: 'layers', tone: 'cyan' },
          { title: 'Mobile network', icon: 'route', tone: 'violet' },
          { title: 'Corporate proxy', icon: 'shield', tone: 'amber' }
        ],
        caption: 'An aggressive per-IP limit can punish an entire NAT or proxy population.'
      })
    },
    {
      test: (text) => text.includes('Client -> CloudFront -> ALB -> NGINX -> Tomcat'),
      render: trustChain
    },
    {
      test: (text) => text.includes('Walk from right to left') && text.includes('First untrusted IP'),
      render: forwardedChain
    },
    {
      test: (text) => text === 'per IP\nper username/email\nper IP + username\nper device/session',
      render: () => cardGrid({
        eyebrow: 'Layered login identity',
        title: 'No single key catches every attack pattern',
        items: [
          { title: 'Per IP', subtitle: 'contains local bursts', icon: 'route', tone: 'blue' },
          { title: 'Per account', subtitle: 'protects one target identity', icon: 'user', tone: 'violet' },
          { title: 'IP + account', subtitle: 'detects focused attacks', icon: 'fingerprint', tone: 'cyan' },
          { title: 'Device / session', subtitle: 'adds another abuse signal', icon: 'key', tone: 'amber' }
        ]
      })
    },
    {
      test: (text) => text.includes('5 attempts/minute per IP') && text.includes('username+IP'),
      render: () => policyBoard({
        title: 'Layer independent login limits',
        groups: [
          { title: 'Network', icon: 'route', tone: 'blue', rows: [{ label: 'IP', value: '5 / minute' }] },
          { title: 'Account', icon: 'user', tone: 'violet', rows: [{ label: 'Username', value: '10 / hour' }] },
          { title: 'Focused pair', icon: 'fingerprint', tone: 'danger', rows: [{ label: 'Username + IP', value: '5 / 10 min' }] }
        ]
      })
    },
    {
      test: (text) => text.includes('1st failure: normal') && text.includes('10th failure'),
      render: () => timeline({
        eyebrow: 'Progressive response',
        title: 'Increase friction as confidence in abuse rises',
        items: [
          { title: 'First failure', subtitle: 'normal response', tone: 'green' },
          { title: 'Fifth failure', subtitle: 'slow the response', tone: 'amber' },
          { title: 'Tenth failure', subtitle: 'temporary block', tone: 'danger' }
        ]
      })
    },
    {
      test: (text) => text.includes('Request fails') && text.includes('Retry immediately') && text.includes('Retry again'),
      render: () => comparison({
        eyebrow: 'Retry behavior',
        title: 'Immediate retries amplify the very overload that caused the rejection',
        items: [
          { title: 'Bad loop', subtitle: 'fail → retry now → fail → retry now', icon: 'retry', tone: 'danger' },
          { title: 'Desired client', subtitle: 'respect Retry-After and spread retries', icon: 'clock', tone: 'green' }
        ]
      })
    }
  ];

  global.SWEChapter1RuleSet = rules;
  global.SWEChapter1GenericVisual = genericVisual;
}(window));
