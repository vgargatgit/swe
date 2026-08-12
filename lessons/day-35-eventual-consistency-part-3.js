window.FULL_LESSONS['day-35-eventual-consistency'].sections.push(
    {
      title: "5. User-visible consistency guarantees",
      diagram: `flowchart TD
          Write[Write commits version 42] --> Response[Return state and version 42]
          Response --> Read[Next read requires at least version 42]
          Read --> Ready{Projection at version 42?}
          Ready -- yes --> Serve[Serve projection]
          Ready -- no --> Choice[Wait, read authority, or return processing]`,
      body: `<h3>Read-your-writes</h3>
<p>Pure eventual consistency can create a terrible user experience.</p>
<p>User changes:</p>
<div class="code-block"><span class="code-label">text</span><pre>Display name:
Vikas → Vik
</pre></div><p>Server commits successfully.</p>
<p>UI redirects to profile page, which reads a stale projection:</p>
<div class="code-block"><span class="code-label">text</span><pre>Vikas
</pre></div><p>User thinks:</p>
<div class="code-block"><span class="code-label">text</span><pre>Save failed.
</pre></div><p>The system is technically working as designed but product behavior is bad.</p>
<p>Several strategies improve this.</p>
<p>You can return the newly written state directly from the command response:</p>
<div class="code-block"><span class="code-label">json</span><pre>{
  &quot;name&quot;: &quot;Vik&quot;,
  &quot;version&quot;: 28
}
</pre></div><p>and let the UI use that rather than immediately re-reading a stale projection.</p>
<p>You can also temporarily route reads to the authoritative store, or use a consistency token indicating the minimum version required.</p>
<h3>Consistency tokens</h3>
<p>Write response:</p>
<div class="code-block"><span class="code-label">json</span><pre>{
  &quot;orderId&quot;: 123,
  &quot;version&quot;: 42
}
</pre></div><p>Subsequent read asks:</p>
<div class="code-block"><span class="code-label">text</span><pre>I require at least version 42.
</pre></div><p>Projection currently has:</p>
<div class="code-block"><span class="code-label">text</span><pre>version 40
</pre></div><p>The service can:</p>
<div class="code-block"><span class="code-label">text</span><pre>wait briefly
read authoritative source
return &quot;processing&quot;
</pre></div><p>When projection reaches:</p>
<div class="code-block"><span class="code-label">text</span><pre>42
</pre></div><p>it is safe to serve.</p>
<p>This gives stronger user-facing consistency without making every read globally strongly consistent.</p>
<h3>Monotonic reads</h3>
<p>Another useful property:</p>
<div class="callout">
<p>Once a user has observed version 42, do not later show version 40.</p>
</div>
<p>This is <strong>monotonic reads</strong>.</p>
<p>It can be violated when:</p>
<div class="code-block"><span class="code-label">text</span><pre>Read 1 → Replica A → version 42
Read 2 → Replica B → version 40
</pre></div><p>Possible fixes include:</p>
<div class="code-block"><span class="code-label">text</span><pre>sticky replica
minimum version token
primary pinning
version-aware routing
</pre></div><p>This is weaker than full linearizability but often enough for good UX.</p>
<h3>Causal consistency</h3>
<p>Suppose user performs:</p>
<div class="code-block"><span class="code-label">text</span><pre>1. Create comment.
2. Like that comment.
</pre></div><p>A downstream observer should not see:</p>
<div class="code-block"><span class="code-label">text</span><pre>Like exists
Comment does not exist
</pre></div><p>because the like causally depends on the comment.</p>
<p>Causal consistency attempts to preserve such relationships.</p>
<p>In service architectures, you often approximate this by preserving:</p>
<div class="code-block"><span class="code-label">text</span><pre>ordering per aggregate
</pre></div><p>and ensuring dependent work follows the same event stream or version chain.</p>
<p>You usually do not need globally ordered events.</p>
<p>You need the right causal relationships to be preserved.</p>`
    },
    {
      title: "6. Ordering across partitions, threads, retries, and DLQs",
      diagram: `flowchart LR
          E1[Order 123 events] --> P4[Partition 4]
          E2[Order 456 events] --> P1[Partition 1]
          P4 --> Lane4[Serial lane for partition 4]
          P1 --> Lane1[Serial lane for partition 1]
          Lane4 --> V4[Version-aware projection]
          Lane1 --> V1[Version-aware projection]
          DLQ[(DLQ)] -. failed convergence path .-> Repair[Alert, replay, reconciliation]`,
      body: `<h3>Per-key ordering</h3>
<p>Kafka-style partitioning is useful here.</p>
<p>Suppose events use:</p>
<div class="code-block"><span class="code-label">text</span><pre>orderId
</pre></div><p>as the partition key.</p>
<p>Then all events for order 123 go to the same partition:</p>
<div class="code-block"><span class="code-label">text</span><pre>OrderCreated
OrderPaid
OrderShipped
OrderDelivered
</pre></div><p>and retain partition order.</p>
<p>Different orders can process independently:</p>
<div class="code-block"><span class="code-label">text</span><pre>order 123 → partition 4
order 456 → partition 1
</pre></div><p>This scales because you obtain:</p>
<div class="code-block"><span class="code-label">text</span><pre>ordering per aggregate
</pre></div><p>rather than:</p>
<div class="code-block"><span class="code-label">text</span><pre>one global ordering bottleneck
</pre></div><p>The partition key becomes part of your consistency architecture.</p>
<h3>The danger of changing partition keys</h3>
<p>Suppose:</p>
<div class="code-block"><span class="code-label">text</span><pre>OrderCreated
partition key = customerId
</pre></div><p>but:</p>
<div class="code-block"><span class="code-label">text</span><pre>OrderPaid
partition key = orderId
</pre></div><p>Those events may reach different partitions and consumers concurrently.</p>
<p>Ordering disappears.</p>
<p>For events whose relative order matters, use a stable routing key.</p>
<h3>Consumer parallelism and ordering</h3>
<p>Even if Kafka delivers:</p>
<div class="code-block"><span class="code-label">text</span><pre>10
11
12
</pre></div><p>in order, application code can destroy that ordering:</p>
<div class="code-block"><span class="code-label">java</span><pre>consumer.receive(event)
    -&gt; submit to thread pool
</pre></div><p>Thread execution:</p>
<div class="code-block"><span class="code-label">text</span><pre>12 finishes
10 finishes
11 finishes
</pre></div><p>Now state updates are reordered.</p>
<p>If per-key ordering matters, processing must preserve it.</p>
<p>Possible pattern:</p>
<div class="code-block"><span class="code-label">text</span><pre>partition
    mapped to one serial processing lane
</pre></div><p>or:</p>
<div class="code-block"><span class="code-label">text</span><pre>version-checked concurrent processing
</pre></div><p>Broker guarantees are not enough if your consumer breaks them.</p>
<h3>Retry queues can reorder events</h3>
<p>Suppose:</p>
<div class="code-block"><span class="code-label">text</span><pre>Event 10 fails.
Event 11 succeeds.
Event 10 moves to retry topic.
</pre></div><p>Later:</p>
<div class="code-block"><span class="code-label">text</span><pre>Event 10 retries after 11.
</pre></div><p>State becomes wrong unless:</p>
<div class="code-block"><span class="code-label">text</span><pre>version checks
</pre></div><p>or other ordering logic exists.</p>
<p>This is one reason retry topics deserve careful design in stateful consumers.</p>
<p>For strict aggregate ordering you may need to block later events until the failed one is resolved, accepting reduced throughput.</p>
<h3>Dead-letter queues and consistency</h3>
<p>Suppose Event 10 eventually lands in DLQ.</p>
<p>Consumer continues processing:</p>
<div class="code-block"><span class="code-label">text</span><pre>11
12
13
</pre></div><p>Projection may now be permanently wrong.</p>
<p>A DLQ is not success.</p>
<p>It means:</p>
<div class="code-block"><span class="code-label">text</span><pre>normal convergence path failed
</pre></div><p>You need:</p>
<div class="code-block"><span class="code-label">text</span><pre>alert
operator workflow
automated replay
reconciliation
business impact assessment
</pre></div><p>DLQ depth should be treated as a consistency signal, not merely queue hygiene.</p>`
    }
);
