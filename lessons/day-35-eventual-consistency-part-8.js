window.FULL_LESSONS['day-35-eventual-consistency'].sections.push(
    {
      title: "15. Monitoring and production incidents",
      diagram: `flowchart LR
          Source[Source versions] --> Freshness[Freshness metrics]
          Broker[Broker and consumer lag] --> Freshness
          Retry[Retry and DLQ age] --> Freshness
          Reconcile[Reconciliation mismatches] --> Freshness
          Freshness --> Alert[Business-impact alert]
          Alert --> Repair[Replay, scale, or repair]`,
      body: `<h3>Monitoring eventual consistency</h3>
<p>A production dashboard should make convergence visible. The most useful signals usually include source-to-projection propagation latency, broker or consumer lag, source version versus projection version, oldest unprocessed event age, DLQ depth, retry rate, reconciliation mismatch count, repair rate, stale-read fallback rate, projection rebuild status, and percentage of writes visible within your freshness SLO.</p>
<p>The best alert is often not:</p>
<div class="code-block"><span class="code-label">text</span><pre>Kafka lag &gt; 100,000
</pre></div><p>but:</p>
<div class="code-block"><span class="code-label">text</span><pre>99th percentile order-projection freshness
has exceeded 10 seconds for 5 minutes
</pre></div><p>That connects infrastructure to business impact.</p>
<h3>Production incident: cache resurrects stale state</h3>
<p>Timeline:</p>
<div class="code-block"><span class="code-label">text</span><pre>T1 cache miss
T2 reader loads V10 from DB
T3 writer commits V11
T4 writer invalidates cache
T5 slow reader stores V10 in cache
</pre></div><p>User now sees V10 for another five minutes.</p>
<p>Fix options include version-tagged cache writes:</p>
<div class="code-block"><span class="code-label">text</span><pre>only store V10 if cache/source has not advanced beyond 10
</pre></div><p>or use short TTL plus event-driven correction.</p>
<p>The important lesson is:</p>
<div class="callout">
<p>A stale write can arrive after the fresh write.</p>
</div>
<p>This is why ordering matters even in caching.</p>
<h3>Production incident: retry topic breaks state order</h3>
<p>Consumer receives:</p>
<div class="code-block"><span class="code-label">text</span><pre>OrderPaid version 8
</pre></div><p>processing fails.</p>
<p>Event goes to a 10-minute retry queue.</p>
<p>Meanwhile:</p>
<div class="code-block"><span class="code-label">text</span><pre>OrderCancelled version 9
</pre></div><p>processes successfully.</p>
<p>Ten minutes later version 8 retries and overwrites:</p>
<div class="code-block"><span class="code-label">text</span><pre>CANCELLED → PAID
</pre></div><p>Fix:</p>
<div class="code-block"><span class="code-label">text</span><pre>projection stores source version
rejects version 8 because current = 9
</pre></div><p>Retry infrastructure cannot be designed separately from state-version semantics.</p>
<h3>Production incident: DLQ silently accumulates</h3>
<p>A schema change makes 1% of events fail.</p>
<p>Consumers move them to DLQ and continue.</p>
<p>Three days later:</p>
<div class="code-block"><span class="code-label">text</span><pre>30,000 customer records
never updated
</pre></div><p>No one noticed because primary consumer lag was zero.</p>
<p>The system looked healthy.</p>
<p>Fix:</p>
<div class="code-block"><span class="code-label">text</span><pre>DLQ age/depth alerts
projection reconciliation
schema compatibility tests
replay tooling
</pre></div><p>A zero broker lag does not prove convergence.</p>
<h3>Production incident: consumer cannot catch up</h3>
<p>Incoming:</p>
<div class="code-block"><span class="code-label">text</span><pre>50k events/sec
</pre></div><p>Consumer capacity:</p>
<div class="code-block"><span class="code-label">text</span><pre>45k/sec
</pre></div><p>Lag grows:</p>
<div class="code-block"><span class="code-label">text</span><pre>5k/sec
</pre></div><p>The team keeps calling it:</p>
<div class="code-block"><span class="code-label">text</span><pre>eventual consistency
</pre></div><p>But convergence is mathematically impossible under current load.</p>
<p>Fix requires increasing processing capacity or reducing work, not merely waiting.</p>`
    },
    {
      title: "16. Spring implementation and projection migrations",
      diagram: `flowchart TD
          Event[Receive event] --> Dedupe{Insert processed event ID}
          Dedupe -- duplicate --> Ack[Acknowledge safely]
          Dedupe -- inserted --> Version{Source version newer?}
          Version -- no --> Ack
          Version -- yes --> Update[Atomic projection update]
          Update --> Commit[Commit one local transaction]
          Commit --> Ack`,
      body: `<h3>Implementation pattern in Spring</h3>
<p>A useful event consumer structure is:</p>
<div class="code-block"><span class="code-label">java</span><pre>@Transactional
public void handle(OrderStatusChanged event) {

    ProcessedEvent inserted =
            processedEventRepository.tryInsert(
                    &quot;order-projection&quot;,
                    event.eventId()
            );

    if (!inserted.created()) {
        return; // Duplicate delivery.
    }

    OrderProjection projection =
            projectionRepository.findById(event.orderId())
                    .orElseGet(() -&gt;
                            OrderProjection.empty(event.orderId()));

    if (event.version() &lt;= projection.getSourceVersion()) {
        return; // Duplicate or stale event.
    }

    projection.apply(
            event.status(),
            event.version()
    );

    projectionRepository.save(projection);
}
</pre></div><p>The important properties are:</p>
<div class="code-block"><span class="code-label">text</span><pre>deduplication
version check
projection update
</pre></div><p>inside the same local transaction.</p>
<p>If the transaction fails:</p>
<div class="code-block"><span class="code-label">text</span><pre>event is retried
</pre></div><p>and remains safe.</p>
<h3>Better SQL-level version enforcement</h3>
<p>Instead of application check-then-update:</p>
<div class="code-block"><span class="code-label">sql</span><pre>UPDATE order_projection
SET status = :status,
    source_version = :version
WHERE order_id = :orderId
  AND source_version &lt; :version;
</pre></div><p>Then:</p>
<div class="code-block"><span class="code-label">text</span><pre>rows updated = 0
</pre></div><p>means:</p>
<div class="code-block"><span class="code-label">text</span><pre>duplicate/stale event
</pre></div><p>The database enforces the ordering atomically.</p>
<p>This is safer under concurrent consumer execution.</p>
<h3>Projection bootstrap</h3>
<p>When creating a new consumer:</p>
<div class="code-block"><span class="code-label">text</span><pre>current source data = millions of records
</pre></div><p>do not necessarily replay every event ever produced.</p>
<p>A practical bootstrap:</p>
<div class="code-block"><span class="code-label">text</span><pre>Take source snapshot at log position P.
Load snapshot.
Start consuming events after P.
Catch up.
Enable traffic.
</pre></div><p>This avoids a long period where the new projection is years behind.</p>
<h3>Blue-green projection migration</h3>
<p>Suppose you need a new search schema.</p>
<p>Instead of modifying live projection in place:</p>
<div class="code-block"><span class="code-label">text</span><pre>Projection v1 serving users
Projection v2 rebuilding
</pre></div><p>Flow:</p>
<div class="code-block"><span class="code-label">text</span><pre>1. Create v2.
2. Snapshot/replay into v2.
3. Consume current events in parallel.
4. Verify v1 versus v2.
5. Switch reads to v2.
6. Retire v1.
</pre></div><p>Eventual consistency enables safe read-model migration when you have replayable change history.</p>`
    }
);
