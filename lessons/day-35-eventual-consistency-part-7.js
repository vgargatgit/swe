window.FULL_LESSONS['day-35-eventual-consistency'].sections.push(
    {
      title: "13. Retry, replay, and time semantics",
      diagram: `flowchart TD
          Event[Event processing fails] --> Classify{Failure type}
          Classify -- transient --> Retry[Backoff and jitter]
          Classify -- poison or schema --> Park[Park or DLQ]
          Retry --> Budget{Retry budget left?}
          Budget -- yes --> Event
          Budget -- no --> Park
          Park --> Repair[Replay only after safe repair]`,
      body: `<h3>Retry strategy</h3>
<p>A consumer retry policy might be:</p>
<div class="code-block"><span class="code-label">text</span><pre>transient DB/network error
    exponential backoff + jitter

validation/schema error
    do not retry indefinitely

dependency outage
    bounded retry, then park/DLQ

duplicate
    idempotently acknowledge
</pre></div><p>Infinite immediate retry can block a partition forever.</p>
<p>A poison event at the head of an ordered stream may stop all later state transitions for that aggregate or partition.</p>
<p>You need an explicit policy for that trade-off.</p>
<h3>Ordered stream versus availability</h3>
<p>Suppose event 100 fails.</p>
<p>Two choices:</p>
<div class="code-block"><span class="code-label">text</span><pre>Stop partition.
Preserve strict order.
Later events wait.
</pre></div><p>or:</p>
<div class="code-block"><span class="code-label">text</span><pre>Skip 100.
Process 101 onward.
Availability improves.
State may be inconsistent.
</pre></div><p>This is a small-scale version of the same consistency/availability tension you've seen in CAP.</p>
<p>There is no universal answer.</p>
<p>For wallet ledger updates:</p>
<div class="code-block"><span class="code-label">text</span><pre>preserve order
</pre></div><p>For analytics events:</p>
<div class="code-block"><span class="code-label">text</span><pre>skip/park and continue
</pre></div><p>may be better.</p>
<h3>Replay safety</h3>
<p>If you replay events from six months ago, consumers must not trigger unintended side effects again.</p>
<p>Example dangerous consumer:</p>
<div class="code-block"><span class="code-label">text</span><pre>PaymentCaptured
    ↓
send payment to external provider
</pre></div><p>Replaying history could charge customers again.</p>
<p>Distinguish:</p>
<div class="code-block"><span class="code-label">text</span><pre>domain events
</pre></div><p>from:</p>
<div class="code-block"><span class="code-label">text</span><pre>commands to perform side effects
</pre></div><p>Projection consumers should ideally be replay-safe.</p>
<p>External side effects require idempotency keys or separate workflow semantics.</p>
<h3>Event timestamps versus processing timestamps</h3>
<p>An event may contain:</p>
<div class="code-block"><span class="code-label">text</span><pre>occurredAt
publishedAt
receivedAt
processedAt
</pre></div><p>These are different.</p>
<p>Suppose event occurred:</p>
<div class="code-block"><span class="code-label">text</span><pre>10:00
</pre></div><p>but consumer processes:</p>
<div class="code-block"><span class="code-label">text</span><pre>10:30
</pre></div><p>Analytics by event time should count:</p>
<div class="code-block"><span class="code-label">text</span><pre>10:00
</pre></div><p>not processing time.</p>
<p>But operational lag monitoring uses:</p>
<div class="code-block"><span class="code-label">text</span><pre>processedAt - committedAt
</pre></div><p>Clearly distinguish business time from system-processing time.</p>`
    },
    {
      title: "14. Conflict resolution and source ownership",
      diagram: `flowchart TD
          Owner[Single authoritative owner] --> Version[Aggregate version]
          Version --> Event[Event carries source version]
          Event --> Projection[(Projection stores source version)]
          Old[Older event] --> Reject[Atomic stale-version rejection]
          Projection --> Reconcile[Reconciliation]
          Owner --> Reconcile`,
      body: `<h3>Clock skew</h3>
<p>If producer timestamps are used to resolve conflicts:</p>
<div class="code-block"><span class="code-label">text</span><pre>Node A: 10:00:10
Node B: 10:00:05
</pre></div><p>but B's update happened later in reality, last-write-wins can choose incorrectly.</p>
<p>Version counters or logical ordering are often safer than wall-clock ordering for a single aggregate.</p>
<p>Clock Skew comes later in the course because this problem appears throughout distributed systems.</p>
<h3>Version vectors: intuition</h3>
<p>A scalar version works well with one authoritative writer:</p>
<div class="code-block"><span class="code-label">text</span><pre>1, 2, 3, 4
</pre></div><p>With multiple independent writers, concurrent versions can appear.</p>
<p>A version vector tracks knowledge per node.</p>
<p>Conceptually:</p>
<div class="code-block"><span class="code-label">text</span><pre>A:
    {A:3, B:1}

B:
    {A:2, B:2}
</pre></div><p>Neither necessarily dominates the other.</p>
<p>That tells us:</p>
<div class="code-block"><span class="code-label">text</span><pre>updates were concurrent
</pre></div><p>rather than pretending one clearly came after the other.</p>
<p>This is useful in multi-master/eventually consistent databases, though application-level service architectures often avoid needing it by maintaining single ownership per aggregate.</p>
<h3>Last-write-wins versus merge</h3>
<p>Suppose two devices update a contact.</p>
<p>Device A:</p>
<div class="code-block"><span class="code-label">text</span><pre>phone = new number
</pre></div><p>Device B:</p>
<div class="code-block"><span class="code-label">text</span><pre>address = Mumbai
</pre></div><p>Whole-object LWW may lose one update.</p>
<p>A field-level merge can preserve both.</p>
<p>For another field:</p>
<div class="code-block"><span class="code-label">text</span><pre>preferredLanguage
</pre></div><p>two conflicting values cannot both be merged.</p>
<p>Conflict resolution must be domain-specific.</p>
<p>Eventually consistent systems work best when data has meaningful merge semantics.</p>
<h3>Optimistic convergence</h3>
<p>One powerful pattern is:</p>
<div class="code-block"><span class="code-label">text</span><pre>single authoritative version
+
event version
+
consumer conditional update
+
reconciliation
</pre></div><p>For many backend systems, this avoids much of the complexity of fully decentralized conflict resolution.</p>
<p>Flow:</p>
<div class="code-block"><span class="code-label">text</span><pre>Source owns aggregate
version = 42

Event carries 42

Projection stores sourceVersion=42

Old event 41 arrives
    ignored

Future event 43 arrives
    applied

Reconciliation sees projection 42/source 43
    repairs if needed
</pre></div><p>This is simple, scalable, and auditable.</p>
<h3>Exactly-once effects versus exactly-once delivery</h3>
<p>Messaging infrastructure may advertise exactly-once processing semantics in some contexts.</p>
<p>But application effects may still span:</p>
<div class="code-block"><span class="code-label">text</span><pre>broker
database
external API
email
payment provider
</pre></div><p>Exactly-once delivery does not automatically make those side effects exactly once.</p>
<p>A safer mindset is:</p>
<div class="code-block"><span class="code-label">text</span><pre>at-least-once delivery
+
idempotent effects
+
deduplication
+
transactional boundaries
+
reconciliation
</pre></div><p>That survives more real-world failure cases.</p>
<h3>Eventual consistency and service ownership</h3>
<p>Bad architecture:</p>
<div class="code-block"><span class="code-label">text</span><pre>Order Service writes order.
Payment Service also directly updates order DB.
Shipping Service also directly updates order DB.
</pre></div><p>Now:</p>
<div class="code-block"><span class="code-label">text</span><pre>ownership unclear
</pre></div><p>and event convergence becomes difficult to reason about.</p>
<p>Better:</p>
<div class="code-block"><span class="code-label">text</span><pre>Order Service owns order state.

Other services:
    send commands/events
    maintain their own projections
</pre></div><p>Single-writer ownership dramatically simplifies consistency.</p>
<h3>The &quot;source of truth&quot; trap</h3>
<p>Sometimes teams say:</p>
<div class="code-block"><span class="code-label">text</span><pre>Kafka is source of truth.
</pre></div><p>Sometimes they say:</p>
<div class="code-block"><span class="code-label">text</span><pre>Database is source of truth.
</pre></div><p>Both can be valid, but the architecture must be explicit.</p>
<p>If Kafka is authoritative event log:</p>
<div class="code-block"><span class="code-label">text</span><pre>DB may be a projection
</pre></div><p>If relational DB is authoritative:</p>
<div class="code-block"><span class="code-label">text</span><pre>outbox event stream is derived
</pre></div><p>Do not let two systems both implicitly claim authority.</p>
<p>That makes recovery ambiguous.</p>`
    }
);
