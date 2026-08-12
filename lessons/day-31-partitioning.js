window.FULL_LESSONS = window.FULL_LESSONS || {};
window.FULL_LESSONS['day-31-partitioning'] = {
  day: 31,
  title: 'Partitioning',
  subtitle: 'Split one logical table into physical pieces inside one database authority.',
  tags: ['Partitioning', 'Partition pruning', 'Range partitions', 'Hash partitions', 'Retention', 'PostgreSQL'],
  core: 'Partitioning is not magic speed. It is a way to divide one logical table into smaller physical pieces so the database can prune irrelevant data, simplify retention, and make large-table maintenance safer.',
  sections: [
    {
      title: '1. The mental model',
      diagram: `flowchart TD
        T[Logical table: payment_events] --> P1[payment_events_2026_01]
        T --> P2[payment_events_2026_02]
        T --> P3[payment_events_2026_03]
        Q[Query: WHERE created_at in February] -. partition pruning .-> P2
        Q -. skipped .-> P1
        Q -. skipped .-> P3`,
      body: `<p>Partitioning means the application sees one logical table, but the database stores the rows in multiple physical partitions.</p>
      <p>For example, a payment history table may be partitioned by month:</p>
      <div class="code-block"><span class="code-label">mental model</span><pre>payment_events
  payment_events_2026_01
  payment_events_2026_02
  payment_events_2026_03
  payment_events_2026_04</pre></div>
      <p>A query for February data can skip January, March, and April entirely if the predicate matches the partition key. That skipping is called partition pruning.</p>
      <div class="callout"><strong>Core idea:</strong> partitioning reduces work only when the query gives the database enough information to know which partitions are irrelevant.</div>`
    },
    {
      title: '2. Partitioning is not sharding',
      diagram: `flowchart LR
        subgraph OneDatabase[One database authority]
          Parent[Logical table]
          Parent --> A[Partition A]
          Parent --> B[Partition B]
          Parent --> C[Partition C]
        end
        App[Application] --> Parent`,
      body: `<p>Partitioning and sharding both divide data, but they solve different problems.</p>
      <table><thead><tr><th>Concept</th><th>What it means</th><th>What it gives you</th></tr></thead><tbody><tr><td>Partitioning</td><td>One logical table split inside one database system.</td><td>Better pruning, maintenance, retention, and sometimes query performance.</td></tr><tr><td>Sharding</td><td>One logical dataset split across independent database nodes.</td><td>More storage/write capacity beyond one database machine.</td></tr><tr><td>Replication</td><td>Multiple copies of the same data.</td><td>Availability, durability, and read scaling with consistency trade-offs.</td></tr></tbody></table>
      <p>Partitioning usually preserves one database authority, one transaction boundary, one connection endpoint, and one catalog. Sharding introduces routing, cross-shard queries, cross-shard transactions, and resharding complexity.</p>
      <div class="callout warn"><strong>Trap:</strong> partitioning a huge table does not automatically give you more write capacity if all partitions live on the same database server and the same disk/CPU bottlenecks remain.</div>`
    },
    {
      title: '3. Partitioning strategies',
      body: `<p>The common partitioning strategies are range, list, and hash.</p>
      <table><thead><tr><th>Strategy</th><th>Example</th><th>Good for</th><th>Common trap</th></tr></thead><tbody><tr><td>Range</td><td>created_at by month</td><td>Time-series data, retention, queries by date range</td><td>Current partition can become the only hot write target</td></tr><tr><td>List</td><td>region IN ('IN', 'US', 'EU')</td><td>Explicit categories, compliance boundaries, business domains</td><td>Too many category values can create partition explosion</td></tr><tr><td>Hash</td><td>hash(tenant_id) into 32 partitions</td><td>Even spread when range/list do not match workload</td><td>Range queries still touch many partitions</td></tr><tr><td>Composite</td><td>month range, then tenant hash</td><td>Large time-series + skew control</td><td>Operational complexity and too many partitions</td></tr></tbody></table>
      <p>Range partitioning by time is common because data naturally ages. New writes go into recent partitions, most queries ask for bounded windows, and old data can be archived or dropped partition-by-partition.</p>`
    },
    {
      title: '4. Partition pruning',
      diagram: `flowchart TD
        SQL[SQL predicate] --> HasKey{Predicate uses partition key?}
        HasKey -- yes --> Prune[Database scans only matching partitions]
        HasKey -- no --> All[Database may scan every partition]
        HasKey -- function/cast hides key --> All
        Prune --> Fast[Less data touched]
        All --> Slow[Planning + scanning many partitions]`,
      body: `<p>Partition pruning is the main performance benefit. The database avoids partitions that cannot possibly contain matching rows.</p>
      <div class="code-block"><span class="code-label">prunable</span><pre>SELECT *
FROM payment_events
WHERE created_at >= '2026-02-01'
  AND created_at <  '2026-03-01';</pre></div>
      <div class="code-block"><span class="code-label">often not prunable</span><pre>SELECT *
FROM payment_events
WHERE date(created_at) = '2026-02-10';</pre></div>
      <p>In the second query, the function on <span class="inline-code">created_at</span> can prevent the planner from using partition boundaries cleanly. The exact behavior depends on the database, but the safe rule is: keep partition-key predicates simple and explicit.</p>
      <div class="callout"><strong>Practice:</strong> always verify pruning with <span class="inline-code">EXPLAIN</span>. Do not assume partitions were skipped just because a partition key exists.</div>`
    },
    {
      title: '5. Partition key selection',
      body: `<p>The partition key should match the dominant access pattern and lifecycle requirement.</p>
      <p>Good questions:</p>
      <ul>
        <li>Do most large queries include a time range?</li>
        <li>Do we need to delete/archive old data cheaply?</li>
        <li>Does one tenant, region, or product need isolation?</li>
        <li>Will the partition key be available in ORM-generated queries?</li>
        <li>Will all writes hit the same partition?</li>
        <li>Will common point lookups have to scan every partition?</li>
      </ul>
      <p>A table partitioned by <span class="inline-code">created_at</span> helps queries like:</p>
      <div class="code-block"><span class="code-label">good fit</span><pre>WHERE created_at >= :from
  AND created_at <  :to</pre></div>
      <p>It may not help a query like:</p>
      <div class="code-block"><span class="code-label">bad fit</span><pre>WHERE payment_id = :paymentId</pre></div>
      <p>unless each partition also has an index on <span class="inline-code">payment_id</span>, and even then the database may need to check many partitions if it cannot infer the date.</p>`
    },
    {
      title: '6. Partitioning and indexes',
      diagram: `flowchart TD
        Parent[Partitioned table] --> P1[Partition Jan]
        Parent --> P2[Partition Feb]
        Parent --> P3[Partition Mar]
        P1 --> I1[Index on Jan]
        P2 --> I2[Index on Feb]
        P3 --> I3[Index on Mar]`,
      body: `<p>Partitioning does not remove the need for indexes. It only narrows which physical pieces the database has to consider.</p>
      <p>Think of the query path as two steps:</p>
      <ol><li>Use the partition key to eliminate irrelevant partitions.</li><li>Use indexes inside the remaining partitions to find rows efficiently.</li></ol>
      <p>If a query lands in one monthly partition but still has to scan 800 million rows inside that partition, you still have a problem.</p>
      <div class="callout warn"><strong>Trap:</strong> people partition a table and then drop or ignore useful indexes. Partitioning and indexing solve different parts of the access path.</div>
      <p>Indexes may be local to each partition or global depending on database support. Local indexes are operationally simpler for detach/drop operations, but global uniqueness and global lookup can become harder.</p>`
    },
    {
      title: '7. Unique constraints are tricky',
      body: `<p>Partitioning complicates uniqueness. A database can easily enforce uniqueness inside one partition, but global uniqueness across all partitions is harder unless the partition key is part of the unique constraint or the database supports global indexes.</p>
      <p>Example:</p>
      <div class="code-block"><span class="code-label">local uniqueness risk</span><pre>UNIQUE(operation_id)</pre></div>
      <p>If the table is partitioned by month, the same <span class="inline-code">operation_id</span> might appear in two different months unless the database can enforce the constraint globally.</p>
      <p>Safer alternatives include:</p>
      <ul>
        <li>Include the partition key in the unique constraint when that matches the business invariant.</li>
        <li>Use a separate global idempotency table for operation IDs.</li>
        <li>Keep current-state/idempotency data in a non-partitioned authority table.</li>
        <li>Use a database that supports the required global index/constraint semantics.</li>
      </ul>
      <div class="callout danger"><strong>Financial-system trap:</strong> do not let partition-local uniqueness accidentally permit duplicate payment or wallet operations across partitions.</div>`
    },
    {
      title: '8. Retention is a major reason to partition',
      diagram: `flowchart LR
        Old[Old monthly partition] --> Detach[Detach partition]
        Detach --> Archive[Archive to object storage]
        Archive --> Drop[Drop from OLTP database]
        Current[Current partition] --> Active[Serve live queries]`,
      body: `<p>For very large tables, deleting old rows with ordinary <span class="inline-code">DELETE</span> can be expensive. It creates write-ahead log traffic, vacuum/bloat work, long transactions, replication pressure, and locks.</p>
      <p>With time partitioning, old data can often be retired by dropping or detaching a partition:</p>
      <div class="code-block"><span class="code-label">conceptual lifecycle</span><pre>1. Stop writing to old partition.
2. Detach partition from live table.
3. Archive/export if required.
4. Validate archive.
5. Drop detached partition.</pre></div>
      <p>This is one of the strongest practical reasons to partition append-heavy history tables such as audit logs, payment events, metrics, notifications, and chat-message metadata.</p>
      <div class="callout"><strong>Rule:</strong> if your main operational pain is retention, partitioning by time often gives more value than raw query speed.</div>`
    },
    {
      title: '9. Too many partitions',
      body: `<p>Partitioning has overhead. Every partition is another physical object with metadata, indexes, statistics, maintenance, and planning cost.</p>
      <p>Bad signs:</p>
      <ul>
        <li>Thousands of tiny partitions.</li>
        <li>Planning time becomes noticeable.</li>
        <li>Every index change touches hundreds of physical indexes.</li>
        <li>Automation is required just to keep future partitions created.</li>
        <li>Monitoring cannot tell which partition is hot or broken.</li>
      </ul>
      <p>Partition granularity should be chosen by data volume, query windows, retention policy, and maintenance cost. Daily partitions may be reasonable for enormous event tables; monthly partitions may be better for ordinary business history; yearly partitions may be enough for lower-volume archives.</p>`
    },
    {
      title: '10. Hot partitions and skew',
      diagram: `flowchart TD
        Writes[All new writes] --> Current[Current month partition]
        Current --> Hot[Hot index pages / hot storage / hot locks]
        Old1[Old partition] -. cold .-> Archive
        Old2[Older partition] -. cold .-> Archive`,
      body: `<p>Time-based partitioning often concentrates writes in the latest partition. That is fine for many systems, but it does not spread the write load across all partitions.</p>
      <p>Examples:</p>
      <ul>
        <li>All current payments write to <span class="inline-code">payment_events_2026_08</span>.</li>
        <li>All current chat messages write to today's or this month's partition.</li>
        <li>All current metrics write to the newest time bucket.</li>
      </ul>
      <p>If the latest partition becomes too hot, options include subpartitioning, hash partitioning inside time, queue-based smoothing, separate current-state tables, or sharding if the real bottleneck is beyond one database server.</p>
      <div class="callout warn"><strong>Trap:</strong> old partitions being cold does not make the current partition less hot.</div>`
    },
    {
      title: '11. Future partitions and default partitions',
      body: `<p>A production partitioned table needs automation for future partitions. If tomorrow's/month's partition does not exist, inserts can fail at midnight or route into a default catch-all partition.</p>
      <p>A default partition can be useful as a safety net, but it can also hide operational mistakes.</p>
      <table><thead><tr><th>Choice</th><th>Benefit</th><th>Risk</th></tr></thead><tbody><tr><td>No default partition</td><td>Bad dates/future-missing partitions fail fast.</td><td>An ops miss can break writes.</td></tr><tr><td>Default partition</td><td>Writes continue during boundary mistakes.</td><td>Rows pile into the wrong partition and pruning becomes worse.</td></tr></tbody></table>
      <p>Production checklist:</p>
      <ul>
        <li>Create future partitions ahead of time.</li>
        <li>Alert if the default partition receives rows.</li>
        <li>Test boundary timestamps exactly at midnight/month-end.</li>
        <li>Use half-open ranges: <span class="inline-code">&gt;= start</span> and <span class="inline-code">&lt; next_start</span>.</li>
      </ul>`
    },
    {
      title: '12. ORM and application concerns',
      body: `<p>Most applications query the parent table. The database routes inserts and performs pruning. But ORM-generated SQL can accidentally defeat partitioning.</p>
      <p>Watch for:</p>
      <ul>
        <li>Queries that omit the partition key.</li>
        <li>Functions or casts around the partition key.</li>
        <li>Pagination queries that span every partition.</li>
        <li>Count queries generated by framework pagination.</li>
        <li>Batch inserts not grouped by partition.</li>
        <li>Entity IDs that do not encode or accompany the partition key.</li>
      </ul>
      <p>For APIs, consider requiring a date range or business period on history endpoints. For example, payment history APIs often should not allow unbounded scans across years of partitions.</p>`
    },
    {
      title: '13. Backfill and repartitioning',
      body: `<p>Adding partitioning to an existing huge table is a migration project, not a small DDL tweak.</p>
      <p>A safe migration usually looks like:</p>
      <ol>
        <li>Create the new partitioned table.</li>
        <li>Dual-write or use change capture for new changes.</li>
        <li>Backfill historical data in bounded chunks.</li>
        <li>Validate row counts/checksums per partition.</li>
        <li>Cut reads over to the new table.</li>
        <li>Cut writes over completely.</li>
        <li>Keep rollback plan until confidence is high.</li>
      </ol>
      <p>Large repartitioning resembles a data migration with consistency guarantees. Treat it like one.</p>
      <div class="callout danger"><strong>Trap:</strong> doing a giant insert-select into a new partitioned table can overload WAL, replication, storage, caches, and lock management.</div>`
    },
    {
      title: '14. Payment / wallet ledger design',
      diagram: `flowchart TD
        Current[(wallet_current_balance)] --> Strong[Point lookup / invariant checks]
        Ledger[(wallet_ledger_entries partitioned by month)] --> History[History and statements]
        Ledger --> Archive[Retention / audit archive]
        Idem[(idempotency_operations)] --> Unique[Global operation uniqueness]
        Strong --> Tx[Debit transaction]
        Idem --> Tx
        Tx --> Ledger`,
      body: `<p>A practical wallet design usually separates current state from historical ledger data.</p>
      <p>For example:</p>
      <ul>
        <li><span class="inline-code">wallet_current_balance</span>: small, current, strongly protected, not partitioned by month.</li>
        <li><span class="inline-code">wallet_ledger_entries</span>: append-heavy history, partitioned by accounting month or business date.</li>
        <li><span class="inline-code">idempotency_operations</span>: global uniqueness for operation IDs.</li>
      </ul>
      <p>This avoids using a partitioned history table as the authority for current balance checks. The ledger remains auditable and manageable; current balance remains efficient and strongly guarded.</p>
      <div class="callout"><strong>Design principle:</strong> partition history for lifecycle and query windows; keep scarce-resource invariants in a clear authority table.</div>`
    },
    {
      title: '15. Production incidents to recognize',
      body: `<div class="mini-card"><h4>Missing future partition</h4><p>At midnight or month boundary, inserts start failing because the next partition was not created. Fix with scheduled partition creation, monitoring, and boundary tests.</p></div>
      <div class="mini-card"><h4>Pruning disabled by ORM SQL</h4><p>The table is partitioned by <span class="inline-code">created_at</span>, but the ORM emits <span class="inline-code">date(created_at)</span>. Queries scan many partitions. Fix predicates and verify with EXPLAIN.</p></div>
      <div class="mini-card"><h4>Too many tiny partitions</h4><p>Daily partitions were created for low-volume data. Planning and maintenance overhead dominate. Fix granularity or consolidate partitions.</p></div>
      <div class="mini-card"><h4>Global uniqueness broken</h4><p>An idempotency key is unique only within a monthly partition. A duplicate operation appears in another partition. Fix with global authority table or correct unique constraint semantics.</p></div>
      <div class="mini-card"><h4>Default partition becomes a junk drawer</h4><p>Bad timestamps or missing partitions route rows into default. Queries slow down and lifecycle rules fail. Alert on default partition row count.</p></div>`
    },
    {
      title: '16. Interview-style answers',
      body: `<h4>What is partitioning?</h4><p>Partitioning splits one logical table into multiple physical partitions inside the database. The application can still query the parent table, but the database can prune irrelevant partitions and manage old data more efficiently.</p>
      <h4>How is partitioning different from sharding?</h4><p>Partitioning is usually inside one database authority. Sharding splits data across independent database nodes and requires routing. Partitioning helps pruning and maintenance; sharding helps scale beyond one database node.</p>
      <h4>When does partitioning help performance?</h4><p>It helps when queries include the partition key so the database can skip irrelevant partitions. It does not help much when queries omit the partition key and still need to search every partition.</p>
      <h4>What are partitioning risks?</h4><p>Bad partition keys, missing future partitions, too many partitions, broken global uniqueness, disabled pruning, hot current partitions, ORM-generated unbounded queries, and complicated migrations.</p>`
    },
    {
      title: '17. Design checklist',
      body: `<ul class="checklist">
        <li>Identify the table's main pain: query speed, retention, maintenance, or write capacity.</li>
        <li>Confirm partitioning is the right solution, not sharding, indexing, archiving, or query rewriting.</li>
        <li>Choose a partition key that appears in the dominant large queries.</li>
        <li>Verify partition pruning with EXPLAIN.</li>
        <li>Keep partition-key predicates simple and half-open for time ranges.</li>
        <li>Design local/global indexes consciously.</li>
        <li>Check uniqueness semantics across partitions.</li>
        <li>Automate future partition creation.</li>
        <li>Monitor default partition row count if a default partition exists.</li>
        <li>Choose partition granularity based on volume and query windows.</li>
        <li>Plan retention through detach/archive/drop.</li>
        <li>Test boundary timestamps and late-arriving data.</li>
        <li>Separate current-state authority from historical partitioned tables where appropriate.</li>
        <li>Design a safe migration/backfill plan for existing large tables.</li>
      </ul>`
    }
  ],
  keyTakeaways: [
    'Partitioning splits one logical table inside one database authority.',
    'Partition pruning is the main query-performance benefit.',
    'Partitioning does not replace indexes.',
    'The partition key must match dominant query and lifecycle patterns.',
    'Time partitioning is especially useful for retention and archive workflows.',
    'Too many partitions create planning and maintenance overhead.',
    'Global uniqueness across partitions needs deliberate design.',
    'Current-state invariants often belong in separate authority tables, not only in partitioned history.',
    'Always verify pruning and query plans in the real database.'
  ]
};
