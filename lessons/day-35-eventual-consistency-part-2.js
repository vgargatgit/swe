window.FULL_LESSONS['day-35-eventual-consistency'].sections.push(
    {
      title: "3. Idempotency, ordering, versions, and gaps",
      diagram: `sequenceDiagram
          participant Bus
          participant Consumer
          participant Projection
          Bus->>Consumer: OrderCancelled version 11
          Consumer->>Projection: Apply if current version is lower
          Projection-->>Consumer: Stored version 11
          Bus->>Consumer: OrderPaid version 10 arrives late
          Consumer->>Projection: Apply if current version is lower
          Projection-->>Consumer: Rejected as stale`,
      body: `<h3>Idempotent consumers</h3>
<p>Suppose event:</p>
<div class="code-block"><span class="code-label">json</span><pre>{
  &quot;eventId&quot;: &quot;evt-9821&quot;,
  &quot;orderId&quot;: 123,
  &quot;type&quot;: &quot;OrderPaid&quot;
}
</pre></div><p>Consumer stores processed event IDs:</p>
<div class="code-block"><span class="code-label">sql</span><pre>CREATE TABLE processed_event (
    consumer_name VARCHAR(100) NOT NULL,
    event_id      VARCHAR(100) NOT NULL,
    processed_at  TIMESTAMP NOT NULL,

    PRIMARY KEY (consumer_name, event_id)
);
</pre></div><p>Consumer transaction:</p>
<div class="code-block"><span class="code-label">text</span><pre>BEGIN

INSERT processed_event(...)
    if already exists → duplicate → stop

UPDATE order_projection ...

COMMIT
</pre></div><p>The uniqueness constraint is the final concurrency-safe deduplication guard.</p>
<p>Application-only code such as:</p>
<div class="code-block"><span class="code-label">java</span><pre>if (!alreadyProcessed(eventId)) {
    process();
}
</pre></div><p>is race-prone unless the check and mutation are protected transactionally.</p>
<h3>Duplication is only one problem</h3>
<p>Consumers must also handle:</p>
<div class="code-block"><span class="code-label">text</span><pre>duplicates
out-of-order events
missing events
late events
poison events
consumer restart
partial processing
schema changes
</pre></div><p>This is where eventual consistency becomes much more interesting than &quot;read replica might be a little stale.&quot;</p>
<h3>Out-of-order delivery</h3>
<p>Suppose Order Service produces:</p>
<div class="code-block"><span class="code-label">text</span><pre>Event 10:
ORDER_PAID

Event 11:
ORDER_CANCELLED
</pre></div><p>But a consumer sees:</p>
<div class="code-block"><span class="code-label">text</span><pre>ORDER_CANCELLED
then
ORDER_PAID
</pre></div><p>Naïve projection:</p>
<div class="code-block"><span class="code-label">text</span><pre>CANCELLED
    ↓
PAID
</pre></div><p>The final state is wrong.</p>
<p>You need ordering information.</p>
<p>One approach:</p>
<div class="code-block"><span class="code-label">json</span><pre>{
  &quot;orderId&quot;: 123,
  &quot;version&quot;: 11,
  &quot;status&quot;: &quot;CANCELLED&quot;
}
</pre></div><p>Consumer stores:</p>
<div class="code-block"><span class="code-label">text</span><pre>lastVersion = 11
</pre></div><p>If version 10 later arrives:</p>
<div class="code-block"><span class="code-label">text</span><pre>10 &lt; 11
</pre></div><p>discard it.</p>
<h3>Aggregate versions</h3>
<p>An authoritative table might contain:</p>
<div class="code-block"><span class="code-label">text</span><pre>order_id
status
version
</pre></div><p>Updates increment:</p>
<div class="code-block"><span class="code-label">text</span><pre>version 7 → 8
</pre></div><p>Event:</p>
<div class="code-block"><span class="code-label">json</span><pre>{
  &quot;orderId&quot;: 123,
  &quot;version&quot;: 8,
  &quot;status&quot;: &quot;PAID&quot;
}
</pre></div><p>Projection performs:</p>
<div class="code-block"><span class="code-label">sql</span><pre>UPDATE order_projection
SET status = 'PAID',
    version = 8
WHERE order_id = 123
  AND version &lt; 8;
</pre></div><p>This handles:</p>
<div class="code-block"><span class="code-label">text</span><pre>duplicates
older events
some reordering
</pre></div><p>It does not automatically solve missing intermediate events if the projection requires them to calculate state.</p>
<h3>State events versus delta events</h3>
<p>Compare:</p>
<div class="code-block"><span class="code-label">text</span><pre>Delta event:
    BalanceDecreasedBy(₹500)
</pre></div><p>with:</p>
<div class="code-block"><span class="code-label">text</span><pre>State event:
    BalanceChangedTo(₹1500, version=91)
</pre></div><p>For projection recovery:</p>
<div class="code-block"><span class="code-label">text</span><pre>state event
</pre></div><p>can be easier because a later event can overwrite older state.</p>
<p>For audit semantics:</p>
<div class="code-block"><span class="code-label">text</span><pre>delta/event history
</pre></div><p>may be essential.</p>
<p>Often systems distinguish:</p>
<div class="code-block"><span class="code-label">text</span><pre>domain event
    describes what happened

projection update
    can derive current state
</pre></div><p>The choice affects replay and recovery behavior.</p>
<h3>Missing events</h3>
<p>Suppose a consumer sees:</p>
<div class="code-block"><span class="code-label">text</span><pre>version 101
version 103
</pre></div><p>but never:</p>
<div class="code-block"><span class="code-label">text</span><pre>102
</pre></div><p>If every event is an independent current-state snapshot:</p>
<div class="code-block"><span class="code-label">text</span><pre>103 may be sufficient
</pre></div><p>If events are deltas:</p>
<div class="code-block"><span class="code-label">text</span><pre>+10
-4
+7
</pre></div><p>missing one corrupts the result.</p>
<p>A robust consumer can detect gaps:</p>
<div class="code-block"><span class="code-label">text</span><pre>expected version 102
received 103
</pre></div><p>Then:</p>
<div class="code-block"><span class="code-label">text</span><pre>pause processing
fetch authoritative state
or
retrieve missing event
</pre></div><p>The recovery mechanism depends on the data model.</p>`
    },
    {
      title: "4. Reconciliation and anti-entropy",
      diagram: `flowchart LR
          Source[(Authoritative state)] --> Compare[Reconciliation job]
          Projection[(Derived state)] --> Compare
          Compare --> Match{Versions or checksums match?}
          Match -- yes --> Healthy[No repair]
          Match -- no --> Repair[Repair derived state]
          Repair --> Projection`,
      body: `<h3>Reconciliation</h3>
<p>This is one of the most important concepts in eventual consistency.</p>
<p>Do not assume propagation will always work perfectly.</p>
<p>Build a way to compare:</p>
<div class="code-block"><span class="code-label">text</span><pre>authoritative state
</pre></div><p>against:</p>
<div class="code-block"><span class="code-label">text</span><pre>derived state
</pre></div><p>Example:</p>
<div class="code-block"><span class="code-label">text</span><pre>Order DB:
    order 123 = CANCELLED version 18

Search index:
    order 123 = PAID version 17
</pre></div><p>A reconciliation job detects the mismatch and repairs it.</p>
<p>Conceptually:</p>
<div class="code-block"><span class="code-label">text</span><pre>Authoritative DB
        │
        ▼
Reconciliation job
        │
        ├── compare versions/checksums
        │
        ▼
Derived system
        │
        └── repair stale/missing records
</pre></div><p>Without reconciliation, transient failures can become permanent divergence.</p>
<h3>Anti-entropy</h3>
<p>In distributed-database terminology, systems may periodically compare replicas and repair differences.</p>
<p>This family of mechanisms is often called:</p>
<div class="code-block"><span class="code-label">text</span><pre>anti-entropy
</pre></div><p>Techniques include:</p>
<div class="code-block"><span class="code-label">text</span><pre>Merkle trees
version comparison
read repair
background synchronization
checksums
</pre></div><p>The principle is simple:</p>
<div class="callout">
<p>Do not depend solely on the original delivery path. Periodically verify that copies still agree.</p>
</div>
<p>This is just as useful in application-level architectures.</p>
<h3>Reconciliation by version</h3>
<p>A straightforward pattern is:</p>
<div class="code-block"><span class="code-label">text</span><pre>authoritative row:
    id
    version

projection:
    id
    source_version
</pre></div><p>Then query:</p>
<div class="code-block"><span class="code-label">text</span><pre>projection.source_version &lt; authoritative.version
</pre></div><p>and repair.</p>
<p>For large systems you may not compare every row continuously. Instead use:</p>
<div class="code-block"><span class="code-label">text</span><pre>incremental sweeps
partition-based reconciliation
sample checks
checksum ranges
failed-event queues
</pre></div>
<h3>Reconciliation is different from retry</h3>
<p>Retry says:</p>
<div class="code-block"><span class="code-label">text</span><pre>The operation just failed.
Try again.
</pre></div><p>Reconciliation says:</p>
<div class="code-block"><span class="code-label">text</span><pre>Regardless of why it happened,
detect that final state is wrong
and repair it.
</pre></div><p>You need both.</p>
<p>Retries handle expected transient failures.</p>
<p>Reconciliation handles:</p>
<div class="code-block"><span class="code-label">text</span><pre>bugs
lost messages
incorrect deployments
manual changes
long outages
unexpected edge cases
</pre></div><p>A resilient eventually consistent system assumes that drift will eventually happen.</p>`
    }
);
