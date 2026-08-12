(function (global) {
  'use strict';

  const {
    requestPath,
    requestWork,
    cacheRoute,
    trafficSplit,
    cacheAside,
    fallbackFlow,
    writeInvalidate,
    readRepair,
    stateSnapshot,
    ttlJitter,
    stampede,
    singleFlight,
    twoTierCache,
    penetration,
    negativeCache,
    avalanche,
    cacheConsumers,
    invalidationFanout,
    cacheLayers,
    comparison,
    pipeline
  } = global.SWEChapter2Visuals;

  const flat = (text) => String(text)
    .replace(/[│▼┌┐└┘├┤─\\]+/g, ' ')
    .replace(/[→↓+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const rules = [
    {
      test: (text) => {
        const value = flat(text);
        return value.includes('client') && value.includes('spring service') && value.includes('postgresql') && !value.includes('redis');
      },
      render: requestPath
    },
    {
      test: (text) => {
        const value = flat(text);
        return value.includes('connection acquisition') && value.includes('sql parsing/planning') && value.includes('json serialization');
      },
      render: requestWork
    },
    {
      test: (text) => {
        const value = flat(text);
        return value.includes('spring service') && value.includes('hit') && value.includes('miss') && value.includes('redis') && value.includes('database') && value.includes('response');
      },
      render: cacheRoute
    },
    {
      test: (text) => {
        const value = flat(text);
        return value.includes('cache hits = 9,500 rps') && value.includes('cache misses = 500 rps');
      },
      render: trafficSplit
    },
    {
      test: (text) => {
        const value = flat(text);
        return value.includes('get product:123') && value.includes('cache') && value.includes('hit') && value.includes('miss') && value.includes('populate') && value.includes('return');
      },
      render: cacheAside
    },
    {
      test: (text) => {
        const value = flat(text);
        return value.includes('redis failure') && value.includes('cache miss/failure') && value.endsWith('database');
      },
      render: fallbackFlow
    },
    {
      test: (text) => flat(text) === 'update database invalidate cache',
      render: writeInvalidate
    },
    {
      test: (text) => {
        const value = flat(text);
        return value.includes('cache miss') && value.includes('database') && value.includes('new value') && value.endsWith('cache');
      },
      render: readRepair
    },
    {
      test: (text) => {
        const value = flat(text);
        return value.includes('database = price 900') && value.includes('cache = empty');
      },
      render: () => comparison({
        eyebrow: 'Initial state',
        title: 'The database has a value, but no cached copy exists yet',
        items: [
          { title: 'Database', value: '₹900', subtitle: 'authoritative value', icon: 'database', tone: 'green' },
          { title: 'Cache', value: 'empty', subtitle: 'the next reader will load and populate it', icon: 'redis', tone: 'amber' }
        ]
      })
    },
    {
      test: (text) => {
        const value = flat(text);
        return value.includes('database = 1000') && value.includes('cache = 900');
      },
      render: () => stateSnapshot('₹1,000', '₹900', 'danger', 'Stale final state')
    },
    {
      test: (text) => {
        const value = flat(text);
        return value.includes('redis') && value.includes('mass expiration') && value.includes('cache misses') && value.includes('database storm');
      },
      render: ttlJitter
    },
    {
      test: (text) => {
        const value = flat(text);
        return value.includes('cache miss') && value.includes('request 1') && value.includes('request 10000') && value.includes('db');
      },
      render: stampede
    },
    {
      test: (text) => {
        const value = flat(text);
        return value.includes('acquire lock for product:123') && value.includes('winner') && value.includes('others') && value.includes('populate cache');
      },
      render: singleFlight
    },
    {
      test: (text) => {
        const value = flat(text);
        return value === 'local l1 cache redis l2 cache' || (value.includes('application') && value.includes('caffeine l1') && value.includes('redis l2') && value.includes('database'));
      },
      render: twoTierCache
    },
    {
      test: (text) => flat(text) === 'cache miss database not found',
      render: penetration
    },
    {
      test: (text) => {
        const value = flat(text);
        return value.includes('product:999999999 = not_found') && value.includes('ttl = 30 seconds');
      },
      render: negativeCache
    },
    {
      test: (text) => {
        const value = flat(text);
        return value.includes('many keys expire') && value.includes('redis cluster fails') && value.includes('database overwhelmed') && value.includes('entire application fails');
      },
      render: avalanche
    },
    {
      test: (text) => {
        const value = flat(text);
        return value.includes('search service caches product') && value.includes('order service caches product') && value.includes('recommendation caches product');
      },
      render: cacheConsumers
    },
    {
      test: (text) => {
        const value = flat(text);
        return value.includes('product service') && value.includes('productupdated') && value.includes('message broker') && value.includes('search order recommendation');
      },
      render: invalidationFanout
    },
    {
      test: (text) => {
        const value = flat(text);
        return value.includes('request') && value.includes('edge/cdn cache') && value.includes('application l1 cache') && value.includes('distributed l2 cache') && value.endsWith('database');
      },
      render: cacheLayers
    }
  ];

  function genericVisual(text) {
    const lines = String(text)
      .split('\n')
      .map((line) => line.replace(/[│▼┌┐└┘├┤─]/g, '').trim())
      .filter(Boolean)
      .filter((line) => line !== 'OR');

    if (lines.length < 2 || lines.length > 6) return null;
    if (/\b(INCR|EXPIRE|TTL\s*=|product:|user:|Duration\.|GET\s+\/|POST\s+\/|PUT\s+\/)\b/i.test(text)) return null;
    if (!/[→↓│▼]/.test(text)) return null;

    return pipeline({
      eyebrow: 'Flow',
      title: 'Follow the cache behavior through the system',
      stages: lines.map((line, index) => ({
        title: line,
        subtitle: index === 0 ? 'trigger' : index === lines.length - 1 ? 'outcome' : 'next stage',
        icon: index === 0 ? 'api' : index === lines.length - 1 ? 'database' : 'filter',
        tone: ['blue', 'cyan', 'violet', 'amber', 'danger'][Math.min(index, 4)],
        volume: 100
      }))
    });
  }

  global.SWEChapter2Rules = Object.freeze({ rules, genericVisual, flat });
}(window));
