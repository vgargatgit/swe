window.FULL_LESSONS['day-35-eventual-consistency'].sections.push(
    {
      title: "17. Design boundaries and interview reasoning",
      diagram: `flowchart LR
          Operation[Operation] --> Invariant{Would stale state violate a hard invariant?}
          Invariant -- yes --> Strong[Coordinate around authoritative state]
          Invariant -- no --> Cost{Is temporary staleness cheaper than coordination?}
          Cost -- yes --> Eventual[Use eventual consistency with repair]
          Cost -- no --> Strong`,
      body: `<h3>When eventual consistency is a poor fit</h3>
<p>It is usually a poor choice for operations where stale/conflicting state directly violates hard invariants.</p>
<p>Examples include:</p>
<div class="code-block"><span class="code-label">text</span><pre>spending current balance
unique username reservation
final inventory allocation
password/token revocation
authorization decisions
one-time coupon redemption
financial ledger posting
</pre></div><p>You can sometimes redesign these using allocation or escrow techniques, but the default should be stronger coordination around the invariant.</p>
<p>Use eventual consistency around derived state, not casually around the authority enforcing the invariant.</p>
<h3>Interview-style reasoning: define eventual consistency</h3>
<p>A strong answer is:</p>
<div class="callout">
<p>Eventual consistency means multiple copies or projections may temporarily diverge, but if updates stop and communication continues, the system is designed to converge. I would not rely only on asynchronous delivery; I would make the propagation durable, usually with an outbox or CDC, make consumers idempotent and version-aware, handle duplicates and out-of-order events, and provide reconciliation for permanent drift.</p>
<p>I would also define a freshness SLO so &quot;eventually&quot; has an operational meaning.</p>
</div>
<h3>Interview-style reasoning: how do you guarantee convergence?</h3>
<p>A strong answer covers several layers:</p>
<div class="callout">
<p>First, the authoritative mutation and change-publication intent must be durably coupled, for example through a transactional outbox or database CDC. The transport should support durable retries. Consumers should be idempotent, and stateful projections should use source versions so stale events cannot overwrite newer state.</p>
<p>Finally, I would run reconciliation against the authoritative source because retries alone do not protect against every bug or lost event. Convergence should have both a normal delivery path and a repair path.</p>
</div>
<h3>Interview-style reasoning: what about out-of-order events?</h3>
<p>A good answer:</p>
<div class="callout">
<p>If operations on the same aggregate require ordering, I would publish them using a stable partition key such as order ID so the broker preserves per-key order. I would still include an aggregate version because retry topics, concurrent processing, replay, and operational mistakes can reorder events after delivery. The projection should atomically reject any update with a version older than the one already applied.</p>
</div>
<h3>Interview-style reasoning: when would you use eventual consistency?</h3>
<div class="callout">
<p>I use it where temporary staleness has lower business cost than synchronous coordination, especially for search indexes, analytics, notifications, feeds, caches, and denormalized read models. I avoid relying on it for hard invariants such as balances, authorization, idempotency, and scarce-resource allocation unless the domain has explicitly been redesigned to preserve the invariant without global coordination.</p>
</div>
<h3>Interview-style reasoning: outbox versus direct Kafka publish</h3>
<div class="callout">
<p>Updating a database and then publishing Kafka creates a dual-write failure window: the database may commit and the process can crash before publishing. A transactional outbox stores the business change and event intent in the same local transaction. A separate publisher retries delivery. That normally gives at-least-once publication, so consumers still need deduplication and idempotency.</p>
</div>`
    },
    {
      title: "18. Practical architecture and production checklist",
      diagram: `flowchart TD
          Service[Payment Service] --> DB[(Authoritative payment DB)]
          DB --> PaymentRow[Payment row]
          DB --> OutboxRow[Outbox row]
          OutboxRow --> Bus[(Event bus)]
          Bus --> OrderView[Order view]
          Bus --> Search[Search]
          Bus --> Analytics[Analytics]
          DB -. compare source versions .-> Repair[Reconciliation]
          Repair -. repair .-> OrderView
          Repair -. repair .-> Search`,
      body: `<h3>Practical architecture</h3>
<p>For a payments platform:</p>
<div class="code-block"><span class="code-label">text</span><pre>Payment Service
    authoritative payment DB
          │
          ├── payment row
          └── outbox row
                 │
                 ▼
              Kafka
        ┌────────┼─────────┐
        ▼        ▼         ▼
   Order view  Search   Analytics
        │
        ▼
Customer APIs
</pre></div><p>The authoritative financial state remains strongly controlled.</p>
<p>The derived systems can converge asynchronously.</p>
<p>Every event contains:</p>
<div class="code-block"><span class="code-label">text</span><pre>eventId
paymentId
sourceVersion
eventType
occurredAt
</pre></div><p>Consumers use:</p>
<div class="code-block"><span class="code-label">text</span><pre>unique event ID
source version
atomic projection update
retry
DLQ
reconciliation
</pre></div><p>That is a practical eventual-consistency architecture rather than merely an asynchronous one.</p>
<h3>Production checklist</h3>
<p>For an eventually consistent workflow, verify these points:</p>
<ul class="checklist">
<li>There is a clearly defined authoritative source and ownership boundary.</li>
<li>The source mutation cannot commit while silently losing the change notification; use outbox, CDC, or an equivalent durable mechanism.</li>
<li>Duplicate event delivery is expected and consumers are idempotent.</li>
<li>Events carry stable IDs and, where state ordering matters, an aggregate/source version.</li>
<li>The broker partition key preserves the ordering scope you actually need.</li>
<li>Consumer thread pools, retries, and retry topics cannot silently corrupt ordering.</li>
<li>Missing events, version gaps, poison events, and DLQ entries have an explicit recovery path.</li>
<li>Projection updates use atomic version checks rather than race-prone check-then-write logic.</li>
<li>Deletes have tombstone/version semantics so stale events cannot resurrect removed data.</li>
<li>Event schema evolution remains backward compatible.</li>
<li>Derived stores can be rebuilt from an authoritative snapshot plus change history.</li>
<li>Reconciliation independently detects drift and repairs it.</li>
<li>Freshness is expressed as a measurable SLO, not an undefined &quot;eventually.&quot;</li>
<li>User-facing flows use read-your-writes, monotonic reads, explicit pending states, or authoritative fallback where necessary.</li>
<li>Consumer capacity is high enough that backlog can actually converge after bursts.</li>
<li>Stale caches, replicas, search indexes, and browser state are all included in the end-to-end consistency model.</li>
<li>Security and financial invariants never depend on a stale projection unless the risk has been explicitly designed for.</li>
</ul>
<p>The deeper principle is:</p>
<div class="callout">
<p><strong>Eventual consistency is not the absence of consistency. It is a consistency strategy in which coordination is moved from the critical write path into durable propagation, versioning, idempotency, convergence, and repair.</strong></p>
</div>
<p>A well-designed eventually consistent system should be able to answer two questions very clearly:</p>
<div class="code-block"><span class="code-label">text</span><pre>How can these copies become different?

How do we know they will become the same again?
</pre></div><p>If the second answer is only:</p>
<div class="code-block"><span class="code-label">text</span><pre>&quot;Kafka will probably deliver it&quot;
</pre></div><p>the system does not yet have a complete consistency design.</p>
<p>The next topic is <strong>Optimistic Locking</strong>: lost updates, compare-and-swap, entity versions, JPA <span class="inline-code">@Version</span>, retry loops, write skew, optimistic concurrency in REST APIs with ETags/<span class="inline-code">If-Match</span>, contention trade-offs, and why optimistic locking prevents some concurrency anomalies but not all of them.</p>`
    }
);
