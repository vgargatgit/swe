window.FULL_LESSONS = window.FULL_LESSONS || {};
window.FULL_LESSONS['day-35-eventual-consistency'] = {
  day: 35,
  title: "Eventual Consistency",
  subtitle: "Design temporary divergence so authoritative state, projections, caches, and workflows measurably converge after failures.",
  tags: ["Convergence", "Transactional outbox", "Idempotent consumers", "Aggregate versions", "Reconciliation", "Freshness SLOs"],
  core: "Eventual consistency means that different copies or projections of the same logical state may temporarily disagree, but if new updates stop and communication continues, they are expected to converge to a common value.",
  sections: [
    {
      title: "1. Convergence, propagation, and authority",
      diagram: `flowchart LR
          Source[(Authoritative write)] --> Commit[Durable commit]
          Commit --> Publish[Change publication]
          Publish --> Bus[(Transport)]
          Bus --> Consumer[Consumer processing]
          Consumer --> Projection[(Projection update)]
          Source -. verify and repair .-> Projection`,
      body: `<p>The important word is not <strong>eventual</strong>. It is <strong>converge</strong>.</p>
<p>A weak design says:</p>
<div class="code-block"><span class="code-label">text</span><pre>Things may be stale for a while.
</pre></div><p>A production-quality eventually consistent design says:</p>
<div class="code-block"><span class="code-label">text</span><pre>We know why replicas can diverge.
We know which state is authoritative.
We know how updates propagate.
We know how duplicates and reordering are handled.
We know how divergence is detected.
We know how convergence is guaranteed.
We know how stale data affects user-visible behavior.
</pre></div><p>That is the difference between &quot;we use eventual consistency&quot; and actually designing an eventually consistent system.</p>
<h3>A simple example</h3>
<p>Suppose Order Service owns the authoritative order state:</p>
<div class="code-block"><span class="code-label">text</span><pre>Order Service DB

order 123
status = PAID
</pre></div><p>Order Service publishes:</p>
<div class="code-block"><span class="code-label">text</span><pre>OrderPaid(orderId=123)
</pre></div><p>Several downstream systems consume it:</p>
<div class="code-block"><span class="code-label">text</span><pre>Order Service
     │
     ├──► Search index
     ├──► Analytics
     ├──► Notification service
     └──► Customer dashboard read model
</pre></div><p>Immediately after the database transaction commits:</p>
<div class="code-block"><span class="code-label">text</span><pre>Order DB:
    PAID

Dashboard read model:
    PAYMENT_PENDING

Search:
    PAYMENT_PENDING

Analytics:
    PAYMENT_PENDING
</pre></div><p>A few hundred milliseconds later:</p>
<div class="code-block"><span class="code-label">text</span><pre>Order DB:
    PAID

Dashboard:
    PAID

Search:
    PAID

Analytics:
    PAID
</pre></div><p>During that propagation interval, the system is inconsistent.</p>
<p>That does not necessarily mean anything is wrong.</p>
<p>The question is whether that inconsistency is:</p>
<div class="code-block"><span class="code-label">text</span><pre>bounded
expected
observable
recoverable
</pre></div>
<h3>Eventual consistency is about propagation</h3>
<p>A useful mental model is:</p>
<div class="code-block"><span class="code-label">text</span><pre>Authoritative write
      ↓
Durable commit
      ↓
Change publication
      ↓
Transport
      ↓
Consumer processing
      ↓
Projection update
</pre></div><p>Latency can appear at every step:</p>
<div class="code-block"><span class="code-label">text</span><pre>transaction commit delay
outbox polling delay
broker delay
consumer backlog
consumer retry
database update latency
cache invalidation delay
replica replay delay
</pre></div><p>So when someone says:</p>
<div class="callout">
<p>&quot;The data is eventually consistent.&quot;</p>
</div>
<p>the next engineering question should be:</p>
<div class="callout">
<p><strong>What is the propagation path, and what is the expected convergence time at P50, P95, and P99?</strong></p>
</div>
<h3>Eventual consistency is not only about replicas</h3>
<p>Read replicas are one source:</p>
<div class="code-block"><span class="code-label">text</span><pre>Primary
    ↓ asynchronous replication
Replica
</pre></div><p>But eventual consistency also appears in:</p>
<div class="code-block"><span class="code-label">text</span><pre>caches
search indexes
CQRS read models
microservices
data warehouses
CDCs
Kafka consumers
materialized views
browser state
CDNs
mobile offline sync
</pre></div><p>Consider:</p>
<div class="code-block"><span class="code-label">text</span><pre>Database
    ↓
Kafka
    ↓
Search index
    ↓
Redis cache
    ↓
browser
</pre></div><p>Each layer can introduce additional staleness.</p>
<p>The user sees the consistency properties of the <strong>entire path</strong>, not just the database.</p>
<h3>The authoritative source</h3>
<p>Every eventually consistent architecture should answer:</p>
<div class="code-block"><span class="code-label">text</span><pre>Which copy is truth?
</pre></div><p>Example:</p>
<div class="code-block"><span class="code-label">text</span><pre>Order DB
    authoritative

Elasticsearch
    projection

Redis
    cache

Analytics warehouse
    projection
</pre></div><p>If Elasticsearch says:</p>
<div class="code-block"><span class="code-label">text</span><pre>PAID
</pre></div><p>and the Order DB says:</p>
<div class="code-block"><span class="code-label">text</span><pre>CANCELLED
</pre></div><p>you need a deterministic answer:</p>
<div class="code-block"><span class="code-label">text</span><pre>Order DB wins.
</pre></div><p>Without an authoritative source, reconciliation becomes ambiguous.</p>
<p>There are architectures where authority is distributed, such as CRDT-based systems, but that is an intentional design with merge semantics. Most service-oriented backend systems have clearer ownership:</p>
<div class="code-block"><span class="code-label">text</span><pre>one service owns writes
others maintain derived copies
</pre></div>
<h3>Eventual consistency versus asynchronous processing</h3>
<p>They are closely related but not identical.</p>
<p>Suppose Order Service writes:</p>
<div class="code-block"><span class="code-label">text</span><pre>status = PAID
</pre></div><p>and asynchronously asks Notification Service to send email.</p>
<p>The notification service may be behind.</p>
<p>That is eventual consistency of workflow state only if the notification system maintains state derived from the order event.</p>
<p>Asynchrony creates the conditions for temporary divergence, but eventual consistency additionally implies:</p>
<div class="code-block"><span class="code-label">text</span><pre>the derived state eventually converges
</pre></div><p>A lost event is not eventual consistency.</p>
<p>It is data loss.</p>`
    },
    {
      title: "2. Reliable publication with the outbox",
      diagram: `sequenceDiagram
          participant API as Order Service
          participant DB as Order DB
          participant Publisher as Outbox publisher
          participant Bus as Event bus
          API->>DB: BEGIN
          API->>DB: Update order and insert outbox row
          API->>DB: COMMIT
          Publisher->>DB: Read durable outbox row
          Publisher->>Bus: Publish event
          Bus-->>Publisher: Accepted
          Publisher->>DB: Mark published or advance checkpoint`,
      body: `<h3>The Outbox Pattern</h3>
<p>One of the most important implementation patterns is the transactional outbox.</p>
<p>A naïve flow:</p>
<div class="code-block"><span class="code-label">text</span><pre>1. Update database.
2. Publish Kafka event.
</pre></div><p>Example:</p>
<div class="code-block"><span class="code-label">java</span><pre>orderRepository.markPaid(orderId);
kafkaTemplate.send(&quot;orders&quot;, event);
</pre></div><p>Failure scenario:</p>
<div class="code-block"><span class="code-label">text</span><pre>DB commit succeeds
process crashes
Kafka publish never occurs
</pre></div><p>Now:</p>
<div class="code-block"><span class="code-label">text</span><pre>Order DB:
    PAID

Consumers:
    forever think PAYMENT_PENDING
</pre></div><p>That is not eventual consistency.</p>
<p>Convergence is broken.</p>
<p>Instead, write the business change and event intent in the same transaction:</p>
<div class="code-block"><span class="code-label">text</span><pre>BEGIN

UPDATE orders
SET status = 'PAID'
WHERE id = 123;

INSERT INTO outbox (
    event_id,
    aggregate_id,
    event_type,
    payload
)
VALUES (...);

COMMIT
</pre></div><p>Then a separate publisher reads the outbox:</p>
<div class="code-block"><span class="code-label">text</span><pre>Outbox
    ↓
Kafka
</pre></div><p>If publication fails:</p>
<div class="code-block"><span class="code-label">text</span><pre>retry later
</pre></div><p>Because the event record is durable, eventual delivery remains possible.</p>
<h3>Transactional outbox flow</h3>
<div class="code-block"><span class="code-label">text</span><pre>HTTP request
     ↓
Order Service
     ↓
Database transaction
     ├── update order
     └── insert outbox record
     ↓
COMMIT
     ↓
Outbox publisher
     ↓
Kafka
     ↓
Consumers
</pre></div><p>The crucial invariant is:</p>
<div class="code-block"><span class="code-label">text</span><pre>Either:
    order update + event intent commit together

or:
    neither commits
</pre></div><p>This closes the classic dual-write gap.</p>
<h3>Exactly-once is rarely the real guarantee</h3>
<p>Outbox publication often behaves like:</p>
<div class="code-block"><span class="code-label">text</span><pre>at least once
</pre></div><p>Suppose publisher:</p>
<div class="code-block"><span class="code-label">text</span><pre>1. Sends event.
2. Kafka accepts it.
3. Process crashes before marking outbox row published.
</pre></div><p>After restart:</p>
<div class="code-block"><span class="code-label">text</span><pre>same event is sent again
</pre></div><p>Consumers may see:</p>
<div class="code-block"><span class="code-label">text</span><pre>Event X
Event X
</pre></div><p>Therefore eventually consistent systems should generally assume:</p>
<div class="code-block"><span class="code-label">text</span><pre>duplicates can happen
</pre></div><p>and make consumers idempotent.</p>`
    }
  ]
};
