window.FULL_LESSONS = window.FULL_LESSONS || {};
window.FULL_LESSONS["day-02-caching"] = {
  "day": 2,
  "title": "Caching",
  "subtitle": "Store expensive results closer to callers while trading freshness for speed.",
  "tags": [
    "Caching",
    "Redis",
    "Cache-aside",
    "TTL",
    "Stampede",
    "Invalidation"
  ],
  "core": "A cache trades freshness and complexity for lower latency, lower backend load, and higher throughput.",
  "sections": [
    {
      "title": "Overview",
      "diagram": "flowchart LR\n  Client --> App[Application]\n  App --> L1[Local L1 cache]\n  L1 -- miss --> L2[(Distributed cache)]\n  L2 -- miss --> DB[(Source of truth)]\n  DB --> L2\n  L2 --> L1\n  L1 --> App",
      "body": "<p>Today's topic is Caching. The key system-design idea is simple:</p>\n<p>A cache trades freshness and complexity for lower latency, lower backend load, and higher throughput.</p>\n<p>A strong engineer doesn't just ask, \"Should we use Redis?\" The important questions are:</p>\n<p>What are we caching? Where? For how long? Who owns invalidation? What happens on a miss? What happens when the cache fails?</p>"
    },
    {
      "title": "1. Start with the request path",
      "diagram": null,
      "body": "<p>Suppose a Spring service exposes:</p>\n<p>GET /products/123</p>\n<p>Without caching:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Client\n   │\n   ▼\nSpring Service\n   │\n   ▼\nPostgreSQL\n</code></pre></div>\n<p>Every request performs roughly:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>connection acquisition\n    → SQL parsing/planning\n    → index/table access\n    → row materialization\n    → network transfer\n    → JPA mapping\n    → JSON serialization\n</code></pre></div>\n<p>Imagine:</p>\n<p>10,000 requests/sec<br/>\n80% request the same 1,000 popular products</p>\n<p>The database repeatedly performs nearly identical work.</p>\n<p>Introduce a cache:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Client\n   │\n   ▼\nSpring Service\n   │\n   ├── HIT ──→ Redis ──→ Response\n   │\n   └── MISS ─→ Database\n                  │\n                  ▼\n                Redis\n                  │\n                  ▼\n               Response\n</code></pre></div>\n<p>Now the database handles primarily cache misses.</p>\n<p>If the cache hit ratio is 95%:</p>\n<p>10,000 RPS</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Cache hits   = 9,500 RPS\nCache misses =   500 RPS\n</code></pre></div>\n<p>That can radically change the database capacity you need.</p>\n<p>But you've introduced a new distributed-system problem:</p>\n<p>Database value = ₹1,000</p>\n<p>Cache value    = ₹900</p>\n<p>Which one does the user see?</p>\n<p>That question is the heart of caching.</p>"
    },
    {
      "title": "2. Cache-aside: the most common application pattern",
      "diagram": null,
      "body": "<p>The application owns cache population.</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>public Product getProduct(long productId) {\n\n    String key = \"product:\" + productId;\n\n    Product cached = redis.get(key);\n\n    if (cached != null) {\n        return cached;\n    }\n\n    Product product = repository.findById(productId)\n            .orElseThrow(ProductNotFoundException::new);\n\n    redis.set(key, product, Duration.ofMinutes(10));\n\n    return product;\n}\n</code></pre></div>\n<p>The sequence is:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>GET product:123\n       │\n       ▼\n     Cache\n    /     \\\n  HIT     MISS\n   │        │\nreturn      ▼\n          Database\n             │\n             ▼\n          populate\n            cache\n             │\n             ▼\n           return\n</code></pre></div>\n<p>This is lazy loading. Only data actually requested enters the cache.</p>\n<p>Why cache-aside is popular</p>\n<p>The database remains the source of truth.</p>\n<p>If Redis disappears:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Redis failure\n    ↓\ncache miss/failure\n    ↓\ndatabase\n</code></pre></div>\n<p>The application can theoretically continue operating.</p>\n<p>But \"just fall back to the database\" creates an important production failure mode we'll discuss shortly.</p>"
    },
    {
      "title": "3. Updating cached data",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<p>PUT /products/123</p>\n<p>price: 900 → 1000</p>\n<p>A common implementation is:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>@Transactional\npublic void updateProduct(Product product) {\n\n    repository.save(product);\n\n    redis.delete(\"product:\" + product.getId());\n}\n</code></pre></div>\n<p>This is:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>update database\n     ↓\ninvalidate cache\n</code></pre></div>\n<p>The next reader gets:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>cache MISS\n    ↓\ndatabase\n    ↓\nnew value\n    ↓\ncache\n</code></pre></div>\n<p>This is generally preferable to:</p>\n<p>update database<br/>\nupdate cache</p>\n<p>because updating two independent systems creates dual-write consistency problems.</p>\n<p>But even delete-after-write has a race.</p>"
    },
    {
      "title": "4. The subtle stale-cache race",
      "diagram": null,
      "body": "<p>Consider:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Database = price 900\nCache    = empty\n</code></pre></div>\n<p>Two requests occur concurrently.</p>\n<h3>Reader A                       Writer B</h3>\n<h3>Cache MISS</h3>\n<p>DB read → 900</p>\n<div class=\"code-block\"><span class=\"code-label\">example</span><pre><code>                           DB update → 1000\n\n                           DELETE cache</code></pre></div>\n<p>SET cache → 900</p>\n<p>Final state:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Database = 1000\nCache    = 900\n</code></pre></div>\n<p>The stale value remains until TTL expiry.</p>\n<p>This race is easy to miss in system-design interviews.</p>\n<p>Possible mitigations include:</p>\n<p>Short TTLs.</p>\n<p>Versioned cache keys.</p>\n<p>CDC/event-driven invalidation.</p>\n<p>Database transaction/outbox events.</p>\n<p>Delayed second deletion in specific architectures.</p>\n<p>Accepting bounded staleness when the business permits it.</p>\n<p>The correct solution depends heavily on consistency requirements.</p>\n<p>For something like:</p>\n<p>product description</p>\n<p>10 seconds of staleness may be fine.</p>\n<p>For:</p>\n<ul><li>wallet balance</li><li>available credit</li><li>inventory reservation</li><li>authorization state</li></ul>\n<p>it may be unacceptable.</p>\n<p>In your closed-wallet type of system, I would generally not treat Redis as authoritative for available balance unless the entire ledger/reservation architecture was explicitly designed around that consistency model.</p>"
    },
    {
      "title": "5. TTL is not just expiration",
      "diagram": null,
      "body": "<p>Suppose every product has:</p>\n<p>TTL = 10 minutes</p>\n<p>You deploy at 10:00 and preload 1 million products.</p>\n<p>At 10:10:</p>\n<p>1,000,000 keys expire</p>\n<p>Suddenly:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Redis\n  ↓\nmass expiration\n  ↓\ncache misses\n  ↓\ndatabase storm\n</code></pre></div>\n<p>This is synchronized expiration.</p>\n<p>Instead of:</p>\n<p>Duration.ofMinutes(10)</p>\n<p>use jitter:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>long ttlSeconds =\n        600 + ThreadLocalRandom.current().nextLong(0, 120);\n\nredis.expire(key, Duration.ofSeconds(ttlSeconds));\n</code></pre></div>\n<p>Now:</p>\n<p>TTL = 10–12 minutes</p>\n<p>Expirations spread over time.</p>\n<p>This tiny detail can prevent a production incident.</p>"
    },
    {
      "title": "6. Cache stampede",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<p>product:123</p>\n<p>is extremely popular.</p>\n<p>It expires.</p>\n<p>At that exact moment:</p>\n<p>10,000 requests</p>\n<p>arrive.</p>\n<p>All observe:</p>\n<p>MISS</p>\n<p>All query the database:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>┌── Request 1 ── DB\n              ├── Request 2 ── DB\nCache MISS ───├── Request 3 ── DB\n              │      ...\n              └── Request 10000 ── DB\n</code></pre></div>\n<p>One expired cache entry causes 10,000 database queries.</p>\n<p>This is called a cache stampede or thundering herd.</p>\n<p>A common solution is request coalescing/single-flight behavior:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Cache MISS\n    │\n    ▼\nAcquire lock for product:123\n    │\n    ├── winner → DB → populate cache\n    │\n    └── others → wait/retry → read cache\n</code></pre></div>\n<p>Conceptually:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>Product cached = cache.get(key);\n\nif (cached != null) {\n    return cached;\n}\n\nif (tryAcquireLock(key)) {\n\n    try {\n\n        // Double check after obtaining lock.\n\n        cached = cache.get(key);\n\n        if (cached != null) {\n            return cached;\n        }\n\n        Product product = database.load(id);\n\n        cache.set(key, product);\n\n        return product;\n\n    } finally {\n        releaseLock(key);\n    }\n}\n\nreturn waitAndRetry(key);\n</code></pre></div>\n<p>Notice the second cache lookup after acquiring the lock.</p>\n<p>Without it:</p>\n<p>Thread A misses<br/>\nThread B misses</p>\n<ul><li>A gets lock</li><li>A loads DB</li><li>A populates cache</li><li>A releases lock</li></ul>\n<p>B gets lock<br/>\nB queries DB again</p>\n<p>The second check prevents the unnecessary DB query.</p>"
    },
    {
      "title": "7. Hot keys",
      "diagram": null,
      "body": "<p>Imagine a celebrity posts a link to:</p>\n<p>/products/123</p>\n<p>Suddenly one Redis key receives:</p>\n<p>500,000 GETs/sec</p>\n<p>Even if the Redis cluster has 100 nodes, consistent hashing may place:</p>\n<p>product:123</p>\n<p>on exactly one shard.</p>\n<p>You now have:</p>\n<p>Cluster capacity: huge</p>\n<p>One Redis node:<br/>\noverloaded</p>\n<p>This is a hot-key problem.</p>\n<p>Solutions may include:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Local L1 cache\n    +\nRedis L2 cache\n</code></pre></div>\n<p>For example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Application\n    │\n    ▼\nCaffeine L1\n    │ MISS\n    ▼\nRedis L2\n    │ MISS\n    ▼\nDatabase\n</code></pre></div>\n<p>Now each application instance absorbs repeated reads locally.</p>\n<p>Spring commonly uses the Cache abstraction with providers such as local Caffeine caches or distributed Redis caches.</p>\n<p>A practical architecture might be:</p>\n<ul><li>Caffeine TTL: 5 seconds</li><li>Redis TTL:    10 minutes</li><li>Database:     source of truth</li></ul>\n<p>A 5-second local cache can dramatically reduce a Redis hot key.</p>\n<p>But you've added another invalidation layer.</p>"
    },
    {
      "title": "8. Cache penetration",
      "diagram": null,
      "body": "<p>An attacker repeatedly requests IDs that don't exist:</p>\n<ul><li>/products/999999999</li><li>/products/999999998</li><li>/products/999999997</li></ul>\n<p>The cache contains nothing.</p>\n<p>Every request becomes:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Cache MISS\n    ↓\nDatabase\n    ↓\nNOT FOUND\n</code></pre></div>\n<p>Caching only successful results doesn't help.</p>\n<p>One solution is negative caching:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>product:999999999 = NOT_FOUND\nTTL = 30 seconds\n</code></pre></div>\n<p>Then repeated requests don't hit the database.</p>\n<p>But negative caching needs short TTLs because:</p>\n<ul><li>10:00 product does not exist</li><li>10:01 cache NOT_FOUND</li><li>10:02 product created</li></ul>\n<p>If your negative cache lives for an hour, users may not see the new product.</p>\n<p>Another technique for very large key spaces is a Bloom filter in front of the database, although false positives and synchronization introduce additional complexity.</p>"
    },
    {
      "title": "9. Cache avalanche",
      "diagram": null,
      "body": "<p>Stampede usually concerns one or a small number of hot keys.</p>\n<p>Avalanche is broader:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>many keys expire\n      OR\nRedis cluster fails\n      ↓\nmassive cache misses\n      ↓\ndatabase overwhelmed\n      ↓\ndatabase fails\n      ↓\nentire application fails\n</code></pre></div>\n<p>A dangerous implementation is:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>try {\n    return redis.get(key);\n} catch (Exception e) {\n    return database.findById(id);\n}\n</code></pre></div>\n<p>It looks resilient.</p>\n<p>But imagine:</p>\n<ul><li>Normal:</li><li>Redis receives 50,000 RPS</li><li>DB receives     2,000 RPS</li></ul>\n<p>Redis fails:<br/>\nDB suddenly receives 52,000 RPS</p>\n<p>Your \"fallback\" kills the database.</p>\n<p>This is why cache failure handling may require:</p>\n<ul><li>rate limiting</li><li>load shedding</li><li>circuit breakers</li><li>local cache</li><li>stale-data serving</li><li>DB concurrency limits</li></ul>\n<p>Sometimes returning:</p>\n<p>503 Service Unavailable</p>\n<p>to some requests is better than allowing every request to reach the database.</p>\n<p>The deeper lesson:</p>\n<p>A cache often becomes part of your effective capacity architecture even when you call it \"optional.\"</p>"
    },
    {
      "title": "10. Eviction versus expiration",
      "diagram": null,
      "body": "<p>These are different.</p>\n<p>Expiration:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>TTL reached\n→ key removed\n</code></pre></div>\n<p>Eviction:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Redis memory full\n→ Redis chooses something to remove\n</code></pre></div>\n<p>Depending on configuration, Redis can use policies such as variants of:</p>\n<ul><li>LRU</li><li>LFU</li><li>random</li><li>TTL-based eviction</li><li>no eviction</li></ul>\n<p>A production question is therefore:</p>\n<p>What happens when the cache reaches maximum memory?</p>\n<p>If you don't know, your cache behavior under pressure is undefined from your application's perspective.</p>\n<p>For frequently accessed uneven workloads, LFU-style policies can sometimes retain hot objects better than approximate LRU.</p>"
    },
    {
      "title": "11. Cache key design",
      "diagram": null,
      "body": "<p>Bad:</p>\n<p>user:123</p>\n<p>Suppose the response depends on:</p>\n<ul><li>user</li><li>tenant</li><li>language</li><li>permissions</li><li>API version</li></ul>\n<p>Then:</p>\n<p>user:123</p>\n<p>may return the wrong representation.</p>\n<p>Better:</p>\n<p>user:v2:tenant-45:123:en-IN</p>\n<p>Think of the cache key as representing:</p>\n<p>function(input) → output</p>\n<p>Every input that can materially change the output may need representation in the key.</p>\n<p>This becomes especially important for authorization.</p>\n<p>Never accidentally do:</p>\n<p>GET /document/123</p>\n<p>cache key:<br/>\ndocument:123</p>\n<p>when Alice and Bob receive different views of document 123.</p>\n<p>That can become a data-leak vulnerability, not merely stale data.</p>"
    },
    {
      "title": "12. Cache invalidation across services",
      "diagram": null,
      "body": "<p>Imagine:</p>\n<p>Product Service → owns Product DB</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Search Service  → caches product\nOrder Service   → caches product\nRecommendation  → caches product\n</code></pre></div>\n<p>Product changes.</p>\n<p>Who invalidates everything?</p>\n<p>One scalable approach:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Product Service\n     │\n     │ ProductUpdated\n     ▼\nMessage Broker\n   /    |     \\\n  ▼     ▼      ▼\nSearch Order Recommendation\n  │      │       │\ninvalidate their caches\n</code></pre></div>\n<p>But event delivery introduces:</p>\n<ul><li>duplicate events</li><li>delayed events</li><li>out-of-order events</li><li>lost events</li></ul>\n<p>A useful technique is versioning:</p>\n<ul><li>{</li><li>\"productId\": 123,</li><li>\"version\": 47</li><li>}</li></ul>\n<p>A consumer currently holding version 48 should not allow a delayed version-47 event to overwrite it.</p>\n<p>This connects caching directly to topics we'll encounter later:</p>\n<p>Pub/Sub → Event-Driven Architecture → Idempotency → Eventual Consistency.</p>"
    },
    {
      "title": "13. What should you cache?",
      "diagram": null,
      "body": "<p>Good candidates:</p>\n<ul><li>read-heavy data</li><li>expensive computations</li><li>slow external API responses</li><li>relatively stable reference data</li><li>frequently reused objects</li></ul>\n<p>Poor candidates include data where:</p>\n<ul><li>every request is unique</li><li>writes dominate reads</li><li>strong consistency is mandatory</li><li>objects are enormous</li><li>cache lookup costs nearly as much as source lookup</li></ul>\n<p>An interview answer should not be:</p>\n<p>\"Redis makes things faster.\"</p>\n<p>It should be:</p>\n<p>\"I would first measure whether the workload has sufficient temporal or spatial locality to produce a useful hit ratio.\"</p>\n<p>If:</p>\n<p>1 million requests<br/>\n1 million unique objects</p>\n<p>and none are reused, caching may add:</p>\n<ul><li>network hop</li><li>serialization</li><li>memory cost</li><li>operational complexity</li></ul>\n<p>with almost no benefit.</p>"
    },
    {
      "title": "14. Cache hit ratio can mislead you",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<p>99% cache hit ratio</p>\n<p>Looks excellent.</p>\n<p>But the remaining 1% might be expensive requests.</p>\n<p>For example:</p>\n<ul><li>99%:</li><li>tiny product metadata</li><li>cache hit</li></ul>\n<ul><li>1%:</li><li>huge analytics query</li><li>cache miss</li></ul>\n<p>That 1% may consume 90% of database CPU.</p>\n<p>So monitor:</p>\n<ul><li>hit ratio</li><li>miss ratio</li><li>cache latency P50/P95/P99</li><li>origin latency</li><li>DB queries avoided</li><li>DB load on misses</li><li>evictions</li><li>memory utilization</li><li>hot keys</li><li>cache errors</li></ul>\n<p>Measure the impact on the origin, not merely the cache.</p>"
    },
    {
      "title": "15. Interview scenario",
      "diagram": null,
      "body": "<p>You're asked:</p>\n<p>\"We have a product API receiving 50,000 RPS. PostgreSQL cannot handle the read traffic. How would you design caching?\"</p>\n<p>A strong reasoning sequence is:</p>\n<ol>\n<li><p>Determine read/write ratio.</p>\n</li>\n<li><p>Determine acceptable staleness.</p>\n</li>\n<li><p>Identify cacheable objects.</p>\n</li>\n<li><p>Choose cache location:<br/>\nCDN / application local / distributed.</p>\n</li>\n<li><p>Start with cache-aside.</p>\n</li>\n<li><p>Define key structure.</p>\n</li>\n<li><p>Define TTL + jitter.</p>\n</li>\n<li><p>Define write invalidation.</p>\n</li>\n<li><p>Protect against stampede.</p>\n</li>\n<li><p>Handle negative lookups.</p>\n</li>\n<li><p>Plan Redis failure behavior.</p>\n</li>\n<li><p>Monitor hit ratio and origin load.</p>\n</li>\n</ol>\n<p>Then ask:</p>\n<p>\"Can product data be stale for 30 seconds?\"</p>\n<p>If yes, your architecture becomes dramatically simpler.</p>\n<p>If no, you need a stronger invalidation/consistency strategy.</p>\n<p>That single business requirement often matters more than the choice between Redis and Memcached.</p>"
    },
    {
      "title": "Production mental model",
      "diagram": null,
      "body": "<p>Don't think:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Database\n   +\nRedis\n</code></pre></div>\n<p>Think:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Request\n   │\n   ▼\nEdge/CDN Cache\n   │\n   ▼\nApplication L1 Cache\n   │\n   ▼\nDistributed L2 Cache\n   │\n   ▼\nDatabase\n</code></pre></div>\n<p>Each layer answers different questions:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>CDN\n→ Can I avoid reaching my infrastructure?\n</code></pre></div>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>L1 local cache\n→ Can I avoid a network call?\n</code></pre></div>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Distributed cache\n→ Can I avoid expensive shared backend work?\n</code></pre></div>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Database\n→ What is the authoritative state?\n</code></pre></div>\n<p>The difficult part is not adding these layers.</p>\n<p>The difficult part is maintaining correct behavior when:</p>\n<ul><li>data changes</li><li>cache expires</li><li>Redis fails</li><li>events arrive late</li><li>traffic spikes</li><li>one key becomes hot</li><li>the database slows down</li><li>multiple requests miss simultaneously</li></ul>\n<p>That's where caching becomes a system-design problem rather than a @Cacheable annotation problem.</p>"
    },
    {
      "title": "Today's design exercise",
      "diagram": null,
      "body": "<p>Consider a Spring Boot e-commerce API:</p>\n<div class=\"code-block\"><span class=\"code-label\">HTTP endpoints</span><pre><code>GET  /products/{id}\nPUT  /products/{id}\nGET  /products/search?q=...\nPOST /orders\nGET  /inventory/{productId}</code></pre></div>\n<p>A useful exercise is to decide which of these you would cache, where you would cache it, the TTL, the invalidation mechanism, and what consistency guarantee each endpoint needs. The interesting ones are search and inventory: they force very different trade-offs from ordinary product metadata.</p>"
    }
  ],
  "keyTakeaways": [
    "Cache only workloads with reuse and a meaningful hit ratio.",
    "Define freshness, key scope, invalidation, TTL jitter, and miss behavior before choosing a product.",
    "Protect the origin from stampedes, penetration, hot keys, cache outages, and mass expiry.",
    "Treat authorization-sensitive cache keys as a security boundary.",
    "Measure origin work avoided, not only the cache hit ratio."
  ]
};
