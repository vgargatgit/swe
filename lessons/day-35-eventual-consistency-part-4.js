window.FULL_LESSONS['day-35-eventual-consistency'].sections.push(
    {
      title: "7. Deletes, tombstones, and schema evolution",
      diagram: `flowchart TD
          Delete[UserDeleted version 8] --> Tombstone[(Tombstone version 8)]
          Old[Late UserUpdated version 7] --> Check{Event version newer than tombstone?}
          Tombstone --> Check
          Check -- no --> Ignore[Ignore stale resurrection]
          Check -- yes --> Apply[Apply newer state]`,
      body: `<h3>Delete events and tombstones</h3>
<p>Deletes are tricky.</p>
<p>Suppose authoritative DB deletes user 123.</p>
<p>Projection receives:</p>
<div class="code-block"><span class="code-label">text</span><pre>UserDeleted(123)
</pre></div><p>and removes the record.</p>
<p>Later an old delayed event arrives:</p>
<div class="code-block"><span class="code-label">text</span><pre>UserUpdated(123, version=7)
</pre></div><p>Naïve consumer recreates the user.</p>
<p>A tombstone can store:</p>
<div class="code-block"><span class="code-label">text</span><pre>user_id = 123
deleted_version = 8
</pre></div><p>Any event:</p>
<div class="code-block"><span class="code-label">text</span><pre>version &lt; 8
</pre></div><p>is ignored.</p>
<p>Deleting the derived row entirely may discard the information needed to reject stale updates.</p>
<h3>Soft deletes and projections</h3>
<p>For eventual systems, soft-delete/version state can simplify ordering:</p>
<div class="code-block"><span class="code-label">text</span><pre>id = 123
version = 8
deleted = true
</pre></div><p>Projection retains:</p>
<div class="code-block"><span class="code-label">text</span><pre>latest version
+
deletion marker
</pre></div><p>Eventually tombstones may be garbage-collected once the system can guarantee that no older events remain.</p>
<p>That guarantee is harder than it sounds in long-retention messaging systems.</p>
<h3>Event schema evolution</h3>
<p>Suppose consumer expects:</p>
<div class="code-block"><span class="code-label">json</span><pre>{
  &quot;orderId&quot;: 123,
  &quot;status&quot;: &quot;PAID&quot;
}
</pre></div><p>Producer deploys:</p>
<div class="code-block"><span class="code-label">json</span><pre>{
  &quot;orderId&quot;: 123,
  &quot;paymentStatus&quot;: &quot;PAID&quot;
}
</pre></div><p>Old consumers break.</p>
<p>Events can remain in queues for:</p>
<div class="code-block"><span class="code-label">text</span><pre>hours
days
weeks
</pre></div><p>so producers and consumers may run different versions.</p>
<p>Use backward-compatible evolution:</p>
<div class="code-block"><span class="code-label">text</span><pre>add fields
do not rename/remove immediately
provide defaults
version schemas when necessary
</pre></div><p>Schema compatibility is part of convergence.</p>
<p>If consumers cannot interpret events, state stops converging.</p>`
    },
    {
      title: "8. Rebuildable projections and CQRS",
      diagram: `flowchart LR
          Source[(Authoritative source)] --> Snapshot[Snapshot at position P]
          Snapshot --> NewProjection[(New projection)]
          Log[(Events after P)] --> CatchUp[Catch up]
          CatchUp --> NewProjection
          NewProjection --> Verify[Verify against source]
          Verify --> Switch[Switch read traffic]`,
      body: `<h3>Full-state rebuild</h3>
<p>A powerful property of an event-driven projection is the ability to rebuild it.</p>
<p>Suppose Elasticsearch becomes corrupted.</p>
<p>Instead of manually fixing thousands of documents:</p>
<div class="code-block"><span class="code-label">text</span><pre>drop/recreate index
replay authoritative event history
</pre></div><p>or:</p>
<div class="code-block"><span class="code-label">text</span><pre>scan authoritative DB
rebuild projection
then consume newer events
</pre></div><p>This is one reason derived state should not become an undocumented second source of truth.</p>
<p>You want:</p>
<div class="code-block"><span class="code-label">text</span><pre>derived store can be recreated
</pre></div><p>where practical.</p>
<h3>Snapshot plus catch-up</h3>
<p>For huge datasets, replaying years of history may take too long.</p>
<p>Use:</p>
<div class="code-block"><span class="code-label">text</span><pre>T0:
take authoritative snapshot

T1:
record event/log position

Bulk load snapshot

Replay events after recorded position

Catch up

Switch traffic
</pre></div><p>This is the same underlying pattern used in:</p>
<div class="code-block"><span class="code-label">text</span><pre>replica creation
resharding
search reindexing
CDC initialization
</pre></div><p>Snapshot plus incremental change capture is a general distributed-systems technique.</p>
<h3>CQRS</h3>
<p>Eventual consistency frequently appears with CQRS:</p>
<div class="code-block"><span class="code-label">text</span><pre>Command side
    authoritative transactional model

Query side
    optimized projections
</pre></div><p>Example:</p>
<div class="code-block"><span class="code-label">text</span><pre>Command DB:
    normalized order/payment tables

Query projection:
    customer_order_summary
</pre></div><p>Write:</p>
<div class="code-block"><span class="code-label">text</span><pre>Command
    ↓
transaction
    ↓
event
    ↓
projection updater
</pre></div><p>Read:</p>
<div class="code-block"><span class="code-label">text</span><pre>Query API
    ↓
projection
</pre></div><p>Advantages:</p>
<div class="code-block"><span class="code-label">text</span><pre>different read schema
cheap denormalized queries
independent scaling
</pre></div><p>Trade-offs:</p>
<div class="code-block"><span class="code-label">text</span><pre>staleness
extra infrastructure
event/replay complexity
debugging
operational burden
</pre></div><p>CQRS is valuable when read and write models genuinely benefit from separation, not as a default architecture.</p>
<h3>Denormalized read models</h3>
<p>Suppose API needs:</p>
<div class="code-block"><span class="code-label">text</span><pre>orderId
customerName
paymentStatus
shipmentStatus
itemCount
totalAmount
</pre></div><p>Instead of live joins across services:</p>
<div class="code-block"><span class="code-label">text</span><pre>Order DB
Customer service
Payment service
Shipment service
</pre></div><p>maintain:</p>
<div class="code-block"><span class="code-label">text</span><pre>order_summary
</pre></div><p>through events.</p>
<p>Read becomes:</p>
<div class="code-block"><span class="code-label">sql</span><pre>SELECT *
FROM order_summary
WHERE order_id = ?;
</pre></div><p>This is fast and operationally independent.</p>
<p>But the projection may temporarily show:</p>
<div class="code-block"><span class="code-label">text</span><pre>paymentStatus = PAID
shipmentStatus = OLD_VALUE
</pre></div><p>The API must tolerate these transitional states.</p>`
    }
);
