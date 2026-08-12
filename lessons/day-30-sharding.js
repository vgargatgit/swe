window.FULL_LESSONS = window.FULL_LESSONS || {};
window.FULL_LESSONS["day-30-sharding"] = {
  "day": 30,
  "title": "Sharding",
  "subtitle": "Split one logical dataset across independent database nodes using a shard key and routing layer.",
  "tags": [
    "Sharding",
    "Shard key",
    "Routing",
    "Hot shards",
    "Resharding",
    "Global operations"
  ],
  "core": "Sharding distributes one logical dataset across multiple independent database nodes. Each shard stores only part of the data, allowing storage capacity and write throughput to scale beyond a single database.",
  "sections": [
    {
      "title": "Overview",
      "diagram": "flowchart LR\n  App --> Router[Shard router]\n  Router -- shard key --> S1[(Shard 1)]\n  Router -- shard key --> S2[(Shard 2)]\n  Router -- shard key --> S3[(Shard 3)]\n  Router -. scatter / gather .-> S1\n  Router -. scatter / gather .-> S2\n  Router -. scatter / gather .-> S3",
      "body": "<p>A simple topology:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>                         Application\n                              │\n                       Shard Router\n                  ┌───────────┼───────────┐\n                  ▼           ▼           ▼\n               Shard 1     Shard 2     Shard 3\n              Customers    Customers    Customers\n               A–H          I–P          Q–Z\n</code></pre></div>\n<p>The application still presents one logical system, but the data is physically split.</p>\n<p>Sharding can solve:</p>\n<ul>\n<li>a database too large for one machine</li>\n<li>write throughput beyond one primary</li>\n<li>storage or I/O limits</li>\n<li>tenant isolation requirements</li>\n<li>regional data placement</li>\n<li>noisy-neighbour problems</li>\n</ul>\n<p>It introduces substantial complexity:</p>\n<ul>\n<li>every query must locate the correct shard</li>\n<li>cross-shard joins become difficult</li>\n<li>distributed transactions become expensive</li>\n<li>rebalancing requires moving live data</li>\n<li>a poor shard key can create permanent hotspots</li>\n<li>global uniqueness and ordering become harder</li>\n<li>operations now manage many databases instead of one</li>\n</ul>\n<p>Sharding should usually be adopted after simpler approaches have been exhausted:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Query optimization\n    ↓\nIndexes\n    ↓\nCaching\n    ↓\nRead replicas\n    ↓\nVertical scaling\n    ↓\nTable partitioning\n    ↓\nSharding\n</code></pre></div>"
    },
    {
      "title": "1. Sharding versus replication",
      "diagram": null,
      "body": "<p>Replication creates copies of the same data:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Primary\n  ├── Replica A: all rows\n  └── Replica B: all rows\n</code></pre></div>\n<p>Sharding divides the rows:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Shard A: customers 1–1,000,000\nShard B: customers 1,000,001–2,000,000\nShard C: customers 2,000,001–3,000,000\n</code></pre></div>\n<p>Replication primarily improves:</p>\n<ul>\n<li>read scale</li>\n<li>availability</li>\n<li>failover</li>\n</ul>\n<p>Sharding primarily improves:</p>\n<ul>\n<li>storage scale</li>\n<li>write scale</li>\n<li>aggregate database capacity</li>\n</ul>\n<p>Production systems often combine them:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Shard 1\n  ├── Primary\n  └── Replicas\n\nShard 2\n  ├── Primary\n  └── Replicas\n\nShard 3\n  ├── Primary\n  └── Replicas\n</code></pre></div>\n<p>Now each shard is itself a replicated database cluster.</p>"
    },
    {
      "title": "2. Sharding versus table partitioning",
      "diagram": null,
      "body": "<p>The terms are sometimes used loosely, but a useful distinction is:</p>\n<h5>Partitioning</h5>\n<p>One database system divides a table internally:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>One PostgreSQL cluster\n\npayment_2026_01\npayment_2026_02\npayment_2026_03\n</code></pre></div>\n<p>The database still provides:</p>\n<ul>\n<li>one SQL endpoint</li>\n<li>one transaction manager</li>\n<li>cross-partition queries</li>\n<li>one catalog</li>\n</ul>\n<h5>Sharding</h5>\n<p>Independent database nodes each own different rows:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>PostgreSQL cluster A\nPostgreSQL cluster B\nPostgreSQL cluster C\n</code></pre></div>\n<p>Cross-shard operations are no longer normal local database operations.</p>\n<p>Partitioning is the next lesson; here, the important idea is:</p>\n<div class=\"callout\">\n<p>Partitioning divides data inside one database authority. Sharding divides data across multiple database authorities.</p>\n</div>"
    },
    {
      "title": "3. The shard key",
      "diagram": null,
      "body": "<p>The <strong>shard key</strong> determines which shard owns a row.</p>\n<p>Examples:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>customer_id\ntenant_id\nwallet_id\nmerchant_id\nregion\norder_id\n</code></pre></div>\n<p>Routing function:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>shard = route(shardKey)\n</code></pre></div>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>wallet_id = 8,421\nhash(wallet_id) % 4 = 2\n\n→ Shard 2\n</code></pre></div>\n<p>The shard key is one of the most consequential decisions in a distributed database design.</p>\n<p>A good shard key should usually provide:</p>\n<ul>\n<li>high cardinality</li>\n<li>reasonably even distribution</li>\n<li>stable ownership</li>\n<li>availability in most queries</li>\n<li>locality for related data</li>\n<li>low hotspot risk</li>\n<li>manageable rebalancing</li>\n</ul>\n<p>These goals often conflict.</p>"
    },
    {
      "title": "4. The two central shard-key questions",
      "diagram": null,
      "body": "<p>For every candidate key, ask:</p>\n<h5>Can most requests identify the shard directly?</h5>\n<p>Good:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>GET /wallets/{walletId}/transactions\n</code></pre></div>\n<p>The request already contains <code class=\"inline-code\">walletId</code>.</p>\n<p>Poor:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>GET /transactions/{transactionId}\n</code></pre></div>\n<p>if transactions are sharded only by <code class=\"inline-code\">walletId</code> and the transaction ID does not encode or map to it.</p>\n<p>Without the shard key, the application may need:</p>\n<ul>\n<li>a global lookup table</li>\n<li>a secondary index service</li>\n<li>a broadcast query to all shards</li>\n<li>a shard-aware identifier</li>\n</ul>\n<h5>Does the key distribute load evenly?</h5>\n<p>A key may distribute rows evenly but not traffic evenly.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>merchant_id\n</code></pre></div>\n<p>One major merchant may generate 40% of all payment traffic.</p>\n<p>That merchant's shard becomes hot even if row counts are balanced.</p>\n<p>You must consider:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>data distribution\n+\nrequest distribution\n+\nwrite distribution\n+\nfuture growth\n</code></pre></div>"
    },
    {
      "title": "5. Tenant-based sharding",
      "diagram": null,
      "body": "<p>For a SaaS platform:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>shardKey = tenant_id\n</code></pre></div>\n<p>All data for one tenant is colocated:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Tenant\n  ├── Users\n  ├── Orders\n  ├── Payments\n  └── Settings\n</code></pre></div>\n<p>Advantages:</p>\n<ul>\n<li>tenant-scoped queries remain local</li>\n<li>transactions within one tenant remain local</li>\n<li>tenant backup/export is simpler</li>\n<li>tenant isolation is natural</li>\n<li>moving one tenant is conceptually possible</li>\n</ul>\n<p>Risks:</p>\n<ul>\n<li>large “whale” tenants create hotspots</li>\n<li>tenant sizes vary greatly</li>\n<li>one tenant may outgrow one shard</li>\n<li>global analytics require fan-out</li>\n<li>requests without tenant ID need lookup</li>\n</ul>\n<p>Tenant sharding is often strong when business operations are naturally tenant-scoped.</p>"
    },
    {
      "title": "6. Wallet-based sharding",
      "diagram": null,
      "body": "<p>For a closed-wallet system:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>shardKey = wallet_id\n</code></pre></div>\n<p>Place together:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>wallet\nledger entries\nholds\nbalance\nexpiry buckets\nidempotency records\n</code></pre></div>\n<p>Advantages:</p>\n<ul>\n<li>debit and credit operations for one wallet remain local</li>\n<li>balance and ledger transaction can use one database transaction</li>\n<li>wallet history queries remain local</li>\n<li>locking is local</li>\n</ul>\n<p>But transfers between two wallets may cross shards:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Wallet A → Shard 1\nWallet B → Shard 4\n</code></pre></div>\n<p>A transfer now requires:</p>\n<ul>\n<li>distributed transaction</li>\n<li>saga</li>\n<li>escrow/intermediate account</li>\n<li>asynchronous settlement</li>\n<li>carefully designed ledger orchestration</li>\n</ul>\n<p>Choosing wallet locality optimizes single-wallet operations while making cross-wallet operations more complex.</p>"
    },
    {
      "title": "7. Sharding strategies",
      "diagram": null,
      "body": "<p>The main strategies are:</p>\n<ol>\n<li>Range sharding</li>\n<li>Hash sharding</li>\n<li>Directory-based sharding</li>\n<li>Geographic sharding</li>\n<li>Composite or hierarchical sharding</li>\n</ol>"
    },
    {
      "title": "8. Range sharding",
      "diagram": null,
      "body": "<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Customer IDs 1–1,000,000       → Shard A\nCustomer IDs 1,000,001–2,000,000 → Shard B\nCustomer IDs 2,000,001–3,000,000 → Shard C\n</code></pre></div>\n<p>Advantages:</p>\n<ul>\n<li>easy to understand</li>\n<li>range queries may target one or a few shards</li>\n<li>moving a range can be straightforward</li>\n<li>natural for dates or ordered keys</li>\n</ul>\n<p>Disadvantages:</p>\n<ul>\n<li>sequential IDs create write hotspots</li>\n<li>newest range receives most inserts</li>\n<li>uneven growth</li>\n<li>boundary management</li>\n<li>one popular range can dominate traffic</li>\n</ul>\n<p>Range sharding by time:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>2024 data → Shard A\n2025 data → Shard B\n2026 data → Shard C\n</code></pre></div>\n<p>may work for archives but can send every current write to the latest shard.</p>"
    },
    {
      "title": "9. Hash sharding",
      "diagram": null,
      "body": "<p>Routing:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>shard = hash(key) mod shardCount\n</code></pre></div>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>hash(customer_id) % 4\n</code></pre></div>\n<p>Advantages:</p>\n<ul>\n<li>generally even distribution</li>\n<li>avoids sequential-key hotspots</li>\n<li>simple deterministic routing</li>\n<li>good for point lookups</li>\n</ul>\n<p>Disadvantages:</p>\n<ul>\n<li>range queries scatter across shards</li>\n<li>changing shard count remaps many keys</li>\n<li>related adjacent IDs are not colocated</li>\n<li>resharding is difficult with plain modulo</li>\n</ul>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>4 shards:\nhash(key) % 4\n\nAdd a fifth shard:\nhash(key) % 5\n</code></pre></div>\n<p>Most keys now map to different shards.</p>\n<p>That makes naive modulo hashing poor for elastic shard growth.</p>"
    },
    {
      "title": "10. Consistent hashing",
      "diagram": null,
      "body": "<p>Consistent hashing places shards and keys on a logical ring.</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>           Shard A\n              ●\n        /             \\\n   key ●               ● Shard B\n       \\               /\n         ● Shard C\n</code></pre></div>\n<p>When a shard is added, only part of the keyspace moves rather than almost every key.</p>\n<p>Advantages:</p>\n<ul>\n<li>less data movement when membership changes</li>\n<li>useful for distributed caches and some sharded stores</li>\n<li>supports virtual nodes for smoother distribution</li>\n</ul>\n<p>Limitations:</p>\n<ul>\n<li>balancing can still be imperfect</li>\n<li>operational movement is still required</li>\n<li>relational range queries remain difficult</li>\n<li>shard ownership must be durable and versioned</li>\n<li>different shard capacities may need weighted placement</li>\n</ul>\n<p>Consistent hashing reduces remapping. It does not make resharding free.</p>"
    },
    {
      "title": "11. Virtual shards",
      "diagram": null,
      "body": "<p>A powerful pattern is to separate:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>logical shard\n</code></pre></div>\n<p>from:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>physical database\n</code></pre></div>\n<p>Suppose there are 1,024 logical buckets:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>bucket = hash(customer_id) % 1024\n</code></pre></div>\n<p>Initially:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Buckets 0–255   → Database A\nBuckets 256–511 → Database B\nBuckets 512–767 → Database C\nBuckets 768–1023 → Database D\n</code></pre></div>\n<p>To add Database E, move selected buckets:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Buckets 100–149 → Database E\nBuckets 500–549 → Database E\n</code></pre></div>\n<p>The key-to-bucket function remains stable.</p>\n<p>Only the bucket-to-database mapping changes.</p>\n<p>Advantages:</p>\n<ul>\n<li>easier incremental rebalancing</li>\n<li>different physical shard capacities</li>\n<li>smaller movement units</li>\n<li>no need to change application hash function</li>\n</ul>\n<p>Trade-offs:</p>\n<ul>\n<li>mapping metadata must be highly available</li>\n<li>routing cache invalidation is required</li>\n<li>bucket migrations need careful coordination</li>\n<li>too few buckets limit balancing granularity</li>\n</ul>"
    },
    {
      "title": "12. Directory-based sharding",
      "diagram": null,
      "body": "<p>Maintain a lookup:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>tenant_id → shard_id\n</code></pre></div>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>tenant_1001 → shard_3\ntenant_1002 → shard_1\ntenant_1003 → shard_7\n</code></pre></div>\n<p>Advantages:</p>\n<ul>\n<li>arbitrary placement</li>\n<li>easy to move one tenant</li>\n<li>supports different-size tenants</li>\n<li>can isolate high-value or regulated tenants</li>\n<li>no deterministic hash restriction</li>\n</ul>\n<p>Disadvantages:</p>\n<ul>\n<li>directory becomes critical infrastructure</li>\n<li>every uncached route may require a lookup</li>\n<li>directory consistency matters</li>\n<li>stale routing can write to the wrong shard</li>\n<li>directory availability can affect the whole platform</li>\n</ul>\n<p>Directory-based routing is common for tenant sharding because tenants differ greatly in size and workload.</p>"
    },
    {
      "title": "13. The shard directory",
      "diagram": null,
      "body": "<p>A shard directory may contain:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>routing_key\nlogical_shard\nphysical_cluster\nregion\nstate\nrouting_version\nmigration_state\n</code></pre></div>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>tenant_id:      T123\nlogical_shard:  87\ndatabase:       shard-eu-04\nstate:          ACTIVE\nversion:        42\n</code></pre></div>\n<p>It should be:</p>\n<ul>\n<li>highly available</li>\n<li>strongly consistent for updates</li>\n<li>aggressively cached for reads</li>\n<li>versioned</li>\n<li>auditable</li>\n<li>protected against concurrent movement</li>\n</ul>\n<p>Routing mistakes can create split ownership.</p>"
    },
    {
      "title": "14. Geographic sharding",
      "diagram": null,
      "body": "<p>Route by region:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>India customers → Mumbai shard\nEU customers    → Frankfurt shard\nUS customers    → Virginia shard\n</code></pre></div>\n<p>Advantages:</p>\n<ul>\n<li>lower local latency</li>\n<li>data residency</li>\n<li>blast-radius isolation</li>\n<li>region-specific compliance</li>\n</ul>\n<p>Trade-offs:</p>\n<ul>\n<li>users can move regions</li>\n<li>global accounts need special handling</li>\n<li>cross-region operations become distributed</li>\n<li>global reporting requires aggregation</li>\n<li>regional traffic may be uneven</li>\n<li>disaster recovery becomes more complex</li>\n</ul>\n<p>Geographic sharding is often both a scaling and compliance decision.</p>"
    },
    {
      "title": "15. Composite shard keys",
      "diagram": null,
      "body": "<p>A composite key may combine dimensions:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>(tenant_id, bucket)\n(region, customer_id)\n(merchant_id, subshard)\n</code></pre></div>\n<p>Example for whale tenants:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>small tenant:\n    all data in one shard\n\nlarge tenant:\n    hash(order_id) across 16 tenant subshards\n</code></pre></div>\n<p>This supports growth but complicates tenant-wide queries.</p>\n<p>A composite design should answer:</p>\n<ul>\n<li>what remains colocated?</li>\n<li>what becomes fan-out?</li>\n<li>can transactions remain local?</li>\n<li>how is the subshard count changed?</li>\n<li>how is routing encoded?</li>\n</ul>"
    },
    {
      "title": "16. Hotspots",
      "diagram": null,
      "body": "<p>A hotspot occurs when one shard receives disproportionate load.</p>\n<p>Possible causes:</p>\n<ul>\n<li>one very large tenant</li>\n<li>one celebrity user</li>\n<li>current time range</li>\n<li>sequential key routing</li>\n<li>one popular product</li>\n<li>uneven hash</li>\n<li>batch job targeting one shard</li>\n<li>skewed event partition keys</li>\n</ul>\n<p>Symptoms:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Shard 1:\n    CPU 95%\n    P99 2 seconds\n    pool pending 200\n\nShard 2–8:\n    CPU 20%\n    P99 20 ms\n</code></pre></div>\n<p>The cluster has unused total capacity, but the hot shard remains overloaded.</p>\n<p>Sharding scales only when the workload can be distributed.</p>"
    },
    {
      "title": "17. Celebrity-key problem",
      "diagram": null,
      "body": "<p>Suppose posts are sharded by:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>user_id\n</code></pre></div>\n<p>A normal user receives:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>10 reads/sec\n</code></pre></div>\n<p>A celebrity receives:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1,000,000 reads/sec\n</code></pre></div>\n<p>Every celebrity read targets one shard.</p>\n<p>Possible mitigations:</p>\n<ul>\n<li>caching</li>\n<li>read replicas for the hot shard</li>\n<li>replicate hot entities</li>\n<li>split high-volume data into subshards</li>\n<li>special-case routing for whales</li>\n<li>precomputed feeds</li>\n<li>isolate hot tenants</li>\n</ul>\n<p>Hashing cannot distribute requests for one indivisible key across shards.</p>"
    },
    {
      "title": "18. Write hotspots",
      "diagram": null,
      "body": "<p>A time-ordered event ID may route all current writes to one range shard.</p>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>event_id 1–1B → Shard A\nnext range    → Shard B\n</code></pre></div>\n<p>While Shard B is active:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>100% new inserts → Shard B\n</code></pre></div>\n<p>Historical shards are nearly idle.</p>\n<p>Possible fixes:</p>\n<ul>\n<li>hash prefix</li>\n<li>multiple active ranges</li>\n<li>time bucket plus hash bucket</li>\n<li>virtual shards</li>\n<li>append-oriented distributed database</li>\n</ul>\n<p>Example composite key:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>(day, hash(customer_id) % 32)\n</code></pre></div>\n<p>This gives 32 active write partitions per day.</p>"
    },
    {
      "title": "19. Data locality",
      "diagram": null,
      "body": "<p>Good sharding keeps frequently joined or transacted data together.</p>\n<p>For an order system:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>order\norder_items\npayment_attempts\nshipment\n</code></pre></div>\n<p>If all use:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>shardKey = order_id\n</code></pre></div>\n<p>then order operations remain local.</p>\n<p>But customer history:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>all orders for customer\n</code></pre></div>\n<p>may span shards unless <code class=\"inline-code\">customer_id</code> determines placement.</p>\n<p>You cannot optimize every access pattern simultaneously.</p>\n<p>Shard-key design is about selecting the most important locality boundary.</p>"
    },
    {
      "title": "20. Colocation",
      "diagram": null,
      "body": "<p>Related tables should generally use the same shard-routing rule.</p>\n<p>Bad:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>orders sharded by customer_id\norder_items sharded by product_id\n</code></pre></div>\n<p>Loading one order now requires cross-shard access.</p>\n<p>Better:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>orders:\n    shard by customer_id\n\norder_items:\n    inherit the order's customer_id shard\n</code></pre></div>\n<p>The child table may store the shard key explicitly:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>order_item (\n    customer_id,\n    order_id,\n    item_id,\n    ...\n)\n</code></pre></div>\n<p>Even if <code class=\"inline-code\">customer_id</code> seems redundant, it enables routing and local foreign-key enforcement.</p>"
    },
    {
      "title": "21. Foreign keys",
      "diagram": null,
      "body": "<p>A relational database can enforce a foreign key only when both rows are within its authority.</p>\n<p>Local:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Order and items on Shard A\n</code></pre></div>\n<p>Normal foreign key works.</p>\n<p>Cross-shard:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Order on Shard A\nCustomer on Shard B\n</code></pre></div>\n<p>The database cannot enforce a normal cross-shard foreign key.</p>\n<p>The application must use:</p>\n<ul>\n<li>service-level validation</li>\n<li>asynchronous reconciliation</li>\n<li>replicated reference data</li>\n<li>denormalization</li>\n<li>globally unique identifiers</li>\n<li>compensating repair jobs</li>\n</ul>\n<p>Loss of database-enforced integrity is a major sharding cost.</p>"
    },
    {
      "title": "22. Cross-shard joins",
      "diagram": null,
      "body": "<p>Single-shard join:</p>\n<div class=\"code-block\"><span class=\"code-label\">sql</span><pre><code>SELECT ...\nFROM orders o\nJOIN order_items i ON i.order_id = o.id\nWHERE o.customer_id = ?;\n</code></pre></div>\n<p>works normally if both tables are colocated.</p>\n<p>Cross-shard join requires:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Query each relevant shard\n    ↓\nTransfer results\n    ↓\nJoin in application or coordinator\n</code></pre></div>\n<p>Costs:</p>\n<ul>\n<li>more network round trips</li>\n<li>more memory</li>\n<li>more complex pagination</li>\n<li>inconsistent snapshots</li>\n<li>partial failure</li>\n<li>higher latency</li>\n</ul>\n<p>Avoid cross-shard joins on interactive paths where possible.</p>"
    },
    {
      "title": "23. Scatter-gather queries",
      "diagram": null,
      "body": "<p>A query without a shard key may need to contact every shard:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Find payment by external_reference\n</code></pre></div>\n<p>Flow:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Coordinator\n   ├── Query Shard 1\n   ├── Query Shard 2\n   ├── Query Shard 3\n   └── Query Shard N\n</code></pre></div>\n<p>Then merge results.</p>\n<p>This is called scatter-gather.</p>\n<p>Latency tends toward the slowest shard:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>response time ≈ max(shard response times) + merge cost\n</code></pre></div>\n<p>As shard count rises, the chance that at least one shard is slow also rises.</p>"
    },
    {
      "title": "24. Tail-latency amplification",
      "diagram": null,
      "body": "<p>Suppose each shard has a 1% chance of taking longer than 500 ms.</p>\n<p>A query contacts 100 shards.</p>\n<p>Probability that all are fast:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>0.99^100 ≈ 36.6%\n</code></pre></div>\n<p>Therefore the probability that at least one is slow is:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>≈ 63.4%\n</code></pre></div>\n<p>Even individually reliable shards can produce poor scatter-gather tail latency.</p>\n<p>This is why shard-key availability in requests is critical.</p>"
    },
    {
      "title": "25. Secondary lookup service",
      "diagram": null,
      "body": "<p>Suppose data is sharded by <code class=\"inline-code\">customer_id</code>, but an API looks up by <code class=\"inline-code\">payment_id</code>.</p>\n<p>Maintain:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>payment_id → customer_id or shard_id\n</code></pre></div>\n<p>Possible implementations:</p>\n<ul>\n<li>global routing table</li>\n<li>distributed key-value store</li>\n<li>searchable index</li>\n<li>ID encoding</li>\n<li>cache backed by authoritative directory</li>\n</ul>\n<p>Lookup:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>payment_id\n    ↓\nrouting index says Shard 7\n    ↓\nquery Shard 7\n</code></pre></div>\n<p>The secondary index must be updated reliably with the primary write.</p>\n<p>That introduces a dual-write problem.</p>"
    },
    {
      "title": "26. Avoiding routing dual writes",
      "diagram": null,
      "body": "<p>Dangerous:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1. Insert payment into shard.\n2. Insert payment→shard mapping into directory.\n</code></pre></div>\n<p>A crash between steps creates inconsistency.</p>\n<p>Possible patterns:</p>\n<ul>\n<li>transactional outbox on the shard</li>\n<li>routing entry created before business write with repair semantics</li>\n<li>globally encoded shard-aware ID</li>\n<li>event-driven index with eventual consistency</li>\n<li>central allocation service</li>\n<li>saga with reconciliation</li>\n</ul>\n<p>If lookup consistency must be immediate, the design becomes more difficult.</p>"
    },
    {
      "title": "27. Shard-aware IDs",
      "diagram": null,
      "body": "<p>An ID can encode routing information.</p>\n<p>Example conceptual layout:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>[ timestamp ][ shard ID ][ sequence ]\n</code></pre></div>\n<p>Given:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>payment_id\n</code></pre></div>\n<p>the application extracts:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>shard ID\n</code></pre></div>\n<p>Advantages:</p>\n<ul>\n<li>no directory lookup for point reads</li>\n<li>globally unique IDs</li>\n<li>fast routing</li>\n</ul>\n<p>Trade-offs:</p>\n<ul>\n<li>shard topology leaks into identifiers</li>\n<li>moving data does not change old encoded shard ID</li>\n<li>routing may require an indirection layer anyway</li>\n<li>ID format becomes difficult to change</li>\n<li>exposing shard IDs may reveal infrastructure information</li>\n</ul>\n<p>A common compromise is to encode a stable logical bucket, not a physical database.</p>"
    },
    {
      "title": "28. Global ID generation",
      "diagram": null,
      "body": "<p>Auto-increment IDs work easily within one database:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1, 2, 3...\n</code></pre></div>\n<p>Across shards, every shard could generate the same ID.</p>\n<p>Options:</p>\n<h5>Composite identity</h5>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>(shard_id, local_id)\n</code></pre></div>\n<p>Simple, but awkward for APIs.</p>\n<h5>UUID</h5>\n<p>Globally unique without coordination.</p>\n<p>Trade-offs:</p>\n<ul>\n<li>larger keys</li>\n<li>random UUIDs can reduce index locality</li>\n<li>text representation is wasteful</li>\n</ul>\n<h5>Time-ordered UUID</h5>\n<p>Such as a time-ordered UUID format.</p>\n<p>Benefits:</p>\n<ul>\n<li>global generation</li>\n<li>better index locality than random UUIDs</li>\n</ul>\n<h5>Snowflake-style ID</h5>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>timestamp + worker/shard bits + sequence\n</code></pre></div>\n<p>Benefits:</p>\n<ul>\n<li>compact numeric ID</li>\n<li>sortable by approximate creation time</li>\n<li>distributed generation</li>\n</ul>\n<p>Risks:</p>\n<ul>\n<li>clock regressions</li>\n<li>worker-ID coordination</li>\n<li>sequence exhaustion within a millisecond</li>\n<li>infrastructure details embedded in IDs</li>\n</ul>"
    },
    {
      "title": "29. Global uniqueness",
      "diagram": null,
      "body": "<p>Suppose email must be unique across every shard.</p>\n<p>A unique index on each shard guarantees only:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>unique within this shard\n</code></pre></div>\n<p>It does not guarantee global uniqueness.</p>\n<p>Solutions:</p>\n<h5>Route uniqueness domain by the same key</h5>\n<p>Shard users by normalized email hash.</p>\n<p>Then all equal emails land on the same shard.</p>\n<p>But most user operations may need a different shard key.</p>\n<h5>Central uniqueness service</h5>\n<p>Reserve:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>normalized_email → user_id\n</code></pre></div>\n<p>in a globally authoritative store.</p>\n<h5>Dedicated global table</h5>\n<p>Small strongly consistent database holding unique values.</p>\n<h5>Accept scoped uniqueness</h5>\n<p>For example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>username unique within tenant\n</code></pre></div>\n<p>and shard by tenant.</p>\n<p>Global constraints are much easier when their uniqueness scope aligns with the shard key.</p>"
    },
    {
      "title": "30. Global ordering",
      "diagram": null,
      "body": "<p>Across shards:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Shard A transaction at 10:00:00.001\nShard B transaction at 10:00:00.002\n</code></pre></div>\n<p>Clock skew and concurrent generation make a perfect global order difficult.</p>\n<p>Possible ordering fields:</p>\n<ul>\n<li>approximate timestamp</li>\n<li>time-ordered ID</li>\n<li>central sequence</li>\n<li>per-shard sequence plus merge ordering</li>\n<li>event-log offset</li>\n</ul>\n<p>A central sequence restores global order but becomes:</p>\n<ul>\n<li>a</li>\n</ul>\n<div class=\"callout warn\">\n<p>Extraction note: this chapter came from a ChatGPT reader page capped at 20,000 characters. It may need a later full-export verification pass.</p>\n</div>"
    }
  ],
  "keyTakeaways": [
    "Choose a stable high-cardinality shard key aligned with dominant access and isolation needs.",
    "Keep invariant-enforcing transactions inside one shard whenever possible.",
    "Design routing, topology versioning, scatter-gather limits, and global-data strategy explicitly.",
    "Plan for hot tenants and online resharding before the first shard fills.",
    "Sharding solves one-node limits by accepting substantial operational and query complexity."
  ]
};
