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

  function requestPath() {
    return pipeline({
      eyebrow: 'Uncached request path',
      title: 'Every request reaches the source of truth',
      stages: [
        { title: 'Client', subtitle: 'requests product 123', icon: 'user', tone: 'blue', volume: 100 },
        { title: 'Spring service', subtitle: 'maps and serializes every response', icon: 'server', tone: 'violet', volume: 100 },
        { title: 'PostgreSQL', subtitle: 'performs repeated read work', icon: 'database', tone: 'amber', volume: 100 }
      ],
      topLabel: '10,000 requests / second →',
      bottomLabel: 'The database repeats nearly identical work →',
      caption: 'Without a cache, request volume and origin load rise together.'
    });
  }

  function requestWork() {
    return pipeline({
      eyebrow: 'Cost of a miss',
      title: 'One simple read triggers work across the full stack',
      stages: [
        { title: 'Acquire connection', subtitle: 'wait for pool capacity', icon: 'server', tone: 'blue', volume: 100 },
        { title: 'Parse and plan', subtitle: 'interpret the SQL', icon: 'api', tone: 'cyan', volume: 96 },
        { title: 'Read storage', subtitle: 'index and table access', icon: 'database', tone: 'violet', volume: 90 },
        { title: 'Materialize row', subtitle: 'construct database result', icon: 'layers', tone: 'amber', volume: 84 },
        { title: 'Transfer and map', subtitle: 'network plus JPA mapping', icon: 'route', tone: 'blue', volume: 78 },
        { title: 'Serialize JSON', subtitle: 'produce the response', icon: 'api', tone: 'green', volume: 72 }
      ],
      caption: 'A cache hit avoids most or all of this repeated work.'
    });
  }

  function cacheRoute() {
    return shell({
      eyebrow: 'Hit / miss routing',
      title: 'A hit returns immediately; only misses reach PostgreSQL',
      className: 'vf-cache-route-figure',
      body: `<div class="vf-cache-route">
        <div class="vf-cache-node" data-tone="blue">${icon('user')}<strong>Client</strong><span>GET /products/123</span></div>
        <span class="vf-cache-arrow" aria-hidden="true"></span>
        <div class="vf-cache-node" data-tone="violet">${icon('server')}<strong>Spring service</strong><span>look up cache key</span></div>
        <div class="vf-cache-branches">
          <article class="vf-cache-branch vf-cache-hit">
            <header><span>HIT</span><b>fast path</b></header>
            <div>${icon('redis')}<strong>Redis</strong><span>return cached value</span></div>
            <i aria-hidden="true"></i>
            <div>${icon('check')}<strong>Response</strong><span>origin avoided</span></div>
          </article>
          <article class="vf-cache-branch vf-cache-miss">
            <header><span>MISS</span><b>origin path</b></header>
            <div>${icon('database')}<strong>PostgreSQL</strong><span>load authoritative value</span></div>
            <i aria-hidden="true"></i>
            <div>${icon('redis')}<strong>Populate Redis</strong><span>serve this and later callers</span></div>
          </article>
        </div>
      </div>`,
      caption: 'The cache changes the origin from the default path into the exceptional path.'
    });
  }

  function trafficSplit() {
    return shell({
      eyebrow: 'Capacity effect',
      title: 'A 95% hit ratio reduces 10,000 RPS to 500 database reads',
      className: 'vf-cache-traffic-figure',
      body: `<div class="vf-cache-traffic">
        <div class="vf-cache-donut" aria-label="95 percent cache hits and 5 percent cache misses">
          <div><strong>10,000</strong><span>requests / sec</span></div>
        </div>
        <div class="vf-cache-traffic-legend">
          <article data-tone="green">${icon('check')}<div><strong>9,500 RPS</strong><span>cache hits</span><small>95% avoids PostgreSQL</small></div></article>
          <article data-tone="amber">${icon('database')}<div><strong>500 RPS</strong><span>cache misses</span><small>5% reaches PostgreSQL</small></div></article>
        </div>
      </div>`,
      caption: 'Hit ratio matters because it changes the capacity required from the source of truth.'
    });
  }

  function cacheAside() {
    return shell({
      eyebrow: 'Cache-aside',
      title: 'The application owns lookup, fallback, population, and return',
      className: 'vf-cache-aside-figure',
      body: `<div class="vf-cache-aside">
        <div class="vf-aside-start">${icon('api')}<strong>GET product:123</strong></div>
        <span class="vf-aside-down"></span>
        <div class="vf-aside-decision">${icon('redis')}<strong>Cache lookup</strong><span>value present?</span></div>
        <div class="vf-aside-paths">
          <article class="vf-aside-hit"><b>HIT</b>${icon('check')}<strong>Return cached product</strong><span>no database work</span></article>
          <article class="vf-aside-miss"><b>MISS</b>${icon('database')}<strong>Load from database</strong><span>populate cache, then return</span></article>
        </div>
      </div>`,
      caption: 'Only requested data enters the cache, while the database remains authoritative.'
    });
  }

  function fallbackFlow() {
    return pipeline({
      eyebrow: 'Cache dependency failure',
      title: 'A Redis failure redirects load rather than making it disappear',
      stages: [
        { title: 'Redis fails', subtitle: 'cache unavailable', icon: 'redis', tone: 'danger', volume: 100 },
        { title: 'Fallback path', subtitle: 'treat as miss or failure', icon: 'retry', tone: 'amber', volume: 100 },
        { title: 'Database', subtitle: 'absorbs redirected traffic', icon: 'database', tone: 'danger', volume: 100 }
      ],
      caption: 'Fallback is safe only when the database has protected, bounded capacity for it.'
    });
  }

  function writeInvalidate() {
    return pipeline({
      eyebrow: 'Write path',
      title: 'Write the source of truth, then invalidate the derived copy',
      stages: [
        { title: 'Update product', subtitle: 'new price is 1,000', icon: 'api', tone: 'blue', volume: 100 },
        { title: 'Commit database', subtitle: 'authoritative state changes', icon: 'database', tone: 'green', volume: 100 },
        { title: 'Delete cache key', subtitle: 'remove the stale representation', icon: 'redis', tone: 'amber', volume: 100 }
      ],
      caption: 'Deleting after the write avoids a permanent dual-write contract, but concurrency can still create a stale refill.'
    });
  }

  function readRepair() {
    return pipeline({
      eyebrow: 'Next read after invalidation',
      title: 'The next miss reconstructs the cache from authoritative state',
      stages: [
        { title: 'Cache miss', subtitle: 'entry was deleted', icon: 'x', tone: 'amber', volume: 100 },
        { title: 'Read database', subtitle: 'load the new value', icon: 'database', tone: 'blue', volume: 100 },
        { title: 'Populate cache', subtitle: 'store fresh representation', icon: 'redis', tone: 'violet', volume: 100 },
        { title: 'Return response', subtitle: 'later readers can hit cache', icon: 'check', tone: 'green', volume: 100 }
      ]
    });
  }

  function stateSnapshot(databaseValue, cacheValue, tone = 'amber', title = 'Cache state') {
    return comparison({
      eyebrow: title,
      title: databaseValue === cacheValue ? 'The cached copy agrees with the source of truth' : 'The cache and source of truth disagree',
      items: [
        { title: 'Database', value: databaseValue, subtitle: 'authoritative value', icon: 'database', tone: 'green' },
        { title: 'Cache', value: cacheValue, subtitle: cacheValue === 'empty' ? 'no derived copy yet' : 'value currently served on a hit', icon: 'redis', tone }
      ]
    });
  }

  function staleRace() {
    return shell({
      eyebrow: 'Concurrency race',
      title: 'A slow reader can repopulate stale data after the writer invalidates',
      className: 'vf-cache-race-figure',
      body: `<div class="vf-cache-race">
        <div class="vf-race-head"><span>Time</span><strong>Reader A</strong><strong>Writer B</strong><strong>Shared state</strong></div>
        <div class="vf-race-row"><span>1</span><p><b>Cache MISS</b><small>starts DB read</small></p><p class="vf-race-idle">—</p><p><b>DB ₹900</b><small>cache empty</small></p></div>
        <div class="vf-race-row"><span>2</span><p><b>Reads ₹900</b><small>response is delayed</small></p><p><b>Update DB → ₹1,000</b><small>new value commits</small></p><p><b>DB ₹1,000</b><small>cache empty</small></p></div>
        <div class="vf-race-row"><span>3</span><p class="vf-race-idle">still running</p><p><b>DELETE cache</b><small>nothing is present</small></p><p><b>DB ₹1,000</b><small>cache empty</small></p></div>
        <div class="vf-race-row vf-race-danger"><span>4</span><p><b>SET cache → ₹900</b><small>old read completes late</small></p><p class="vf-race-idle">—</p><p><b>DB ₹1,000</b><small>cache ₹900</small></p></div>
      </div>`,
      caption: 'Delete-after-write narrows inconsistency, but it does not serialize readers and writers.'
    });
  }

  function stalenessSpectrum() {
    return shell({
      eyebrow: 'Business tolerance',
      title: 'Acceptable staleness depends on what the value controls',
      className: 'vf-staleness-figure',
      body: `<div class="vf-staleness-scale">
        <div class="vf-staleness-line"><i></i><i></i><i></i><i></i></div>
        <article data-tone="green">${icon('check')}<strong>Product description</strong><span>seconds of staleness may be acceptable</span></article>
        <article data-tone="amber">${icon('queue')}<strong>Search index</strong><span>bounded eventual consistency is often acceptable</span></article>
        <article data-tone="danger">${icon('coins')}<strong>Wallet balance</strong><span>stale authorization or spendability may be unacceptable</span></article>
      </div>`,
      caption: 'Consistency requirements should determine the cache strategy, not the other way around.'
    });
  }

  function ttlJitter() {
    return shell({
      eyebrow: 'TTL jitter',
      title: 'Spread expirations across time instead of creating one cliff',
      className: 'vf-ttl-figure',
      body: `<div class="vf-ttl-comparison">
        <article class="vf-ttl-synchronized">
          <header><strong>Fixed TTL</strong><span>all keys expire at 10:10</span></header>
          <div class="vf-ttl-bars">${Array.from({ length: 12 }, () => '<i></i>').join('')}</div>
          <b>1,000,000 simultaneous misses</b>
        </article>
        <span class="vf-ttl-arrow" aria-hidden="true">→</span>
        <article class="vf-ttl-jittered">
          <header><strong>TTL + jitter</strong><span>keys expire between 10:10 and 10:12</span></header>
          <div class="vf-ttl-bars">${[38, 56, 44, 69, 52, 63, 47, 74, 58, 42, 66, 50].map((height) => `<i style="--vf-height:${height}%"></i>`).join('')}</div>
          <b>origin load is distributed</b>
        </article>
      </div>`,
      caption: 'A small random addition to TTL can prevent synchronized expiration from becoming an incident.'
    });
  }

  function stampede() {
    return shell({
      eyebrow: 'Cache stampede',
      title: 'One expired hot key can multiply into thousands of database queries',
      className: 'vf-stampede-figure',
      body: `<div class="vf-stampede">
        <div class="vf-request-cloud">${Array.from({ length: 14 }, (_, index) => `<i style="--vf-index:${index}"></i>`).join('')}<strong>10,000 requests</strong><span>all observe MISS</span></div>
        <div class="vf-stampede-lines" aria-hidden="true">${Array.from({ length: 7 }, () => '<i></i>').join('')}</div>
        <div class="vf-origin-hot">${icon('database')}<strong>PostgreSQL</strong><span>10,000 duplicate reads</span><b>overloaded</b></div>
      </div>`,
      caption: 'The load amplification happens at the exact moment the cache stops protecting the origin.'
    });
  }

  function singleFlight() {
    return shell({
      eyebrow: 'Request coalescing',
      title: 'Many misses share one origin load',
      className: 'vf-single-flight-figure',
      body: `<div class="vf-single-flight">
        <div class="vf-flight-requests">${Array.from({ length: 9 }, () => `<span>${icon('api')}</span>`).join('')}<strong>concurrent misses</strong></div>
        <span class="vf-flight-funnel" aria-hidden="true"></span>
        <div class="vf-flight-lock">${icon('lock')}<strong>Lock: product:123</strong><span>one winner; others wait</span></div>
        <div class="vf-flight-outcomes">
          <article data-tone="green">${icon('database')}<strong>Winner</strong><span>one DB read, then populate cache</span></article>
          <article data-tone="blue">${icon('retry')}<strong>Other callers</strong><span>wait, retry, then read cached value</span></article>
        </div>
      </div>`,
      caption: 'The second cache check after acquiring the lock prevents sequential duplicate loads.'
    });
  }

  function twoTierCache() {
    return layerStack({
      title: 'A short local cache shields a distributed hot key',
      layers: [
        { title: 'Application L1 — Caffeine', subtitle: '5-second local reuse; no network hop', icon: 'server', tone: 'blue' },
        { title: 'Distributed L2 — Redis', subtitle: '10-minute shared reuse across instances', icon: 'redis', tone: 'violet' },
        { title: 'Database', subtitle: 'authoritative source of truth', icon: 'database', tone: 'amber' }
      ],
      caption: 'L1 reduces pressure on a single Redis shard, at the cost of another invalidation boundary.'
    });
  }

  function hotKey() {
    return shell({
      eyebrow: 'Hot-key concentration',
      title: 'A large cluster does not help when one key maps to one overloaded shard',
      className: 'vf-hot-key-figure',
      body: `<div class="vf-hot-key">
        <div class="vf-hot-clients">${Array.from({ length: 12 }, () => `<i>${icon('user')}</i>`).join('')}<strong>500,000 GETs/sec</strong></div>
        <span class="vf-hot-flow" aria-hidden="true"></span>
        <div class="vf-hot-cluster">
          ${Array.from({ length: 6 }, (_, index) => `<article class="${index === 2 ? 'is-hot' : ''}">${icon('redis')}<strong>Shard ${index + 1}</strong>${index === 2 ? '<span>product:123</span><b>overloaded</b>' : '<span>normal load</span>'}</article>`).join('')}
        </div>
      </div>`,
      caption: 'Consistent hashing distributes keys, not traffic evenly when popularity is highly skewed.'
    });
  }

  function penetration() {
    return pipeline({
      eyebrow: 'Cache penetration',
      title: 'Unknown IDs bypass a cache that stores only successful results',
      stages: [
        { title: 'Unknown product ID', subtitle: 'repeated or adversarial request', icon: 'alert', tone: 'danger', volume: 100 },
        { title: 'Cache miss', subtitle: 'no successful value exists', icon: 'redis', tone: 'amber', volume: 100 },
        { title: 'Database lookup', subtitle: 'origin must prove absence', icon: 'database', tone: 'danger', volume: 100 },
        { title: 'NOT FOUND', subtitle: 'same expensive answer every time', icon: 'x', tone: 'danger', volume: 100 }
      ]
    });
  }

  function negativeCache() {
    return comparison({
      eyebrow: 'Negative caching',
      title: 'Cache absence briefly so repeated invalid lookups avoid the database',
      items: [
        { title: 'Without negative cache', value: 'MISS → DB → 404', subtitle: 'every request repeats the lookup', icon: 'database', tone: 'danger' },
        { title: 'With negative cache', value: 'NOT_FOUND, TTL 30s', subtitle: 'repeated requests terminate at Redis', icon: 'redis', tone: 'green' }
      ],
      caption: 'The TTL should be short so newly created data becomes visible quickly.'
    });
  }

  function avalanche() {
    return shell({
      eyebrow: 'Cache avalanche',
      title: 'A broad cache failure can cascade through the entire application',
      className: 'vf-avalanche-figure',
      body: `<div class="vf-avalanche">
        <article data-tone="danger">${icon('redis')}<div><strong>Many keys expire or Redis fails</strong><span>the protection layer disappears broadly</span></div></article>
        <i></i>
        <article data-tone="amber">${icon('x')}<div><strong>Massive cache misses</strong><span>all callers redirect at once</span></div></article>
        <i></i>
        <article data-tone="danger">${icon('database')}<div><strong>Database overwhelmed</strong><span>2,000 RPS becomes 52,000 RPS</span></div></article>
        <i></i>
        <article data-tone="danger">${icon('alert')}<div><strong>Application failure</strong><span>fallback becomes the failure amplifier</span></div></article>
      </div>`,
      caption: 'Rate limits, load shedding, local caches, stale serving, and origin concurrency limits bound the cascade.'
    });
  }

  function expirationVsEviction() {
    return comparison({
      eyebrow: 'Removal semantics',
      title: 'Expiration is time-driven; eviction is pressure-driven',
      items: [
        {
          title: 'Expiration',
          value: 'TTL reached',
          subtitle: 'the key is removed because its freshness window ended',
          icon: 'clock',
          tone: 'blue',
          lines: ['predictable from policy', 'can synchronize without jitter']
        },
        {
          title: 'Eviction',
          value: 'memory full',
          subtitle: 'Redis chooses a victim according to its configured policy',
          icon: 'filter',
          tone: 'amber',
          lines: ['LRU, LFU, random, TTL-based, or no-eviction', 'depends on runtime memory pressure']
        }
      ],
      caption: 'A production design must define behavior for both time expiry and memory exhaustion.'
    });
  }

  function cacheKeyComposition() {
    return shell({
      eyebrow: 'Cache-key design',
      title: 'Every input that changes the representation belongs in the key',
      className: 'vf-cache-key-figure',
      body: `<div class="vf-cache-key">
        <div class="vf-key-inputs">
          ${[
            ['API version', 'v2', 'api'],
            ['Tenant', 'tenant-45', 'users'],
            ['User', '123', 'user'],
            ['Language', 'en-IN', 'route'],
            ['Permission view', 'reader', 'lock']
          ].map(([label, value, iconName]) => `<article>${icon(iconName)}<span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`).join('')}
        </div>
        <span class="vf-key-assembly" aria-hidden="true">→</span>
        <div class="vf-key-result">${icon('key')}<span>Complete key</span><strong>user:v2:tenant-45:123:en-IN:reader</strong></div>
      </div>`,
      caption: 'An underspecified key can return another tenant’s, language’s, or permission level’s representation.'
    });
  }

  function cacheConsumers() {
    return cardGrid({
      eyebrow: 'Distributed cached copies',
      title: 'One product can be cached independently by many services',
      items: [
        { title: 'Search service', subtitle: 'search result and document cache', icon: 'route', tone: 'blue' },
        { title: 'Order service', subtitle: 'product snapshot used during order flow', icon: 'queue', tone: 'violet' },
        { title: 'Recommendation', subtitle: 'feature and product metadata cache', icon: 'brain', tone: 'amber' }
      ],
      caption: 'The owning service cannot invalidate remote copies with an in-process delete.'
    });
  }

  function invalidationFanout() {
    return shell({
      eyebrow: 'Event-driven invalidation',
      title: 'The owner publishes one versioned change; every consumer invalidates its own cache',
      className: 'vf-invalidation-figure',
      body: `<div class="vf-invalidation">
        <div class="vf-invalidation-source">${icon('database')}<strong>Product service</strong><span>commits version 47</span></div>
        <span class="vf-event-arrow" aria-hidden="true"></span>
        <div class="vf-broker">${icon('queue')}<strong>ProductUpdated</strong><span>productId 123 · version 47</span></div>
        <div class="vf-fanout-lines" aria-hidden="true"><i></i><i></i><i></i></div>
        <div class="vf-consumers">
          <article>${icon('route')}<strong>Search</strong><span>invalidate local copy</span></article>
          <article>${icon('queue')}<strong>Order</strong><span>invalidate local copy</span></article>
          <article>${icon('brain')}<strong>Recommendation</strong><span>invalidate local copy</span></article>
        </div>
      </div>`,
      caption: 'Consumers must tolerate duplicate, delayed, lost, and out-of-order events; version checks stop old events from overwriting newer state.'
    });
  }

  function candidateMatrix() {
    return comparison({
      eyebrow: 'Workload fit',
      title: 'Cache only when reuse is high enough to repay the extra system',
      items: [
        {
          title: 'Good candidates',
          subtitle: 'high reuse and expensive origin work',
          icon: 'check',
          tone: 'green',
          lines: ['read-heavy data', 'expensive computations', 'slow external API responses', 'stable reference data', 'frequently reused objects']
        },
        {
          title: 'Poor candidates',
          subtitle: 'low reuse or unacceptable inconsistency',
          icon: 'x',
          tone: 'danger',
          lines: ['every request is unique', 'writes dominate reads', 'strong consistency is mandatory', 'objects are enormous', 'cache lookup costs nearly as much as origin']
        }
      ],
      caption: 'Temporal and spatial locality—not the availability of Redis—determine whether caching helps.'
    });
  }

  function impactDashboard() {
    return shell({
      eyebrow: 'Measure origin impact',
      title: 'A high hit ratio can hide an expensive miss population',
      className: 'vf-cache-impact-figure',
      body: `<div class="vf-cache-impact">
        <div class="vf-impact-ratio"><strong>99%</strong><span>tiny metadata hits</span><i></i></div>
        <div class="vf-impact-cost"><strong>1%</strong><span>large analytics misses</span><i></i><b>90% of DB CPU</b></div>
        <div class="vf-impact-metrics">
          ${[
            ['Hit / miss ratio', 'chart'],
            ['Cache P50 / P95 / P99', 'pulse'],
            ['Origin latency', 'clock'],
            ['DB queries avoided', 'database'],
            ['Evictions and memory', 'filter'],
            ['Hot keys and errors', 'alert']
          ].map(([label, iconName]) => `<article>${icon(iconName)}<span>${escapeHtml(label)}</span></article>`).join('')}
        </div>
      </div>`,
      caption: 'Measure work avoided and work remaining at the origin, not only activity inside the cache.'
    });
  }

  function interviewChecklist() {
    return steps({
      eyebrow: 'Design reasoning sequence',
      title: 'Start with business and workload constraints, then choose cache mechanics',
      items: [
        { title: 'Determine read/write ratio', subtitle: 'is the workload read-heavy enough?' },
        { title: 'Determine acceptable staleness', subtitle: 'what freshness window can the business tolerate?' },
        { title: 'Identify cacheable objects', subtitle: 'which values have useful reuse?' },
        { title: 'Choose cache location', subtitle: 'CDN, application-local, distributed, or layered' },
        { title: 'Choose population pattern', subtitle: 'start with cache-aside unless requirements suggest otherwise' },
        { title: 'Define key structure', subtitle: 'include every material representation input' },
        { title: 'Define TTL and jitter', subtitle: 'bound staleness and spread expiry' },
        { title: 'Define write invalidation', subtitle: 'who removes or updates derived copies?' },
        { title: 'Protect against stampede', subtitle: 'coalesce concurrent misses' },
        { title: 'Handle negative lookups', subtitle: 'bound repeated misses for absent data' },
        { title: 'Plan cache failure behavior', subtitle: 'protect the origin during outages' },
        { title: 'Monitor origin load', subtitle: 'prove the cache reduces real backend work' }
      ]
    });
  }

  function cacheLayers() {
    return layerStack({
      title: 'Each cache layer removes a different kind of cost',
      layers: [
        { title: 'Edge / CDN cache', subtitle: 'Can the request avoid reaching your infrastructure?', icon: 'shield', tone: 'blue' },
        { title: 'Application L1 cache', subtitle: 'Can the service avoid a network call?', icon: 'server', tone: 'cyan' },
        { title: 'Distributed L2 cache', subtitle: 'Can all instances avoid expensive shared backend work?', icon: 'redis', tone: 'violet' },
        { title: 'Database', subtitle: 'What is the authoritative state?', icon: 'database', tone: 'amber' }
      ],
      caption: 'More layers improve locality but multiply freshness, failure, and invalidation responsibilities.'
    });
  }

  function designQuestions() {
    return cardGrid({
      eyebrow: 'Cache design contract',
      title: 'Answer these questions before selecting Redis, Caffeine, or a CDN',
      items: [
        { title: 'What?', subtitle: 'object, query, computation, or response', icon: 'layers', tone: 'blue' },
        { title: 'Where?', subtitle: 'edge, local L1, distributed L2, or several layers', icon: 'route', tone: 'cyan' },
        { title: 'How long?', subtitle: 'freshness window, TTL, and jitter', icon: 'clock', tone: 'violet' },
        { title: 'Who invalidates?', subtitle: 'writer, event consumer, TTL, or version change', icon: 'filter', tone: 'amber' },
        { title: 'What on miss?', subtitle: 'origin load, single flight, negative cache, or rejection', icon: 'x', tone: 'danger' },
        { title: 'What on failure?', subtitle: 'serve stale, shed load, or bound fallback', icon: 'alert', tone: 'danger' }
      ]
    });
  }

  function endpointCanvas() {
    return cardGrid({
      eyebrow: 'E-commerce exercise',
      title: 'These endpoints require different cache and consistency decisions',
      items: [
        { title: 'GET /products/{id}', subtitle: 'strong reuse; metadata can often be briefly stale', icon: 'api', tone: 'green' },
        { title: 'PUT /products/{id}', subtitle: 'write path; must invalidate dependent representations', icon: 'filter', tone: 'amber' },
        { title: 'GET /products/search', subtitle: 'query-result cache or search index; many key dimensions', icon: 'route', tone: 'blue' },
        { title: 'POST /orders', subtitle: 'side effect; idempotency matters more than response caching', icon: 'queue', tone: 'violet' },
        { title: 'GET /inventory/{id}', subtitle: 'freshness-sensitive; reservations and availability complicate caching', icon: 'database', tone: 'danger' }
      ],
      caption: 'For each endpoint, decide location, TTL, invalidation, miss behavior, and consistency guarantee.'
    });
  }

  global.SWEChapter2Visuals = Object.freeze({
    requestPath,
    requestWork,
    cacheRoute,
    trafficSplit,
    cacheAside,
    fallbackFlow,
    writeInvalidate,
    readRepair,
    stateSnapshot,
    staleRace,
    stalenessSpectrum,
    ttlJitter,
    stampede,
    singleFlight,
    twoTierCache,
    hotKey,
    penetration,
    negativeCache,
    avalanche,
    expirationVsEviction,
    cacheKeyComposition,
    cacheConsumers,
    invalidationFanout,
    candidateMatrix,
    impactDashboard,
    interviewChecklist,
    cacheLayers,
    designQuestions,
    endpointCanvas,
    pipeline,
    comparison,
    timeline,
    policyBoard
  });
}(window));
