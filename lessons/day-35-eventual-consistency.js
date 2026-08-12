window.FULL_LESSONS = window.FULL_LESSONS || {};
window.FULL_LESSONS['day-35-eventual-consistency'] = {
  day: 35,
  title: 'Eventual Consistency',
  subtitle: 'Make temporary disagreement converge through durable propagation, versioning, idempotency, and repair.',
  tags: ['Outbox pattern', 'Idempotent consumers', 'Read models', 'Reconciliation', 'Stale reads'],
  core: 'Eventual consistency means copies or projections may temporarily disagree, but if new updates stop and communication continues, the system is designed to converge to a common state.',
  sections: [
    {
      title: '1. The mental model',
      diagram: `flowchart LR
        Source[(Authoritative DB)] --> Commit[Durable commit]
        Commit --> Outbox[(Outbox / CDC)]
        Outbox --> Bus[(Event bus)]
        Bus --> Projection[(Read model)]
        Bus --> Search[(Search index)]
        Bus --> Analytics[(Analytics)]
        Source -.reconciliation.-> Projection
        Source -.repair.-> Search`,
      body: `<p>The important word is not <em>eventual</em>. It is <strong>converge</strong>. A weak design says, "things may be stale for a while." A production design explains why divergence can happen, which copy is authoritative, how updates propagate, how duplicates and reordering are handled, and how drift is detected and repaired.</p>
      <div class="code-block"><span class="code-label">propagation path</span><pre>Authoritative write
  ↓
Durable commit
  ↓
Change publication
  ↓
Transport
  ↓
Consumer processing
  ↓
Projection update</pre></div>
      <p>Every arrow has latency and failure modes. Eventual consistency is the architecture around those arrows.</p>`
    },
    {
      title: '2. Authoritative source versus derived copies',
      body: `<p>Every eventually consistent design needs a clear source of truth.</p>
      <table><thead><tr><th>Copy</th><th>Role</th><th>Correctness rule</th></tr></thead><tbody><tr><td>Order database</td><td>Authoritative command model</td><td>Owns current order state.</td></tr><tr><td>Search index</td><td>Projection</td><td>Can be rebuilt from source/events.</td></tr><tr><td>Redis cache</td><td>Cache</td><td>May be stale and must not be authoritative.</td></tr><tr><td>Analytics warehouse</td><td>Projection</td><td>Optimized for history and reporting.</td></tr></tbody></table>
      <p>If the search index says <span class="inline-code">PAID</span> and the order database says <span class="inline-code">CANCELLED</span>, the design should already know which one wins. In most service-oriented systems, one service owns mutations and others maintain derived copies.</p>
      <div class="callout warn"><strong>Trap:</strong> if two systems silently claim to be source of truth, reconciliation becomes ambiguous. You no longer know whether to repair the projection or the command model.</div>`
    },
    {
      title: '3. Outbox: closing the dual-write gap',
      diagram: `sequenceDiagram
        participant API as Order API
        participant DB as Order DB
        participant Pub as Outbox publisher
        participant Bus as Event bus
        API->>DB: BEGIN
        API->>DB: UPDATE order status = PAID
        API->>DB: INSERT outbox event OrderPaid
        API->>DB: COMMIT
        Pub->>DB: read unpublished outbox row
        Pub->>Bus: publish OrderPaid
        Pub->>DB: mark published / advance checkpoint`,
      body: `<p>The classic bug is updating a database and then publishing an event as a separate step.</p>
      <div class="code-block"><span class="code-label">dangerous dual write</span><pre>orderRepository.markPaid(orderId);
kafkaTemplate.send("orders", event);</pre></div>
      <p>If the database commit succeeds and the process crashes before the Kafka publish, downstream systems may remain stale forever.</p>
      <p>The transactional outbox stores the business change and the event intent in the same local transaction:</p>
      <div class="code-block"><span class="code-label">outbox transaction</span><pre>BEGIN;

UPDATE orders
SET status = 'PAID', version = version + 1
WHERE order_id = :orderId;

INSERT INTO outbox(event_id, aggregate_id, event_type, payload)
VALUES (:eventId, :orderId, 'OrderPaid', :payload);

COMMIT;</pre></div>
      <p>A separate publisher can retry delivery because the event intent is durable. This turns "maybe publish" into an eventually deliverable workflow.</p>`
    },
    {
      title: '4. At-least-once delivery and idempotent consumers',
      diagram: `flowchart TD
        Event[Event evt-9821] --> Consumer
        Consumer --> Insert{INSERT processed_event}
        Insert -- inserted --> Apply[Apply projection update]
        Insert -- duplicate key --> Ack[Ack duplicate safely]
        Apply --> Commit[Commit consumer transaction]`,
      body: `<p>Outbox publication commonly produces at-least-once delivery. If the publisher sends an event and crashes before marking it published, the same event can be sent again after restart.</p>
      <p>Consumers should treat duplicates as normal.</p>
      <div class="code-block"><span class="code-label">dedupe table</span><pre>CREATE TABLE processed_event (
    consumer_name VARCHAR(100) NOT NULL,
    event_id      VARCHAR(100) NOT NULL,
    processed_at  TIMESTAMP NOT NULL,
    PRIMARY KEY (consumer_name, event_id)
);</pre></div>
      <p>The insertion of the processed-event row and the projection update should happen in one local transaction. Do not rely on application-only <span class="inline-code">alreadyProcessed()</span> checks unless the database also enforces uniqueness.</p>`
    },
    {
      title: '5. Out-of-order events and aggregate versions',
      diagram: `sequenceDiagram
        participant Bus
        participant Consumer
        participant Projection
        Bus->>Consumer: OrderCancelled v11
        Consumer->>Projection: update if source_version < 11
        Projection-->>Consumer: applied v11
        Bus->>Consumer: OrderPaid v10 arrives late
        Consumer->>Projection: update if source_version < 10
        Projection-->>Consumer: rejected as stale`,
      body: `<p>Consumers must handle reordering. If <span class="inline-code">ORDER_CANCELLED</span> version 11 is applied and a delayed <span class="inline-code">ORDER_PAID</span> version 10 arrives later, the old event must not overwrite the newer state.</p>
      <div class="code-block"><span class="code-label">version-aware projection update</span><pre>UPDATE order_projection
SET status = :status,
    source_version = :eventVersion
WHERE order_id = :orderId
  AND source_version < :eventVersion;</pre></div>
      <p>Aggregate versions protect projections from duplicates, stale events, retry-topic reordering, and concurrent consumer execution.</p>
      <div class="callout"><strong>Rule:</strong> the broker's ordering guarantee is not enough if the consumer submits work to a thread pool, uses retry topics, or allows multiple handlers for one aggregate to run concurrently.</div>`
    },
    {
      title: '6. State events versus delta events',
      body: `<p>The event shape determines how easy convergence is.</p>
      <table><thead><tr><th>Event style</th><th>Example</th><th>Trade-off</th></tr></thead><tbody><tr><td>Delta event</td><td><span class="inline-code">BalanceDecreasedBy(500)</span></td><td>Excellent audit semantics, but missing or reordering can corrupt a projection.</td></tr><tr><td>State event</td><td><span class="inline-code">OrderStatusChangedTo(CANCELLED, version=11)</span></td><td>Later versions can safely overwrite older versions for current-state projections.</td></tr></tbody></table>
      <p>For projections, carrying current state plus a source version is often easier to repair. For audit and domain history, deltas may be essential. Do not use one event style blindly for every purpose.</p>`
    },
    {
      title: '7. Missing events and reconciliation',
      diagram: `flowchart LR
        Source[(Authoritative source)] --> Sweep[Reconciliation job]
        Projection[(Projection)] --> Sweep
        Sweep --> Compare{source version > projection version?}
        Compare -- yes --> Repair[Repair projection]
        Compare -- no --> OK[No action]
        DLQ[(DLQ)] --> Sweep`,
      body: `<p>Retries are not enough. Bugs, schema mistakes, DLQs, manual edits, and long outages can produce permanent drift. Reconciliation independently compares authoritative state with derived state and repairs mismatches.</p>
      <div class="code-block"><span class="code-label">version drift example</span><pre>Authoritative order:
  order_id = 123
  status = CANCELLED
  version = 18

Search document:
  order_id = 123
  status = PAID
  source_version = 17

Repair:
  update search document to version 18.</pre></div>
      <p>Reconciliation can use full sweeps, sampled checks, partitioned checksums, version comparisons, replay tooling, or source-of-truth snapshots. A resilient eventually consistent system has both a normal propagation path and a repair path.</p>`
    },
    {
      title: '8. Read-your-writes and monotonic reads',
      diagram: `flowchart TD
        Write[User saves profile v28] --> Response[Return updated state / version token]
        Response --> NextRead[Next read requires at least v28]
        NextRead --> Projection{Projection at v28?}
        Projection -- yes --> Serve[Serve projection]
        Projection -- no --> Fallback[Wait briefly / read source / show processing]`,
      body: `<p>Pure eventual consistency can be technically correct but terrible UX. A user saves a change, lands on a stale page, and thinks the save failed.</p>
      <p>Common fixes:</p>
      <ul class="checklist"><li>Return the updated resource directly from the write response.</li><li>Temporarily pin that user's reads to the authoritative source.</li><li>Carry a consistency token or minimum version.</li><li>Use one sticky replica/projection when monotonic reads matter.</li><li>Show explicit <span class="inline-code">PROCESSING</span> states for workflows that genuinely take time.</li></ul>
      <p>Read-your-writes and monotonic reads are weaker than full linearizability, but often enough for a good product experience.</p>`
    },
    {
      title: '9. Deletes, tombstones, and stale resurrection',
      body: `<p>Deletes are harder than updates. If you delete a projection row and then an old delayed update arrives, a naive consumer may recreate the deleted record.</p>
      <div class="code-block"><span class="code-label">tombstone idea</span><pre>user_id = 123
deleted = true
deleted_version = 8

Ignore any UserUpdated event where version < 8.</pre></div>
      <p>For privacy-sensitive deletes, deletion propagation should have its own SLO and monitoring. Eventual consistency is not an excuse for deleted data to remain visible indefinitely in search, cache, CDN, analytics, or browser state.</p>`
    },
    {
      title: '10. Cache consistency races',
      diagram: `sequenceDiagram
        participant R as Slow reader
        participant W as Writer
        participant C as Cache
        participant DB as Database
        R->>C: miss
        R->>DB: read old V10
        W->>DB: commit V11
        W->>C: invalidate
        R->>C: stores stale V10 after invalidation`,
      body: `<p>Caches are part of the end-to-end consistency model. A stale cache refill can resurrect old state after a writer invalidated it.</p>
      <p>Mitigations include short TTLs, versioned cache values, rejecting older cache writes, event-driven invalidation, delayed second invalidation, or reading through a source that returns version information.</p>
      <div class="callout warn"><strong>Trap:</strong> a strongly consistent database does not give the application strong reads if stale caches, stale replicas, CDN, or browser state sit in front of it.</div>`
    },
    {
      title: '11. Freshness SLOs and observability',
      body: `<p>Do not leave "eventual" undefined. Give derived state a freshness target.</p>
      <div class="code-block"><span class="code-label">freshness SLO examples</span><pre>Order dashboard projection:
  99% of committed order updates visible within 10 seconds.

Search index:
  95% of profile updates searchable within 30 seconds.

Analytics warehouse:
  daily reports complete within 2 hours after close.</pre></div>
      <p>Useful signals include source-to-projection latency, oldest unprocessed event age, consumer lag, retry rate, DLQ depth, source version versus projection version, repair count, projection rebuild status, and percentage of writes visible within the freshness SLO.</p>
      <p>A meaningful alert says: <span class="inline-code">Order projection freshness P99 exceeded 10 seconds</span>, not merely <span class="inline-code">Kafka lag high</span>.</p>`
    },
    {
      title: '12. Wallet and payment system boundary',
      diagram: `flowchart TD
        Payment[(Authoritative payment DB)] --> Outbox[(Outbox)]
        Outbox --> Bus[(Event bus)]
        Bus --> OrderView[(Order read model)]
        Bus --> Search[(Search)]
        Bus --> Analytics[(Analytics)]
        Bus --> Notify[Notification]
        Payment --> Ledger[(Ledger / authoritative state)]`,
      body: `<p>For financial systems, eventual consistency usually belongs around projections, not around the invariant itself.</p>
      <table><thead><tr><th>Strong/current</th><th>Eventually consistent</th></tr></thead><tbody><tr><td>Ledger posting</td><td>Search document</td></tr><tr><td>Idempotency lookup</td><td>Customer timeline</td></tr><tr><td>Balance before debit</td><td>Analytics report</td></tr><tr><td>Refund state transition</td><td>Receipt notification</td></tr></tbody></table>
      <p>The authoritative financial state remains strongly controlled. Read models, notifications, reports, and search can converge asynchronously with reconciliation.</p>`
    },
    {
      title: '13. Production incidents to recognize',
      body: `<div class="mini-card"><h4>DLQ silently accumulates</h4><p>A schema change makes 1% of events fail. Main consumer lag is zero because bad events are parked, but 30,000 projection rows never update. Fix with DLQ alerts, replay tooling, and reconciliation.</p></div>
      <div class="mini-card"><h4>Retry topic breaks state order</h4><p>Version 8 fails and goes to retry. Version 9 applies. Ten minutes later version 8 retries and overwrites state. Fix with source-version checks.</p></div>
      <div class="mini-card"><h4>Consumer cannot catch up</h4><p>Producer emits 50k events/sec; consumer handles 45k/sec. Lag grows forever. This is not eventual convergence; capacity is mathematically insufficient.</p></div>
      <div class="mini-card"><h4>Cache resurrects stale state</h4><p>A slow reader loads V10, writer commits V11 and invalidates cache, then reader stores V10. Fix with version-aware cache writes or short TTL plus correction.</p></div>`
    },
    {
      title: '14. Interview-style answers',
      body: `<h4>Define eventual consistency</h4><p>Eventual consistency means copies or projections may temporarily diverge, but if updates stop and communication continues, the system is designed to converge. A strong design uses durable propagation, idempotent/version-aware consumers, and reconciliation.</p>
      <h4>How do you guarantee convergence?</h4><p>Couple source mutation and event intent using outbox or CDC, deliver durably, process idempotently, reject stale versions, and run reconciliation against the authoritative source.</p>
      <h4>How do you handle out-of-order events?</h4><p>Preserve per-aggregate ordering with a stable partition key when possible, but still include source versions because retries, parallelism, and replay can reorder effects.</p>
      <h4>When is eventual consistency a poor fit?</h4><p>It is risky for balances, idempotency, authorization, scarce inventory, token revocation, one-time coupon use, and other hard invariants unless the domain is explicitly redesigned around allocation or escrow.</p>`
    },
    {
      title: '15. Design checklist',
      body: `<ul class="checklist"><li>Identify the authoritative source.</li><li>Close the dual-write gap with outbox, CDC, or equivalent.</li><li>Assume duplicate delivery.</li><li>Make consumers idempotent.</li><li>Carry event IDs and source versions.</li><li>Reject stale projection updates atomically.</li><li>Preserve ordering only at the scope that needs it.</li><li>Handle retry-topic and DLQ effects explicitly.</li><li>Design delete/tombstone behavior.</li><li>Keep event schemas backward compatible.</li><li>Make derived stores rebuildable.</li><li>Run reconciliation, not just retries.</li><li>Define freshness SLOs.</li><li>Expose stale/pending states honestly in UX.</li><li>Do not use stale projections for financial or authorization invariants.</li></ul>`
    }
  ],
  keyTakeaways: [
    'Eventual consistency is a convergence strategy, not an excuse for stale data.',
    'A source mutation and its change notification must be durably coupled.',
    'Outbox or CDC prevents the classic database-commit/event-lost failure.',
    'Consumers should assume duplicates, reordering, retry, and replay.',
    'Source versions protect projections from stale overwrites.',
    'Reconciliation is the repair path that makes convergence trustworthy.',
    'Freshness should have an SLO, not an undefined eventually.',
    'Financial and authorization invariants usually stay on authoritative strong paths.',
    'Derived state such as search, analytics, notifications, and timelines can often converge asynchronously.'
  ],
  next: 'day-36-optimistic-locking'
};
