window.FULL_LESSONS = window.FULL_LESSONS || {};
window.FULL_LESSONS["day-29-read-replicas"] = {
  "day": 29,
  "title": "Read Replicas",
  "subtitle": "Scale stale-tolerant reads from copies while protecting current and invariant reads on the primary.",
  "tags": [
    "Read replicas",
    "Replica lag",
    "Read-your-writes",
    "Failover",
    "Routing",
    "Consistency"
  ],
  "core": "A read replica improves read capacity by maintaining a copy of the primary database and serving selected queries from that copy. The trade-off is that the replica may not contain the primary’s latest committed data.",
  "sections": [
    {
      "title": "Overview",
      "diagram": "flowchart LR\n  App -- writes and current reads --> Primary[(Primary)]\n  Primary -- replication stream --> R1[(Replica A)]\n  Primary -- replication stream --> R2[(Replica B)]\n  App -- stale-tolerant reads --> R1\n  App -- reporting --> R2\n  R1 -. lag / failover .-> App",
      "body": "<p>A typical topology:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>                         Writes\nApplication ─────────────────────────► Primary\n                                         │\n                                         │ replication stream\n                                         ▼\n                              ┌─────────────────────┐\n                              │                     │\n                         Read Replica A        Read Replica B\n                              ▲                     ▲\n                              │                     │\n                           Read queries          Read queries\n</code></pre></div>\n<p>Read replicas can improve:</p>\n<ul>\n<li>read throughput</li>\n<li>isolation of reporting workloads</li>\n<li>geographic read latency</li>\n<li>primary availability during heavy reads</li>\n<li>disaster-recovery options</li>\n</ul>\n<p>They do <strong>not</strong> automatically provide:</p>\n<ul>\n<li>read-after-write consistency</li>\n<li>unlimited read capacity</li>\n<li>write scaling</li>\n<li>zero data-loss failover</li>\n<li>backups</li>\n<li>correct query routing</li>\n</ul>"
    },
    {
      "title": "1. Primary and replica responsibilities",
      "diagram": null,
      "body": "<p>The primary normally handles:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>INSERT\nUPDATE\nDELETE\nschema changes\ntransaction commits\n</code></pre></div>\n<p>The replica normally handles:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>SELECT\nreports\nsearch/list screens\nanalytics\nhistorical queries\n</code></pre></div>\n<p>Changes flow from primary to replica:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Primary transaction commits\n        ↓\nReplication record generated\n        ↓\nRecord transferred to replica\n        ↓\nReplica stores it\n        ↓\nReplica applies it\n        ↓\nNew data becomes visible to reads\n</code></pre></div>\n<p>The delay between commit and visibility is <strong>replica lag</strong>.</p>"
    },
    {
      "title": "2. Read replicas scale reads, not writes",
      "diagram": null,
      "body": "<p>Suppose one primary supports:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>10,000 writes/sec\n20,000 reads/sec\n</code></pre></div>\n<p>Adding three replicas might increase total read capacity:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Primary      20,000 reads/sec\nReplica A    20,000 reads/sec\nReplica B    20,000 reads/sec\nReplica C    20,000 reads/sec\n</code></pre></div>\n<p>But write capacity remains approximately:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>10,000 writes/sec\n</code></pre></div>\n<p>In fact, replication can slightly increase primary write overhead because the primary must produce and transmit replication records.</p>\n<p>If writes are the bottleneck, consider:</p>\n<ul>\n<li>query and index optimization</li>\n<li>batching</li>\n<li>partitioning</li>\n<li>sharding</li>\n<li>data-model changes</li>\n<li>asynchronous processing</li>\n</ul>\n<p>A read replica does not solve a write bottleneck.</p>"
    },
    {
      "title": "3. Asynchronous replication",
      "diagram": null,
      "body": "<p>Most read-replica architectures use asynchronous replication.</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Client\n   ↓\nPrimary commits\n   ↓\nClient receives success\n   ↓\nReplica receives and applies change later\n</code></pre></div>\n<p>The primary does not wait for the replica before acknowledging the write.</p>\n<p>Advantages:</p>\n<ul>\n<li>low write latency</li>\n<li>primary can continue if replica is slow</li>\n<li>replicas can be geographically distant</li>\n</ul>\n<p>Trade-off:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Replica may be stale.\n</code></pre></div>"
    },
    {
      "title": "4. Synchronous replication",
      "diagram": null,
      "body": "<p>With synchronous replication:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Primary executes transaction\n        ↓\nReplica acknowledges required replication stage\n        ↓\nPrimary commits/acknowledges to client\n</code></pre></div>\n<p>Depending on configuration, the acknowledgement may mean the replica has:</p>\n<ul>\n<li>received the log</li>\n<li>flushed it to disk</li>\n<li>applied it</li>\n<li>made it visible to queries</li>\n</ul>\n<p>Advantages:</p>\n<ul>\n<li>lower risk of committed data loss</li>\n<li>stronger consistency guarantees</li>\n</ul>\n<p>Trade-offs:</p>\n<ul>\n<li>higher write latency</li>\n<li>replica/network failure can affect writes</li>\n<li>cross-region synchronization can be expensive</li>\n<li>throughput may decline</li>\n</ul>\n<p>Synchronous replication is usually chosen for durability or consistency requirements, not merely read scaling.</p>"
    },
    {
      "title": "5. Replica lag is not one number",
      "diagram": null,
      "body": "<p>Several stages can lag:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Primary generated position\n        ↓\nReplica received position\n        ↓\nReplica flushed position\n        ↓\nReplica replayed/applied position\n</code></pre></div>\n<p>Possible measurements:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Transport lag\n    primary log generated but not yet received\n\nFlush lag\n    received but not durably stored\n\nReplay lag\n    stored but not yet applied\n\nVisibility lag\n    applied position relevant to a client read\n</code></pre></div>\n<p>A replica can have:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>low network lag\nbut high replay lag\n</code></pre></div>\n<p>when it is CPU- or I/O-constrained.</p>"
    },
    {
      "title": "6. Time lag can be misleading",
      "diagram": null,
      "body": "<p>Suppose the primary has no writes for ten minutes.</p>\n<p>A disconnected replica might still report:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>last replayed transaction was ten minutes ago\n</code></pre></div>\n<p>But so was the primary’s last transaction.</p>\n<p>A simple “seconds behind” measure may look harmless.</p>\n<p>More reliable monitoring combines:</p>\n<ul>\n<li>replication log positions</li>\n<li>bytes behind</li>\n<li>last received position</li>\n<li>last replayed position</li>\n<li>connection state</li>\n<li>replay timestamp</li>\n<li>primary write activity</li>\n</ul>\n<p>Do not rely on one lag metric alone.</p>"
    },
    {
      "title": "7. The read-after-write problem",
      "diagram": null,
      "body": "<p>A user updates an address:</p>\n<div class=\"code-block\"><span class=\"code-label\">http</span><pre><code>PUT /profile/address\n</code></pre></div>\n<p>Primary commits:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Address = Mumbai\n</code></pre></div>\n<p>The frontend immediately requests:</p>\n<div class=\"code-block\"><span class=\"code-label\">http</span><pre><code>GET /profile\n</code></pre></div>\n<p>The load balancer routes the read to a lagging replica:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Address = Pune\n</code></pre></div>\n<p>The user sees the old value and may think the update failed.</p>\n<p>Timeline:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>T0: Write commits on primary\nT1: Read reaches replica\nT2: Replica applies the write\n</code></pre></div>\n<p>If:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>T1 &lt; T2\n</code></pre></div>\n<p>the read is stale.</p>"
    },
    {
      "title": "8. Read-your-writes consistency",
      "diagram": null,
      "body": "<p>A user expects:</p>\n<div class=\"callout\">\n<p>After I successfully change something, subsequent reads from my session should include that change.</p>\n</div>\n<p>This property is called <strong>read-your-writes consistency</strong>.</p>\n<p>Asynchronous replicas do not provide it automatically.</p>\n<p>Common strategies include:</p>\n<ol>\n<li>Route critical reads to the primary.</li>\n<li>Temporarily pin the user to the primary after a write.</li>\n<li>Wait until the replica reaches a known replication position.</li>\n<li>Pass a consistency token between requests.</li>\n<li>Return the updated resource directly from the write response.</li>\n</ol>"
    },
    {
      "title": "9. Return the updated state from the write",
      "diagram": null,
      "body": "<p>Instead of:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>PUT address\n    ↓\n200 OK\n    ↓\nGET profile from replica\n</code></pre></div>\n<p>return:</p>\n<div class=\"code-block\"><span class=\"code-label\">json</span><pre><code>{\n  \"userId\": 42,\n  \"address\": \"Mumbai\",\n  \"version\": 18\n}\n</code></pre></div>\n<p>The frontend can update its local state without immediately reading again.</p>\n<p>This reduces the problem but does not eliminate it. A later page refresh may still hit a stale replica.</p>"
    },
    {
      "title": "10. Primary pinning after writes",
      "diagram": null,
      "body": "<p>After a successful write, record:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>user/session requires primary until time T\n</code></pre></div>\n<p>For example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>primaryPinUntil = now + 5 seconds\n</code></pre></div>\n<p>Reads during that window go to the primary.</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Write\n  ↓\nPin session to primary\n  ↓\nSubsequent reads → primary\n  ↓\nAfter window expires → replica allowed\n</code></pre></div>\n<p>Advantages:</p>\n<ul>\n<li>simple</li>\n<li>good for short lag</li>\n<li>no database-specific replication token required</li>\n</ul>\n<p>Weaknesses:</p>\n<ul>\n<li>fixed duration may be too short during incidents</li>\n<li>unnecessarily sends reads to primary when lag is tiny</li>\n<li>session state must work across application instances</li>\n<li>background writes may not update the user’s pin</li>\n</ul>\n<p>Use a conservative bounded window and monitor lag.</p>"
    },
    {
      "title": "11. Replication-position consistency tokens",
      "diagram": null,
      "body": "<p>A stronger design records the primary’s commit position.</p>\n<p>Conceptually:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Write commits at replication position 8A/4F21\n</code></pre></div>\n<p>The write response includes an opaque token:</p>\n<div class=\"code-block\"><span class=\"code-label\">json</span><pre><code>{\n  \"status\": \"UPDATED\",\n  \"consistencyToken\": \"opaque-token\"\n}\n</code></pre></div>\n<p>A later read includes it:</p>\n<div class=\"code-block\"><span class=\"code-label\">http</span><pre><code>GET /profile\nX-Minimum-Consistency-Token: opaque-token\n</code></pre></div>\n<p>The application selects a replica only if:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>replica replay position &gt;= required position\n</code></pre></div>\n<p>Otherwise it can:</p>\n<ul>\n<li>wait briefly</li>\n<li>choose another replica</li>\n<li>fall back to the primary</li>\n</ul>\n<p>This provides causal consistency without routing every read permanently to the primary.</p>\n<p>Trade-offs:</p>\n<ul>\n<li>database-specific implementation</li>\n<li>token propagation complexity</li>\n<li>replica-position lookup overhead</li>\n<li>timeout and fallback policy required</li>\n</ul>"
    },
    {
      "title": "12. Monotonic-read violations",
      "diagram": null,
      "body": "<p>Suppose replicas have different lag:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Replica A replayed version 100\nReplica B replayed version 95\n</code></pre></div>\n<p>The user performs two reads:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Read 1 → Replica A → version 100\nRead 2 → Replica B → version 95\n</code></pre></div>\n<p>From the user’s perspective, data moved backward in time.</p>\n<p>This violates <strong>monotonic reads</strong>.</p>\n<p>Possible mitigations:</p>\n<ul>\n<li>stick a session to one replica</li>\n<li>carry a minimum-version token</li>\n<li>route to replicas that have reached the required position</li>\n<li>route critical flows to the primary</li>\n</ul>\n<p>Load balancing randomly across replicas can create anomalies even when each individual replica is functioning correctly.</p>"
    },
    {
      "title": "13. Causal-consistency anomaly",
      "diagram": null,
      "body": "<p>Suppose:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1. Order is created.\n2. Payment references that order.\n</code></pre></div>\n<p>Replica state may temporarily show:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Payment exists\nOrder does not exist\n</code></pre></div>\n<p>depending on:</p>\n<ul>\n<li>separate databases</li>\n<li>separate replication channels</li>\n<li>independent services</li>\n<li>read routing</li>\n<li>apply order</li>\n</ul>\n<p>Within one database replication stream, commit ordering is generally maintained, but cross-database or cross-service causal relationships are not automatically preserved.</p>\n<p>This matters when composing API responses from multiple sources.</p>"
    },
    {
      "title": "14. Deletes may appear to “undo”",
      "diagram": null,
      "body": "<p>A user deletes a saved payment method.</p>\n<p>Primary:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>payment method removed\n</code></pre></div>\n<p>Immediate read from replica:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>payment method still exists\n</code></pre></div>\n<p>The user clicks Delete again.</p>\n<p>Possible consequences:</p>\n<ul>\n<li>confusing “already deleted” error</li>\n<li>duplicate requests</li>\n<li>unnecessary retries</li>\n<li>stale UI</li>\n</ul>\n<p>Stale reads affect deletions and permission revocations particularly strongly because old data reappears.</p>"
    },
    {
      "title": "15. Security-sensitive reads",
      "diagram": null,
      "body": "<p>Never casually route these to a lagging replica:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Has the account been disabled?\nWas this token revoked?\nWas the user removed from the organization?\nWas a permission removed?\nHas the spending limit changed?\nWas a payment instrument blocked?\n</code></pre></div>\n<p>A stale authorization read can grant access that should already have been removed.</p>\n<p>Security-sensitive decisions generally belong on:</p>\n<ul>\n<li>the primary</li>\n<li>a strongly consistent authorization store</li>\n<li>a specialized revocation mechanism</li>\n<li>a short-lived local cache with explicit risk analysis</li>\n</ul>\n<p>Performance optimization must not weaken authorization semantics silently.</p>"
    },
    {
      "title": "16. Financial and wallet reads",
      "diagram": null,
      "body": "<p>For a closed-wallet system, examples include:</p>\n<table>\n<thead>\n<tr>\n<th>Operation</th>\n<th>Typical routing</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td>Check available balance before debit</td>\n<td>Primary</td>\n</tr>\n<tr>\n<td>Verify idempotency key</td>\n<td>Primary</td>\n</tr>\n<tr>\n<td>Block funds</td>\n<td>Primary</td>\n</tr>\n<tr>\n<td>Commit/refund transaction</td>\n<td>Primary</td>\n</tr>\n<tr>\n<td>Show historical transactions</td>\n<td>Replica may be acceptable</td>\n</tr>\n<tr>\n<td>Monthly statement</td>\n<td>Replica/reporting store</td>\n</tr>\n<tr>\n<td>Current balance displayed after payment</td>\n<td>Primary or consistency-token read</td>\n</tr>\n<tr>\n<td>Analytics dashboard</td>\n<td>Replica</td>\n</tr>\n<tr>\n<td>Fraud decision using latest blocks</td>\n<td>Primary or strongly consistent store</td>\n</tr>\n</tbody>\n</table>\n<p>The key question is not:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Is this query a SELECT?\n</code></pre></div>\n<p>It is:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>What happens if this result is stale?\n</code></pre></div>"
    },
    {
      "title": "17. A query-classification model",
      "diagram": null,
      "body": "<p>Classify reads by tolerated staleness.</p>\n<h5>Class A — Strong/current</h5>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Tolerance: none or near zero\n</code></pre></div>\n<p>Examples:</p>\n<ul>\n<li>authorization</li>\n<li>wallet balance before spending</li>\n<li>idempotency lookup</li>\n<li>inventory availability before confirmation</li>\n<li>state-machine transition validation</li>\n</ul>\n<p>Route to primary.</p>\n<h5>Class B — Read-your-writes</h5>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Tolerance: stale generally okay,\nbut not after this user just changed it\n</code></pre></div>\n<p>Examples:</p>\n<ul>\n<li>profile update</li>\n<li>order status after checkout</li>\n<li>settings page</li>\n</ul>\n<p>Use primary pinning or consistency tokens.</p>\n<h5>Class C — Bounded stale</h5>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Tolerance: up to 5–30 seconds\n</code></pre></div>\n<p>Examples:</p>\n<ul>\n<li>notification counts</li>\n<li>recent activity</li>\n<li>operational dashboards</li>\n</ul>\n<p>Use a replica only while lag remains below a threshold.</p>\n<h5>Class D — Eventually consistent</h5>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Tolerance: minutes or hours\n</code></pre></div>\n<p>Examples:</p>\n<ul>\n<li>analytics</li>\n<li>historical reports</li>\n<li>trend dashboards</li>\n<li>exports</li>\n</ul>\n<p>Use reporting replicas or dedicated analytical systems.</p>"
    },
    {
      "title": "18. Endpoint-based routing",
      "diagram": null,
      "body": "<p>A simple architecture uses explicit repositories:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>primaryPaymentRepository.findCurrentBalance(...);\n\nreplicaPaymentRepository.findTransactionHistory(...);\n</code></pre></div>\n<p>Advantages:</p>\n<ul>\n<li>routing intent is visible</li>\n<li>hard to accidentally route critical reads</li>\n<li>easy to test</li>\n</ul>\n<p>Disadvantages:</p>\n<ul>\n<li>duplicated repository wiring</li>\n<li>developers must choose correctly</li>\n<li>transaction composition becomes more explicit</li>\n</ul>\n<p>For critical systems, explicitness is often valuable.</p>"
    },
    {
      "title": "19. Transaction-based routing",
      "diagram": null,
      "body": "<p>Another pattern routes based on transaction metadata:</p>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>@Transactional(readOnly = true)\npublic List&lt;TransactionSummary&gt; history(...) {\n    ...\n}\n</code></pre></div>\n<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>@Transactional\npublic void debit(...) {\n    ...\n}\n</code></pre></div>\n<p>A routing data source may interpret:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>readOnly transaction → replica\nread/write transaction → primary\n</code></pre></div>\n<p>This is convenient, but it has important edge cases.</p>"
    },
    {
      "title": "20. `readOnly=true` is a hint, not a guarantee",
      "diagram": null,
      "body": "<p><code class=\"inline-code\">@Transactional(readOnly = true)</code> can influence:</p>\n<ul>\n<li>ORM flush behavior</li>\n<li>JDBC connection state</li>\n<li>routing logic you implement</li>\n</ul>\n<p>It does not inherently mean:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Spring automatically sends this query to a replica.\n</code></pre></div>\n<p>You need an explicit routing data source or database/proxy support.</p>\n<p>Also, a method marked read-only may still execute unsafe behavior if:</p>\n<ul>\n<li>native SQL writes are attempted</li>\n<li>stored procedures mutate data</li>\n<li>the database user permits writes</li>\n<li>routing configuration is wrong</li>\n</ul>\n<p>Use a truly read-only replica user as an additional safeguard.</p>"
    },
    {
      "title": "21. Routing must happen before connection acquisition",
      "diagram": null,
      "body": "<p>A routing data source typically chooses a target when:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>transaction begins\n    ↓\nconnection is requested\n</code></pre></div>\n<p>If code sets the routing context after a connection has already been borrowed, it is too late.</p>\n<p>Bad conceptual order:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Start transaction\nBorrow primary connection\nSet context to REPLICA\nExecute query\n</code></pre></div>\n<p>The query still uses the primary connection.</p>\n<p>Correct order:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Set routing decision\nStart transaction\nBorrow selected connection\nExecute query\nClear routing context\n</code></pre></div>\n<p>AOP ordering and transaction-proxy boundaries matter.</p>"
    },
    {
      "title": "22. Simplified Spring routing context",
      "diagram": null,
      "body": "<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>public final class DatabaseRouteContext {\n\n    private static final ThreadLocal&lt;Route&gt; CURRENT =\n            new ThreadLocal&lt;&gt;();\n\n    private DatabaseRouteContext() {\n    }\n\n    public static void use(Route route) {\n        CURRENT.set(route);\n    }\n\n    public static Route current() {\n        return CURRENT.get();\n    }\n\n    public static void clear() {\n        CURRENT.remove();\n    }\n\n    public enum Route {\n        PRIMARY,\n        REPLICA\n    }\n}\n</code></pre></div>\n<p>Always clear the <code class=\"inline-code\">ThreadLocal</code> in a <code class=\"inline-code\">finally</code> block. Application-server threads are reused, so stale routing state could leak into another request.</p>"
    },
    {
      "title": "23. Simplified routing data source",
      "diagram": null,
      "body": "<div class=\"code-block\"><span class=\"code-label\">java</span><pre><code>public final class PrimaryReplicaRoutingDataSource\n        extends AbstractRoutingDataSource {\n\n    @Override\n    protected Object determineCurrentLookupKey() {\n        DatabaseRouteContext.Route route =\n                DatabaseRouteContext.current();\n\n        return route == DatabaseRouteContext.Route.REPLICA\n                ? \"replica\"\n                : \"primary\";\n    }\n}\n</code></pre></div>\n<p>Primary should normally be the safe default:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Unknown routing context\n    → PRIMARY\n</code></pre></div>\n<p>Accidentally sending reads to primary affects performance.</p>\n<p>Accidentally sending consistency-critical reads to a replica affects correctness.</p>\n<p>Prefer correctness as the default.</p>"
    },
    {
      "title": "24. Separate connection pools",
      "diagram": null,
      "body": "<p>Each data source needs its own pool:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Primary Hikari pool\nReplica Hikari pool\n</code></pre></div>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Primary:\n    10 connections per pod\n\nReplica:\n    20 connections per pod\n</code></pre></div>\n<p>But calculate cluster-wide totals independently:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Primary connection budget\n    = primary pool × maximum pods\n\nReplica connection budget\n    = replica pool × maximum pods\n</code></pre></div>\n<p>Adding replicas does not make application connection counts irrelevant.</p>"
    },
    {
      "title": "25. Avoid opening primary and replica connections together",
      "diagram": null,
      "body": "<p>A request might:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>1. Read history from replica.\n2. Start write transaction on primary.\n</code></pre></div>\n<p>If it holds the replica connection while requesting the primary connection, high load can create cross-pool contention.</p>\n<p>Prefer:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>finish and release replica read\n    ↓\nstart primary transaction\n</code></pre></div>\n<p>Also ensure that business decisions for the write are not based on stale replica data.</p>"
    },
    {
      "title": "26. Do not make write decisions from stale reads",
      "diagram": null,
      "body": "<p>Dangerous workflow:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Read available balance from replica: ₹1,000\n    ↓\nPrimary already processed another debit\nActual balance: ₹200\n    ↓\nApprove ₹500 debit based on replica result\n</code></pre></div>\n<p>The final write must revalidate the invariant on the primary transaction.</p>\n<p>Correct:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Replica read may be used for display\nPrimary transaction checks current balance\nPrimary enforces balance constraint\n</code></pre></div>\n<p>A replica should never be the final authority for a write invariant.</p>"
    },
    {
      "title": "27. Replica-aware load balancing",
      "diagram": null,
      "body": "<p>With several replicas, selection can consider:</p>\n<ul>\n<li>health</li>\n<li>replay position</li>\n<li>lag</li>\n<li>active connections</li>\n<li>query latency</li>\n<li>region</li>\n<li>workload class</li>\n<li>maintenance state</li>\n</ul>\n<p>Bad strategy:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Round-robin all replicas regardless of lag\n</code></pre></div>\n<p>Better:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Eligible replicas =\n    healthy\n    AND lag below endpoint threshold\n    AND not draining\n</code></pre></div>\n<p>Then balance among eligible replicas.</p>"
    },
    {
      "title": "28. Lag-aware routing",
      "diagram": null,
      "body": "<p>Suppose endpoint policy permits:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>maximum staleness = 5 seconds\n</code></pre></div>\n<p>Replica states:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Replica A lag = 0.2 sec\nReplica B lag = 3 sec\nReplica C lag = 40 sec\n</code></pre></div>\n<p>Eligible:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>A and B\n</code></pre></div>\n<p>Replica C should be:</p>\n<ul>\n<li>removed from routing</li>\n<li>investigated</li>\n<li>possibly restarted or scaled</li>\n<li>kept available for lower-priority workloads only</li>\n</ul>\n<p>A replica can be healthy at the TCP level but unhealthy for a consistency-sensitive endpoint.</p>"
    },
    {
      "title": "29. Fallback to primary",
      "diagram": null,
      "body": "<p>If no eligible replica exists, possible policies are:</p>\n<h5>Fall back to primary</h5>\n<p>Good when:</p>\n<ul>\n<li>correctness is more important than protecting primary</li>\n<li>read volume is manageable</li>\n<li>temporary degradation is acceptable</li>\n</ul>\n<p>Risk:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>all replica traffic suddenly hits primary\n</code></pre></div>\n<h5>Fail the request</h5>\n<p>Good when:</p>\n<ul>\n<li>workload is optional</li>\n<li>protecting transactional writes is essential</li>\n<li>stale or primary reads are unacceptable</li>\n</ul>\n<p>Example:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>analytics report unavailable\n</code></pre></div>\n<h5>Serve stale data</h5>\n<p>Good when:</p>\n<ul>\n<li>endpoint explicitly allows it</li>\n<li>response can declare staleness</li>\n<li>data is non-critical</li>\n</ul>\n<p>The fallback policy should be defined per workload, not improvised during an incident.</p>"
    },
    {
      "title": "30. Primary fallback can cause a cascading failure",
      "diagram": null,
      "body": "<p>Suppose replicas handle:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>50,000 reads/sec\n</code></pre></div>\n<p>They fail.</p>\n<p>All traffic falls back to a primary designed for:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>10,000 writes/sec\n+\n5,000 critical reads/sec\n</code></pre></div>\n<p>Result:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>primary overloaded\n    ↓\nwrites slow\n    ↓\nreplication and failover worsen\n    ↓\nentire system fails\n</code></pre></div>\n<p>Protect the primary using:</p>\n<ul>\n<li>separate traffic classes</li>\n<li>rate limiting</li>\n<li>fallback quotas</li>\n<li>circuit breakers</li>\n<li>load shedding</li>\n<li>cached responses</li>\n<li>disabling optional reports</li>\n</ul>\n<p>Availability of non-critical reads should not destroy write availability.</p>"
    },
    {
      "title": "31. Replica overload",
      "diagram": null,
      "body": "<p>A replica can become overloaded because of:</p>\n<ul>\n<li>expensive reports</li>\n<li>missing indexes</li>\n<li>many concurrent reads</li>\n<li>application pool too large</li>\n<li>replication replay competing with queries</li>\n<li>table scans</li>\n<li>temporary-file spills</li>\n<li>cache churn</li>\n</ul>\n<p>Symptoms:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>query latency rises\nreplay lag rises\nCPU/I/O rises\nreplica falls further behind\n</code></pre></div>\n<p>This creates a feedback loop:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>slow replica\n    ↓\nqueries run longer\n    ↓\nmore connections remain active\n    ↓\nreplica has fewer resources for replay\n    ↓\nlag increases\n</code></pre></div>\n<p>Separate interactive and analytical workloads where possible.</p>"
    },
    {
      "title": "32. Dedicated reporting replicas",
      "diagram": null,
      "body": "<p>A common topology:</p>\n<div class=\"code-block\"><span class=\"code-label\">text</span><pre><code>Primary\n   ├── Interactive replica A\n   ├── Interactive replica B\n   └── Reporting replica\n</code></pre></div>\n<p>Interactive replicas:</p>\n<ul>\n<li>strict lag thresholds</li>\n<li>short queries</li>\n<li>low query timeouts</li>\n<li>predictable</li>\n</ul>\n<div class=\"callout warn\">\n<p>Extraction note: this chapter came from a ChatGPT reader page capped at 20,000 characters. It may need a later full-export verification pass.</p>\n</div>"
    }
  ],
  "keyTakeaways": [
    "Route only reads whose staleness tolerance is explicit.",
    "Protect read-your-writes and invariant checks on the primary or with a monotonic strategy.",
    "Measure replay position, time lag, apply delay, and replica query pressure.",
    "A replica outage must not silently redirect unlimited load to the primary.",
    "Failover, promotion, DNS, connection pools, and data-loss objectives form one design."
  ]
};
