window.FULL_LESSONS['day-35-eventual-consistency'].sections.push(
    {
      title: "9. Product states and stale-read policy",
      diagram: `stateDiagram-v2
          [*] --> REFUND_PENDING
          REFUND_PENDING --> REFUNDED: provider and ledger complete
          REFUND_PENDING --> REFUND_FAILED: workflow fails
          REFUNDED --> [*]
          REFUND_FAILED --> [*]`,
      body: `<h3>User experience around intermediate states</h3>
<p>Do not pretend distributed workflows are instant.</p>
<p>Instead of:</p>
<div class="code-block"><span class="code-label">text</span><pre>Payment complete
</pre></div><p>while downstream fulfillment is still catching up, model explicit states:</p>
<div class="code-block"><span class="code-label">text</span><pre>PAYMENT_CONFIRMED
ORDER_PROCESSING
SHIPMENT_PREPARING
</pre></div><p>A distributed system naturally contains intermediate states.</p>
<p>Expose meaningful ones to the user instead of treating them as bugs.</p>
<p>This is especially important for long-running sagas.</p>
<h3>&quot;Pending&quot; is a consistency tool</h3>
<p>Suppose refund workflow:</p>
<div class="code-block"><span class="code-label">text</span><pre>Refund requested
    ↓
Payment provider
    ↓
ledger update
    ↓
notification
</pre></div><p>Rather than trying to make everything instantly atomic:</p>
<div class="code-block"><span class="code-label">text</span><pre>REFUND_PENDING
</pre></div><p>becomes a durable business state.</p>
<p>Eventually:</p>
<div class="code-block"><span class="code-label">text</span><pre>REFUNDED
</pre></div><p>or:</p>
<div class="code-block"><span class="code-label">text</span><pre>REFUND_FAILED
</pre></div><p>The product model now reflects the distributed workflow.</p>
<p>This is usually better than lying to the user with a premature final status.</p>
<h3>Availability versus stale state</h3>
<p>When a projection is behind, an API may choose among:</p>
<div class="code-block"><span class="code-label">text</span><pre>serve stale value
read authoritative source
wait for projection
return processing state
fail
</pre></div><p>The correct answer depends on business risk.</p>
<p>Transaction history:</p>
<div class="code-block"><span class="code-label">text</span><pre>serve slightly stale
</pre></div><p>Wallet balance before spending:</p>
<div class="code-block"><span class="code-label">text</span><pre>use authoritative state
</pre></div><p>Analytics:</p>
<div class="code-block"><span class="code-label">text</span><pre>stale is fine
</pre></div><p>Account-revoked check:</p>
<div class="code-block"><span class="code-label">text</span><pre>stale may be unsafe
</pre></div><p>Eventual consistency must be workload-specific.</p>`
    },
    {
      title: "10. Freshness SLOs, lag, and backpressure",
      diagram: `flowchart LR
          Commit[Source commit] --> Broker[Broker arrival]
          Broker --> Queue[Consumer queue wait]
          Queue --> Process[Consumer processing]
          Process --> Projection[Projection commit]
          Commit -. measure end to end .-> Projection
          Overload{Consumer capacity sufficient?} -- no --> Lag[Lag and staleness grow]
          Overload -- yes --> Converge[Backlog converges]`,
      body: `<h3>Staleness budgets</h3>
<p>Instead of saying:</p>
<div class="code-block"><span class="code-label">text</span><pre>eventually consistent
</pre></div><p>define:</p>
<div class="code-block"><span class="code-label">text</span><pre>P95 propagation &lt; 1 sec
P99 propagation &lt; 5 sec
maximum expected &lt; 30 sec
</pre></div><p>For a dashboard:</p>
<div class="code-block"><span class="code-label">text</span><pre>freshness SLO:
99% of updates visible within 10 seconds
</pre></div><p>Now eventual consistency becomes measurable.</p>
<p>Without a freshness SLO, &quot;eventually&quot; can hide incidents indefinitely.</p>
<h3>Measuring propagation latency</h3>
<p>Include timestamps/positions:</p>
<div class="code-block"><span class="code-label">json</span><pre>{
  &quot;eventId&quot;: &quot;evt-100&quot;,
  &quot;occurredAt&quot;: &quot;...&quot;,
  &quot;sourceVersion&quot;: 81
}
</pre></div><p>Consumer records:</p>
<div class="code-block"><span class="code-label">text</span><pre>processedAt
</pre></div><p>Then calculate:</p>
<div class="code-block"><span class="code-label">text</span><pre>propagationLatency
=
processedAt - occurredAt
</pre></div><p>Even better, distinguish:</p>
<div class="code-block"><span class="code-label">text</span><pre>source commit → broker
broker → consumer
consumer queue wait
consumer processing
projection commit
</pre></div><p>This tells you where convergence is slowing.</p>
<h3>Consumer lag is a consistency metric</h3>
<p>Suppose consumer is:</p>
<div class="code-block"><span class="code-label">text</span><pre>2 million events behind
</pre></div><p>That is not merely messaging infrastructure load.</p>
<p>It means:</p>
<div class="code-block"><span class="code-label">text</span><pre>projection freshness is degraded
</pre></div><p>Business alerts should translate broker lag into user impact.</p>
<p>For example:</p>
<div class="code-block"><span class="code-label">text</span><pre>Order dashboard projection
    45 seconds behind source
</pre></div><p>is more meaningful than:</p>
<div class="code-block"><span class="code-label">text</span><pre>consumer offset lag = 1,842,331
</pre></div>
<h3>Backpressure</h3>
<p>If producers generate:</p>
<div class="code-block"><span class="code-label">text</span><pre>100k events/sec
</pre></div><p>but consumers process:</p>
<div class="code-block"><span class="code-label">text</span><pre>80k/sec
</pre></div><p>backlog increases:</p>
<div class="code-block"><span class="code-label">text</span><pre>20k/sec
</pre></div><p>Eventually consistency latency grows without bound.</p>
<p>This is not eventual convergence.</p>
<p>At steady state:</p>
<div class="code-block"><span class="code-label">text</span><pre>consumer capacity
&gt;=
average incoming rate
</pre></div><p>with headroom for bursts.</p>
<p>Otherwise &quot;eventual&quot; becomes &quot;never catches up.&quot;</p>
<p>This is where eventual consistency intersects with the later Backpressure topic.</p>
<h3>Load shedding and non-critical projections</h3>
<p>If the system is overloaded, prioritize:</p>
<div class="code-block"><span class="code-label">text</span><pre>financial projection
authorization projection
customer-visible state
</pre></div><p>over:</p>
<div class="code-block"><span class="code-label">text</span><pre>analytics
recommendations
low-priority reporting
</pre></div><p>Consumers can have separate queues, pools, priorities, or clusters.</p>
<p>A slow analytics consumer should not prevent critical state convergence.</p>`
    }
);
