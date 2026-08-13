(function (global) {
  'use strict';

  const {
    trafficDistributor,
    singleServerPath,
    verticalScale,
    horizontalCapacity,
    failureRedistribution,
    roundRobin,
    requestCostSkew,
    weightedRoundRobin,
    canarySplit,
    leastConnections,
    connectionCountTrap,
    adaptiveOscillation,
    pipeline
  } = global.SWEChapter3Visuals;

  const flat = (text) => String(text)
    .replace(/[│▼┌┐└┘├┤─✓✗\\]+/g, ' ')
    .replace(/[→↓+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const rules = [
    {
      test: (text) => {
        const value = flat(text);
        return value.includes('client') && value.includes('load balancer') && value.includes('service instance a') && value.includes('service instance d');
      },
      render: trafficDistributor
    },
    {
      test: (text) => {
        const value = flat(text);
        return value === 'client spring boot database';
      },
      render: singleServerPath
    },
    {
      test: (text) => {
        const value = flat(text);
        return value.includes('8 cpu 32 cpu') && value.includes('16 gb 64 gb');
      },
      render: verticalScale
    },
    {
      test: (text) => {
        const value = flat(text);
        return value.includes('client lb') && value.includes('app 1') && value.includes('app 4') && !text.includes('✗') && !text.includes('✓');
      },
      render: horizontalCapacity
    },
    {
      test: (text) => {
        const value = flat(text);
        return value.includes('client lb') && value.includes('app 1') && value.includes('app 3') && (text.includes('✗') || text.includes('✓'));
      },
      render: failureRedistribution
    },
    {
      test: (text) => {
        const value = flat(text);
        return value.startsWith('round robin') && value.includes('request 1 a') && value.includes('request 5 b');
      },
      render: roundRobin
    },
    {
      test: (text) => {
        const value = flat(text);
        return value.includes('request 1 10 ms') && value.includes('request 2 30 seconds') && value.includes('request 3 20 ms');
      },
      render: requestCostSkew
    },
    {
      test: (text) => {
        const value = flat(text);
        return value.includes('a weight = 1') && value.includes('b weight = 1') && value.includes('c weight = 4');
      },
      render: weightedRoundRobin
    },
    {
      test: (text) => {
        const value = flat(text);
        return value.includes('v1 weight = 95') && value.includes('v2 weight = 5');
      },
      render: canarySplit
    },
    {
      test: (text) => {
        const value = flat(text);
        return value.includes('a 100 active connections') && value.includes('b 20 active connections') && value.includes('c 70 active connections');
      },
      render: leastConnections
    },
    {
      test: (text) => flat(text) === 'a = 10 b = 50',
      render: connectionCountTrap
    },
    {
      test: (text) => {
        const value = flat(text);
        return value.includes('lb reduces traffic to a') && value.includes('a recovers') && value.includes('a becomes overloaded') && value.includes('traffic decreases');
      },
      render: adaptiveOscillation
    }
  ];

  function genericVisual(text) {
    const lines = String(text)
      .split('\n')
      .map((line) => line.replace(/[│▼┌┐└┘├┤─✓✗]/g, '').trim())
      .filter(Boolean)
      .filter((line) => !/^or$/i.test(line));

    if (lines.length < 2 || lines.length > 6) return null;
    if (/\b(GET|POST|PUT|Host:|X-Forwarded-For|HTTP|HTTPS|TLS|CPU|GB|RPS|weight\s*=|App\s+[A-Z]\s*=)\b/i.test(text)) return null;
    if (!/[→↓│▼]/.test(text)) return null;

    return pipeline({
      eyebrow: 'Flow',
      title: 'Follow the routing behavior through the system',
      stages: lines.map((line, index) => ({
        title: line,
        subtitle: index === 0 ? 'trigger' : index === lines.length - 1 ? 'outcome' : 'next stage',
        icon: index === 0 ? 'api' : index === lines.length - 1 ? 'server' : 'route',
        tone: ['blue', 'cyan', 'violet', 'amber', 'danger'][Math.min(index, 4)],
        volume: 100
      }))
    });
  }

  global.SWEChapter3Rules = Object.freeze({ rules, genericVisual, flat });
}(window));
