window.FULL_LESSONS['day-35-eventual-consistency'].sections.push(
    {
      title: "11. Cache convergence and stale resurrection",
      diagram: `sequenceDiagram
          participant Reader as Slow reader
          participant Writer
          participant Cache
          participant DB
          Reader->>Cache: Miss
          Reader->>DB: Read old V1
          Writer->>DB: Commit V2
          Writer->>Cache: Invalidate
          Reader->>Cache: Store stale V1 after invalidation`,
      body: `<h3>Cache invalidation and eventual consistency</h3>
<p>Suppose:</p>
<div class="code-block"><span class="code-label">text</span><pre>DB updated
event emitted
cache invalidation consumer delayed
</pre></div><p>Cache still contains:</p>
<div class="code-block"><span class="code-label">text</span><pre>old version
</pre></div><p>Even after a read replica catches up, the API may still return the stale cache.</p>
<p>Version-aware cache entries help:</p>
<div class="code-block"><span class="code-label">text</span><pre>cache:
    value + version
</pre></div><p>An incoming update with version 42 should never be overwritten by a delayed version 41.</p>
<p>This protects against invalidation/update reordering.</p>
<h3>Cache-aside race</h3>
<p>Consider:</p>
<div class="code-block"><span class="code-label">text</span><pre>T1 Reader misses cache.
T2 Reader queries DB → old value V1.
T3 Writer updates DB → V2.
T4 Writer invalidates cache.
T5 Reader writes V1 into cache.
</pre></div><p>Now stale V1 has been resurrected <strong>after</strong> invalidation.</p>
<p>This is a classic eventual-consistency race.</p>
<p>Possible mitigations include:</p>
<div class="code-block"><span class="code-label">text</span><pre>short TTL
versioned cache writes
write-through/update strategies
delayed second invalidation
event-driven versions
</pre></div><p>There is no universal perfect cache protocol; understand the race you are accepting.</p>`
    },
    {
      title: "12. Financial systems and domain-specific consistency",
      diagram: `flowchart TD
          Payment[(Authoritative payment state)] --> Outbox[(Outbox)]
          Outbox --> Bus[(Event bus)]
          Bus --> Order[Order projection]
          Bus --> Notify[Notification]
          Bus --> Analytics[Analytics]
          Bus --> Search[Search]
          Payment --> Ledger[(Authoritative ledger and balance)]
          Payment -. reconciliation .-> Order`,
      body: `<h3>Reconciliation in financial systems</h3>
<p>For financial systems, eventual consistency should generally exist around <strong>projections</strong>, not around the authoritative ledger invariant.</p>
<p>Example:</p>
<div class="code-block"><span class="code-label">text</span><pre>Authoritative:
    ledger entries
    balances
    idempotency
    transaction state

Eventually consistent:
    reports
    search
    customer timeline
    analytics
    notifications
</pre></div><p>Then reconcile:</p>
<div class="code-block"><span class="code-label">text</span><pre>ledger-derived balance
versus
materialized balance

payment provider settlements
versus
internal payment records

event projection version
versus
source version
</pre></div><p>Financial systems often employ reconciliation as a first-class control, not merely a repair script.</p>
<h3>Example: payment workflow</h3>
<p>Suppose:</p>
<div class="code-block"><span class="code-label">text</span><pre>Payment Service transaction:
    payment = CAPTURED
    outbox event = PaymentCaptured
</pre></div><p>Consumers:</p>
<div class="code-block"><span class="code-label">text</span><pre>Order Service
    marks order paid

Notification Service
    sends receipt

Analytics
    increments daily revenue

Search projection
    updates payment search document
</pre></div><p>Possible temporary state:</p>
<div class="code-block"><span class="code-label">text</span><pre>Payment Service:
    CAPTURED

Order:
    PAYMENT_PENDING

Notification:
    not sent

Analytics:
    old total
</pre></div><p>This is acceptable only if every consumer eventually converges.</p>
<p>If Order Service fails for an hour:</p>
<div class="code-block"><span class="code-label">text</span><pre>events remain durable
consumer catches up later
</pre></div><p>If one event permanently fails:</p>
<div class="code-block"><span class="code-label">text</span><pre>DLQ + alert + reconciliation
</pre></div><p>The design needs both paths.</p>
<h3>Example: user profile</h3>
<p>Profile Service owns:</p>
<div class="code-block"><span class="code-label">text</span><pre>user_id
name
photo
</pre></div><p>Search index contains:</p>
<div class="code-block"><span class="code-label">text</span><pre>user search document
</pre></div><p>User changes name.</p>
<p>Search can be stale for seconds.</p>
<p>That is acceptable.</p>
<p>But suppose authentication/authorization relies on:</p>
<div class="code-block"><span class="code-label">text</span><pre>account_disabled
</pre></div><p>Do not casually put that field on the same stale search projection and use it for access control.</p>
<p>Different fields of the same entity may have different consistency requirements.</p>
<h3>Eventual consistency and deletes</h3>
<p>Deletes require special care across many copies:</p>
<div class="code-block"><span class="code-label">text</span><pre>Primary DB
cache
search
warehouse
replicas
CDN
</pre></div><p>If one projection misses a delete:</p>
<div class="code-block"><span class="code-label">text</span><pre>deleted user resurfaces
</pre></div><p>For privacy-sensitive data, deletion convergence may have a much stricter SLO than ordinary updates.</p>
<p>Track:</p>
<div class="code-block"><span class="code-label">text</span><pre>delete propagation
</pre></div><p>explicitly.</p>
<p>Eventual consistency is not an excuse for indefinite retention of deleted data.</p>`
    }
);
